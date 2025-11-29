/**
 * Agent Network Orchestrator
 * Manages communication between agents using an event bus
 * 
 * MASUMI INTEGRATION:
 * Events are published to both local event bus and Masumi network.
 * This enables decentralized agent communication on Cardano blockchain.
 */
import {
  AgentEvent,
  AgentEventType,
  GoalCompletedEvent,
  TokenTransferredEvent,
  CharityDistributionEvent,
} from '../types/rdm';
import {
  createGoalCompletedEvent,
  createTokenTransferredEvent,
  createCharityDistributionEvent,
  markEventProcessed,
} from '../utils/agentEvents';
import { getMasumiClient, MasumiEvent } from './masumiClient';
import { masumiConfig } from '../config/masumiConfig';

type EventHandler = (event: AgentEvent) => Promise<void> | void;
type AgentId = 'medaa1' | 'medaa2' | 'medaa3';

export class AgentNetwork {
  private eventBus: Map<AgentEventType, Set<EventHandler>>;
  private eventHistory: AgentEvent[];
  private registeredAgents: Set<AgentId>;
  private maxHistorySize: number = 1000;
  private masumiClient = getMasumiClient();
  private useMasumi: boolean = true; // Toggle Masumi integration

  constructor() {
    this.eventBus = new Map();
    this.eventHistory = [];
    this.registeredAgents = new Set();
  }

  /**
   * Enable or disable Masumi integration
   */
  setMasumiEnabled(enabled: boolean): void {
    this.useMasumi = enabled;
    console.log(`Masumi integration ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Check if Masumi is enabled
   */
  isMasumiEnabled(): boolean {
    return this.useMasumi;
  }

  /**
   * Register an agent with the network
   */
  registerAgent(agentId: AgentId): void {
    this.registeredAgents.add(agentId);
    console.log(`Agent ${agentId} registered with network`);
  }

  /**
   * Unregister an agent
   */
  unregisterAgent(agentId: AgentId): void {
    this.registeredAgents.delete(agentId);
    console.log(`Agent ${agentId} unregistered from network`);
  }

  /**
   * Subscribe to specific event types
   */
  subscribe(eventType: AgentEventType, handler: EventHandler): () => void {
    if (!this.eventBus.has(eventType)) {
      this.eventBus.set(eventType, new Set());
    }

    const handlers = this.eventBus.get(eventType)!;
    handlers.add(handler);

    // Return unsubscribe function
    return () => {
      handlers.delete(handler);
    };
  }

  /**
   * Map local agent IDs to Masumi agent IDs
   */
  private getMasumiAgentId(localAgentId: AgentId | 'system'): string {
    const agentIdMap: Record<string, string> = {
      'medaa1': masumiConfig.agentIds.medaa1,
      'medaa2': masumiConfig.agentIds.medaa2,
      'medaa3': masumiConfig.agentIds.medaa3,
      'system': masumiConfig.agentIds.medaa1, // Default to medaa1 for system events
    };
    return agentIdMap[localAgentId] || localAgentId;
  }

  /**
   * Convert local event to Masumi event format
   */
  private convertToMasumiEvent(event: AgentEvent): MasumiEvent {
    const masumiAgentId = this.getMasumiAgentId(event.sourceAgent as AgentId);
    
    return {
      eventType: event.type,
      agentId: masumiAgentId,
      payload: {
        ...event.payload,
        eventId: event.id,
        timestamp: event.timestamp.toISOString(),
        sourceAgent: event.sourceAgent,
        targetAgent: event.targetAgent,
      },
      timestamp: event.timestamp,
    };
  }

  /**
   * Publish an event to the network (local + Masumi)
   */
  async publish(event: AgentEvent): Promise<void> {
    // Add to local history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Notify local subscribers (for immediate UI updates)
    const handlers = this.eventBus.get(event.type);
    if (handlers) {
      const promises = Array.from(handlers).map((handler) => {
        try {
          return Promise.resolve(handler(event));
        } catch (error) {
          console.error(`Error in event handler for ${event.type}:`, error);
          return Promise.resolve();
        }
      });

      await Promise.all(promises);
    }

    // Also notify target agent specifically if specified
    if (event.targetAgent) {
      // Emit to all events for that agent (agents can subscribe to all events)
      const allHandlers = this.eventBus.get(AgentEventType.GOAL_CREATED); // Use any event type
      // In a real implementation, we'd have agent-specific routing
      console.log(`Event ${event.type} targeted to ${event.targetAgent}`);
    }

    // Publish to Masumi network (for blockchain persistence and decentralized communication)
    if (this.useMasumi) {
      try {
        // Only publish if we have Masumi agent IDs configured
        const masumiAgentId = this.getMasumiAgentId(event.sourceAgent as AgentId);
        if (masumiAgentId && masumiAgentId.length > 0) {
          const masumiEvent = this.convertToMasumiEvent(event);
          const result = await this.masumiClient.publishEvent(masumiEvent);
          
          if (result.success) {
            console.log(`✅ Event published to Masumi: ${event.type} (Event ID: ${result.eventId || 'N/A'})`);
          } else {
            console.warn(`⚠️ Failed to publish event to Masumi: ${event.type} - ${result.error || 'Unknown error'}`);
          }
        } else {
          console.warn(`⚠️ Masumi agent ID not configured for ${event.sourceAgent}, skipping Masumi publish`);
        }
      } catch (error) {
        // Don't fail local operations if Masumi publish fails
        console.error(`❌ Error publishing to Masumi:`, error);
      }
    }
  }

  /**
   * Create and publish a goal completed event
   */
  async publishGoalCompleted(
    goalId: string,
    status: 'done' | 'not_done' | 'partially_done',
    pledgedTokens: { ada: number; rdmTokens?: number },
    sourceAgent: 'medaa1' | 'system' = 'medaa1',
    verificationData?: Record<string, any>
  ): Promise<void> {
    const event = createGoalCompletedEvent(goalId, status, pledgedTokens, sourceAgent, verificationData);
    await this.publish(event);
  }

  /**
   * Create and publish a token transferred event
   */
  async publishTokenTransferred(
    fromPurse: string,
    toPurse: string,
    amount: { ada: number; rdmTokens?: number },
    goalId?: string,
    transactionHash?: string
  ): Promise<void> {
    const event = createTokenTransferredEvent(
      fromPurse as any,
      toPurse as any,
      amount,
      goalId,
      transactionHash
    );
    await this.publish(event);
  }

  /**
   * Create and publish a charity distribution event
   */
  async publishCharityDistribution(
    totalAmount: { ada: number; rdmTokens?: number },
    distributions: Array<{ charityId: string; amount: { ada: number; rdmTokens?: number }; transactionHash?: string }>
  ): Promise<void> {
    const event = createCharityDistributionEvent(totalAmount, distributions);
    await this.publish(event);
  }

  /**
   * Get event history
   */
  getEventHistory(filter?: {
    type?: AgentEventType;
    sourceAgent?: AgentId;
    targetAgent?: AgentId;
    processed?: boolean;
  }): AgentEvent[] {
    let events = [...this.eventHistory];

    if (filter) {
      if (filter.type) {
        events = events.filter((e) => e.type === filter.type);
      }
      if (filter.sourceAgent) {
        events = events.filter((e) => e.sourceAgent === filter.sourceAgent);
      }
      if (filter.targetAgent) {
        events = events.filter((e) => e.targetAgent === filter.targetAgent);
      }
      if (filter.processed !== undefined) {
        events = events.filter((e) => e.processed === filter.processed);
      }
    }

    return events;
  }

  /**
   * Get unprocessed events for an agent
   */
  getUnprocessedEvents(targetAgent: AgentId): AgentEvent[] {
    return this.eventHistory.filter(
      (event) => !event.processed && event.targetAgent === targetAgent
    );
  }

  /**
   * Mark event as processed
   */
  markEventProcessed(eventId: string): void {
    const event = this.eventHistory.find((e) => e.id === eventId);
    if (event) {
      const processed = markEventProcessed(event);
      const index = this.eventHistory.findIndex((e) => e.id === eventId);
      if (index !== -1) {
        this.eventHistory[index] = processed;
      }
    }
  }

  /**
   * Get all registered agents
   */
  getRegisteredAgents(): AgentId[] {
    return Array.from(this.registeredAgents);
  }

  /**
   * Check if agent is registered
   */
  isAgentRegistered(agentId: AgentId): boolean {
    return this.registeredAgents.has(agentId);
  }

  /**
   * Clear event history (use with caution)
   */
  clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Get statistics about the network
   */
  getNetworkStats(): {
    registeredAgents: number;
    eventHistorySize: number;
    subscriptions: Record<string, number>;
  } {
    const subscriptions: Record<string, number> = {};
    this.eventBus.forEach((handlers, eventType) => {
      subscriptions[eventType] = handlers.size;
    });

    return {
      registeredAgents: this.registeredAgents.size,
      eventHistorySize: this.eventHistory.length,
      subscriptions,
    };
  }
}

// Singleton instance
let agentNetworkInstance: AgentNetwork | null = null;

/**
 * Get the global agent network instance
 */
export function getAgentNetwork(): AgentNetwork {
  if (!agentNetworkInstance) {
    agentNetworkInstance = new AgentNetwork();
  }
  return agentNetworkInstance;
}


/**
 * Agent Event Utilities
 * Helper functions for creating and handling agent communication events
 */

import {
  AgentEvent,
  AgentEventType,
  GoalCompletedEvent,
  TokenTransferredEvent,
  CharityDistributionEvent,
  GoalStatus,
  TokenAmount,
  PurseType,
} from '../types/rdm';

/**
 * Create a goal completed event
 */
export function createGoalCompletedEvent(
  goalId: string,
  status: GoalStatus,
  pledgedTokens: TokenAmount,
  sourceAgent: 'medaa1' | 'system' = 'medaa1',
  verificationData?: Record<string, any>
): GoalCompletedEvent {
  return {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: AgentEventType.GOAL_COMPLETED,
    timestamp: new Date(),
    sourceAgent,
    targetAgent: 'medaa2',
    payload: {
      goalId,
      status,
      pledgedTokens,
      verificationData,
    },
    processed: false,
  };
}

/**
 * Create a token transferred event
 */
export function createTokenTransferredEvent(
  fromPurse: PurseType,
  toPurse: PurseType,
  amount: TokenAmount,
  goalId?: string,
  transactionHash?: string
): TokenTransferredEvent {
  return {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: AgentEventType.TOKEN_TRANSFERRED,
    timestamp: new Date(),
    sourceAgent: 'medaa2',
    targetAgent: 'medaa3',
    payload: {
      fromPurse,
      toPurse,
      amount,
      goalId,
      transactionHash,
    },
    processed: false,
  };
}

/**
 * Create a charity distribution event
 */
export function createCharityDistributionEvent(
  totalAmount: TokenAmount,
  distributions: Array<{ charityId: string; amount: TokenAmount; transactionHash?: string }>
): CharityDistributionEvent {
  return {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: AgentEventType.CHARITY_DISTRIBUTION,
    timestamp: new Date(),
    sourceAgent: 'medaa3',
    payload: {
      totalAmount,
      distributions,
    },
    processed: false,
  };
}

/**
 * Create a goal created event
 */
export function createGoalCreatedEvent(goalId: string, pledgedTokens: TokenAmount): AgentEvent {
  return {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: AgentEventType.GOAL_CREATED,
    timestamp: new Date(),
    sourceAgent: 'medaa1',
    payload: {
      goalId,
      pledgedTokens,
    },
    processed: false,
  };
}

/**
 * Check if event is a specific type
 */
export function isEventType<T extends AgentEvent>(
  event: AgentEvent,
  type: AgentEventType
): event is T {
  return event.type === type;
}

/**
 * Mark event as processed
 */
export function markEventProcessed(event: AgentEvent): AgentEvent {
  return {
    ...event,
    processed: true,
    processedAt: new Date(),
  };
}


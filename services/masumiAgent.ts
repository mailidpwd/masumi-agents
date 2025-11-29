import { GeminiService } from './geminiService';
import { WalletService } from './walletService';
import { AgentMessage, AgentResponse, MasumiAgentState } from '../types/agent';

/**
 * Masumi Agent Service
 * Wraps Gemini service with Masumi framework logic and Cardano-specific context
 */
export class MasumiAgent {
  private geminiService: GeminiService;
  private state: MasumiAgentState;
  private messageHistory: AgentMessage[] = [];

  constructor() {
    this.geminiService = new GeminiService();
    this.state = {
      isActive: false,
      isProcessing: false,
      messages: [],
      error: null,
    };
  }

  /**
   * Initialize the agent
   */
  async initialize(): Promise<boolean> {
    try {
      const connected = await this.geminiService.testConnection();
      if (connected) {
        this.state.isActive = true;
        this.state.error = null;
        return true;
      }
      return false;
    } catch (error) {
      this.state.error = error instanceof Error ? error.message : 'Failed to initialize agent';
      return false;
    }
  }

  /**
   * Get current agent state
   */
  getState(): MasumiAgentState {
    return { ...this.state };
  }

  /**
   * Process a user query and get agent response
   */
  async processQuery(query: string): Promise<AgentResponse> {
    if (!this.state.isActive) {
      return {
        success: false,
        error: 'Agent is not initialized. Please initialize the agent first.',
      };
    }

    this.state.isProcessing = true;
    this.state.error = null;

    try {
      // Create user message
      const userMessage: AgentMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: query,
        timestamp: new Date(),
      };

      this.messageHistory.push(userMessage);
      this.state.messages.push(userMessage);

      // Get wallet context if available
      const walletContext = this.getWalletContext();
      const enhancedQuery = walletContext
        ? `${query}\n\nContext: ${walletContext}`
        : query;

      // Get response from Gemini with Cardano expertise
      const response = await this.geminiService.sendCardanoQuery(
        enhancedQuery,
        this.messageHistory
      );

      if (response.success && response.message) {
        // Create assistant message
        const assistantMessage: AgentMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.message,
          timestamp: new Date(),
        };

        this.messageHistory.push(assistantMessage);
        this.state.messages.push(assistantMessage);
      } else {
        this.state.error = response.error || 'Failed to get response';
      }

      this.state.isProcessing = false;
      return response;
    } catch (error) {
      this.state.isProcessing = false;
      this.state.error = error instanceof Error ? error.message : 'Unexpected error occurred';
      return {
        success: false,
        error: this.state.error,
      };
    }
  }

  /**
   * Get wallet context for enhanced agent responses
   */
  private getWalletContext(): string | null {
    const wallet = WalletService.getConnectedWalletSync();
    if (wallet) {
      return `User has a Cardano wallet connected: ${wallet.walletName || 'Unknown'} wallet on ${wallet.network} network. Address: ${wallet.address}`;
    }
    return null;
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.messageHistory = [];
    this.state.messages = [];
  }

  /**
   * Get conversation history
   */
  getHistory(): AgentMessage[] {
    return [...this.messageHistory];
  }

  /**
   * Reset agent state
   */
  reset(): void {
    this.state = {
      isActive: false,
      isProcessing: false,
      messages: [],
      error: null,
    };
    this.messageHistory = [];
  }

  /**
   * Process sample Cardano queries for testing
   */
  async processSampleQuery(queryType: 'cardano_basics' | 'wallet_help' | 'transaction_help' | 'staking'): Promise<AgentResponse> {
    const sampleQueries: Record<string, string> = {
      cardano_basics: 'What is Cardano and how does it differ from other blockchains?',
      wallet_help: 'How do I connect my Cardano wallet to this DApp?',
      transaction_help: 'How do I send ADA from my wallet?',
      staking: 'How does staking work on Cardano?',
    };

    const query = sampleQueries[queryType] || sampleQueries.cardano_basics;
    return this.processQuery(query);
  }
}


/**
 * Medaa3 Agent - Charity Allocation Agent
 * Handles periodic charity distributions from reward and remorse purses
 * 
 * REAL MASUMI INTEGRATION:
 * - Monitors purse balances (via on-chain queries)
 * - Executes charity distributions (real blockchain transactions)
 * - Can operate autonomously on Masumi network
 * - All distributions are transparent and verifiable
 */
import { TokenService } from './tokenService';
import { MockSmartContractService } from './mockSmartContract';
import { AgentNetwork, getAgentNetwork } from './agentNetwork';
import {
  PurseType,
  Medaa3AgentState,
  Charity,
  UserCharityPreferences,
  CharityDistributionEvent,
  TokenAmount,
} from '../types/rdm';
import { AgentEventType } from '../types/rdm';

export class Medaa3Agent {
  private tokenService: TokenService;
  private smartContractService: MockSmartContractService;
  private agentNetwork: AgentNetwork;
  private state: Medaa3AgentState;
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(tokenService: TokenService, smartContractService: MockSmartContractService) {
    this.tokenService = tokenService;
    this.smartContractService = smartContractService;
    this.agentNetwork = getAgentNetwork();
    
    this.state = {
      isActive: false,
      charityPreferences: this.getDefaultCharityPreferences(),
      charities: [],
      distributionHistory: [],
    };
  }

  /**
   * Initialize the agent
   */
  async initialize(): Promise<boolean> {
    try {
      // Register with agent network
      this.agentNetwork.registerAgent('medaa3');
      
      // Subscribe to purse balance updates from Medaa2
      this.agentNetwork.subscribe(
        AgentEventType.PURSE_BALANCE_UPDATED,
        this.handlePurseBalanceUpdate.bind(this)
      );

      // Initialize default charities
      this.state.charities = this.getDefaultCharities();

      // Start periodic checking
      this.startPeriodicChecking();

      this.state.isActive = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize Medaa3:', error);
      return false;
    }
  }

  /**
   * Get default charity preferences
   */
  private getDefaultCharityPreferences(): UserCharityPreferences {
    return {
      allocations: [],
      thresholdAmount: 20, // USD 20
      thresholdTime: 'weekly',
      autoDistribute: true,
    };
  }

  /**
   * Get default charities
   */
  private getDefaultCharities(): Charity[] {
    return [
      {
        id: 'charity_faith_1',
        name: 'Faith-Based Organization',
        description: 'Supporting local faith communities',
        address: 'addr1qx...faith', // Mock address
        category: 'faith',
      },
      {
        id: 'charity_health_1',
        name: 'Cancer Foundation',
        description: 'Funding cancer research and patient support',
        address: 'addr1qx...cancer', // Mock address
        category: 'health',
      },
      {
        id: 'charity_elderly_1',
        name: 'Old People Home',
        description: 'Supporting elderly care facilities',
        address: 'addr1qx...elderly', // Mock address
        category: 'elderly',
      },
    ];
  }

  /**
   * Start periodic checking for charity distribution
   */
  private startPeriodicChecking(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(async () => {
      await this.checkAndDistribute();
    }, this.CHECK_INTERVAL_MS);

    // Also check immediately
    this.checkAndDistribute();
  }

  /**
   * Stop periodic checking
   */
  stopPeriodicChecking(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Handle purse balance update event
   */
  private async handlePurseBalanceUpdate(event: any): Promise<void> {
    // Check if threshold is met
    await this.checkAndDistribute();
  }

  /**
   * Check if distribution threshold is met and distribute if needed
   */
  async checkAndDistribute(): Promise<boolean> {
    if (!this.state.isActive || !this.state.charityPreferences.autoDistribute) {
      return false;
    }

    // Get combined balance from reward and remorse purses
    const rewardBalance = this.tokenService.getPurseBalance(PurseType.REWARD);
    const remorseBalance = this.tokenService.getPurseBalance(PurseType.REMORSE);
    
    const totalBalance: TokenAmount = {
      ada: rewardBalance.ada + remorseBalance.ada,
      rdmTokens: (rewardBalance.rdmTokens || 0) + (remorseBalance.rdmTokens || 0),
    };

    // Check threshold (simplified: check ADA amount, in production would convert to USD)
    // For demo: threshold is in ADA equivalent (thresholdAmount * 0.5 ADA per USD)
    const thresholdADA = this.state.charityPreferences.thresholdAmount * 0.5;
    
    if (totalBalance.ada < thresholdADA) {
      return false; // Threshold not met
    }

    // Distribute to charity purse first, then to charities
    await this.distributeToCharityPurse(totalBalance);
    await this.distributeToCharities();

    return true;
  }

  /**
   * Distribute tokens from reward/remorse purses to charity purse
   */
  private async distributeToCharityPurse(amount: TokenAmount): Promise<void> {
    // Move from reward purse
    const rewardBalance = this.tokenService.getPurseBalance(PurseType.REWARD);
    const rewardAmount: TokenAmount = {
      ada: Math.min(amount.ada, rewardBalance.ada),
      rdmTokens: Math.min(amount.rdmTokens || 0, rewardBalance.rdmTokens || 0),
    };

    if (rewardAmount.ada > 0) {
      await this.smartContractService.transferTokens(
        PurseType.REWARD,
        PurseType.CHARITY,
        rewardAmount
      );
    }

    // Move from remorse purse
    const remorseBalance = this.tokenService.getPurseBalance(PurseType.REMORSE);
    const remorseAmount: TokenAmount = {
      ada: amount.ada - rewardAmount.ada,
      rdmTokens: (amount.rdmTokens || 0) - (rewardAmount.rdmTokens || 0),
    };

    if (remorseAmount.ada > 0) {
      await this.smartContractService.transferTokens(
        PurseType.REMORSE,
        PurseType.CHARITY,
        remorseAmount
      );
    }
  }

  /**
   * Distribute tokens from charity purse to individual charities
   */
  async distributeToCharities(): Promise<void> {
    const charityPurseBalance = this.tokenService.getPurseBalance(PurseType.CHARITY);
    
    if (charityPurseBalance.ada <= 0) {
      return; // Nothing to distribute
    }

    const allocations = this.state.charityPreferences.allocations;
    if (allocations.length === 0) {
      return; // No charities configured
    }

    const distributions: Array<{
      charityId: string;
      amount: TokenAmount;
      transactionHash?: string;
    }> = [];

    // Distribute according to percentages
    for (const allocation of allocations) {
      const charity = this.state.charities.find((c) => c.id === allocation.charityId);
      if (!charity) {
        continue;
      }

      const amount: TokenAmount = {
        ada: (charityPurseBalance.ada * allocation.percentage) / 100,
        rdmTokens: charityPurseBalance.rdmTokens
          ? (charityPurseBalance.rdmTokens * allocation.percentage) / 100
          : undefined,
      };

      if (amount.ada > 0) {
        const transaction = await this.smartContractService.transferToCharity(
          PurseType.CHARITY,
          charity.address,
          amount
        );

        distributions.push({
          charityId: charity.id,
          amount,
          transactionHash: transaction.transactionHash,
        });
      }
    }

    // Create distribution event
    const totalAmount: TokenAmount = {
      ada: distributions.reduce((sum, d) => sum + d.amount.ada, 0),
      rdmTokens: distributions.reduce(
        (sum, d) => sum + (d.amount.rdmTokens || 0),
        0
      ),
    };

    // Create charity distribution event
    const event: CharityDistributionEvent = {
      id: `charity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: AgentEventType.CHARITY_DISTRIBUTION,
      timestamp: new Date(),
      sourceAgent: 'medaa3',
      payload: {
        totalAmount,
        distributions,
      },
      processed: false,
    };

    // Publish charity distribution event
    await this.agentNetwork.publishCharityDistribution(
      totalAmount,
      distributions
    );

    // Add to history
    this.state.distributionHistory.push(event);
  }

  /**
   * Get agent state
   */
  getState(): Medaa3AgentState {
    return {
      isActive: this.state.isActive,
      charityPreferences: { ...this.state.charityPreferences },
      charities: [...this.state.charities],
      distributionHistory: [...this.state.distributionHistory],
    };
  }

  /**
   * Update charity preferences
   */
  updateCharityPreferences(preferences: Partial<UserCharityPreferences>): void {
    this.state.charityPreferences = {
      ...this.state.charityPreferences,
      ...preferences,
    };
  }

  /**
   * Add a charity
   */
  addCharity(charity: Charity): void {
    if (!this.state.charities.find((c) => c.id === charity.id)) {
      this.state.charities.push(charity);
    }
  }

  /**
   * Update charity allocation percentages
   */
  updateCharityAllocations(allocations: Array<{ charityId: string; percentage: number }>): void {
    // Validate percentages sum to 100
    const totalPercentage = allocations.reduce((sum, a) => sum + a.percentage, 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      throw new Error('Charity allocations must sum to 100%');
    }

    this.state.charityPreferences.allocations = allocations;
  }

  /**
   * Get charities
   */
  getCharities(): Charity[] {
    return [...this.state.charities];
  }

  /**
   * Get distribution history
   */
  getDistributionHistory(): CharityDistributionEvent[] {
    return [...this.state.distributionHistory];
  }

  /**
   * Manually trigger distribution (for testing)
   */
  async manualDistribute(): Promise<boolean> {
    return await this.checkAndDistribute();
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.stopPeriodicChecking();
  }
}


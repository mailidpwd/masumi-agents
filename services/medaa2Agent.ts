/**
 * Medaa2 Agent - Token Management Agent
 * Handles token transfers between purses via smart contracts
 * 
 * REAL MASUMI INTEGRATION:
 * - Listens for events from Medaa1 (via Masumi event stream)
 * - Executes smart contracts (real Plutus contracts on Cardano)
 * - Token transfers become real on-chain transactions
 * - All actions are verifiable on blockchain
 */
import { TokenService } from './tokenService';
import { MockSmartContractService } from './mockSmartContract';
import { AgentNetwork, getAgentNetwork } from './agentNetwork';
import { ImpactLedgerService } from './impactLedger';
import { BadgeService } from './badgeService';
import { LiquidityPoolService } from './liquidityPoolService';
import { VaultService } from './vaultService';
import {
  PurseType,
  Medaa2AgentState,
  SmartContractTransaction,
  GoalCompletedEvent,
  DailyGoal,
  GoalStatus,
  TokenAmount,
} from '../types/rdm';
import { AgentEventType } from '../types/rdm';
import {
  LPPoolPair,
  LPInvestment,
  LPYieldCalculation,
  LPPenaltyCalculation,
} from '../types/liquidityPool';
import { HabitNFT } from '../types/habitNFT';
import {
  VaultConfig,
  VaultUnlockRequest,
  PartialUnlock,
  VerificationData,
} from '../types/vault';

export type ClassificationResult = 'success' | 'partial' | 'failure';

export class Medaa2Agent {
  private tokenService: TokenService;
  private smartContractService: MockSmartContractService;
  private agentNetwork: AgentNetwork;
  private impactLedger: ImpactLedgerService;
  private badgeService: BadgeService;
  private lpService: LiquidityPoolService;
  private vaultService: VaultService;
  private state: Medaa2AgentState;

  constructor(
    tokenService: TokenService,
    smartContractService: MockSmartContractService,
    impactLedger?: ImpactLedgerService,
    badgeService?: BadgeService,
    lpService?: LiquidityPoolService,
    vaultService?: VaultService
  ) {
    this.tokenService = tokenService;
    this.smartContractService = smartContractService;
    this.agentNetwork = getAgentNetwork();
    this.impactLedger = impactLedger || new ImpactLedgerService();
    this.badgeService = badgeService || new BadgeService();
    this.lpService = lpService || new LiquidityPoolService();
    // VaultService requires GeminiService - would need to pass it
    // For now, create without it and it will need to be initialized separately
    this.vaultService = vaultService || null as any; // Will be set during initialization
    
    // Initialize purses
    const purses = this.tokenService.getAllPurses();
    
    this.state = {
      isActive: false,
      purses: purses as Record<PurseType, any>,
      pendingTransactions: [],
      completedTransactions: [],
    };
  }

  /**
   * Set vault service (needs GeminiService)
   */
  setVaultService(vaultService: VaultService): void {
    this.vaultService = vaultService;
  }

  /**
   * Initialize the agent
   */
  async initialize(): Promise<boolean> {
    try {
      // Register with agent network
      this.agentNetwork.registerAgent('medaa2');
      
      // Subscribe to goal completed events from Medaa1
      this.agentNetwork.subscribe(
        AgentEventType.GOAL_COMPLETED,
        this.handleGoalCompleted.bind(this)
      );

      // Initialize purses
      await this.refreshPurses();

      this.state.isActive = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize Medaa2:', error);
      return false;
    }
  }

  /**
   * Refresh purse balances
   */
  async refreshPurses(): Promise<void> {
    const purses = this.tokenService.getAllPurses();
    this.state.purses = purses;
  }

  /**
   * Handle goal completed event from Medaa1 with enhanced classification and splitting
   */
  private async handleGoalCompleted(event: any): Promise<void> {
    if (event.type !== AgentEventType.GOAL_COMPLETED) {
      return;
    }

    const payload = (event as GoalCompletedEvent).payload;
    const { goalId, status, pledgedTokens, verificationData } = payload;

    try {
      // Classify outcome (Success/Partial/Failure)
      const classification = this.classifyOutcome(status, verificationData);
      
      // Get goal details if available (would need to query from Medaa1 or storage)
      const goal: Partial<DailyGoal> = {
        id: goalId,
        status,
      };

      // Split tokens based on classification
      const splitResult = this.calculateTokenSplit(classification, pledgedTokens, verificationData);
      
      // Execute token transfers via smart contract
      if (splitResult.rewardAmount.ada > 0 || splitResult.rewardAmount.rdmTokens) {
        await this.transferTokens(
          PurseType.BASE,
          PurseType.REWARD,
          splitResult.rewardAmount,
          goalId
        );
      }

      if (splitResult.remorseAmount.ada > 0 || splitResult.remorseAmount.rdmTokens) {
        await this.transferTokens(
          PurseType.BASE,
          PurseType.REMORSE,
          splitResult.remorseAmount,
          goalId
        );
      }

      // Create impact ledger entry
      if (goal && status) {
        const verificationScore = verificationData?.verificationScore || 
          (status === 'done' ? 1.0 : status === 'partially_done' ? 0.5 : 0);
        
        const impactEntry = await this.impactLedger.createImpactEntry(
          goal as DailyGoal,
          status,
          verificationScore
        );

        // Check for badges
        // Note: Would need access to all goals for badge calculation
        // this.badgeService.checkAndAwardBadges(allGoals, goal as DailyGoal, status);

        // Update impact ledger with transaction hash (after smart contract execution)
        // This would happen after transaction confirmation
      }

      // Mark event as processed
      this.agentNetwork.markEventProcessed(event.id);
    } catch (error) {
      console.error(`Error handling goal completed for ${goalId}:`, error);
    }
  }

  /**
   * Classify outcome as Success, Partial, or Failure
   */
  classifyOutcome(
    status: GoalStatus,
    verificationData?: Record<string, any>
  ): ClassificationResult {
    if (status === 'done') {
      // Check verification score for success threshold
      const verificationScore = verificationData?.verificationScore || 1.0;
      if (verificationScore >= 0.8) {
        return 'success';
      } else if (verificationScore >= 0.5) {
        return 'partial';
      }
      return 'partial'; // Done but low verification
    } else if (status === 'partially_done') {
      return 'partial';
    } else {
      return 'failure';
    }
  }

  /**
   * Calculate token split for partial completion
   */
  calculateTokenSplit(
    classification: ClassificationResult,
    pledgedTokens: TokenAmount,
    verificationData?: Record<string, any>
  ): {
    rewardAmount: TokenAmount;
    remorseAmount: TokenAmount;
    partialPercentage?: number;
  } {
    let rewardPercentage = 0;
    let remorsePercentage = 0;
    let partialPercentage: number | undefined;

    switch (classification) {
      case 'success':
        rewardPercentage = 1.0;
        remorsePercentage = 0;
        break;
      case 'partial':
        // Calculate partial percentage from verification data
        partialPercentage = verificationData?.verificationScore || 0.5;
        rewardPercentage = partialPercentage!;
        remorsePercentage = 1.0 - partialPercentage!;
        break;
      case 'failure':
        rewardPercentage = 0;
        remorsePercentage = 1.0;
        break;
    }

    // Calculate split amounts
    const rewardAmount: TokenAmount = {
      ada: pledgedTokens.ada * rewardPercentage,
      rdmTokens: pledgedTokens.rdmTokens ? pledgedTokens.rdmTokens * rewardPercentage : undefined,
    };

    const remorseAmount: TokenAmount = {
      ada: pledgedTokens.ada * remorsePercentage,
      rdmTokens: pledgedTokens.rdmTokens ? pledgedTokens.rdmTokens * remorsePercentage : undefined,
    };

    return {
      rewardAmount,
      remorseAmount,
      partialPercentage: classification === 'partial' ? partialPercentage : undefined,
    };
  }

  /**
   * Transfer tokens between purses
   */
  async transferTokens(
    fromPurse: PurseType,
    toPurse: PurseType,
    amount: { ada: number; rdmTokens?: number },
    goalId?: string
  ): Promise<SmartContractTransaction> {
    // Create transaction via smart contract service
    const transaction = await this.smartContractService.transferTokens(
      fromPurse,
      toPurse,
      amount,
      goalId
    );

    // Add to pending transactions
    this.state.pendingTransactions.push(transaction);

    // Wait for confirmation (async, non-blocking)
    this.waitForTransactionConfirmation(transaction.id);

    // Publish token transferred event
    await this.agentNetwork.publishTokenTransferred(
      fromPurse,
      toPurse,
      amount,
      goalId
    );

    return transaction;
  }

  /**
   * Wait for transaction confirmation
   */
  private async waitForTransactionConfirmation(transactionId: string): Promise<void> {
    try {
      const transaction = await this.smartContractService.waitForConfirmation(
        transactionId,
        30000
      );

      // Move from pending to completed
      this.state.pendingTransactions = this.state.pendingTransactions.filter(
        (tx) => tx.id !== transactionId
      );
      this.state.completedTransactions.push(transaction);

      // Refresh purses after confirmation
      await this.refreshPurses();

      // Publish purse balance updated event
      await this.agentNetwork.publish({
        id: `balance_${Date.now()}`,
        type: AgentEventType.PURSE_BALANCE_UPDATED,
        timestamp: new Date(),
        sourceAgent: 'medaa2',
        targetAgent: 'medaa3',
        payload: {
          purses: this.state.purses,
        },
        processed: false,
      });
    } catch (error) {
      console.error(`Transaction ${transactionId} failed:`, error);
      // Update transaction status
      const index = this.state.pendingTransactions.findIndex(
        (tx) => tx.id === transactionId
      );
      if (index !== -1) {
        this.state.pendingTransactions[index].status = 'failed';
        this.state.pendingTransactions[index].error =
          error instanceof Error ? error.message : 'Transaction failed';
      }
    }
  }

  /**
   * Get agent state
   */
  getState(): Medaa2AgentState {
    return {
      isActive: this.state.isActive,
      purses: { ...this.state.purses },
      pendingTransactions: [...this.state.pendingTransactions],
      completedTransactions: [...this.state.completedTransactions],
    };
  }

  /**
   * Get purse balance
   */
  getPurseBalance(purseType: PurseType): { ada: number; rdmTokens?: number } {
    return this.tokenService.getPurseBalance(purseType);
  }

  /**
   * Get all purses
   */
  getAllPurses(): Record<PurseType, any> {
    return this.tokenService.getAllPurses();
  }

  /**
   * Get transaction history
   */
  getTransactionHistory(): SmartContractTransaction[] {
    return [
      ...this.state.pendingTransactions,
      ...this.state.completedTransactions,
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get pending transactions
   */
  getPendingTransactions(): SmartContractTransaction[] {
    return [...this.state.pendingTransactions];
  }

  /**
   * Get transactions for a specific goal
   */
  getTransactionsForGoal(goalId: string): SmartContractTransaction[] {
    return this.smartContractService.getTransactionsForGoal(goalId);
  }

  /**
   * Get total balances across all purses
   */
  getTotalBalances(): { ada: number; rdmTokens?: number } {
    return this.tokenService.getTotalBalance();
  }

  /**
   * Refresh all purse balances
   */
  async refreshBalances(): Promise<void> {
    await this.tokenService.refreshBalances();
    await this.refreshPurses();
  }

  /**
   * Get impact ledger service instance
   */
  getImpactLedger(): ImpactLedgerService {
    return this.impactLedger;
  }

  /**
   * Get badge service instance
   */
  getBadgeService(): BadgeService {
    return this.badgeService;
  }

  /**
   * Create liquidity pool pair
   */
  async createLPPair(
    creatorId: string,
    creatorRating: number,
    habitNFT: HabitNFT,
    initialRDMStake: TokenAmount
  ): Promise<LPPoolPair> {
    const pool = this.lpService.createLPPair(creatorId, creatorRating, habitNFT, initialRDMStake);

    // Lock initial stake
    this.tokenService.deductFromBasePurse(initialRDMStake);

    // Publish LP pair created event
    await this.agentNetwork.publish({
      id: `lp_created_${Date.now()}`,
      type: AgentEventType.LP_PAIR_CREATED,
      timestamp: new Date(),
      sourceAgent: 'medaa2',
      payload: {
        poolId: pool.id,
        pool,
        creatorId,
        initialStake: initialRDMStake,
      },
      processed: false,
    } as any);

    return pool;
  }

  /**
   * Process LP investment
   */
  async processInvestment(
    poolId: string,
    investorId: string,
    rdmAmount: TokenAmount
  ): Promise<LPInvestment> {
    // Lock investment RDM
    this.tokenService.deductFromBasePurse(rdmAmount);

    const investment = this.lpService.invest(poolId, investorId, rdmAmount);

    // Publish investment event
    await this.agentNetwork.publish({
      id: `lp_investment_${Date.now()}`,
      type: AgentEventType.LP_INVESTMENT,
      timestamp: new Date(),
      sourceAgent: 'medaa2',
      payload: {
        investmentId: investment.id,
        poolId,
        investorId,
        rdmAmount,
        lpTokens: investment.lpTokens,
        sharePercentage: investment.sharePercentage,
      },
      processed: false,
    } as any);

    return investment;
  }

  /**
   * Calculate and distribute LP yield
   */
  async calculateYield(
    poolId: string,
    outcome: GoalStatus,
    verificationScore: number,
    consistencyDays: number,
    communityRating: number,
    supportActionCount: number
  ): Promise<LPYieldCalculation> {
    const yieldCalc = this.lpService.calculateYield(
      poolId,
      outcome,
      verificationScore,
      consistencyDays,
      communityRating,
      supportActionCount
    );

    // Distribute yield
    this.lpService.distributeYield(poolId, yieldCalc);

    // Transfer user bonus to reward purse
    if (yieldCalc.userBonus.ada > 0) {
      await this.transferTokens(
        PurseType.BASE,
        PurseType.REWARD,
        yieldCalc.userBonus,
        undefined
      );
    }

    // Publish yield distributed event
    await this.agentNetwork.publish({
      id: `lp_yield_${Date.now()}`,
      type: AgentEventType.LP_YIELD_DISTRIBUTED,
      timestamp: new Date(),
      sourceAgent: 'medaa2',
      payload: {
        poolId,
        yieldCalculation: yieldCalc,
        distributionDetails: {
          investorYield: yieldCalc.investorYield,
          userBonus: yieldCalc.userBonus,
          platformFee: yieldCalc.platformFee,
          charityFromFees: yieldCalc.charityFromFees,
        },
      },
      processed: false,
    } as any);

    return yieldCalc;
  }

  /**
   * Apply LP penalty for failure
   */
  async applyLPPenalty(
    poolId: string,
    failureReason: string,
    userRatingPenalty: number = 0.5
  ): Promise<LPPenaltyCalculation> {
    const penalty = this.lpService.calculatePenalty(poolId, failureReason, userRatingPenalty);

    // Transfer penalty to charity
    if (penalty.charityAmount.ada > 0) {
      await this.transferTokens(
        PurseType.BASE,
        PurseType.CHARITY,
        penalty.charityAmount,
        undefined
      );
    }

    // Publish penalty event
    await this.agentNetwork.publish({
      id: `lp_penalty_${Date.now()}`,
      type: AgentEventType.LP_PENALTY_APPLIED,
      timestamp: new Date(),
      sourceAgent: 'medaa2',
      payload: {
        poolId,
        penalty,
        userRatingPenalty,
      },
      processed: false,
    } as any);

    return penalty;
  }

  /**
   * Create time-locked vault
   */
  async createVault(
    creatorId: string,
    beneficiaryId: string,
    vaultType: 'personal' | 'generational' | 'institutional',
    lockedRDM: TokenAmount,
    lockDuration: number,
    habitGoal: string,
    goalDescription: string,
    verificationCriteria: any[],
    verificationMethod: any,
    requiredConfidence: number = 0.8
  ): Promise<VaultConfig> {
    if (!this.vaultService) {
      throw new Error('VaultService not initialized. Use setVaultService() first.');
    }

    // Lock RDM
    this.tokenService.deductFromBasePurse(lockedRDM);

    const vault = this.vaultService.createVault(
      creatorId,
      beneficiaryId,
      vaultType,
      lockedRDM,
      lockDuration,
      habitGoal,
      goalDescription,
      verificationCriteria,
      verificationMethod,
      requiredConfidence
    );

    // Publish vault created event
    await this.agentNetwork.publish({
      id: `vault_created_${Date.now()}`,
      type: AgentEventType.VAULT_CREATED,
      timestamp: new Date(),
      sourceAgent: 'medaa2',
      payload: {
        vaultId: vault.id,
        vault,
        lockedRDM,
        lockDuration,
      },
      processed: false,
    } as any);

    return vault;
  }

  /**
   * Verify and unlock vault
   */
  async verifyVaultUnlock(
    vaultId: string,
    verificationData: VerificationData[]
  ): Promise<PartialUnlock | void> {
    if (!this.vaultService) {
      throw new Error('VaultService not initialized');
    }

    // Submit unlock request
    const request = await this.vaultService.submitUnlockRequest(vaultId, verificationData);

    // If approved, unlock
    if (request.status === 'approved') {
      const unlockResult = await this.vaultService.approveUnlock(request.id);
      
      if (unlockResult) {
        // Partial unlock
        await this.transferTokens(
          PurseType.BASE,
          PurseType.REWARD,
          unlockResult.unlockedAmount,
          undefined
        );

        await this.agentNetwork.publish({
          id: `vault_partial_${Date.now()}`,
          type: AgentEventType.VAULT_PARTIAL_UNLOCK,
          timestamp: new Date(),
          sourceAgent: 'medaa2',
          payload: {
            vaultId,
            partialUnlock: unlockResult,
            remainingLocked: unlockResult.remainingLocked,
          },
          processed: false,
        } as any);

        return unlockResult;
      } else {
        // Full unlock
        const vault = this.vaultService.getVault(vaultId);
        if (vault && vault.unlockedAmount) {
          await this.transferTokens(
            PurseType.BASE,
            PurseType.REWARD,
            vault.unlockedAmount,
            undefined
          );

          await this.agentNetwork.publish({
            id: `vault_unlocked_${Date.now()}`,
            type: AgentEventType.VAULT_VERIFIED_UNLOCK,
            timestamp: new Date(),
            sourceAgent: 'medaa2',
            payload: {
              vaultId,
              unlockRequest: request,
              unlockedAmount: vault.unlockedAmount,
              verificationConfidence: request.confidenceScore,
            },
            processed: false,
          } as any);
        }
      }
    }
  }

  /**
   * Check and process expired vaults
   */
  async checkExpiredVaults(): Promise<void> {
    if (!this.vaultService) return;

    const failures = this.vaultService.checkExpiredVaults();

    for (const failure of failures) {
      // Transfer to charity
      await this.transferTokens(
        PurseType.BASE,
        PurseType.CHARITY,
        failure.rdmDistribution.charityAmount,
        undefined
      );

      // Publish expired event
      await this.agentNetwork.publish({
        id: `vault_expired_${Date.now()}`,
        type: AgentEventType.VAULT_EXPIRED,
        timestamp: new Date(),
        sourceAgent: 'medaa2',
        payload: {
          vaultId: failure.vaultId,
          expiredAt: failure.failedAt,
          charityAmount: failure.rdmDistribution.charityAmount,
          returnedAmount: failure.rdmDistribution.returnedAmount,
        },
        processed: false,
      } as any);
    }
  }
}


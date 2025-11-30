/**
 * Liquidity Pool Service
 * RDM-HabitNFT liquidity pools for investing in human potential
 */
import {
  LPPoolPair,
  LPInvestment,
  LPYieldCalculation,
  LPPenaltyCalculation,
  LPPoolStats,
  SupportAction,
  EarlyInvestorBonus,
  CommunityCheerleaderBadge,
} from '../types/liquidityPool';
import { HabitNFT } from '../types/habitNFT';
import { TokenAmount } from '../types/rdm';
import { DailyGoal, GoalStatus } from '../types/rdm';

const RATING_THRESHOLD = 7.5;
const PLATFORM_FEE_PERCENTAGE = 0.02; // 2%
const CHARITY_FEE_PERCENTAGE = 0.01; // 1% of fees to charity

export class LiquidityPoolService {
  private pools: Map<string, LPPoolPair>;
  private investments: Map<string, LPInvestment>;
  private supportActions: Map<string, SupportAction[]>;
  private earlyInvestorBonuses: Map<string, EarlyInvestorBonus[]>;

  constructor() {
    this.pools = new Map();
    this.investments = new Map();
    this.supportActions = new Map();
    this.earlyInvestorBonuses = new Map();
  }

  /**
   * Create LP pair (requires high rating user)
   */
  createLPPair(
    creatorId: string,
    creatorRating: number,
    habitNFT: HabitNFT,
    initialRDMStake: TokenAmount
  ): LPPoolPair {
    if (creatorRating < RATING_THRESHOLD) {
      throw new Error(`Creator rating ${creatorRating} below threshold ${RATING_THRESHOLD}`);
    }

    if (!habitNFT.isLPQualified) {
      throw new Error('HabitNFT must be LP qualified');
    }

    const poolId = `lp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const pool: LPPoolPair = {
      id: poolId,
      rdmToken: initialRDMStake,
      habitNFT,
      creatorId,
      creatorRating,
      totalLPRDM: initialRDMStake.ada,
      totalShares: 1000000, // Initial shares (1M = 1 LP token unit)
      currentValuation: initialRDMStake,
      status: 'active',
      createdAt: new Date(),
      startedAt: new Date(),
      successRate: 0,
      totalYieldGenerated: { ada: 0 },
      totalYieldDistributed: { ada: 0 },
      investorCount: 0,
      totalInvestments: { ada: 0 },
      averageInvestment: { ada: 0 },
    };

    this.pools.set(poolId, pool);
    return pool;
  }

  /**
   * Invest in LP pool
   */
  invest(
    poolId: string,
    investorId: string,
    rdmAmount: TokenAmount
  ): LPInvestment {
    const pool = this.pools.get(poolId);
    if (!pool) {
      throw new Error('Pool not found');
    }

    if (pool.status !== 'active') {
      throw new Error('Pool is not active for investments');
    }

    // Calculate LP tokens based on current pool value
    const sharePercentage = (rdmAmount.ada / (pool.totalLPRDM + rdmAmount.ada)) * 100;
    const lpTokens = (pool.totalShares * sharePercentage) / 100;

    // Update pool
    pool.totalLPRDM += rdmAmount.ada;
    pool.totalShares += lpTokens;
    pool.currentValuation = {
      ada: pool.totalLPRDM,
      rdmTokens: pool.currentValuation.rdmTokens,
    };
    pool.investorCount += 1;
    pool.totalInvestments = {
      ada: pool.totalInvestments.ada + rdmAmount.ada,
      rdmTokens: (pool.totalInvestments.rdmTokens || 0) + (rdmAmount.rdmTokens || 0),
    };
    pool.averageInvestment = {
      ada: pool.totalInvestments.ada / pool.investorCount,
      rdmTokens: pool.totalInvestments.rdmTokens,
    };

    // Check for early investor bonus
    const poolFillPercentage = (pool.totalInvestments.ada / (pool.totalLPRDM * 2)) * 100;
    let bonus: EarlyInvestorBonus | undefined;
    if (poolFillPercentage <= 10) {
      bonus = {
        investmentId: '',
        bonusMultiplier: 1.15,
        bonusRDM: { ada: rdmAmount.ada * 0.15 },
        tier: 'founder',
      };
    } else if (poolFillPercentage <= 25) {
      bonus = {
        investmentId: '',
        bonusMultiplier: 1.1,
        bonusRDM: { ada: rdmAmount.ada * 0.1 },
        tier: 'early',
      };
    }

    const investment: LPInvestment = {
      id: `investment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      poolId,
      investorId,
      rdmAmount,
      lpTokens,
      sharePercentage,
      status: 'active',
      investedAt: new Date(),
      yieldEarned: { ada: 0 },
      totalReturn: { ada: 0 },
      supportActions: [],
    };

    if (bonus) {
      bonus.investmentId = investment.id;
      investment.supportBonus = bonus.bonusRDM;
      const bonuses = this.earlyInvestorBonuses.get(poolId) || [];
      bonuses.push(bonus);
      this.earlyInvestorBonuses.set(poolId, bonuses);
    }

    this.investments.set(investment.id, investment);
    this.pools.set(poolId, pool);

    return investment;
  }

  /**
   * Calculate yield using combined metrics
   */
  calculateYield(
    poolId: string,
    outcome: GoalStatus,
    verificationScore: number,
    consistencyDays: number,
    communityRating: number,
    supportActionCount: number
  ): LPYieldCalculation {
    const pool = this.pools.get(poolId);
    if (!pool) {
      throw new Error('Pool not found');
    }

    // Base success rate
    const baseSuccessRate = outcome === 'done' ? 1.0 : outcome === 'partially_done' ? 0.5 : 0;

    // Time consistency multiplier (up to 1.5x)
    const consistencyMultiplier = Math.min(1.5, 1.0 + (consistencyDays / 30) * 0.5);

    // Community rating multiplier (up to 1.3x)
    const ratingMultiplier = Math.min(1.3, 1.0 + (communityRating / 10) * 0.3);

    // Support bonus multiplier (up to 1.2x)
    const supportMultiplier = Math.min(1.2, 1.0 + (supportActionCount / 10) * 0.2);

    // Combined yield rate
    const finalYieldRate =
      baseSuccessRate * 100 * consistencyMultiplier * ratingMultiplier * supportMultiplier;

    // Calculate total yield
    const totalYield: TokenAmount = {
      ada: (pool.totalLPRDM * finalYieldRate) / 100,
      rdmTokens: pool.totalLPRDM * (finalYieldRate / 100),
    };

    // Yield per share
    const yieldPerShare: TokenAmount = {
      ada: totalYield.ada / pool.totalShares,
      rdmTokens: (totalYield.rdmTokens || 0) / pool.totalShares,
    };

    // Platform fee
    const platformFee: TokenAmount = {
      ada: totalYield.ada * PLATFORM_FEE_PERCENTAGE,
      rdmTokens: (totalYield.rdmTokens || 0) * PLATFORM_FEE_PERCENTAGE,
    };

    // Charity from fees
    const charityFromFees: TokenAmount = {
      ada: platformFee.ada * CHARITY_FEE_PERCENTAGE * 100,
      rdmTokens: (platformFee.rdmTokens || 0) * CHARITY_FEE_PERCENTAGE * 100,
    };

    // User bonus (10% of total yield)
    const userBonus: TokenAmount = {
      ada: totalYield.ada * 0.1,
      rdmTokens: (totalYield.rdmTokens || 0) * 0.1,
    };

    // Investor yield (remaining after fees and bonus)
    const investorYield: TokenAmount = {
      ada: totalYield.ada - platformFee.ada - userBonus.ada,
      rdmTokens: (totalYield.rdmTokens || 0) - (platformFee.rdmTokens || 0) - (userBonus.rdmTokens || 0),
    };

    const calculation: LPYieldCalculation = {
      poolId,
      baseSuccessRate,
      timeConsistencyMultiplier: consistencyMultiplier,
      communityRatingMultiplier: ratingMultiplier,
      supportBonusMultiplier: supportMultiplier,
      finalYieldRate,
      totalYield,
      yieldPerShare,
      userBonus,
      investorYield,
      platformFee,
      charityFromFees,
    };

    // Update pool
    pool.totalYieldGenerated = totalYield;
    pool.successRate = baseSuccessRate;
    this.pools.set(poolId, pool);

    return calculation;
  }

  /**
   * Distribute yield to investors
   */
  distributeYield(poolId: string, yieldCalculation: LPYieldCalculation): void {
    const pool = this.pools.get(poolId);
    if (!pool) return;

    // Get all active investments
    const investments = Array.from(this.investments.values()).filter(
      (inv) => inv.poolId === poolId && inv.status === 'active'
    );

    // Distribute proportionally
    investments.forEach((investment) => {
      const investorYield: TokenAmount = {
        ada: yieldCalculation.yieldPerShare.ada * investment.lpTokens,
        rdmTokens: (yieldCalculation.yieldPerShare.rdmTokens || 0) * investment.lpTokens,
      };

      investment.yieldEarned = {
        ada: investment.yieldEarned.ada + investorYield.ada,
        rdmTokens: (investment.yieldEarned.rdmTokens || 0) + (investorYield.rdmTokens || 0),
      };

      investment.totalReturn = {
        ada: investment.rdmAmount.ada + investment.yieldEarned.ada,
        rdmTokens: (investment.rdmAmount.rdmTokens || 0) + (investment.yieldEarned.rdmTokens || 0),
      };

      this.investments.set(investment.id, investment);
    });

    pool.totalYieldDistributed = yieldCalculation.investorYield;
    pool.status = 'completed';
    pool.completedAt = new Date();
    this.pools.set(poolId, pool);
  }

  /**
   * Calculate penalty for failure
   */
  calculatePenalty(
    poolId: string,
    failureReason: string,
    userRatingPenalty: number = 0.5
  ): LPPenaltyCalculation {
    const pool = this.pools.get(poolId);
    if (!pool) {
      throw new Error('Pool not found');
    }

    // Investors lose their position
    const totalInvestments = pool.totalInvestments.ada;
    const investorLoss: TokenAmount = {
      ada: totalInvestments,
      rdmTokens: pool.totalInvestments.rdmTokens,
    };

    // User penalty (multiplier applied - e.g., 1.5x)
    const userPenalty: TokenAmount = {
      ada: pool.rdmToken.ada * 1.5,
      rdmTokens: (pool.rdmToken.rdmTokens || 0) * 1.5,
    };

    const totalLoss: TokenAmount = {
      ada: investorLoss.ada + userPenalty.ada,
      rdmTokens: (investorLoss.rdmTokens || 0) + (userPenalty.rdmTokens || 0),
    };

    // Go to charity
    const charityAmount: TokenAmount = {
      ada: totalLoss.ada,
      rdmTokens: totalLoss.rdmTokens,
    };

    // Redistribute to successful pools (small portion)
    const poolRedistribution: TokenAmount = {
      ada: totalLoss.ada * 0.1, // 10% to successful pools
      rdmTokens: (totalLoss.rdmTokens || 0) * 0.1,
    };

    // Mark investments as liquidated
    const investments = Array.from(this.investments.values()).filter(
      (inv) => inv.poolId === poolId && inv.status === 'active'
    );

    investments.forEach((inv) => {
      inv.status = 'liquidated';
      inv.withdrawnAt = new Date();
      this.investments.set(inv.id, inv);
    });

    pool.status = 'failed';
    this.pools.set(poolId, pool);

    return {
      poolId,
      failureReason,
      investorLoss,
      userPenalty,
      ratingPenalty: userRatingPenalty,
      totalLoss,
      charityAmount,
      poolRedistribution,
    };
  }

  /**
   * Add support action (tip, check-in, message)
   */
  addSupportAction(
    investmentId: string,
    action: Omit<SupportAction, 'id' | 'timestamp' | 'verified'>
  ): SupportAction {
    const investment = this.investments.get(investmentId);
    if (!investment) {
      throw new Error('Investment not found');
    }

    const supportAction: SupportAction = {
      id: `support_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...action,
      timestamp: new Date(),
      verified: true, // Auto-verified for now
    };

    investment.supportActions.push(supportAction);

    const actions = this.supportActions.get(investment.poolId) || [];
    actions.push(supportAction);
    this.supportActions.set(investment.poolId, actions);

    this.investments.set(investmentId, investment);

    return supportAction;
  }

  /**
   * Get investor positions
   */
  getInvestorPositions(investorId: string): LPInvestment[] {
    return Array.from(this.investments.values()).filter((inv) => inv.investorId === investorId);
  }

  /**
   * Get pool by ID
   */
  getPool(poolId: string): LPPoolPair | undefined {
    return this.pools.get(poolId);
  }

  /**
   * Get pool statistics
   */
  getPoolStats(poolId: string): LPPoolStats | null {
    const pool = this.pools.get(poolId);
    if (!pool) return null;

    const investments = Array.from(this.investments.values()).filter(
      (inv) => inv.poolId === poolId
    );
    const activeInvestments = investments.filter((inv) => inv.status === 'active');
    const supportActions = this.supportActions.get(poolId) || [];

    const daysActive = Math.floor(
      (new Date().getTime() - pool.startedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      poolId,
      currentValuation: pool.currentValuation,
      totalVolume: pool.totalInvestments,
      averageYieldRate: pool.totalYieldGenerated.ada > 0
        ? (pool.totalYieldDistributed.ada / pool.totalYieldGenerated.ada) * 100
        : 0,
      activeInvestors: activeInvestments.length,
      totalInvestments: investments.length,
      milestonesCompleted: pool.habitNFT.metadata.milestonesCompleted,
      daysActive,
      communityEngagement: supportActions.length,
    };
  }

  /**
   * Check for cheerleader badge eligibility
   */
  checkCheerleaderBadge(investorId: string, poolId: string): CommunityCheerleaderBadge | null {
    const investments = Array.from(this.investments.values()).filter(
      (inv) => inv.investorId === investorId && inv.poolId === poolId
    );

    if (investments.length === 0) return null;

    const investment = investments[0];
    const supportActions = investment.supportActions;

    const totalTips = supportActions
      .filter((a) => a.type === 'tip' && a.rdmAmount)
      .reduce((sum, a) => sum + (a.rdmAmount?.ada || 0), 0);

    const consistencyDays = this.calculateConsistencyDays(supportActions);

    let badgeType: 'supporter' | 'cheerleader' | 'champion' | null = null;
    let bonusMultiplier = 1.0;

    if (supportActions.length >= 20 && totalTips >= 100 && consistencyDays >= 14) {
      badgeType = 'champion';
      bonusMultiplier = 1.2;
    } else if (supportActions.length >= 10 && totalTips >= 50 && consistencyDays >= 7) {
      badgeType = 'cheerleader';
      bonusMultiplier = 1.1;
    } else if (supportActions.length >= 5) {
      badgeType = 'supporter';
      bonusMultiplier = 1.05;
    }

    if (!badgeType) return null;

    return {
      investorId,
      poolId,
      badgeType,
      criteria: {
        supportActions: supportActions.length,
        totalTips: { ada: totalTips },
        consistencyDays,
      },
      bonusYieldMultiplier: bonusMultiplier,
    };
  }

  /**
   * Calculate consistency days from support actions
   */
  private calculateConsistencyDays(actions: SupportAction[]): number {
    if (actions.length < 2) return actions.length;

    const dates = actions.map((a) => new Date(a.timestamp).toDateString());
    const uniqueDays = new Set(dates).size;
    return uniqueDays;
  }

  /**
   * Get all pools (for dashboard)
   */
  getAllPools(): LPPoolPair[] {
    return Array.from(this.pools.values());
  }
}


/**
 * Liquidity Pool Types
 * RDM-HabitNFT liquidity pools for investing in human potential
 */
import { TokenAmount } from './rdm';
import { HabitNFT } from './habitNFT';

export type LPPoolStatus = 'active' | 'closed' | 'completed' | 'failed';
export type InvestmentStatus = 'active' | 'withdrawn' | 'liquidated';

export interface LPPoolPair {
  id: string;
  // Pair assets
  rdmToken: TokenAmount; // RDM side of pool
  habitNFT: HabitNFT; // HabitNFT side of pool
  // Creator
  creatorId: string;
  creatorRating: number; // Must be > threshold (e.g., 7.5)
  // Pool state
  totalLPRDM: number; // Total RDM in pool
  totalShares: number; // Total LP tokens (shares)
  currentValuation: TokenAmount;
  status: LPPoolStatus;
  // Dates
  createdAt: Date;
  startedAt: Date;
  maturityDate?: Date;
  completedAt?: Date;
  // Performance
  successRate: number; // 0-1
  totalYieldGenerated: TokenAmount;
  totalYieldDistributed: TokenAmount;
  // Statistics
  investorCount: number;
  totalInvestments: TokenAmount;
  averageInvestment: TokenAmount;
}

export interface LPInvestment {
  id: string;
  poolId: string;
  investorId: string;
  // Investment details
  rdmAmount: TokenAmount;
  lpTokens: number; // Shares received
  sharePercentage: number; // Percentage of pool owned
  // Status
  status: InvestmentStatus;
  investedAt: Date;
  withdrawnAt?: Date;
  // Returns
  yieldEarned: TokenAmount;
  principalReturned?: TokenAmount;
  totalReturn: TokenAmount;
  // Support activities
  supportActions: SupportAction[];
  supportBonus?: TokenAmount;
}

export interface SupportAction {
  id: string;
  type: 'tip' | 'check_in' | 'message' | 'cheer';
  rdmAmount?: TokenAmount;
  timestamp: Date;
  message?: string;
  verified: boolean;
}

export interface LPYieldCalculation {
  poolId: string;
  // Combined metrics for yield
  baseSuccessRate: number; // 0-1 (primary metric)
  timeConsistencyMultiplier: number; // 0-1.5 (up to 1.5x)
  communityRatingMultiplier: number; // 0-1.3 (up to 1.3x)
  supportBonusMultiplier: number; // 0-1.2 (for investor support)
  // Final calculation
  finalYieldRate: number; // Combined yield percentage (0-100%)
  totalYield: TokenAmount;
  yieldPerShare: TokenAmount;
  // Distribution
  userBonus: TokenAmount; // Bonus RDM for user
  investorYield: TokenAmount; // Total yield for investors
  platformFee: TokenAmount; // Platform fee (e.g., 2%)
  charityFromFees: TokenAmount; // Charity portion of fees
}

export interface LPPenaltyCalculation {
  poolId: string;
  failureReason: string;
  // Penalties
  investorLoss: TokenAmount; // Investors lose position
  userPenalty: TokenAmount; // User loses more (multiplier)
  ratingPenalty: number; // Rating decrease amount
  // Distribution
  totalLoss: TokenAmount;
  charityAmount: TokenAmount; // Goes to charity
  poolRedistribution: TokenAmount; // Redistributed to successful pools
}

export interface LPPoolStats {
  poolId: string;
  // Performance
  currentValuation: TokenAmount;
  totalVolume: TokenAmount;
  averageYieldRate: number;
  // Participation
  activeInvestors: number;
  totalInvestments: number;
  // Success metrics
  milestonesCompleted: number;
  daysActive: number;
  communityEngagement: number; // Support actions count
}

export interface LPInvestorPosition {
  investmentId: string;
  poolId: string;
  pool: LPPoolPair;
  lpTokens: number;
  sharePercentage: number;
  currentValue: TokenAmount;
  yieldAccrued: TokenAmount;
  totalReturn: TokenAmount;
  roi: number; // Return on investment percentage
  status: InvestmentStatus;
}

export interface EarlyInvestorBonus {
  investmentId: string;
  bonusMultiplier: number; // e.g., 1.1x for first 10% of pool
  bonusRDM: TokenAmount;
  tier: 'early' | 'founder' | 'vip'; // Based on timing
}

export interface CommunityCheerleaderBadge {
  investorId: string;
  poolId: string;
  badgeType: 'supporter' | 'cheerleader' | 'champion';
  criteria: {
    supportActions: number;
    totalTips: TokenAmount;
    consistencyDays: number;
  };
  bonusYieldMultiplier: number; // Extra yield for active support
}


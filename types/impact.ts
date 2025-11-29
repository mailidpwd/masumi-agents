/**
 * Impact Types
 * Impact ledger, badges, and metrics tracking
 */

import { SDG } from './sdg';
import { TokenAmount } from './rdm';

export interface ImpactLedgerEntry {
  id: string;
  goalId: string;
  userId: string;
  timestamp: Date;
  sdgContributions: SDGContribution[];
  impactMetrics: ImpactMetric[];
  behaviorChange: BehaviorChangeMetric;
  transactionHash?: string; // On-chain transaction hash
  verified: boolean;
}

export interface SDGContribution {
  sdgId: SDG;
  contributionType: string; // Description of how goal contributes to SDG
  impactLevel: 'low' | 'medium' | 'high';
  metrics: Record<string, number>; // Quantifiable metrics
}

export interface ImpactMetric {
  type: 'carbon_reduced' | 'waste_reduced' | 'water_saved' | 'trees_planted' | 'hours_volunteered' | 'custom';
  value: number;
  unit: string;
  description?: string;
}

export interface BehaviorChangeMetric {
  goalCategory: string;
  completionRate: number;
  consistencyScore: number; // How consistently the behavior was performed
  habitStrength: number; // 0-1 score indicating habit formation
}

export enum BadgeTier {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
}

export interface ImpactBadge {
  id: string;
  name: string; // e.g., "Recycling Hero"
  tier: BadgeTier;
  description: string;
  criteria: BadgeCriteria;
  earnedAt: Date;
  goalId?: string; // If earned from specific goal
  metadata: Record<string, any>;
}

export interface BadgeCriteria {
  behaviorType: string; // e.g., 'recycling'
  completionCount: number; // Number of times behavior completed
  consistencyDays: number; // Days of consistent behavior
  impactLevel: number; // Required impact level
}

export interface BadgeProgress {
  badgeId: string;
  currentProgress: number;
  targetProgress: number;
  progressPercentage: number;
  nextTier?: BadgeTier;
}

export interface ImpactSummary {
  totalImpactEntries: number;
  sdgContributions: Record<SDG, number>; // Count of contributions per SDG
  totalMetrics: ImpactMetric[];
  behaviorChanges: BehaviorChangeMetric[];
  badges: ImpactBadge[];
  verifiedImpactValue: number; // Aggregated verified impact
}

export interface BonusToken {
  id: string;
  source: 'institution' | 'sponsor' | 'challenge' | 'achievement';
  institutionName?: string;
  amount: TokenAmount;
  awardedAt: Date;
  reason: string;
  goalId?: string; // If tied to specific goal
}

export interface OutcomeSummary {
  goalId: string;
  rewardTokens: TokenAmount;
  remorseTokens: TokenAmount;
  partialTokens?: TokenAmount; // If partial completion
  charityAllocation: TokenAmount;
  bonusTokens: BonusToken[];
  impactLedgerEntry: ImpactLedgerEntry;
  badgesEarned: ImpactBadge[];
  smartContractHash: string;
}


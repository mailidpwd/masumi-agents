/**
 * Liquidity Pool Event Types
 * Events for LP operations
 */
import { AgentEvent } from './rdm';
import { AgentEventType } from './rdm';
import { LPPoolPair, LPInvestment, LPYieldCalculation, LPPenaltyCalculation } from './liquidityPool';
import { TokenAmount } from './rdm';

export interface LPPairCreatedEvent extends AgentEvent {
  type: AgentEventType.LP_PAIR_CREATED;
  payload: {
    poolId: string;
    pool: LPPoolPair;
    creatorId: string;
    initialStake: TokenAmount;
  };
}

export interface LPInvestmentEvent extends AgentEvent {
  type: AgentEventType.LP_INVESTMENT;
  payload: {
    investmentId: string;
    poolId: string;
    investorId: string;
    rdmAmount: TokenAmount;
    lpTokens: number;
    sharePercentage: number;
  };
}

export interface LPYieldDistributedEvent extends AgentEvent {
  type: AgentEventType.LP_YIELD_DISTRIBUTED;
  payload: {
    poolId: string;
    yieldCalculation: LPYieldCalculation;
    distributionDetails: {
      investorYield: TokenAmount;
      userBonus: TokenAmount;
      platformFee: TokenAmount;
      charityFromFees: TokenAmount;
    };
  };
}

export interface LPPenaltyAppliedEvent extends AgentEvent {
  type: AgentEventType.LP_PENALTY_APPLIED;
  payload: {
    poolId: string;
    penalty: LPPenaltyCalculation;
    userRatingPenalty: number;
  };
}


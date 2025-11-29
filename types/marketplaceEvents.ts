/**
 * Marketplace Event Types
 * Events for habit swap marketplace operations
 */
import { AgentEvent } from './rdm';
import { AgentEventType } from './rdm';
import {
  MarketplaceMatch,
  ApprenticeshipContract,
  UserProfile,
} from './marketplace';
import { TokenAmount } from './rdm';

export interface HabitMatchedEvent extends AgentEvent {
  type: AgentEventType.HABIT_MATCHED;
  payload: {
    requesterId: string;
    match: MarketplaceMatch;
    recommendedMatches: number;
  };
}

export interface MentorshipCreatedEvent extends AgentEvent {
  type: AgentEventType.MENTORSHIP_CREATED;
  payload: {
    contractId: string;
    contract: ApprenticeshipContract;
    rdmLocked: TokenAmount;
  };
}

export interface ApprenticeshipCompletedEvent extends AgentEvent {
  type: AgentEventType.APPRENTICESHIP_COMPLETED;
  payload: {
    contractId: string;
    outcome: 'success' | 'failure' | 'partial';
    rdmDistribution: {
      mentorAmount?: TokenAmount;
      charityAmount?: TokenAmount;
      partialSplit?: {
        mentor: TokenAmount;
        charity: TokenAmount;
      };
    };
  };
}


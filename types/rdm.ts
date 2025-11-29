/**
 * RDM (Responsible Decision-Making) Type Definitions
 * Types for behavior tracking and reinforcement agent network
 */

export type GoalStatus = 'pending' | 'done' | 'not_done' | 'partially_done';
export type VerificationStatus = 'verified' | 'unverified' | 'pending_verification';

export interface DailyGoal {
  id: string;
  userId: string;
  title: string;
  description?: string;
  category?: string;
  createdAt: Date;
  targetDate: Date;
  status: GoalStatus;
  verificationStatus: VerificationStatus;
  pledgedTokens: TokenAmount;
  pledgeLocked: boolean; // Token pledge locked when goal created
  reflectionNote?: string;
  completedAt?: Date;
  verifiedAt?: Date;
  // Progress tracking fields (calculated from reflections)
  completion_percentage?: number; // 0-100, average of reflection self_percentage values
  days_with_reflections?: number; // Count of unique days with reflections
  streak_days?: number; // Consecutive days with reflections
  // Enhanced features
  timeWindow?: {
    startDate: Date;
    endDate: Date;
    duration: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';
    customDays?: number;
  };
  checkInSchedule?: {
    frequency: 'daily' | 'every_2_days' | 'every_3_days' | 'weekly' | 'custom';
    customInterval?: number;
    remindersEnabled: boolean;
  };
  sdgAlignment?: number[]; // SDG IDs this goal aligns with
  esgAlignment?: {
    environmental: boolean;
    social: boolean;
    governance: boolean;
  };
  verifierIds?: string[]; // Optional peer verifiers
  measurableAction?: string; // Specific measurable action (e.g., "recycle twice weekly")
}

export interface TokenAmount {
  ada: number; // Amount in ADA (lovelace will be converted)
  rdmTokens?: number; // Optional RDM custom tokens
}

export enum PurseType {
  BASE = 'base',
  REWARD = 'reward',
  REMORSE = 'remorse',
  CHARITY = 'charity',
}

export interface Purse {
  type: PurseType;
  address: string; // Cardano address for the purse
  balance: TokenAmount;
  lastUpdated: Date;
}

export interface Charity {
  id: string;
  name: string;
  description?: string;
  address: string; // Cardano address to receive donations
  category: 'faith' | 'health' | 'elderly' | 'education' | 'other';
}

export interface CharityAllocation {
  charityId: string;
  percentage: number; // Percentage of charity purse to allocate
}

export interface UserCharityPreferences {
  allocations: CharityAllocation[];
  thresholdAmount: number; // USD amount threshold
  thresholdTime?: 'weekly' | 'monthly' | 'custom'; // Time-based threshold
  autoDistribute: boolean;
}

// Agent Communication Events
export enum AgentEventType {
  GOAL_CREATED = 'goal_created',
  GOAL_COMPLETED = 'goal_completed',
  GOAL_VERIFIED = 'goal_verified',
  TOKEN_PLEDGED = 'token_pledged',
  TOKEN_TRANSFERRED = 'token_transferred',
  CHARITY_DISTRIBUTION = 'charity_distribution',
  PURSE_BALANCE_UPDATED = 'purse_balance_updated',
  REMINDER_TRIGGERED = 'reminder_triggered',
  // Marketplace events
  HABIT_MATCHED = 'habit_matched',
  MENTORSHIP_CREATED = 'mentorship_created',
  APPRENTICESHIP_COMPLETED = 'apprenticeship_completed',
  // Liquidity Pool events
  LP_PAIR_CREATED = 'lp_pair_created',
  LP_INVESTMENT = 'lp_investment',
  LP_YIELD_DISTRIBUTED = 'lp_yield_distributed',
  LP_PENALTY_APPLIED = 'lp_penalty_applied',
  // Vault events
  VAULT_CREATED = 'vault_created',
  VAULT_VERIFIED_UNLOCK = 'vault_verified_unlock',
  VAULT_PARTIAL_UNLOCK = 'vault_partial_unlock',
  VAULT_EXPIRED = 'vault_expired',
}

export interface AgentEvent {
  id: string;
  type: AgentEventType;
  timestamp: Date;
  sourceAgent: 'medaa1' | 'medaa2' | 'medaa3' | 'system';
  targetAgent?: 'medaa1' | 'medaa2' | 'medaa3';
  payload: any;
  processed: boolean;
  processedAt?: Date;
}

export interface GoalCompletedEvent extends AgentEvent {
  type: AgentEventType.GOAL_COMPLETED;
  payload: {
    goalId: string;
    status: GoalStatus;
    pledgedTokens: TokenAmount;
    verificationData?: Record<string, any>; // Structured verification data from Medaa1
  };
}

export interface TokenTransferredEvent extends AgentEvent {
  type: AgentEventType.TOKEN_TRANSFERRED;
  payload: {
    fromPurse: PurseType;
    toPurse: PurseType;
    amount: TokenAmount;
    transactionHash?: string;
    goalId?: string;
  };
}

export interface CharityDistributionEvent extends AgentEvent {
  type: AgentEventType.CHARITY_DISTRIBUTION;
  payload: {
    totalAmount: TokenAmount;
    distributions: {
      charityId: string;
      amount: TokenAmount;
      transactionHash?: string;
    }[];
  };
}

// Smart Contract Types
export interface SmartContractTransaction {
  id: string;
  type: 'transfer' | 'charity_distribution';
  fromPurse: PurseType;
  toPurse?: PurseType;
  toAddress?: string; // For charity distributions
  amount: TokenAmount;
  status: 'pending' | 'confirmed' | 'failed';
  transactionHash?: string;
  createdAt: Date;
  confirmedAt?: Date;
  error?: string;
  goalId?: string; // Associated goal if applicable
}

// Agent State Types
export interface Medaa1AgentState {
  isActive: boolean;
  goals: DailyGoal[];
  activeReminders: string[]; // Goal IDs with active reminders
  personalizationData: PersonalizationData;
}

export interface Medaa2AgentState {
  isActive: boolean;
  purses: Record<PurseType, Purse>;
  pendingTransactions: SmartContractTransaction[];
  completedTransactions: SmartContractTransaction[];
}

export interface Medaa3AgentState {
  isActive: boolean;
  charityPreferences: UserCharityPreferences;
  charities: Charity[];
  distributionHistory: CharityDistributionEvent[];
}

export interface PersonalizationData {
  goalCategories: Record<string, number>; // Category -> success rate
  completionPatterns: {
    timeOfDay: Record<string, number>; // Hour -> completion rate
    dayOfWeek: Record<string, number>; // Day -> completion rate
  };
  averageCompletionRate: number;
  preferredGoalTypes: string[];
  reminderPreferences: {
    frequency: 'low' | 'medium' | 'high';
    times: string[]; // Preferred reminder times
  };
}

// Agent Configuration
export interface AgentConfig {
  medaa1: {
    reminderEnabled: boolean;
    aiSuggestionsEnabled: boolean;
    personalizationEnabled: boolean;
  };
  medaa2: {
    autoTransfer: boolean;
    confirmBeforeTransfer: boolean;
  };
  medaa3: {
    enabled: boolean;
    checkInterval: number; // Minutes
    autoDistribute: boolean;
  };
}


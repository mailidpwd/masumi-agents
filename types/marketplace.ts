/**
 * Marketplace Types
 * AI Habit Swap Marketplace with smart contract-based habit apprenticeships
 */
import { TokenAmount } from './rdm';
import { DailyGoal } from './rdm';

export type UserRating = number; // 0-10 scale
export type MentorshipType = 'apprenticeship' | 'buddy';
export type ContractStatus = 'pending' | 'active' | 'completed' | 'failed' | 'cancelled';

export interface UserProfile {
  userId: string;
  username: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  // Ratings and metrics
  overallRating: UserRating; // 0-10 scale
  habitSuccessRate: number; // 0-1 (percentage)
  mentorshipSuccessRate: number; // 0-1 (percentage of successful mentorships)
  totalMentorships: number;
  totalGoalsCompleted: number;
  // Skills and expertise
  expertiseAreas: string[]; // Habit categories user excels at
  isKnownAthlete?: boolean; // Rating > 7.5 threshold
  isVerified?: boolean;
  // Statistics
  joinedDate: Date;
  lastActive: Date;
  reputationScore: number;
}

export interface HabitStruggle {
  habitCategory: string;
  struggleDescription: string;
  severity: 'low' | 'medium' | 'high';
  duration: number; // Days struggling
  previousAttempts: number;
  motivationLevel: number; // 0-10
}

export interface MatchCriteria {
  habitCategory: string;
  preferredMentorRating?: number; // Minimum rating
  mentorshipType: MentorshipType;
  timezonePreference?: string;
  availability?: {
    hours: string[];
    days: string[];
  };
  communicationStyle?: 'formal' | 'casual' | 'encouraging' | 'strict';
}

export interface MatchScore {
  userId: string;
  profile: UserProfile;
  compatibilityScore: number; // 0-100
  breakdown: {
    habitCompatibility: number; // Based on success in same habit
    personalityFit: number; // AI-analyzed personality match
    scheduleCompatibility: number; // Timezone/availability match
    ratingScore: number; // Mentor rating if applicable
    successHistory: number; // Past mentorship success rate
  };
  recommendationReason: string; // AI-generated explanation
}

export interface ApprenticeshipContract {
  id: string;
  type: MentorshipType;
  menteeId: string;
  mentorId?: string; // Optional for buddy type
  buddyId?: string; // For buddy type
  habitCategory: string;
  goalDescription: string;
  // Smart contract terms
  pledgedRDM: TokenAmount; // Locked RDM
  successCriteria: {
    milestones: string[];
    verificationMethod: 'self' | 'mentor' | 'ai' | 'multi';
    minimumSuccessRate: number; // 0-1
  };
  duration: {
    startDate: Date;
    endDate: Date;
    days: number;
  };
  // Status tracking
  status: ContractStatus;
  createdAt: Date;
  activatedAt?: Date;
  completedAt?: Date;
  // Progress
  milestonesCompleted: number;
  totalMilestones: number;
  progressPercentage: number;
  // Outcomes
  outcome?: 'success' | 'failure' | 'partial';
  rdmDistribution?: {
    mentorAmount?: TokenAmount;
    charityAmount?: TokenAmount;
    partialSplit?: {
      mentor: TokenAmount;
      charity: TokenAmount;
    };
  };
}

export interface MarketplaceMatch {
  id: string;
  requesterId: string;
  matches: MatchScore[];
  generatedAt: Date;
  aiAnalysis?: {
    strugglePattern: string;
    recommendedApproach: string;
    confidence: number; // 0-1
  };
}

export interface MentorshipFeedback {
  id: string;
  contractId: string;
  fromUserId: string;
  toUserId: string;
  rating: number; // 1-5
  comments?: string;
  helpfulnessScore: number; // 0-10
  communicationScore: number; // 0-10
  submittedAt: Date;
}

export interface MarketplaceStats {
  totalActiveContracts: number;
  totalCompletedContracts: number;
  averageSuccessRate: number;
  topMentors: UserProfile[];
  popularHabits: string[];
  totalRDMLocked: TokenAmount;
  totalRDMDistributed: TokenAmount;
}

/**
 * Mentor interface for Habit Swap Marketplace
 * Mentors are experts with high success rates who charge a fee for guidance
 */
export interface Mentor {
  id: string;
  name: string;
  category: string; // e.g., "Meditation & Mindfulness", "Fitness & Running"
  specialties: string[]; // List of habit codes they excel in (e.g., ['Meditation', 'SDG_GoodHealth'])
  rating: number; // 1-5 star rating
  reviews: number; // Number of reviews
  successRate: number; // Percentage of successful apprenticeships (e.g., 89)
  rate: number; // Cost per hour in RDM tokens (e.g., 50)
  avatarInitials?: string; // Initials for avatar display
  avatarUrl?: string; // Optional avatar image URL
}

/**
 * Habit Buddy interface for Habit Swap Marketplace
 * Buddies are peers for mutual accountability, matched by compatibility
 */
export interface HabitBuddy {
  id: string;
  name: string;
  habits: string; // Text description of their current habits (e.g., "Daily Journaling, Reading")
  habitCategories: string[]; // List of habit codes they are working on
  streak: number; // Current day streak (social proof of consistency)
  compatibility: number; // Calculated score (0-100%) indicating how well their habits align with the user's
  avatarInitials?: string; // Initials for avatar display
  avatarUrl?: string; // Optional avatar image URL
}

/**
 * Type for selected struggling habits
 * Can be SDG categories or specific habit types
 */
export type StrugglingHabit = string;


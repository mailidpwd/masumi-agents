/**
 * Time-Locked Commitment Vault Types
 * Long-term habit transformation vaults (1-10 years)
 */
import { TokenAmount } from './rdm';
import { SDG } from './sdg';

export type VaultType = 'personal' | 'generational' | 'institutional';
export type VaultStatus = 'locked' | 'verification_pending' | 'verified_unlocked' | 'partial_unlock' | 'expired_failed' | 'cancelled';
export type VerificationSource = 'race_results' | 'fitness_data' | 'certification' | 'education' | 'professional' | 'multi_source';

export interface VaultConfig {
  id: string;
  // Ownership
  creatorId: string;
  beneficiaryId: string; // May differ for generational vaults
  vaultType: VaultType;
  // Lock terms
  lockedRDM: TokenAmount;
  minimumLockAmount: number; // Minimum threshold
  lockDuration: number; // Years (1-10)
  lockStartDate: Date;
  lockEndDate: Date;
  // Goal
  habitGoal: string;
  goalDescription: string;
  lifeChangingGoal: boolean; // Must be transformative
  sdgAlignment?: SDG[];
  // Verification
  verificationCriteria: VerificationCriteria[];
  verificationMethod: VerificationSource;
  requiredConfidence: number; // 0-1, minimum AI verification confidence
  // Status
  status: VaultStatus;
  createdAt: Date;
  lockedAt: Date;
  // Progress tracking
  progressMilestones: VaultMilestone[];
  currentMilestone?: number;
  // Outcomes
  unlockedAt?: Date;
  unlockedAmount?: TokenAmount;
  remainingLocked?: TokenAmount;
  failureReason?: string;
}

export interface VerificationCriteria {
  id: string;
  description: string;
  type: VerificationSource;
  required: boolean;
  verified: boolean;
  verificationData?: VerificationData;
  verifiedAt?: Date;
  confidenceScore?: number; // 0-1
}

export interface VerificationData {
  source: VerificationSource;
  data: any; // Structure depends on source type
  timestamp: Date;
  verifiedBy: 'ai' | 'third_party' | 'iot' | 'manual';
  confidence: number; // 0-1
  metadata?: Record<string, any>;
}

// Specific verification data structures
export interface RaceResultVerification {
  eventName: string;
  eventDate: Date;
  resultUrl: string;
  bibNumber?: string;
  finishTime?: string;
  placement?: number;
  certificate?: string; // URL or hash
}

export interface FitnessDataVerification {
  dataSource: 'wearable' | 'app' | 'gym' | 'coach';
  metrics: {
    distance?: number; // km
    duration?: number; // minutes
    calories?: number;
    heartRate?: number;
    steps?: number;
  };
  dateRange: {
    start: Date;
    end: Date;
  };
  verificationHash?: string;
}

export interface CertificationVerification {
  certificationName: string;
  issuingOrganization: string;
  certificateNumber: string;
  issueDate: Date;
  expiryDate?: Date;
  certificateUrl?: string;
  verificationHash?: string;
}

export interface VaultMilestone {
  id: string;
  name: string;
  description: string;
  targetDate: Date;
  unlockedPercentage: number; // Percentage of vault unlocked on milestone
  verificationRequired: boolean;
  verified: boolean;
  verifiedAt?: Date;
}

export interface VaultUnlockRequest {
  id: string;
  vaultId: string;
  requestedAt: Date;
  verificationData: VerificationData[];
  confidenceScore: number; // AI-calculated
  status: 'pending' | 'approved' | 'rejected';
  reviewedAt?: Date;
  reviewNotes?: string;
}

export interface GenerationalVault extends VaultConfig {
  vaultType: 'generational';
  parentId: string;
  childId: string;
  familyLegacy: {
    generation: number;
    previousVaults: string[]; // Previous generation vault IDs
    familyGoal?: string;
  };
  unlockableByChild: boolean; // Child can unlock when ready
  transferable: boolean; // Can transfer to next generation
}

export interface InstitutionalVault extends VaultConfig {
  vaultType: 'institutional';
  institutionId: string;
  institutionName: string;
  communityGoal: string;
  beneficiaries: string[]; // Multiple beneficiaries
  unlockConditions: {
    minBeneficiariesMet?: number;
    communityThreshold?: number; // Percentage of community that must succeed
  };
}

export interface VaultStats {
  totalVaults: number;
  totalLocked: TokenAmount;
  averageLockDuration: number;
  successfulUnlocks: number;
  failedVaults: number;
  pendingVerifications: number;
  generationalVaults: number;
  averageUnlockTime: number; // Days from lock to unlock
}

export interface PartialUnlock {
  vaultId: string;
  milestoneId: string;
  unlockPercentage: number;
  unlockedAmount: TokenAmount;
  remainingLocked: TokenAmount;
  unlockedAt: Date;
  verificationData: VerificationData;
}

export interface VaultFailure {
  vaultId: string;
  failureType: 'expired' | 'insufficient_verification' | 'goal_not_met' | 'cancelled';
  failureReason: string;
  failedAt: Date;
  rdmDistribution: {
    charityAmount: TokenAmount;
    returnedAmount: TokenAmount; // If partial unlock occurred
  };
}


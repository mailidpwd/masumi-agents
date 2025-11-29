/**
 * Vault Service
 * Time-locked commitment vaults for life-changing habit transformation
 */
import {
  VaultConfig,
  VaultType,
  VaultStatus,
  VerificationCriteria,
  VerificationData,
  VaultUnlockRequest,
  PartialUnlock,
  GenerationalVault,
  InstitutionalVault,
  VaultStats,
  VaultFailure,
} from '../types/vault';
import { TokenAmount } from '../types/rdm';
import { GeminiService } from './geminiService';

const MINIMUM_LOCK_AMOUNT = 100; // Minimum RDM to lock

export class VaultService {
  private vaults: Map<string, VaultConfig>;
  private unlockRequests: Map<string, VaultUnlockRequest>;
  private geminiService: GeminiService;

  constructor(geminiService: GeminiService) {
    this.vaults = new Map();
    this.unlockRequests = new Map();
    this.geminiService = geminiService;
  }

  /**
   * Create time-locked vault
   */
  createVault(
    creatorId: string,
    beneficiaryId: string,
    vaultType: VaultType,
    lockedRDM: TokenAmount,
    lockDuration: number, // Years
    habitGoal: string,
    goalDescription: string,
    verificationCriteria: VerificationCriteria[],
    verificationMethod: VerificationData['source'],
    requiredConfidence: number = 0.8
  ): VaultConfig {
    if (lockedRDM.ada < MINIMUM_LOCK_AMOUNT) {
      throw new Error(`Minimum lock amount is ${MINIMUM_LOCK_AMOUNT} RDM`);
    }

    if (lockDuration < 1 || lockDuration > 10) {
      throw new Error('Lock duration must be between 1 and 10 years');
    }

    const vaultId = `vault_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const lockStartDate = new Date();
    const lockEndDate = new Date();
    lockEndDate.setFullYear(lockEndDate.getFullYear() + lockDuration);

    // Generate milestones for partial unlocks
    const progressMilestones = this.generateMilestones(lockDuration, lockedRDM);

    let vault: VaultConfig;

    if (vaultType === 'generational') {
      vault = {
        id: vaultId,
        creatorId,
        beneficiaryId,
        vaultType: 'generational',
        parentId: creatorId,
        childId: beneficiaryId,
        familyLegacy: {
          generation: 1, // Would track from parent vaults
          previousVaults: [],
        },
        lockedRDM,
        minimumLockAmount: MINIMUM_LOCK_AMOUNT,
        lockDuration,
        lockStartDate,
        lockEndDate,
        habitGoal,
        goalDescription,
        lifeChangingGoal: true,
        verificationCriteria,
        verificationMethod,
        requiredConfidence,
        status: 'locked',
        createdAt: new Date(),
        lockedAt: lockStartDate,
        progressMilestones,
        unlockableByChild: true,
        transferable: true,
      } as GenerationalVault;
    } else {
      vault = {
        id: vaultId,
        creatorId,
        beneficiaryId,
        vaultType,
        lockedRDM,
        minimumLockAmount: MINIMUM_LOCK_AMOUNT,
        lockDuration,
        lockStartDate,
        lockEndDate,
        habitGoal,
        goalDescription,
        lifeChangingGoal: true,
        verificationCriteria,
        verificationMethod,
        requiredConfidence,
        status: 'locked',
        createdAt: new Date(),
        lockedAt: lockStartDate,
        progressMilestones,
      };
    }

    this.vaults.set(vaultId, vault);
    return vault;
  }

  /**
   * Generate milestones for partial unlocks
   */
  private generateMilestones(lockDuration: number, lockedRDM: TokenAmount): VaultConfig['progressMilestones'] {
    const milestones: VaultConfig['progressMilestones'] = [];

    // Create milestones at 25%, 50%, 75% of duration
    const milestonePercentages = [0.25, 0.5, 0.75];
    
    milestonePercentages.forEach((percentage, index) => {
      const milestoneDate = new Date();
      milestoneDate.setFullYear(milestoneDate.getFullYear() + lockDuration * percentage);

      milestones.push({
        id: `milestone_${index + 1}`,
        name: `${(percentage * 100).toFixed(0)}% Milestone`,
        description: `Progress milestone at ${(percentage * 100).toFixed(0)}% of vault duration`,
        targetDate: milestoneDate,
        unlockedPercentage: percentage * 0.5, // 50% of milestone percentage can be unlocked
        verificationRequired: true,
        verified: false,
      });
    });

    return milestones;
  }

  /**
   * Submit verification for vault unlock
   */
  async submitUnlockRequest(
    vaultId: string,
    verificationData: VerificationData[]
  ): Promise<VaultUnlockRequest> {
    const vault = this.vaults.get(vaultId);
    if (!vault) {
      throw new Error('Vault not found');
    }

    if (vault.status !== 'locked' && vault.status !== 'verification_pending') {
      throw new Error(`Vault is ${vault.status}, cannot submit unlock request`);
    }

    // AI verification using Gemini
    const confidenceScore = await this.verifyWithAI(vault, verificationData);

    const request: VaultUnlockRequest = {
      id: `unlock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      vaultId,
      requestedAt: new Date(),
      verificationData,
      confidenceScore,
      status: confidenceScore >= vault.requiredConfidence ? 'approved' : 'pending',
      reviewedAt: confidenceScore >= vault.requiredConfidence ? new Date() : undefined,
    };

    this.unlockRequests.set(request.id, request);

    // Update vault status
    vault.status = 'verification_pending';
    this.vaults.set(vaultId, vault);

    // Auto-approve if confidence is high enough
    if (confidenceScore >= vault.requiredConfidence) {
      await this.approveUnlock(request.id);
    }

    return request;
  }

  /**
   * AI verification using Gemini
   */
  private async verifyWithAI(
    vault: VaultConfig,
    verificationData: VerificationData[]
  ): Promise<number> {
    const prompt = `Verify if this habit goal has been achieved based on the provided evidence:

Goal: ${vault.habitGoal}
Description: ${vault.goalDescription}
Verification Method: ${vault.verificationMethod}
Required Confidence: ${vault.requiredConfidence}

Verification Data:
${verificationData.map((v, i) => `
  Source ${i + 1}: ${v.source}
  Data: ${JSON.stringify(v.data)}
  Timestamp: ${v.timestamp}
`).join('\n')}

Analyze the evidence and determine:
1. If the goal has been achieved
2. Confidence score (0-1)
3. Quality of verification

Return JSON: {"verified": true/false, "confidence": 0.0-1.0, "reason": "..."}`;

    try {
      const response = await this.geminiService.sendCardanoQuery(prompt);
      if (response.success && response.message) {
        const jsonMatch = response.message.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          return result.confidence || 0.7;
        }
      }
    } catch (error) {
      console.error('Error in AI verification:', error);
    }

    // Default confidence based on verification sources
    return verificationData.length > 0 ? 0.75 : 0.5;
  }

  /**
   * Approve unlock request
   */
  async approveUnlock(requestId: string): Promise<PartialUnlock | void> {
    const request = this.unlockRequests.get(requestId);
    if (!request) {
      throw new Error('Unlock request not found');
    }

    const vault = this.vaults.get(request.vaultId);
    if (!vault) {
      throw new Error('Vault not found');
    }

    if (request.confidenceScore < vault.requiredConfidence) {
      throw new Error('Confidence score below required threshold');
    }

    // Check if partial unlock or full unlock
    const now = new Date();
    const timeElapsed = (now.getTime() - vault.lockedAt.getTime()) / (1000 * 60 * 60 * 24 * 365);
    const progressPercentage = timeElapsed / vault.lockDuration;

    if (progressPercentage < 1.0) {
      // Partial unlock based on milestone
      const milestone = vault.progressMilestones.find(
        (m) => !m.verified && progressPercentage >= (vault.progressMilestones.indexOf(m) + 1) / vault.progressMilestones.length
      );

      if (milestone) {
        const unlockedAmount: TokenAmount = {
          ada: vault.lockedRDM.ada * milestone.unlockedPercentage,
          rdmTokens: (vault.lockedRDM.rdmTokens || 0) * milestone.unlockedPercentage,
        };

        const remainingLocked: TokenAmount = {
          ada: vault.lockedRDM.ada - unlockedAmount.ada,
          rdmTokens: (vault.lockedRDM.rdmTokens || 0) - (unlockedAmount.rdmTokens || 0),
        };

        milestone.verified = true;
        milestone.verifiedAt = new Date();

        const partialUnlock: PartialUnlock = {
          vaultId: vault.id,
          milestoneId: milestone.id,
          unlockPercentage: milestone.unlockedPercentage,
          unlockedAmount,
          remainingLocked,
          unlockedAt: new Date(),
          verificationData: request.verificationData[0],
        };

        vault.lockedRDM = remainingLocked;
        vault.status = 'partial_unlock';
        vault.unlockedAmount = unlockedAmount;
        vault.remainingLocked = remainingLocked;
        this.vaults.set(vault.id, vault);

        request.status = 'approved';
        this.unlockRequests.set(requestId, request);

        return partialUnlock;
      }
    }

    // Full unlock
    vault.status = 'verified_unlocked';
    vault.unlockedAt = new Date();
    vault.unlockedAmount = vault.lockedRDM;
    this.vaults.set(vault.id, vault);

    request.status = 'approved';
    request.reviewedAt = new Date();
    this.unlockRequests.set(requestId, request);
  }

  /**
   * Check for expired vaults
   */
  checkExpiredVaults(): VaultFailure[] {
    const now = new Date();
    const failures: VaultFailure[] = [];

    for (const vault of this.vaults.values()) {
      if (vault.status === 'locked' || vault.status === 'verification_pending') {
        if (now > vault.lockEndDate) {
          // Vault expired without successful unlock
          const failure: VaultFailure = {
            vaultId: vault.id,
            failureType: 'expired',
            failureReason: 'Vault expired without successful verification',
            failedAt: now,
            rdmDistribution: {
              charityAmount: vault.remainingLocked || vault.lockedRDM,
              returnedAmount: vault.unlockedAmount || { ada: 0 },
            },
          };

          vault.status = 'expired_failed';
          this.vaults.set(vault.id, vault);
          failures.push(failure);
        }
      }
    }

    return failures;
  }

  /**
   * Get vault by ID
   */
  getVault(vaultId: string): VaultConfig | undefined {
    return this.vaults.get(vaultId);
  }

  /**
   * Get vaults by user
   */
  getUserVaults(userId: string): VaultConfig[] {
    return Array.from(this.vaults.values()).filter(
      (v) => v.creatorId === userId || v.beneficiaryId === userId
    );
  }

  /**
   * Get vault statistics
   */
  getVaultStats(): VaultStats {
    const allVaults = Array.from(this.vaults.values());
    const totalVaults = allVaults.length;
    
    let totalLocked: TokenAmount = { ada: 0, rdmTokens: 0 };
    allVaults.forEach((v) => {
      totalLocked.ada += v.lockedRDM.ada;
      totalLocked.rdmTokens = (totalLocked.rdmTokens || 0) + (v.lockedRDM.rdmTokens || 0);
    });
    if (totalLocked.rdmTokens === 0) {
      delete totalLocked.rdmTokens;
    }

    const averageLockDuration =
      allVaults.reduce((sum, v) => sum + v.lockDuration, 0) / totalVaults || 0;

    const successfulUnlocks = allVaults.filter((v) => v.status === 'verified_unlocked').length;
    const failedVaults = allVaults.filter((v) => v.status === 'expired_failed').length;
    const pendingVerifications = allVaults.filter((v) => v.status === 'verification_pending').length;
    const generationalVaults = allVaults.filter((v) => v.vaultType === 'generational').length;

    const unlockedVaults = allVaults.filter((v) => v.unlockedAt);
    const averageUnlockTime =
      unlockedVaults.length > 0
        ? unlockedVaults.reduce(
            (sum, v) =>
              sum + ((v.unlockedAt!.getTime() - v.lockedAt.getTime()) / (1000 * 60 * 60 * 24)),
            0
          ) / unlockedVaults.length
        : 0;

    return {
      totalVaults,
      totalLocked,
      averageLockDuration,
      successfulUnlocks,
      failedVaults,
      pendingVerifications,
      generationalVaults,
      averageUnlockTime,
    };
  }
}


/**
 * Verification Service
 * Manages verification hooks for third-party apps, IoT, and external confirmations
 */
import {
  VerificationHook,
  ThirdPartyVerification,
  IoTVerification,
  PeerVerifier,
  VerifierInput,
  VerificationResult,
  VerificationStatus,
  VerificationSource,
  ReflectionEvidence,
} from '../types/verification';

export class VerificationService {
  private hooks: Map<string, VerificationHook>;
  private verifiers: Map<string, PeerVerifier>;

  constructor() {
    this.hooks = new Map();
    this.verifiers = new Map();
  }

  /**
   * Register a verification hook
   */
  registerHook(hook: VerificationHook): void {
    this.hooks.set(hook.id, hook);
  }

  /**
   * Get all registered hooks
   */
  getHooks(): VerificationHook[] {
    return Array.from(this.hooks.values()).filter((h) => h.enabled);
  }

  /**
   * Execute third-party app verification
   */
  async verifyWithThirdParty(
    hookId: string,
    goalId: string,
    verificationData: Record<string, any>
  ): Promise<ThirdPartyVerification> {
    const hook = this.hooks.get(hookId);
    if (!hook || hook.type !== 'third_party_app') {
      throw new Error('Invalid third-party verification hook');
    }

    // In production, this would call the actual third-party API
    // For now, simulate the verification
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      const verification: ThirdPartyVerification = {
        hookId,
        verified: true, // Mock verification result
        verificationData,
        timestamp: new Date(),
        confidence: 0.85, // Confidence score from third-party
      };

      // Update hook last verified time
      if (hook) {
        hook.lastVerifiedAt = new Date();
        this.hooks.set(hookId, hook);
      }

      return verification;
    } catch (error) {
      throw new Error(`Third-party verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute IoT device verification
   */
  async verifyWithIoT(
    deviceId: string,
    deviceType: string,
    data: Record<string, any>
  ): Promise<IoTVerification> {
    // In production, this would connect to actual IoT devices
    // For now, simulate IoT verification
    try {
      // Simulate IoT device connection
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      const verification: IoTVerification = {
        deviceId,
        deviceType,
        data,
        timestamp: new Date(),
        verified: true, // Mock verification result
      };

      return verification;
    } catch (error) {
      throw new Error(`IoT verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add a peer verifier
   */
  addVerifier(verifier: PeerVerifier): void {
    this.verifiers.set(verifier.id, verifier);
  }

  /**
   * Get verifiers for a goal
   */
  getVerifiers(goalId: string): PeerVerifier[] {
    return Array.from(this.verifiers.values());
  }

  /**
   * Submit verifier input
   */
  submitVerifierInput(input: VerifierInput): void {
    // Store verifier input
    // In production, this would be stored in database/blockchain
    console.log('Verifier input submitted:', input);
  }

  /**
   * Process comprehensive verification result
   */
  processVerificationResult(
    goalId: string,
    reflectionEvidence: ReflectionEvidence
  ): VerificationResult {
    const sources: VerificationSource[] = ['self']; // Always includes self
    let verificationScore = 0;
    const flags: string[] = [];

    // Self-score contributes to verification
    if (reflectionEvidence.selfScore === 'done') {
      verificationScore += 0.4;
    } else if (reflectionEvidence.selfScore === 'partially_done') {
      verificationScore += 0.2;
    }

    // Media evidence contributes
    if (reflectionEvidence.media.length > 0) {
      sources.push('media');
      verificationScore += 0.2;
      flags.push('MEDIA_EVIDENCE_PROVIDED');
    }

    // Third-party verifications contribute
    if (reflectionEvidence.thirdPartyVerifications.length > 0) {
      sources.push('third_party');
      const avgConfidence = reflectionEvidence.thirdPartyVerifications.reduce(
        (sum, v) => sum + v.confidence,
        0
      ) / reflectionEvidence.thirdPartyVerifications.length;
      verificationScore += avgConfidence * 0.2;
      flags.push('THIRD_PARTY_VERIFIED');
    }

    // IoT verifications contribute
    if (reflectionEvidence.iotVerifications.length > 0) {
      sources.push('iot');
      verificationScore += 0.15;
      flags.push('IOT_VERIFIED');
    }

    // Peer verifier inputs contribute
    if (reflectionEvidence.verifierInputs.length > 0) {
      sources.push('verifier');
      const avgRating = reflectionEvidence.verifierInputs.reduce(
        (sum, v) => sum + v.rating,
        0
      ) / reflectionEvidence.verifierInputs.length;
      verificationScore += (avgRating / 5) * 0.15;
      flags.push('PEER_VERIFIED');
    }

    // Determine overall status
    let overallStatus: VerificationStatus;
    if (verificationScore >= 0.7) {
      overallStatus = 'verified';
    } else if (verificationScore >= 0.4) {
      overallStatus = 'self_verified';
    } else {
      overallStatus = 'unverified';
    }

    // Add structured data flags
    if (reflectionEvidence.activityLog.trim().length > 0) {
      flags.push('ACTIVITY_LOG_PROVIDED');
    }
    if (reflectionEvidence.notes && reflectionEvidence.notes.trim().length > 0) {
      flags.push('REFLECTION_NOTES_PROVIDED');
    }

    return {
      goalId,
      reflectionEvidence,
      overallStatus,
      verificationScore: Math.min(1, verificationScore), // Cap at 1.0
      sources,
      verifiedAt: new Date(),
      flags,
    };
  }

  /**
   * Format verification result for Agent 2 (structured data)
   */
  formatForAgent2(verificationResult: VerificationResult): Record<string, any> {
    return {
      goalId: verificationResult.goalId,
      verificationStatus: verificationResult.overallStatus,
      verificationScore: verificationResult.verificationScore,
      sources: verificationResult.sources,
      flags: verificationResult.flags,
      selfScore: verificationResult.reflectionEvidence.selfScore,
      mediaCount: verificationResult.reflectionEvidence.media.length,
      thirdPartyCount: verificationResult.reflectionEvidence.thirdPartyVerifications.length,
      iotCount: verificationResult.reflectionEvidence.iotVerifications.length,
      verifierCount: verificationResult.reflectionEvidence.verifierInputs.length,
      metadata: {
        mediaLinks: verificationResult.reflectionEvidence.media.map((m) => m.uri),
        timestamps: [
          verificationResult.reflectionEvidence.submittedAt,
          verificationResult.verifiedAt,
        ],
        sources: verificationResult.sources,
        confidence: verificationResult.verificationScore,
        evidenceCount: verificationResult.reflectionEvidence.media.length +
          verificationResult.reflectionEvidence.thirdPartyVerifications.length +
          verificationResult.reflectionEvidence.iotVerifications.length,
      },
    };
  }
}


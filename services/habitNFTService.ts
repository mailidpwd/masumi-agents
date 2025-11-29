/**
 * HabitNFT Service
 * Manages HabitNFT lifecycle from commitment to achievement
 */
import {
  HabitNFT,
  HabitNFTMetadata,
  NFTLifecyclePhase,
  NFTStatus,
  NFTTier,
  NFTMilestone,
  NFTProgressUpdate,
  NFTEvolution,
  NFTAttribute,
} from '../types/habitNFT';
import { DailyGoal } from '../types/rdm';
import { SDG } from '../types/sdg';

export class HabitNFTService {
  private nfts: Map<string, HabitNFT>;
  private evolutions: Map<string, NFTEvolution[]>;

  constructor() {
    this.nfts = new Map();
    this.evolutions = new Map();
  }

  /**
   * Mint HabitNFT from goal commitment
   */
  async mintHabitNFT(
    goal: DailyGoal,
    userId: string,
    username: string,
    owner: string // Cardano address
  ): Promise<HabitNFT> {
    const nftId = `habitNFT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Generate milestones from goal
    const milestones = this.generateMilestonesFromGoal(goal);

    const metadata: HabitNFTMetadata = {
      habitType: goal.category || 'general',
      goalDescription: goal.description || goal.title,
      userId,
      username,
      phase: 'commitment',
      status: 'active',
      mintedAt: new Date(),
      startedAt: goal.createdAt,
      milestones,
      currentMilestone: 0,
      totalMilestones: milestones.length,
      milestonesCompleted: 0,
      progressPercentage: 0,
      sdgAlignment: goal.sdgAlignment,
      ratings: 0,
      viewCount: 0,
      attributes: this.generateAttributes(goal),
    };

    const nft: HabitNFT = {
      id: nftId,
      policyId: `policy_${nftId}`, // Mock policy ID
      assetName: `habit_${goal.id}`,
      metadata,
      owner,
      mintedAt: new Date(),
      isLPQualified: false, // Will be qualified if rating meets threshold
    };

    this.nfts.set(nftId, nft);
    return nft;
  }

  /**
   * Generate milestones from goal
   */
  private generateMilestonesFromGoal(goal: DailyGoal): NFTMilestone[] {
    const milestones: NFTMilestone[] = [];

    if (goal.checkInSchedule) {
      // Generate milestones based on check-ins
      const startDate = goal.timeWindow?.startDate || goal.createdAt;
      const endDate = goal.timeWindow?.endDate || goal.targetDate;

      let currentDate = new Date(startDate);
      let milestoneIndex = 0;

      while (currentDate <= endDate) {
        const interval = this.getIntervalDays(goal.checkInSchedule.frequency, goal.checkInSchedule.customInterval);
        
        milestones.push({
          id: `milestone_${goal.id}_${milestoneIndex}`,
          name: `Check-in ${milestoneIndex + 1}`,
          description: `${goal.title} progress check-in`,
          targetDate: new Date(currentDate),
          completed: false,
          verificationMethod: 'self',
        });

        currentDate.setDate(currentDate.getDate() + interval);
        milestoneIndex++;
      }
    } else {
      // Default milestone
      milestones.push({
        id: `milestone_${goal.id}_0`,
        name: 'Complete Goal',
        description: goal.title,
        targetDate: goal.targetDate,
        completed: false,
        verificationMethod: 'self',
      });
    }

    return milestones;
  }

  /**
   * Get interval days from frequency
   */
  private getIntervalDays(frequency: string, customInterval?: number): number {
    switch (frequency) {
      case 'daily':
        return 1;
      case 'every_2_days':
        return 2;
      case 'every_3_days':
        return 3;
      case 'weekly':
        return 7;
      case 'custom':
        return customInterval || 1;
      default:
        return 1;
    }
  }

  /**
   * Generate NFT attributes
   */
  private generateAttributes(goal: DailyGoal): NFTAttribute[] {
    const attributes: NFTAttribute[] = [
      { trait_type: 'Habit Category', value: goal.category || 'general' },
      { trait_type: 'Commitment Level', value: goal.pledgedTokens.ada >= 100 ? 'high' : 'medium' },
    ];

    if (goal.sdgAlignment && goal.sdgAlignment.length > 0) {
      attributes.push({ trait_type: 'SDG Aligned', value: goal.sdgAlignment.length, display_type: 'number' });
    }

    if (goal.timeWindow) {
      attributes.push({
        trait_type: 'Duration',
        value: goal.timeWindow.duration,
      });
    }

    return attributes;
  }

  /**
   * Update NFT progress
   */
  updateProgress(update: NFTProgressUpdate): HabitNFT | null {
    const nft = this.nfts.get(update.nftId);
    if (!nft) return null;

    // Find and update milestone
    const milestone = nft.metadata.milestones.find((m) => m.id === update.milestoneId);
    if (!milestone) return null;

    milestone.completed = update.completed;
    if (update.completed) {
      milestone.completedAt = update.timestamp;
    }

    // Update progress percentage
    const completedMilestones = nft.metadata.milestones.filter((m) => m.completed).length;
    nft.metadata.milestonesCompleted = completedMilestones;
    nft.metadata.progressPercentage = (completedMilestones / nft.metadata.totalMilestones) * 100;
    nft.metadata.currentMilestone = completedMilestones;

    // Check if should evolve to progress phase
    if (nft.metadata.phase === 'commitment' && completedMilestones > 0) {
      this.evolveNFT(nft.id, 'commitment', 'progress', 'Milestone progress started');
    }

    // Check if all milestones completed (achievement phase)
    if (completedMilestones === nft.metadata.totalMilestones && nft.metadata.phase !== 'achievement') {
      this.evolveNFT(nft.id, nft.metadata.phase, 'achievement', 'All milestones completed');
    }

    this.nfts.set(update.nftId, nft);
    return nft;
  }

  /**
   * Evolve NFT to next phase
   */
  private evolveNFT(
    nftId: string,
    fromPhase: NFTLifecyclePhase,
    toPhase: NFTLifecyclePhase,
    reason: string
  ): void {
    const nft = this.nfts.get(nftId);
    if (!nft) return;

    const evolution: NFTEvolution = {
      nftId,
      fromPhase,
      toPhase,
      triggeredAt: new Date(),
      triggerReason: reason,
      newMetadata: {
        phase: toPhase,
      },
    };

    // Apply evolution
    nft.metadata.phase = toPhase;

    if (toPhase === 'achievement') {
      nft.metadata.status = 'completed';
      nft.metadata.completedAt = new Date();
      nft.metadata.achievementLevel = this.calculateAchievementTier(nft);
      nft.metadata.completionScore = nft.metadata.progressPercentage;
    }

    // Store evolution
    const evolutions = this.evolutions.get(nftId) || [];
    evolutions.push(evolution);
    this.evolutions.set(nftId, evolutions);

    this.nfts.set(nftId, nft);
  }

  /**
   * Calculate achievement tier
   */
  private calculateAchievementTier(nft: HabitNFT): NFTTier {
    const score = nft.metadata.completionScore || nft.metadata.progressPercentage;
    const verificationScore = nft.metadata.verificationScore || 0.8;

    const combinedScore = (score / 100) * verificationScore * 100;

    if (combinedScore >= 90) return 'platinum';
    if (combinedScore >= 75) return 'gold';
    if (combinedScore >= 60) return 'silver';
    return 'bronze';
  }

  /**
   * Get NFT by ID
   */
  getNFT(nftId: string): HabitNFT | undefined {
    return this.nfts.get(nftId);
  }

  /**
   * Get NFTs by owner
   */
  getNFTsByOwner(owner: string): HabitNFT[] {
    return Array.from(this.nfts.values()).filter((nft) => nft.owner === owner);
  }

  /**
   * Get NFT evolution history
   */
  getEvolutionHistory(nftId: string): NFTEvolution[] {
    return this.evolutions.get(nftId) || [];
  }

  /**
   * Update NFT verification score
   */
  updateVerificationScore(nftId: string, score: number): void {
    const nft = this.nfts.get(nftId);
    if (!nft) return;

    nft.metadata.verificationScore = score;
    this.nfts.set(nftId, nft);
  }

  /**
   * Check if NFT qualifies for LP (rating threshold)
   */
  checkLPQualification(nftId: string, userRating: number): boolean {
    const nft = this.nfts.get(nftId);
    if (!nft) return false;

    const qualified = userRating >= 7.5; // Known athlete/skilled person threshold
    nft.isLPQualified = qualified;
    this.nfts.set(nftId, nft);

    return qualified;
  }

  /**
   * Update NFT image/visual representation
   */
  updateNFTImage(nftId: string, imageUri: string, animationUri?: string): void {
    const nft = this.nfts.get(nftId);
    if (!nft) return;

    nft.metadata.imageUri = imageUri;
    if (animationUri) {
      nft.metadata.animationUri = animationUri;
    }
    this.nfts.set(nftId, nft);
  }
}


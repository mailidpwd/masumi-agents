/**
 * Badge Service
 * Generates and tracks impact badges based on behavior patterns
 */
import {
  ImpactBadge,
  BadgeTier,
  BadgeCriteria,
  BadgeProgress,
} from '../types/impact';
import { DailyGoal, GoalStatus } from '../types/rdm';

export class BadgeService {
  private badges: Map<string, ImpactBadge>;
  private badgeDefinitions: Map<string, BadgeCriteria>;

  constructor() {
    this.badges = new Map();
    this.badgeDefinitions = new Map();
    this.initializeBadgeDefinitions();
  }

  /**
   * Initialize badge definitions
   */
  private initializeBadgeDefinitions(): void {
    this.badgeDefinitions = new Map([
      ['recycling_hero', {
        behaviorType: 'recycling',
        completionCount: 10,
        consistencyDays: 14,
        impactLevel: 5,
      }],
      ['water_warrior', {
        behaviorType: 'water conservation',
        completionCount: 7,
        consistencyDays: 7,
        impactLevel: 3,
      }],
      ['fitness_champion', {
        behaviorType: 'exercise',
        completionCount: 20,
        consistencyDays: 30,
        impactLevel: 8,
      }],
      ['green_guardian', {
        behaviorType: 'sustainability',
        completionCount: 15,
        consistencyDays: 30,
        impactLevel: 10,
      }],
    ]);
  }

  /**
   * Check and award badges based on goal completion
   */
  checkAndAwardBadges(
    goals: DailyGoal[],
    completedGoal: DailyGoal,
    outcome: GoalStatus
  ): ImpactBadge[] {
    const newBadges: ImpactBadge[] = [];
    
    // Check each badge definition
    this.badgeDefinitions.forEach((criteria, badgeKey) => {
      const progress = this.calculateBadgeProgress(goals, completedGoal, criteria);
      
      if (progress.currentProgress >= progress.targetProgress) {
        // Check if badge already awarded
        const existingBadge = Array.from(this.badges.values()).find(
          (b) => b.name.toLowerCase().includes(badgeKey.split('_')[0])
        );

        if (!existingBadge || this.shouldUpgradeBadge(existingBadge, progress)) {
          const badge = this.createBadge(badgeKey, criteria, completedGoal, progress);
          if (badge) {
            this.badges.set(badge.id, badge);
            newBadges.push(badge);
          }
        }
      }
    });

    return newBadges;
  }

  /**
   * Calculate badge progress
   */
  calculateBadgeProgress(
    goals: DailyGoal[],
    completedGoal: DailyGoal,
    criteria: BadgeCriteria
  ): BadgeProgress {
    // Filter goals by behavior type
    const relevantGoals = goals.filter((goal) => {
      const goalDesc = (goal.description || goal.title).toLowerCase();
      return goalDesc.includes(criteria.behaviorType.toLowerCase());
    });

    const completedCount = relevantGoals.filter(
      (g) => g.status === 'done' || g.status === 'partially_done'
    ).length;

    // Calculate consistency days
    const completedDates = relevantGoals
      .filter((g) => g.completedAt)
      .map((g) => g.completedAt!)
      .sort((a, b) => a.getTime() - b.getTime());

    const consistencyDays = this.calculateConsistencyDays(completedDates);

    const targetProgress = criteria.completionCount;
    const currentProgress = Math.min(completedCount, targetProgress);

    return {
      badgeId: criteria.behaviorType,
      currentProgress,
      targetProgress,
      progressPercentage: (currentProgress / targetProgress) * 100,
      nextTier: this.getNextTier(this.getCurrentTier(completedCount)),
    };
  }

  /**
   * Calculate consistency days
   */
  private calculateConsistencyDays(dates: Date[]): number {
    if (dates.length < 2) return dates.length;

    // Count consecutive days
    let maxConsistency = 1;
    let currentConsistency = 1;

    for (let i = 1; i < dates.length; i++) {
      const daysDiff = Math.floor(
        (dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysDiff <= 1) {
        currentConsistency++;
        maxConsistency = Math.max(maxConsistency, currentConsistency);
      } else {
        currentConsistency = 1;
      }
    }

    return maxConsistency;
  }

  /**
   * Get current tier based on completion count
   */
  private getCurrentTier(completionCount: number): BadgeTier {
    if (completionCount >= 30) return BadgeTier.PLATINUM;
    if (completionCount >= 20) return BadgeTier.GOLD;
    if (completionCount >= 10) return BadgeTier.SILVER;
    return BadgeTier.BRONZE;
  }

  /**
   * Get next tier
   */
  private getNextTier(currentTier: BadgeTier): BadgeTier | undefined {
    switch (currentTier) {
      case BadgeTier.BRONZE:
        return BadgeTier.SILVER;
      case BadgeTier.SILVER:
        return BadgeTier.GOLD;
      case BadgeTier.GOLD:
        return BadgeTier.PLATINUM;
      default:
        return undefined;
    }
  }

  /**
   * Check if badge should be upgraded
   */
  private shouldUpgradeBadge(
    existingBadge: ImpactBadge,
    progress: BadgeProgress
  ): boolean {
    if (!progress.nextTier) return false;
    
    const tierOrder = [BadgeTier.BRONZE, BadgeTier.SILVER, BadgeTier.GOLD, BadgeTier.PLATINUM];
    const currentIndex = tierOrder.indexOf(existingBadge.tier);
    const nextIndex = tierOrder.indexOf(progress.nextTier);
    
    return nextIndex > currentIndex;
  }

  /**
   * Create badge
   */
  private createBadge(
    badgeKey: string,
    criteria: BadgeCriteria,
    goal: DailyGoal,
    progress: BadgeProgress
  ): ImpactBadge | null {
    const tier = progress.nextTier || this.getCurrentTier(progress.currentProgress);
    
    // Generate badge name
    const behaviorName = criteria.behaviorType
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    const tierName = tier.charAt(0).toUpperCase() + tier.slice(1);
    const badgeName = `${behaviorName} Hero - ${tierName}`;

    return {
      id: `badge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: badgeName,
      tier,
      description: `Awarded for consistent ${criteria.behaviorType} behavior`,
      criteria,
      earnedAt: new Date(),
      goalId: goal.id,
      metadata: {
        completionCount: progress.currentProgress,
        consistencyDays: this.calculateConsistencyDays(
          goal.completedAt ? [goal.completedAt] : []
        ),
      },
    };
  }

  /**
   * Get all badges for user
   */
  getUserBadges(userId: string): ImpactBadge[] {
    return Array.from(this.badges.values()).sort(
      (a, b) => b.earnedAt.getTime() - a.earnedAt.getTime()
    );
  }

  /**
   * Get badge progress for a specific badge type
   */
  getBadgeProgress(
    badgeKey: string,
    goals: DailyGoal[]
  ): BadgeProgress | null {
    const criteria = this.badgeDefinitions.get(badgeKey);
    if (!criteria) return null;

    return this.calculateBadgeProgress(goals, goals[0] || {} as DailyGoal, criteria);
  }

  /**
   * Get all available badge definitions
   */
  getBadgeDefinitions(): Map<string, BadgeCriteria> {
    return new Map(this.badgeDefinitions);
  }
}


/**
 * Impact Ledger Service
 * Tracks impact metrics, SDG contributions, and creates verifiable impact records
 */
import {
  ImpactLedgerEntry,
  SDGContribution,
  ImpactMetric,
  BehaviorChangeMetric,
} from '../types/impact';
import { SDG, getSDGById } from '../types/sdg';
import { DailyGoal, GoalStatus } from '../types/rdm';

export class ImpactLedgerService {
  private entries: ImpactLedgerEntry[];

  constructor() {
    this.entries = [];
  }

  /**
   * Create impact ledger entry from goal completion
   */
  async createImpactEntry(
    goal: DailyGoal,
    outcome: GoalStatus,
    verificationScore: number
  ): Promise<ImpactLedgerEntry> {
    // Calculate SDG contributions
    const sdgContributions: SDGContribution[] = [];
    
    if (goal.sdgAlignment && goal.sdgAlignment.length > 0) {
      for (const sdgId of goal.sdgAlignment) {
        const sdg = getSDGById(sdgId);
        sdgContributions.push({
          sdgId,
          contributionType: this.getContributionType(goal, sdgId),
          impactLevel: this.calculateImpactLevel(outcome, verificationScore),
          metrics: this.extractMetrics(goal, sdgId),
        });
      }
    }

    // Calculate impact metrics
    const impactMetrics: ImpactMetric[] = this.calculateImpactMetrics(goal, outcome);

    // Calculate behavior change metrics
    const behaviorChange: BehaviorChangeMetric = {
      goalCategory: goal.category || 'general',
      completionRate: outcome === 'done' ? 1.0 : outcome === 'partially_done' ? 0.5 : 0,
      consistencyScore: verificationScore,
      habitStrength: this.calculateHabitStrength(outcome, verificationScore),
    };

    const entry: ImpactLedgerEntry = {
      id: `impact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      goalId: goal.id,
      userId: goal.userId,
      timestamp: new Date(),
      sdgContributions,
      impactMetrics,
      behaviorChange,
      verified: verificationScore >= 0.7,
    };

    this.entries.push(entry);
    return entry;
  }

  /**
   * Get contribution type description
   */
  private getContributionType(goal: DailyGoal, sdgId: SDG): string {
    const goalDesc = goal.description || goal.title.toLowerCase();
    
    // Map goal to SDG contribution type
    const contributionMap: Partial<Record<SDG, string[]>> = {
      [SDG.RESPONSIBLE_CONSUMPTION]: ['recycling', 'reducing waste', 'sustainable consumption'],
      [SDG.CLIMATE_ACTION]: ['reducing emissions', 'carbon footprint reduction', 'climate awareness'],
      [SDG.GOOD_HEALTH]: ['physical activity', 'wellness', 'health improvement'],
      [SDG.QUALITY_EDUCATION]: ['learning', 'skill development', 'educational progress'],
      // Add more mappings as needed
    };

    const contributions = contributionMap[sdgId] || ['general contribution'];
    return contributions[0] || 'Sustainable behavior change';
  }

  /**
   * Calculate impact level
   */
  private calculateImpactLevel(
    outcome: GoalStatus,
    verificationScore: number
  ): 'low' | 'medium' | 'high' {
    if (outcome === 'done' && verificationScore >= 0.8) {
      return 'high';
    } else if (outcome === 'done' || (outcome === 'partially_done' && verificationScore >= 0.6)) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Extract metrics from goal
   */
  private extractMetrics(goal: DailyGoal, sdgId: SDG): Record<string, number> {
    const metrics: Record<string, number> = {};
    
    // Example: Extract numeric values from goal description
    const desc = (goal.description || goal.title).toLowerCase();
    
    // Try to extract quantities
    const quantityMatch = desc.match(/(\d+)\s*(times|days|hours|items)/);
    if (quantityMatch) {
      metrics['frequency'] = parseInt(quantityMatch[1], 10);
    }

    // Add goal-specific metrics
    metrics['completion_count'] = 1;
    
    return metrics;
  }

  /**
   * Calculate impact metrics
   */
  private calculateImpactMetrics(
    goal: DailyGoal,
    outcome: GoalStatus
  ): ImpactMetric[] {
    const metrics: ImpactMetric[] = [];
    const goalDesc = (goal.description || goal.title).toLowerCase();

    // Estimate impact based on goal type
    if (goalDesc.includes('recycle') || goalDesc.includes('waste')) {
      metrics.push({
        type: 'waste_reduced',
        value: outcome === 'done' ? 5 : outcome === 'partially_done' ? 2.5 : 0, // kg
        unit: 'kg',
        description: 'Waste diverted from landfill',
      });
    }

    if (goalDesc.includes('water') || goalDesc.includes('shower')) {
      metrics.push({
        type: 'water_saved',
        value: outcome === 'done' ? 50 : outcome === 'partially_done' ? 25 : 0, // liters
        unit: 'liters',
        description: 'Water saved',
      });
    }

    if (goalDesc.includes('carbon') || goalDesc.includes('emission') || goalDesc.includes('walk')) {
      metrics.push({
        type: 'carbon_reduced',
        value: outcome === 'done' ? 2 : outcome === 'partially_done' ? 1 : 0, // kg CO2
        unit: 'kg CO2',
        description: 'Carbon emissions reduced',
      });
    }

    return metrics;
  }

  /**
   * Calculate habit strength
   */
  private calculateHabitStrength(
    outcome: GoalStatus,
    verificationScore: number
  ): number {
    let strength = 0;
    
    if (outcome === 'done') {
      strength = 0.7 + (verificationScore * 0.3);
    } else if (outcome === 'partially_done') {
      strength = 0.3 + (verificationScore * 0.3);
    }
    
    return Math.min(1, strength);
  }

  /**
   * Get all impact entries
   */
  getAllEntries(): ImpactLedgerEntry[] {
    return [...this.entries];
  }

  /**
   * Get entries for a specific goal
   */
  getEntriesForGoal(goalId: string): ImpactLedgerEntry[] {
    return this.entries.filter((entry) => entry.goalId === goalId);
  }

  /**
   * Get entries by SDG
   */
  getEntriesBySDG(sdgId: SDG): ImpactLedgerEntry[] {
    return this.entries.filter((entry) =>
      entry.sdgContributions.some((contrib) => contrib.sdgId === sdgId)
    );
  }

  /**
   * Update entry with transaction hash (after on-chain logging)
   */
  updateEntryWithTransactionHash(entryId: string, transactionHash: string): void {
    const entry = this.entries.find((e) => e.id === entryId);
    if (entry) {
      entry.transactionHash = transactionHash;
    }
  }

  /**
   * Get impact summary
   */
  getImpactSummary(userId?: string): {
    totalEntries: number;
    sdgContributions: Record<SDG, number>;
    totalMetrics: Record<string, number>;
    verifiedCount: number;
  } {
    const entries = userId
      ? this.entries.filter((e) => e.userId === userId)
      : this.entries;

    const sdgContributions: Record<SDG, number> = {} as any;
    const totalMetrics: Record<string, number> = {};
    let verifiedCount = 0;

    entries.forEach((entry) => {
      if (entry.verified) verifiedCount++;

      entry.sdgContributions.forEach((contrib) => {
        sdgContributions[contrib.sdgId] = (sdgContributions[contrib.sdgId] || 0) + 1;
      });

      entry.impactMetrics.forEach((metric) => {
        const key = `${metric.type}_${metric.unit}`;
        totalMetrics[key] = (totalMetrics[key] || 0) + metric.value;
      });
    });

    return {
      totalEntries: entries.length,
      sdgContributions,
      totalMetrics,
      verifiedCount,
    };
  }
}


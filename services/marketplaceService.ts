/**
 * Marketplace Service
 * AI Habit Swap Marketplace with smart contract-based habit apprenticeships
 */
import { GeminiService } from './geminiService';
import {
  UserProfile,
  HabitStruggle,
  MatchCriteria,
  MatchScore,
  MarketplaceMatch,
  ApprenticeshipContract,
  MentorshipType,
  ContractStatus,
  MentorshipFeedback,
  MarketplaceStats,
} from '../types/marketplace';
import { TokenAmount } from '../types/rdm';

const RATING_THRESHOLD = 7.5; // Known athlete/skilled person threshold

export class MarketplaceService {
  private profiles: Map<string, UserProfile>;
  private contracts: Map<string, ApprenticeshipContract>;
  private feedbacks: Map<string, MentorshipFeedback[]>;
  private geminiService: GeminiService;

  constructor(geminiService: GeminiService) {
    this.profiles = new Map();
    this.contracts = new Map();
    this.feedbacks = new Map();
    this.geminiService = geminiService;
  }

  /**
   * Register or update user profile
   */
  registerProfile(profile: UserProfile): void {
    // Update known athlete status
    profile.isKnownAthlete = profile.overallRating >= RATING_THRESHOLD;
    this.profiles.set(profile.userId, profile);
  }

  /**
   * Get user profile
   */
  getProfile(userId: string): UserProfile | undefined {
    return this.profiles.get(userId);
  }

  /**
   * AI-powered habit matching
   */
  async findMatches(
    requesterId: string,
    struggle: HabitStruggle,
    criteria: MatchCriteria
  ): Promise<MarketplaceMatch> {
    const requester = this.profiles.get(requesterId);
    if (!requester) {
      throw new Error('Requester profile not found');
    }

    // Get all potential matches
    const candidates = this.getCandidateMatches(criteria);

    // AI analysis of struggle pattern
    const aiAnalysis = await this.analyzeStrugglePattern(struggle, criteria);

    // Score each candidate
    const matchScores: MatchScore[] = [];
    for (const candidate of candidates) {
      if (candidate.userId === requesterId) continue; // Skip self

      const score = await this.calculateMatchScore(
        requester,
        candidate,
        struggle,
        criteria,
        aiAnalysis
      );
      matchScores.push(score);
    }

    // Sort by compatibility score
    matchScores.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

    // Take top matches
    const topMatches = matchScores.slice(0, 10);

    const match: MarketplaceMatch = {
      id: `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      requesterId,
      matches: topMatches,
      generatedAt: new Date(),
      aiAnalysis,
    };

    return match;
  }

  /**
   * Get candidate matches based on criteria
   */
  private getCandidateMatches(criteria: MatchCriteria): UserProfile[] {
    const candidates: UserProfile[] = [];

    for (const profile of this.profiles.values()) {
      // Filter by mentorship type
      if (criteria.mentorshipType === 'apprenticeship') {
        // For apprenticeships, need high-rated mentors
        if (profile.overallRating >= (criteria.preferredMentorRating || 6.0)) {
          candidates.push(profile);
        }
      } else {
        // For buddies, any active user
        candidates.push(profile);
      }
    }

    // Filter by habit category expertise (if specified)
    if (criteria.habitCategory) {
      return candidates.filter(
        (p) =>
          p.expertiseAreas.includes(criteria.habitCategory) ||
          p.expertiseAreas.length === 0 // Include if no specific expertise
      );
    }

    return candidates;
  }

  /**
   * AI analysis of struggle pattern
   */
  private async analyzeStrugglePattern(
    struggle: HabitStruggle,
    criteria: MatchCriteria
  ): Promise<{
    strugglePattern: string;
    recommendedApproach: string;
    confidence: number;
  }> {
    const prompt = `Analyze this habit struggle and recommend the best matching approach:

Habit Category: ${struggle.habitCategory}
Struggle Description: ${struggle.struggleDescription}
Severity: ${struggle.severity}
Duration: ${struggle.duration} days
Previous Attempts: ${struggle.previousAttempts}
Motivation Level: ${struggle.motivationLevel}/10

Preferred Mentorship Type: ${criteria.mentorshipType}

Provide:
1. Struggle pattern analysis (what type of support is needed)
2. Recommended approach (mentor vs buddy, communication style)
3. Confidence score (0-1)

Return as JSON: {"strugglePattern": "...", "recommendedApproach": "...", "confidence": 0.0-1.0}`;

    try {
      const response = await this.geminiService.sendCardanoQuery(prompt);
      if (response.success && response.message) {
        const jsonMatch = response.message.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const analysis = JSON.parse(jsonMatch[0]);
          return {
            strugglePattern: analysis.strugglePattern || 'Standard habit struggle',
            recommendedApproach: analysis.recommendedApproach || 'Peer support recommended',
            confidence: analysis.confidence || 0.7,
          };
        }
      }
    } catch (error) {
      console.error('Error analyzing struggle pattern:', error);
    }

    return {
      strugglePattern: 'Standard habit struggle requiring support',
      recommendedApproach: criteria.mentorshipType === 'apprenticeship' ? 'Mentor guidance' : 'Peer buddy support',
      confidence: 0.6,
    };
  }

  /**
   * Calculate match score between requester and candidate
   */
  private async calculateMatchScore(
    requester: UserProfile,
    candidate: UserProfile,
    struggle: HabitStruggle,
    criteria: MatchCriteria,
    aiAnalysis: any
  ): Promise<MatchScore> {
    // Habit compatibility (candidate's success in same habit)
    const habitCompatibility = candidate.expertiseAreas.includes(struggle.habitCategory) ? 80 : 50;

    // Personality fit (AI-powered)
    const personalityFit = await this.calculatePersonalityFit(requester, candidate, criteria);

    // Schedule compatibility (placeholder - would check timezone/availability)
    const scheduleCompatibility = 70; // Default, would calculate from availability

    // Rating score (for mentors)
    const ratingScore = criteria.mentorshipType === 'apprenticeship' ? candidate.overallRating * 10 : 50;

    // Success history
    const successHistory = candidate.mentorshipSuccessRate * 100;

    // Combined compatibility score (weighted)
    const compatibilityScore =
      habitCompatibility * 0.3 +
      personalityFit * 0.25 +
      scheduleCompatibility * 0.15 +
      ratingScore * 0.15 +
      successHistory * 0.15;

    // Generate recommendation reason
    const reason = this.generateRecommendationReason(candidate, compatibilityScore, criteria);

    return {
      userId: candidate.userId,
      profile: candidate,
      compatibilityScore: Math.round(compatibilityScore),
      breakdown: {
        habitCompatibility,
        personalityFit,
        scheduleCompatibility,
        ratingScore,
        successHistory,
      },
      recommendationReason: reason,
    };
  }

  /**
   * Calculate personality fit using AI
   */
  private async calculatePersonalityFit(
    requester: UserProfile,
    candidate: UserProfile,
    criteria: MatchCriteria
  ): Promise<number> {
    const prompt = `Assess personality compatibility for habit mentorship:

Requester Bio: ${requester.bio || 'No bio'}
Candidate Bio: ${candidate.bio || 'No bio'}
Preferred Communication Style: ${criteria.communicationStyle || 'not specified'}

Rate compatibility 0-100 based on communication styles, personalities, and mentorship approach.

Return just a number.`;

    try {
      const response = await this.geminiService.sendCardanoQuery(prompt);
      if (response.success && response.message) {
        const numberMatch = response.message.match(/\d+/);
        if (numberMatch) {
          return Math.min(100, Math.max(0, parseInt(numberMatch[0], 10)));
        }
      }
    } catch (error) {
      console.error('Error calculating personality fit:', error);
    }

    return 70; // Default moderate fit
  }

  /**
   * Generate recommendation reason
   */
  private generateRecommendationReason(
    candidate: UserProfile,
    score: number,
    criteria: MatchCriteria
  ): string {
    if (score >= 85) {
      return `${candidate.displayName} is an excellent match with high success rate and proven expertise.`;
    } else if (score >= 70) {
      return `${candidate.displayName} is a good match with solid experience in this area.`;
    } else {
      return `${candidate.displayName} could provide peer support for your journey.`;
    }
  }

  /**
   * Create apprenticeship/buddy contract
   */
  createApprenticeshipContract(
    menteeId: string,
    mentorId: string | undefined,
    buddyId: string | undefined,
    habitCategory: string,
    goalDescription: string,
    pledgedRDM: TokenAmount,
    successCriteria: ApprenticeshipContract['successCriteria'],
    duration: { startDate: Date; endDate: Date; days: number }
  ): ApprenticeshipContract {
    if (!mentorId && !buddyId) {
      throw new Error('Either mentorId or buddyId must be provided');
    }

    const contract: ApprenticeshipContract = {
      id: `contract_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: mentorId ? 'apprenticeship' : 'buddy',
      menteeId,
      mentorId,
      buddyId,
      habitCategory,
      goalDescription,
      pledgedRDM,
      successCriteria,
      duration,
      status: 'pending',
      createdAt: new Date(),
      milestonesCompleted: 0,
      totalMilestones: successCriteria.milestones.length,
      progressPercentage: 0,
    };

    this.contracts.set(contract.id, contract);
    return contract;
  }

  /**
   * Activate contract (after RDM is locked)
   */
  activateContract(contractId: string): void {
    const contract = this.contracts.get(contractId);
    if (!contract) {
      throw new Error('Contract not found');
    }

    contract.status = 'active';
    contract.activatedAt = new Date();
    this.contracts.set(contractId, contract);
  }

  /**
   * Complete contract with outcome
   */
  completeContract(
    contractId: string,
    outcome: 'success' | 'failure' | 'partial',
    rdmDistribution: ApprenticeshipContract['rdmDistribution']
  ): void {
    const contract = this.contracts.get(contractId);
    if (!contract) {
      throw new Error('Contract not found');
    }

    contract.status = 'completed';
    contract.completedAt = new Date();
    contract.outcome = outcome;
    contract.rdmDistribution = rdmDistribution;
    this.contracts.set(contractId, contract);

    // Update mentor/buddy success rates
    const mentorId = contract.mentorId || contract.buddyId;
    if (mentorId) {
      this.updateMentorshipStats(mentorId, outcome === 'success');
    }
  }

  /**
   * Update mentorship statistics
   */
  private updateMentorshipStats(mentorId: string, success: boolean): void {
    const profile = this.profiles.get(mentorId);
    if (!profile) return;

    profile.totalMentorships += 1;
    const successfulCount = profile.totalMentorships * profile.mentorshipSuccessRate;
    profile.mentorshipSuccessRate = success
      ? (successfulCount + 1) / profile.totalMentorships
      : successfulCount / profile.totalMentorships;

    this.profiles.set(mentorId, profile);
  }

  /**
   * Submit feedback for mentorship
   */
  submitFeedback(feedback: MentorshipFeedback): void {
    const feedbacks = this.feedbacks.get(feedback.contractId) || [];
    feedbacks.push(feedback);
    this.feedbacks.set(feedback.contractId, feedbacks);

    // Update profile ratings based on feedback
    const profile = this.profiles.get(feedback.toUserId);
    if (profile) {
      // Weighted average rating update (simplified)
      const newRating = (profile.overallRating * 9 + feedback.rating * 2) / 11;
      profile.overallRating = Math.min(10, Math.max(0, newRating));
      this.profiles.set(feedback.toUserId, profile);
    }
  }

  /**
   * Get marketplace statistics
   */
  getMarketplaceStats(): MarketplaceStats {
    const activeContracts = Array.from(this.contracts.values()).filter(
      (c) => c.status === 'active'
    );
    const completedContracts = Array.from(this.contracts.values()).filter(
      (c) => c.status === 'completed'
    );

    const totalRDMLocked: TokenAmount = activeContracts.reduce(
      (sum, c) => ({
        ada: sum.ada + c.pledgedRDM.ada,
        rdmTokens: (sum.rdmTokens || 0) + (c.pledgedRDM.rdmTokens || 0),
      }),
      { ada: 0, rdmTokens: 0 }
    );
    if (totalRDMLocked.rdmTokens === 0) {
      delete totalRDMLocked.rdmTokens;
    }

    let totalRDMDistributed: TokenAmount = { ada: 0, rdmTokens: 0 };
    completedContracts.forEach((c) => {
      if (c.rdmDistribution?.mentorAmount) {
        totalRDMDistributed.ada += c.rdmDistribution.mentorAmount.ada;
        totalRDMDistributed.rdmTokens = (totalRDMDistributed.rdmTokens || 0) + (c.rdmDistribution.mentorAmount.rdmTokens || 0);
      }
    });
    if (totalRDMDistributed.rdmTokens === 0) {
      delete totalRDMDistributed.rdmTokens;
    }

    const successRate =
      completedContracts.length > 0
        ? completedContracts.filter((c) => c.outcome === 'success').length /
          completedContracts.length
        : 0;

    const topMentors = Array.from(this.profiles.values())
      .filter((p) => p.overallRating >= RATING_THRESHOLD)
      .sort((a, b) => b.mentorshipSuccessRate - a.mentorshipSuccessRate)
      .slice(0, 5);

    // Count popular habits
    const habitCounts: Record<string, number> = {};
    activeContracts.forEach((c) => {
      habitCounts[c.habitCategory] = (habitCounts[c.habitCategory] || 0) + 1;
    });
    const popularHabits = Object.entries(habitCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([habit]) => habit);

    return {
      totalActiveContracts: activeContracts.length,
      totalCompletedContracts: completedContracts.length,
      averageSuccessRate: successRate,
      topMentors,
      popularHabits,
      totalRDMLocked,
      totalRDMDistributed,
    };
  }

  /**
   * Get contract by ID
   */
  getContract(contractId: string): ApprenticeshipContract | undefined {
    return this.contracts.get(contractId);
  }

  /**
   * Get user's contracts
   */
  getUserContracts(userId: string): ApprenticeshipContract[] {
    return Array.from(this.contracts.values()).filter(
      (c) => c.menteeId === userId || c.mentorId === userId || c.buddyId === userId
    );
  }
}


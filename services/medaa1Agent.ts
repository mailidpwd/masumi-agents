/**
 * Medaa1 Agent - Goal Setting and Tracking Agent
 * Handles AI-assisted goal creation, reminders, reflections, and verification
 * 
 * REAL MASUMI INTEGRATION:
 * This agent structure matches how Masumi agents work:
 * - Agent registers with network (local now, Masumi network later)
 * - Publishes events when goals complete (on-chain events in Masumi)
 * - Maintains independent state (can be persisted to blockchain)
 * - Communicates via events, not direct calls (Masumi pattern)
 */
import { GeminiService } from './geminiService';
import { TokenService } from './tokenService';
import { AgentNetwork, getAgentNetwork } from './agentNetwork';
import { VerificationService } from './verificationService';
import { MarketplaceService } from './marketplaceService';
import { HabitNFTService } from './habitNFTService';
import {
  DailyGoal,
  GoalStatus,
  VerificationStatus,
  TokenAmount,
  Medaa1AgentState,
  PersonalizationData,
} from '../types/rdm';
import { AgentEventType } from '../types/rdm';
import { SDG, getSDGsByGoal } from '../types/sdg';
import { TimeWindow, calculateTimeWindow, CheckInSchedule, generateCheckIns, CheckIn } from '../types/goalWindow';
import { ReflectionEvidence, VerificationResult, Reflection } from '../types/verification';
import {
  HabitStruggle,
  MatchCriteria,
  MarketplaceMatch,
  ApprenticeshipContract,
  MentorshipType,
  UserProfile,
} from '../types/marketplace';
import { HabitNFT } from '../types/habitNFT';

export class Medaa1Agent {
  private geminiService: GeminiService;
  private tokenService: TokenService;
  private agentNetwork: AgentNetwork;
  private verificationService: VerificationService;
  private marketplaceService: MarketplaceService;
  private habitNFTService: HabitNFTService;
  private state: Medaa1AgentState;
  private reminderTimers: Map<string, NodeJS.Timeout>;
  private checkInSchedules: Map<string, CheckIn[]>; // goalId -> check-ins
  private reflections: Map<string, Reflection[]>; // goalId -> reflections

  constructor(
    geminiService: GeminiService,
    tokenService: TokenService,
    verificationService?: VerificationService,
    marketplaceService?: MarketplaceService,
    habitNFTService?: HabitNFTService
  ) {
    this.geminiService = geminiService;
    this.tokenService = tokenService;
    this.agentNetwork = getAgentNetwork();
    this.verificationService = verificationService || new VerificationService();
    this.marketplaceService = marketplaceService || new MarketplaceService(geminiService);
    this.habitNFTService = habitNFTService || new HabitNFTService();
    this.reminderTimers = new Map();
    this.checkInSchedules = new Map();
    this.reflections = new Map();
    
    this.state = {
      isActive: false,
      goals: [],
      activeReminders: [],
      personalizationData: this.initializePersonalizationData(),
    };
  }

  /**
   * Initialize the agent
   */
  async initialize(): Promise<boolean> {
    try {
      // Register with agent network
      this.agentNetwork.registerAgent('medaa1');
      
      // Subscribe to relevant events
      this.agentNetwork.subscribe(AgentEventType.TOKEN_PLEDGED, this.handleTokenPledged.bind(this));
      
      this.state.isActive = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize Medaa1:', error);
      return false;
    }
  }

  /**
   * Initialize personalization data
   */
  private initializePersonalizationData(): PersonalizationData {
    return {
      goalCategories: {},
      completionPatterns: {
        timeOfDay: {},
        dayOfWeek: {},
      },
      averageCompletionRate: 0,
      preferredGoalTypes: [],
      reminderPreferences: {
        frequency: 'medium',
        times: ['09:00', '18:00'],
      },
    };
  }

  /**
   * Get agent state
   */
  getState(): Medaa1AgentState {
    return { ...this.state };
  }

  /**
   * Create a new goal with AI assistance
   */
  async createGoal(
    title: string,
    description: string,
    category: string,
    pledgedTokens: TokenAmount,
    targetDate: Date
  ): Promise<DailyGoal> {
    // Validate sufficient balance
    if (!this.tokenService.hasSufficientBalance(pledgedTokens)) {
      throw new Error('Insufficient balance in base purse for pledge');
    }

    // Get AI suggestions for goal enhancement
    let enhancedGoal = { title, description, category };
    if (this.state.personalizationData.preferredGoalTypes.length > 0) {
      enhancedGoal = await this.getAIGoalSuggestions(title, description, category);
    }

    // Create goal
    const goal: DailyGoal = {
      id: `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: 'current_user', // In production, get from auth
      title: enhancedGoal.title,
      description: enhancedGoal.description,
      category: enhancedGoal.category,
      createdAt: new Date(),
      targetDate,
      status: 'pending',
      verificationStatus: 'pending_verification',
      pledgedTokens,
      pledgeLocked: true,
      completion_percentage: 0,
      days_with_reflections: 0,
      streak_days: 0,
    };

    // Deduct pledge from base purse
    this.tokenService.deductFromBasePurse(pledgedTokens);

    // Add to goals list
    this.state.goals.push(goal);

    // Schedule reminders
    this.scheduleReminders(goal);

    // Publish goal created event (goal created, not completed yet)
    // We'll publish GOAL_COMPLETED when goal is actually completed

    // Update personalization
    this.updatePersonalizationData(goal, 'created');

    return goal;
  }

  /**
   * Get AI-powered goal suggestions
   */
  private async getAIGoalSuggestions(
    title: string,
    description: string,
    category: string
  ): Promise<{ title: string; description: string; category: string }> {
    try {
      const prompt = `Help improve this goal for better success:
Title: ${title}
Description: ${description}
Category: ${category}

Based on habit formation principles and the user's past goals, suggest improvements to make this goal:
1. More specific and measurable
2. More achievable
3. Better aligned with long-term personal growth

Return a JSON object with "title", "description", and "category" fields.`;

      const response = await this.geminiService.sendCardanoQuery(prompt);
      
      if (response.success && response.message) {
        // Try to parse JSON from response
        try {
          const jsonMatch = response.message.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const suggestion = JSON.parse(jsonMatch[0]);
            return {
              title: suggestion.title || title,
              description: suggestion.description || description,
              category: suggestion.category || category,
            };
          }
        } catch (e) {
          // If parsing fails, use original
        }
      }
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
    }

    return { title, description, category };
  }

  /**
   * Schedule reminders for a goal
   */
  private scheduleReminders(goal: DailyGoal): void {
    const now = new Date();
    const targetTime = new Date(goal.targetDate);

    // Schedule reminder at target time
    const timeUntilReminder = targetTime.getTime() - now.getTime();
    
    if (timeUntilReminder > 0) {
      const reminderId = `${goal.id}_reminder`;
      
      const timer = setTimeout(async () => {
        await this.sendReminder(goal);
      }, timeUntilReminder);

      this.reminderTimers.set(reminderId, timer);
      this.state.activeReminders.push(goal.id);
    }
  }

  /**
   * Send reminder notification
   */
  private async sendReminder(goal: DailyGoal): Promise<void> {
    // Publish reminder event (UI will handle notification)
    await this.agentNetwork.publish({
      id: `reminder_${Date.now()}`,
      type: AgentEventType.REMINDER_TRIGGERED,
      timestamp: new Date(),
      sourceAgent: 'medaa1',
      payload: {
        goalId: goal.id,
        goalTitle: goal.title,
      },
      processed: false,
    });
  }

  /**
   * Complete a goal with reflection
   */
  async completeGoal(
    goalId: string,
    status: 'done' | 'not_done' | 'partially_done',
    reflectionNote?: string
  ): Promise<DailyGoal> {
    const goal = this.state.goals.find((g) => g.id === goalId);
    if (!goal) {
      throw new Error('Goal not found');
    }

    goal.status = status;
    goal.reflectionNote = reflectionNote;
    goal.completedAt = new Date();

    // Update personalization
    this.updatePersonalizationData(goal, 'completed');

    // Publish goal completed event to Medaa2 (old method for backward compatibility)
    await this.agentNetwork.publishGoalCompleted(
      goalId,
      status,
      goal.pledgedTokens,
      'medaa1'
    );

    return goal;
  }

  /**
   * Verify a goal
   */
  async verifyGoal(goalId: string, verified: boolean): Promise<DailyGoal> {
    const goal = this.state.goals.find((g) => g.id === goalId);
    if (!goal) {
      throw new Error('Goal not found');
    }

    goal.verificationStatus = verified ? 'verified' : 'unverified';
    goal.verifiedAt = new Date();

    // Publish verification event
    await this.agentNetwork.publish({
      id: `verify_${Date.now()}`,
      type: AgentEventType.GOAL_VERIFIED,
      timestamp: new Date(),
      sourceAgent: 'medaa1',
      targetAgent: 'medaa2',
      payload: {
        goalId,
        verified,
      },
      processed: false,
    });

    return goal;
  }

  /**
   * Get goals for today
   */
  getTodaysGoals(): DailyGoal[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return this.state.goals.filter((goal) => {
      const goalDate = new Date(goal.targetDate);
      goalDate.setHours(0, 0, 0, 0);
      return goalDate.getTime() === today.getTime();
    });
  }

  /**
   * Get pending goals
   */
  getPendingGoals(): DailyGoal[] {
    return this.state.goals.filter((goal) => goal.status === 'pending');
  }

  /**
   * Get goal by ID
   */
  getGoal(goalId: string): DailyGoal | undefined {
    return this.state.goals.find((g) => g.id === goalId);
  }

  /**
   * Update personalization data based on goal activity
   */
  private updatePersonalizationData(goal: DailyGoal, action: 'created' | 'completed'): void {
    if (action === 'created') {
      // Track category
      if (goal.category) {
        this.state.personalizationData.goalCategories[goal.category] = 
          (this.state.personalizationData.goalCategories[goal.category] || 0) + 1;
      }
    } else if (action === 'completed' && goal.completedAt) {
      // Track completion patterns
      const hour = goal.completedAt.getHours();
      const dayOfWeek = goal.completedAt.toLocaleDateString('en-US', { weekday: 'long' });
      
      this.state.personalizationData.completionPatterns.timeOfDay[hour] =
        (this.state.personalizationData.completionPatterns.timeOfDay[hour] || 0) + 1;
      
      this.state.personalizationData.completionPatterns.dayOfWeek[dayOfWeek] =
        (this.state.personalizationData.completionPatterns.dayOfWeek[dayOfWeek] || 0) + 1;

      // Update completion rate
      const completedCount = this.state.goals.filter((g) => g.status === 'done').length;
      const totalCount = this.state.goals.length;
      this.state.personalizationData.averageCompletionRate = totalCount > 0
        ? completedCount / totalCount
        : 0;
    }
  }

  /**
   * Handle token pledged event
   */
  private async handleTokenPledged(event: any): Promise<void> {
    // Handle any token pledge events if needed
    console.log('Token pledged event received:', event);
  }

  /**
   * Get personalized goal suggestions
   */
  async getPersonalizedSuggestions(): Promise<string[]> {
    const personalization = this.state.personalizationData;
    const prompt = `Based on this user's goal history:
- Categories: ${Object.keys(personalization.goalCategories).join(', ')}
- Completion rate: ${(personalization.averageCompletionRate * 100).toFixed(1)}%
- Preferred times: ${personalization.completionPatterns.timeOfDay}

Suggest 3 new daily goals that would help build good habits. Return them as a JSON array of goal titles.`;

    try {
      const response = await this.geminiService.sendCardanoQuery(prompt);
      if (response.success && response.message) {
        try {
          const jsonMatch = response.message.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
          }
        } catch (e) {
          // Fallback to default suggestions
        }
      }
    } catch (error) {
      console.error('Error getting personalized suggestions:', error);
    }

    return [
      'Complete morning meditation',
      'Read for 30 minutes',
      'Exercise for 20 minutes',
    ];
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalGoals: number;
    completedGoals: number;
    completionRate: number;
    totalPledged: TokenAmount;
  } {
    const totalGoals = this.state.goals.length;
    const completedGoals = this.state.goals.filter((g) => g.status === 'done').length;
    
    const totalPledged: TokenAmount = this.state.goals.reduce(
      (acc, goal) => ({
        ada: acc.ada + goal.pledgedTokens.ada,
        rdmTokens: (acc.rdmTokens || 0) + (goal.pledgedTokens.rdmTokens || 0),
      }),
      { ada: 0, rdmTokens: 0 }
    );

    return {
      totalGoals,
      completedGoals,
      completionRate: totalGoals > 0 ? completedGoals / totalGoals : 0,
      totalPledged,
    };
  }

  /**
   * Create enhanced goal with SDG alignment, time windows, and check-ins
   */
  async createEnhancedGoal(
    title: string,
    description: string,
    category: string,
    pledgedTokens: TokenAmount,
    timeWindow: TimeWindow,
    checkInSchedule: CheckInSchedule,
    sdgAlignment?: number[],
    measurableAction?: string,
    verifierIds?: string[]
  ): Promise<DailyGoal> {
    // Validate sufficient balance
    if (!this.tokenService.hasSufficientBalance(pledgedTokens)) {
      throw new Error('Insufficient balance in base purse for pledge');
    }

    // Get SDG alignment if not provided
    if (!sdgAlignment || sdgAlignment.length === 0) {
      sdgAlignment = getSDGsByGoal(description || title);
    }

    // Get AI suggestions for goal clarity
    const enhancedGoal = await this.getAIGoalSuggestions(title, description, category);

    // Create goal with enhanced features
    const goal: DailyGoal = {
      id: `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: 'current_user',
      title: enhancedGoal.title,
      description: enhancedGoal.description || description,
      category: enhancedGoal.category || category,
      createdAt: new Date(),
      targetDate: timeWindow.endDate,
      status: 'pending',
      verificationStatus: 'pending_verification',
      pledgedTokens,
      pledgeLocked: true,
      timeWindow,
      checkInSchedule,
      sdgAlignment,
      measurableAction,
      verifierIds,
      completion_percentage: 0,
      days_with_reflections: 0,
      streak_days: 0,
    };

    // Lock pledge and deduct from base purse
    this.tokenService.deductFromBasePurse(pledgedTokens);

    // Generate check-ins
    const checkIns = generateCheckIns(goal.id, timeWindow, checkInSchedule);
    this.checkInSchedules.set(goal.id, checkIns);

    // Add to goals list
    this.state.goals.push(goal);

    // Schedule reminders and check-ins
    this.scheduleReminders(goal);
    this.scheduleCheckIns(goal, checkIns);

    // Publish goal created event
    await this.agentNetwork.publish({
      id: `goal_created_${Date.now()}`,
      type: AgentEventType.GOAL_CREATED,
      timestamp: new Date(),
      sourceAgent: 'medaa1',
      payload: {
        goalId: goal.id,
        pledgedTokens,
        timeWindow,
        sdgAlignment,
      },
      processed: false,
    } as any);

    // Update personalization
    this.updatePersonalizationData(goal, 'created');

    return goal;
  }

  /**
   * Schedule check-ins for a goal
   */
  private scheduleCheckIns(goal: DailyGoal, checkIns: CheckIn[]): void {
    checkIns.forEach((checkIn) => {
      const now = new Date();
      const scheduledTime = new Date(checkIn.scheduledDate);
      const timeUntilCheckIn = scheduledTime.getTime() - now.getTime();

      if (timeUntilCheckIn > 0) {
        const timerId = `${goal.id}_checkin_${checkIn.id}`;
        const timer = setTimeout(async () => {
          await this.sendCheckInPrompt(goal, checkIn);
        }, timeUntilCheckIn);

        this.reminderTimers.set(timerId, timer);
      }
    });
  }

  /**
   * Send check-in prompt
   */
  private async sendCheckInPrompt(goal: DailyGoal, checkIn: CheckIn): Promise<void> {
    await this.agentNetwork.publish({
      id: `checkin_${Date.now()}`,
      type: AgentEventType.REMINDER_TRIGGERED,
      timestamp: new Date(),
      sourceAgent: 'medaa1',
      payload: {
        goalId: goal.id,
        goalTitle: goal.title,
        checkInId: checkIn.id,
        type: 'check_in',
      },
      processed: false,
    });
  }

  /**
   * Calculate progress from reflections (average of self_percentage)
   */
  private calculateProgressFromReflections(goalId: string): number {
    const reflections = this.reflections.get(goalId) || [];
    if (reflections.length === 0) return 0;
    
    const totalPercentage = reflections.reduce((sum, r) => sum + (r.self_percentage || 0), 0);
    return Math.round(totalPercentage / reflections.length);
  }

  /**
   * Calculate streak days (consecutive days with reflections)
   */
  private calculateStreak(goalId: string, goal: DailyGoal): number {
    const reflections = this.reflections.get(goalId) || [];
    if (reflections.length === 0) return 0;

    // Sort reflections by date (newest first)
    const sortedReflections = [...reflections].sort((a, b) => 
      b.created_date.getTime() - a.created_date.getTime()
    );

    // Get check-in frequency
    const frequency = goal.checkInSchedule?.frequency || 'weekly';
    let maxIntervalDays = 1;
    switch (frequency) {
      case 'daily':
        maxIntervalDays = 1;
        break;
      case 'every_2_days':
        maxIntervalDays = 2;
        break;
      case 'every_3_days':
        maxIntervalDays = 3;
        break;
      case 'weekly':
        maxIntervalDays = 7;
        break;
      default:
        maxIntervalDays = 1;
    }

    // Count consecutive days backwards from today
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let currentDate = new Date(today);
    let reflectionIndex = 0;

    while (reflectionIndex < sortedReflections.length) {
      const reflectionDate = new Date(sortedReflections[reflectionIndex].created_date);
      reflectionDate.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((currentDate.getTime() - reflectionDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 0) {
        // Reflection exists for this day
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
        reflectionIndex++;
      } else if (daysDiff > 0 && daysDiff <= maxIntervalDays) {
        // Within acceptable interval, continue streak
        streak++;
        currentDate.setDate(currentDate.getDate() - daysDiff);
        reflectionIndex++;
      } else {
        // Gap too large, streak broken
        break;
      }
    }

    return streak;
  }

  /**
   * Count unique days with reflections
   */
  private countDaysWithReflections(goalId: string): number {
    const reflections = this.reflections.get(goalId) || [];
    if (reflections.length === 0) return 0;

    const uniqueDates = new Set<string>();
    reflections.forEach((r) => {
      const date = new Date(r.created_date);
      date.setHours(0, 0, 0, 0);
      uniqueDates.add(date.toISOString());
    });

    return uniqueDates.size;
  }

  /**
   * Get all reflections for a goal
   */
  getReflections(goalId: string): Reflection[] {
    return this.reflections.get(goalId) || [];
  }

  /**
   * Submit reflection with comprehensive evidence
   */
  async submitReflection(
    goalId: string,
    reflectionEvidence: ReflectionEvidence
  ): Promise<VerificationResult> {
    const goal = this.state.goals.find((g) => g.id === goalId);
    if (!goal) {
      throw new Error('Goal not found');
    }

    // Create Reflection entity
    const reflection: Reflection = {
      id: `reflection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      goal_id: goalId,
      content: reflectionEvidence.activityLog,
      self_score: reflectionEvidence.selfScore,
      self_percentage: reflectionEvidence.self_percentage || 
        (reflectionEvidence.selfScore === 'done' ? 80 : 
         reflectionEvidence.selfScore === 'partially_done' ? 50 : 0),
      notes: reflectionEvidence.notes,
      media_urls: reflectionEvidence.media.map(m => m.uri),
      created_date: reflectionEvidence.submittedAt,
    };

    // Store reflection
    const goalReflections = this.reflections.get(goalId) || [];
    goalReflections.push(reflection);
    this.reflections.set(goalId, goalReflections);

    // Process verification through verification service
    const verificationResult = this.verificationService.processVerificationResult(
      goalId,
      reflectionEvidence
    );
    reflection.verificationResult = verificationResult;

    // Recalculate progress metrics
    goal.completion_percentage = this.calculateProgressFromReflections(goalId);
    goal.days_with_reflections = this.countDaysWithReflections(goalId);
    goal.streak_days = this.calculateStreak(goalId, goal);

    // Update goal status based on self-score (don't mark as completed unless end date reached)
    const endDate = goal.timeWindow?.endDate || goal.targetDate;
    const now = new Date();
    if (now >= endDate) {
      // Goal period ended, determine final status
      if (goal.completion_percentage >= 50) {
        goal.status = 'done';
      } else {
        goal.status = 'not_done';
      }
      goal.completedAt = new Date();
    } else {
      // Goal still active, update status but don't mark as completed
      if (reflectionEvidence.selfScore === 'done') {
        // Keep as pending if not at end date
        if (goal.status === 'pending') {
          // Status remains pending until goal period ends
        }
      } else if (reflectionEvidence.selfScore === 'partially_done') {
        goal.status = 'partially_done';
      }
      // Don't set status to 'not_done' immediately, wait for final judgment
    }

    goal.verificationStatus = verificationResult.overallStatus === 'verified' ? 'verified' : 
                              verificationResult.overallStatus === 'self_verified' ? 'verified' : 
                              'unverified';

    // Update personalization
    this.updatePersonalizationData(goal, 'completed');

    // Format structured data for Agent 2
    const structuredData = this.verificationService.formatForAgent2(verificationResult);

    // Only publish goal completed event if goal period has ended
    if (now >= endDate && goal.status !== 'pending') {
      await this.agentNetwork.publishGoalCompleted(
        goalId,
        goal.status as 'done' | 'not_done' | 'partially_done',
        goal.pledgedTokens,
        'medaa1',
        structuredData // Include verification data
      );
    }

    return verificationResult;
  }

  /**
   * Clear all goals (for testing/reset)
   */
  clearGoals(): void {
    // Clear all timers
    this.reminderTimers.forEach((timer) => clearTimeout(timer));
    this.reminderTimers.clear();
    
    this.state.goals = [];
    this.state.activeReminders = [];
    this.checkInSchedules.clear();
  }

  /**
   * AI-powered habit matching for marketplace
   */
  async matchHabitBuddy(
    userId: string,
    struggle: HabitStruggle,
    criteria: MatchCriteria
  ): Promise<MarketplaceMatch> {
    return await this.marketplaceService.findMatches(userId, struggle, criteria);
  }

  /**
   * Create habit apprenticeship/buddy contract
   */
  async createApprenticeship(
    menteeId: string,
    mentorId: string | undefined,
    buddyId: string | undefined,
    habitCategory: string,
    goalDescription: string,
    pledgedRDM: TokenAmount,
    successCriteria: ApprenticeshipContract['successCriteria'],
    duration: { startDate: Date; endDate: Date; days: number }
  ): Promise<ApprenticeshipContract> {
    const contract = this.marketplaceService.createApprenticeshipContract(
      menteeId,
      mentorId,
      buddyId,
      habitCategory,
      goalDescription,
      pledgedRDM,
      successCriteria,
      duration
    );

    // Lock RDM for contract
    this.tokenService.deductFromBasePurse(pledgedRDM);

    // Publish mentorship created event
    await this.agentNetwork.publish({
      id: `mentorship_${Date.now()}`,
      type: AgentEventType.MENTORSHIP_CREATED,
      timestamp: new Date(),
      sourceAgent: 'medaa1',
      payload: {
        contractId: contract.id,
        contract,
        rdmLocked: pledgedRDM,
      },
      processed: false,
    } as any);

    return contract;
  }

  /**
   * Mint HabitNFT for LP eligibility
   */
  async mintHabitNFT(
    goal: DailyGoal,
    userId: string,
    username: string,
    owner: string // Cardano address
  ): Promise<HabitNFT> {
    const nft = await this.habitNFTService.mintHabitNFT(goal, userId, username, owner);

    // Publish NFT minted event (for LP creation)
    await this.agentNetwork.publish({
      id: `nft_minted_${Date.now()}`,
      type: AgentEventType.LP_PAIR_CREATED, // Will be used by Medaa2 for LP creation
      timestamp: new Date(),
      sourceAgent: 'medaa1',
      payload: {
        nftId: nft.id,
        goalId: goal.id,
        userId,
      },
      processed: false,
    } as any);

    return nft;
  }

  /**
   * Register/update user profile for marketplace
   */
  registerUserProfile(profile: UserProfile): void {
    this.marketplaceService.registerProfile(profile);
  }

  /**
   * Get user profile
   */
  getUserProfile(userId: string): UserProfile | undefined {
    return this.marketplaceService.getProfile(userId);
  }
}


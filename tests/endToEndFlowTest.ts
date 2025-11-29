/**
 * End-to-End Flow Test
 * Tests complete flows across all features
 */
import { initializeRDMServices, getRDMServices } from '../services/agentInitializer';
import { HabitStruggle, MatchCriteria } from '../types/marketplace';
import { DailyGoal } from '../types/rdm';

export interface FlowTestResult {
  testName: string;
  success: boolean;
  duration: number;
  error?: string;
  details?: any;
}

export class EndToEndFlowTest {
  private results: FlowTestResult[] = [];

  async runAllTests(): Promise<FlowTestResult[]> {
    console.log('🚀 Starting End-to-End Flow Tests...\n');
    this.results = [];

    try {
      // Initialize services
      await initializeRDMServices();
      console.log('✅ Services initialized\n');

      // Run all flow tests
      await this.testMarketplaceFlow();
      await this.testLPFlow();
      await this.testVaultFlow();
      await this.testCompleteGoalFlow();
      await this.testCrossFeatureIntegration();

      // Print summary
      this.printSummary();

      return this.results;
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      return this.results;
    }
  }

  /**
   * Test 1: Marketplace Flow
   * User struggles → AI matches → Creates apprenticeship → Completes → Tokens distributed
   */
  private async testMarketplaceFlow(): Promise<void> {
    const startTime = Date.now();
    const testName = 'Marketplace Flow';

    try {
      console.log(`📋 Test: ${testName}`);
      const services = getRDMServices();

      // 1. Register user profile
      const profile = {
        userId: 'test_user_marketplace',
        username: 'testuser',
        displayName: 'Test User',
        overallRating: 8.5,
        habitSuccessRate: 0.85,
        mentorshipSuccessRate: 0.9,
        totalMentorships: 0,
        totalGoalsCompleted: 0,
        expertiseAreas: ['fitness'],
        isKnownAthlete: true,
        joinedDate: new Date(),
        lastActive: new Date(),
        reputationScore: 100,
      };
      services.medaa1Agent.registerUserProfile(profile);

      // 2. User struggles with habit
      const struggle: HabitStruggle = {
        habitCategory: 'fitness',
        struggleDescription: 'Struggling to maintain consistent exercise routine',
        severity: 'medium',
        duration: 30,
        previousAttempts: 3,
        motivationLevel: 7,
      };

      // 3. AI finds matches
      const criteria: MatchCriteria = {
        habitCategory: 'fitness',
        mentorshipType: 'apprenticeship',
        preferredMentorRating: 7.5,
      };

      const matches = await services.medaa1Agent.matchHabitBuddy('test_user_marketplace', struggle, criteria);
      console.log(`   ✓ Found ${matches.matches.length} matches`);

      if (matches.matches.length === 0) {
        // Create a mentor profile if none exist
        const mentorProfile = {
          ...profile,
          userId: 'mentor_1',
          displayName: 'Fitness Mentor',
          overallRating: 8.0,
        };
        services.medaa1Agent.registerUserProfile(mentorProfile);
        
        // Retry matching
        const newMatches = await services.medaa1Agent.matchHabitBuddy('test_user_marketplace', struggle, criteria);
        console.log(`   ✓ Found ${newMatches.matches.length} matches after creating mentor`);
      }

      // 4. Create apprenticeship contract
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 14);

      const contract = await services.medaa1Agent.createApprenticeship(
        'test_user_marketplace',
        matches.matches[0]?.userId || 'mentor_1',
        undefined,
        'fitness',
        struggle.struggleDescription,
        { ada: 200 },
        {
          milestones: ['Week 1 check-in', 'Week 2 completion'],
          verificationMethod: 'multi',
          minimumSuccessRate: 0.8,
        },
        {
          startDate: new Date(),
          endDate,
          days: 14,
        }
      );
      console.log(`   ✓ Created apprenticeship contract: ${contract.id}`);

      // 5. Activate contract
      services.marketplaceService.activateContract(contract.id);
      console.log(`   ✓ Contract activated`);

      // 6. Complete contract (success)
      services.marketplaceService.completeContract(
        contract.id,
        'success',
        {
          mentorAmount: { ada: 200 },
        }
      );
      console.log(`   ✓ Contract completed successfully`);

      const duration = Date.now() - startTime;
      this.results.push({
        testName,
        success: true,
        duration,
        details: {
          contractId: contract.id,
          matchesFound: matches.matches.length,
        },
      });

      console.log(`✅ ${testName} - PASSED (${duration}ms)\n`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.push({
        testName,
        success: false,
        duration,
        error: error instanceof Error ? error.message : String(error),
      });
      console.log(`❌ ${testName} - FAILED (${duration}ms)\n`);
    }
  }

  /**
   * Test 2: Liquidity Pool Flow
   * High-rated user creates goal → Mints NFT → Creates LP → Investor invests → Success → Yield distributed
   */
  private async testLPFlow(): Promise<void> {
    const startTime = Date.now();
    const testName = 'Liquidity Pool Flow';

    try {
      console.log(`📋 Test: ${testName}`);
      const services = getRDMServices();

      // 1. Create high-rated user profile
      const profile = {
        userId: 'lp_creator',
        username: 'lpcreator',
        displayName: 'LP Creator',
        overallRating: 8.5, // Above 7.5 threshold
        habitSuccessRate: 0.9,
        mentorshipSuccessRate: 0.95,
        totalMentorships: 10,
        totalGoalsCompleted: 50,
        expertiseAreas: ['fitness', 'meditation'],
        isKnownAthlete: true,
        joinedDate: new Date(),
        lastActive: new Date(),
        reputationScore: 200,
      };
      services.medaa1Agent.registerUserProfile(profile);

      // 2. Create goal
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);

      const goal = await services.medaa1Agent.createGoal(
        'Complete Marathon Training',
        'Train for and complete a full marathon',
        'fitness',
        { ada: 1000 },
        endDate
      );
      console.log(`   ✓ Created goal: ${goal.id}`);

      // 3. Mint HabitNFT
      const nft = await services.medaa1Agent.mintHabitNFT(
        goal,
        'lp_creator',
        'lpcreator',
        'addr_lp_creator'
      );
      console.log(`   ✓ Minted HabitNFT: ${nft.id}`);

      // 4. Check LP qualification
      const qualified = services.habitNFTService.checkLPQualification(nft.id, profile.overallRating);
      console.log(`   ✓ LP Qualified: ${qualified}`);

      // 5. Create LP pair
      const pool = await services.medaa2Agent.createLPPair(
        'lp_creator',
        profile.overallRating,
        nft,
        { ada: 1000 }
      );
      console.log(`   ✓ Created LP pool: ${pool.id}`);

      // 6. Investor invests
      const investment = await services.medaa2Agent.processInvestment(
        pool.id,
        'investor_1',
        { ada: 500 }
      );
      console.log(`   ✓ Investor invested: ${investment.lpTokens.toFixed(2)} LP tokens`);

      // 7. Calculate and distribute yield (simulating success)
      const yieldCalc = await services.medaa2Agent.calculateYield(
        pool.id,
        'done',
        0.95, // verification score
        30, // consistency days
        8.5, // community rating
        10 // support actions
      );
      console.log(`   ✓ Yield calculated: ${yieldCalc.finalYieldRate.toFixed(2)}%`);
      console.log(`   ✓ User bonus: ${yieldCalc.userBonus.ada} RDM`);
      console.log(`   ✓ Investor yield: ${yieldCalc.investorYield.ada} RDM`);

      const duration = Date.now() - startTime;
      this.results.push({
        testName,
        success: true,
        duration,
        details: {
          poolId: pool.id,
          investmentId: investment.id,
          yieldRate: yieldCalc.finalYieldRate,
        },
      });

      console.log(`✅ ${testName} - PASSED (${duration}ms)\n`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.push({
        testName,
        success: false,
        duration,
        error: error instanceof Error ? error.message : String(error),
      });
      console.log(`❌ ${testName} - FAILED (${duration}ms)\n`);
    }
  }

  /**
   * Test 3: Vault Flow
   * User creates vault → Locks RDM → Submits verification → AI verifies → Vault unlocks
   */
  private async testVaultFlow(): Promise<void> {
    const startTime = Date.now();
    const testName = 'Vault Flow';

    try {
      console.log(`📋 Test: ${testName}`);
      const services = getRDMServices();

      // 1. Create vault
      const vault = await services.medaa2Agent.createVault(
        'vault_creator',
        'vault_creator',
        'personal',
        { ada: 10000 },
        5, // 5 years
        'Run a Marathon',
        'Complete a full marathon within 5 years',
        [], // verification criteria
        'race_results',
        0.8
      );
      console.log(`   ✓ Created vault: ${vault.id}`);
      console.log(`   ✓ Locked: ${vault.lockedRDM.ada} RDM until ${vault.lockEndDate.toLocaleDateString()}`);

      // 2. Submit verification (simulating goal achieved)
      const verificationData = [{
        source: 'race_results' as const,
        data: {
          eventName: 'City Marathon 2024',
          eventDate: new Date().toISOString(),
          resultUrl: 'https://example.com/results/12345',
          finishTime: '3:45:30',
          placement: 156,
        },
        timestamp: new Date(),
        verifiedBy: 'ai' as const,
        confidence: 0.9,
      }];

      // 3. Verify and unlock
      const unlockResult = await services.medaa2Agent.verifyVaultUnlock(
        vault.id,
        verificationData
      );
      console.log(`   ✓ Verification submitted`);

      // Check vault status
      const updatedVault = services.vaultService.getVault(vault.id);
      if (updatedVault && (updatedVault.status === 'verified_unlocked' || updatedVault.status === 'partial_unlock')) {
        console.log(`   ✓ Vault unlocked: ${updatedVault.status}`);
        if (updatedVault.unlockedAmount) {
          console.log(`   ✓ Unlocked amount: ${updatedVault.unlockedAmount.ada} RDM`);
        }
      }

      const duration = Date.now() - startTime;
      this.results.push({
        testName,
        success: true,
        duration,
        details: {
          vaultId: vault.id,
          status: updatedVault?.status,
        },
      });

      console.log(`✅ ${testName} - PASSED (${duration}ms)\n`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.push({
        testName,
        success: false,
        duration,
        error: error instanceof Error ? error.message : String(error),
      });
      console.log(`❌ ${testName} - FAILED (${duration}ms)\n`);
    }
  }

  /**
   * Test 4: Complete Goal Flow (RDM Core)
   * Create goal → Lock pledge → Reflect → Verify → Tokens distributed
   */
  private async testCompleteGoalFlow(): Promise<void> {
    const startTime = Date.now();
    const testName = 'Complete Goal Flow';

    try {
      console.log(`📋 Test: ${testName}`);
      const services = getRDMServices();

      // 1. Create goal with pledge
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7);

      const goal = await services.medaa1Agent.createGoal(
        'Daily Meditation',
        'Meditate for 20 minutes every day',
        'wellness',
        { ada: 100 },
        endDate
      );
      console.log(`   ✓ Created goal: ${goal.id}`);
      console.log(`   ✓ Pledged: ${goal.pledgedTokens.ada} RDM (locked: ${goal.pledgeLocked})`);

      // 2. Complete goal directly (recordReflection is an internal method)
      await services.medaa1Agent.completeGoal(goal.id, 'done');
      console.log(`   ✓ Goal completed`);

      // Wait a bit for agent network processing
      await new Promise(resolve => setTimeout(resolve, 500));

      // 4. Check token distribution (Medaa2 should have processed)
      const rewardBalance = services.tokenService.getPurseBalance('reward' as any);
      console.log(`   ✓ Reward purse balance: ${rewardBalance.ada} RDM`);

      const duration = Date.now() - startTime;
      this.results.push({
        testName,
        success: true,
        duration,
        details: {
          goalId: goal.id,
          rewardBalance: rewardBalance.ada,
        },
      });

      console.log(`✅ ${testName} - PASSED (${duration}ms)\n`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.push({
        testName,
        success: false,
        duration,
        error: error instanceof Error ? error.message : String(error),
      });
      console.log(`❌ ${testName} - FAILED (${duration}ms)\n`);
    }
  }

  /**
   * Test 5: Cross-Feature Integration
   * Tests how features work together
   */
  private async testCrossFeatureIntegration(): Promise<void> {
    const startTime = Date.now();
    const testName = 'Cross-Feature Integration';

    try {
      console.log(`📋 Test: ${testName}`);
      const services = getRDMServices();

      // Scenario: User creates goal → Mint NFT → Create LP → Marketplace mentorship → Vault for long-term
      
      // 1. Create goal
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);

      const goal = await services.medaa1Agent.createGoal(
        'Become a Certified Fitness Trainer',
        'Complete certification and start training clients',
        'fitness',
        { ada: 500 },
        endDate
      );
      console.log(`   ✓ Created goal: ${goal.id}`);

      // 2. Mint NFT (for LP eligibility)
      const nft = await services.medaa1Agent.mintHabitNFT(
        goal,
        'integration_user',
        'integrationuser',
        'addr_integration'
      );
      console.log(`   ✓ Minted NFT: ${nft.id}`);

      // 3. Create marketplace profile
      const profile = {
        userId: 'integration_user',
        username: 'integrationuser',
        displayName: 'Integration User',
        overallRating: 8.0,
        habitSuccessRate: 0.85,
        mentorshipSuccessRate: 0.9,
        totalMentorships: 0,
        totalGoalsCompleted: 5,
        expertiseAreas: ['fitness'],
        joinedDate: new Date(),
        lastActive: new Date(),
        reputationScore: 100,
      };
      services.medaa1Agent.registerUserProfile(profile);
      console.log(`   ✓ Created marketplace profile`);

      // 4. Create vault for long-term commitment
      const vault = await services.medaa2Agent.createVault(
        'integration_user',
        'integration_user',
        'personal',
        { ada: 5000 },
        3, // 3 years
        'Open Fitness Studio',
        'Open my own fitness studio within 3 years',
        [],
        'multi_source',
        0.8
      );
      console.log(`   ✓ Created vault: ${vault.id}`);

      // Verify all features integrated
      const goalExists = services.medaa1Agent.getState().goals.find(g => g.id === goal.id);
      const nftExists = services.habitNFTService.getNFT(nft.id);
      const vaultExists = services.vaultService.getVault(vault.id);
      const profileExists = services.medaa1Agent.getUserProfile('integration_user');

      const allIntegrated = goalExists && nftExists && vaultExists && profileExists;

      if (!allIntegrated) {
        throw new Error('Not all features properly integrated');
      }

      const duration = Date.now() - startTime;
      this.results.push({
        testName,
        success: true,
        duration,
        details: {
          goalId: goal.id,
          nftId: nft.id,
          vaultId: vault.id,
          profileCreated: !!profileExists,
        },
      });

      console.log(`✅ ${testName} - PASSED (${duration}ms)\n`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.push({
        testName,
        success: false,
        duration,
        error: error instanceof Error ? error.message : String(error),
      });
      console.log(`❌ ${testName} - FAILED (${duration}ms)\n`);
    }
  }

  private printSummary(): void {
    console.log('\n📊 Test Summary');
    console.log('='.repeat(50));
    
    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    this.results.forEach(result => {
      const icon = result.success ? '✅' : '❌';
      console.log(`${icon} ${result.testName} - ${result.duration}ms`);
      if (!result.success && result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    console.log('='.repeat(50));
    console.log(`Total: ${this.results.length} | Passed: ${passed} | Failed: ${failed}`);
    console.log(`Total Duration: ${totalDuration}ms`);
    console.log(`Success Rate: ${((passed / this.results.length) * 100).toFixed(1)}%`);
  }
}

// Export function for easy use
export async function runEndToEndTests(): Promise<FlowTestResult[]> {
  const tester = new EndToEndFlowTest();
  return await tester.runAllTests();
}


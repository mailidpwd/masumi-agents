/**
 * Backend Services Test
 * Simple test to verify all backend services are properly initialized
 */
import { initializeRDMServices, getRDMServices } from '../services/agentInitializer';

export async function testBackendServices(): Promise<boolean> {
  try {
    console.log('🧪 Testing Backend Services...\n');

    // Initialize services
    console.log('1. Initializing RDM services...');
    const services = await initializeRDMServices();
    console.log('✅ Services initialized\n');

    // Test Marketplace Service
    console.log('2. Testing Marketplace Service...');
    const testProfile = {
      userId: 'test_user',
      username: 'testuser',
      displayName: 'Test User',
      overallRating: 8.0,
      habitSuccessRate: 0.85,
      mentorshipSuccessRate: 0.9,
      totalMentorships: 5,
      totalGoalsCompleted: 20,
      expertiseAreas: ['fitness', 'meditation'],
      isKnownAthlete: true,
      joinedDate: new Date(),
      lastActive: new Date(),
      reputationScore: 150,
    };
    services.marketplaceService.registerProfile(testProfile);
    console.log('✅ Marketplace service working\n');

    // Test HabitNFT Service
    console.log('3. Testing HabitNFT Service...');
    const testGoal = {
      id: 'test_goal_1',
      userId: 'test_user',
      title: 'Run 5K daily',
      description: 'Run 5 kilometers every day',
      category: 'fitness',
      createdAt: new Date(),
      targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'pending' as const,
      verificationStatus: 'pending_verification' as const,
      pledgedTokens: { ada: 100 },
      pledgeLocked: true,
      sdgAlignment: [],
      reflections: [],
      evidence: [],
    };
    const nft = await services.habitNFTService.mintHabitNFT(
      testGoal,
      'test_user',
      'testuser',
      'addr_test_123'
    );
    console.log(`✅ HabitNFT minted: ${nft.id}\n`);

    // Qualify NFT for LP (check with user rating above threshold)
    const userRating = 8.5; // Above 7.5 threshold
    services.habitNFTService.checkLPQualification(nft.id, userRating);
    console.log(`✅ HabitNFT LP qualified: ${nft.isLPQualified}\n`);

    // Test Liquidity Pool Service
    console.log('4. Testing Liquidity Pool Service...');
    const lpPool = services.liquidityPoolService.createLPPair(
      'test_user',
      userRating,
      nft,
      { ada: 1000 }
    );
    console.log(`✅ LP Pool created: ${lpPool.id}\n`);

    // Test Vault Service
    console.log('5. Testing Vault Service...');
    const vault = services.vaultService.createVault(
      'test_user',
      'test_user',
      'personal',
      { ada: 10000 },
      5,
      'Run a Marathon',
      'Complete a full marathon within 5 years',
      [],
      'race_results',
      0.8
    );
    console.log(`✅ Vault created: ${vault.id}\n`);

    // Test Agent Methods
    console.log('6. Testing Agent Methods...');
    
    // Test Medaa1 marketplace matching
    const struggle = {
      habitCategory: 'fitness',
      struggleDescription: 'Struggling to maintain exercise routine',
      severity: 'medium' as const,
      duration: 30,
      previousAttempts: 3,
      motivationLevel: 7,
    };
    
    const criteria = {
      habitCategory: 'fitness',
      mentorshipType: 'apprenticeship' as const,
      preferredMentorRating: 7.5,
    };
    
    const matches = await services.medaa1Agent.matchHabitBuddy('test_user', struggle, criteria);
    console.log(`✅ Found ${matches.matches.length} matches\n`);

    // Test Medaa2 LP methods
    const investment = services.liquidityPoolService.invest(lpPool.id, 'investor_1', { ada: 500 });
    console.log(`✅ LP Investment created: ${investment.id}\n`);

    console.log('🎉 All Backend Tests Passed!\n');
    return true;
  } catch (error) {
    console.error('❌ Backend Test Failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return false;
  }
}

// Export for use in App or console
// Note: React Native doesn't have window, so this check is for Node.js environments only


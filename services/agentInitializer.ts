/**
 * Agent Initializer Service
 * Initializes all agents and services for the RDM system
 */
import { GeminiService } from './geminiService';
import { TokenService } from './tokenService';
import { MockSmartContractService } from './mockSmartContract';
import { PlutusSmartContractService } from './plutusSmartContract';
import { Medaa1Agent } from './medaa1Agent';
import { Medaa2Agent } from './medaa2Agent';
import { Medaa3Agent } from './medaa3Agent';
import { MarketplaceService } from './marketplaceService';
import { HabitNFTService } from './habitNFTService';
import { LiquidityPoolService } from './liquidityPoolService';
import { VaultService } from './vaultService';
import { VerificationService } from './verificationService';
import { MediaService } from './mediaService';
import { getMasumiClient } from './masumiClient';
import { getAgentNetwork } from './agentNetwork';
import { WalletService } from './walletService';
import { areContractsDeployed, getContractAddresses } from '../config/contractAddresses';

// Union type for smart contract service (supports both mock and real)
export type SmartContractService = MockSmartContractService | PlutusSmartContractService;

export interface RDMServiceContainer {
  geminiService: GeminiService;
  tokenService: TokenService;
  smartContractService: SmartContractService;
  medaa1Agent: Medaa1Agent;
  medaa2Agent: Medaa2Agent;
  medaa3Agent: Medaa3Agent;
  marketplaceService: MarketplaceService;
  habitNFTService: HabitNFTService;
  liquidityPoolService: LiquidityPoolService;
  vaultService: VaultService;
  verificationService: VerificationService;
  mediaService: MediaService;
}

let serviceContainer: RDMServiceContainer | null = null;

/**
 * Initialize all services and agents
 */
export async function initializeRDMServices(): Promise<RDMServiceContainer> {
  if (serviceContainer) {
    return serviceContainer;
  }

  // Initialize core services
  const geminiService = new GeminiService();
  const tokenService = new TokenService();
  
  // Initialize smart contract service (real contracts with fallback to mock)
  const smartContractService = initializeSmartContractService(tokenService);
  
  const verificationService = new VerificationService();
  const mediaService = new MediaService();

  // Initialize new marketplace/LP/Vault services
  const marketplaceService = new MarketplaceService(geminiService);
  const habitNFTService = new HabitNFTService();
  const liquidityPoolService = new LiquidityPoolService();
  const vaultService = new VaultService(geminiService);

  // Initialize token service with timeout (increased to 10 seconds for slow networks)
  try {
    const tokenInitPromise = tokenService.initialize();
    const tokenInitTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Token service initialization timeout')), 10000)
    );
    await Promise.race([tokenInitPromise, tokenInitTimeout]);
  } catch (error) {
    // Silently continue - token service will work with default values
    // Balance will be refreshed when wallet connects
  }

  // Initialize agents with new services
  const medaa1Agent = new Medaa1Agent(
    geminiService,
    tokenService,
    verificationService,
    marketplaceService,
    habitNFTService
  );
  
  const medaa2Agent = new Medaa2Agent(
    tokenService,
    smartContractService,
    undefined, // impactLedger - will use default
    undefined, // badgeService - will use default
    liquidityPoolService,
    vaultService
  );
  
  const medaa3Agent = new Medaa3Agent(tokenService, smartContractService);

  // Initialize all agents with timeout and error handling
  // Don't let agent initialization failures block the app
  const agentInitPromises = [
    medaa1Agent.initialize().catch(err => {
      console.warn('Medaa1Agent initialization failed:', err);
      return false;
    }),
    medaa2Agent.initialize().catch(err => {
      console.warn('Medaa2Agent initialization failed:', err);
      return false;
    }),
    medaa3Agent.initialize().catch(err => {
      console.warn('Medaa3Agent initialization failed:', err);
      return false;
    }),
  ];
  
  // Add overall timeout for agent initialization (increased to 15 seconds for slow networks)
  // Agents can initialize in parallel, so this should be enough time
  const agentInitTimeout = new Promise((resolve) => 
    setTimeout(() => {
      // Don't log warning - agents may still be initializing in background
      resolve(false);
    }, 15000)
  );
  
  try {
    await Promise.race([
      Promise.all(agentInitPromises),
      agentInitTimeout
    ]);
  } catch (error) {
    // Silently continue - agents will work with partial initialization
  }

  // Initialize Masumi connection (if configured) - non-blocking with timeout
  // Don't wait for this to complete, initialize in background
  initializeMasumiConnection().catch(err => {
    console.warn('Masumi initialization failed, continuing with local mode:', err);
  });

  serviceContainer = {
    geminiService,
    tokenService,
    smartContractService,
    medaa1Agent,
    medaa2Agent,
    medaa3Agent,
    marketplaceService,
    habitNFTService,
    liquidityPoolService,
    vaultService,
    verificationService,
    mediaService,
  };

  return serviceContainer;
}

/**
 * Get the service container (must be initialized first)
 */
export function getRDMServices(): RDMServiceContainer {
  if (!serviceContainer) {
    throw new Error('RDM services not initialized. Call initializeRDMServices() first.');
  }
  return serviceContainer;
}

/**
 * Initialize smart contract service with safe fallback
 * Tries to use real Plutus contracts if deployed, otherwise falls back to mock
 */
function initializeSmartContractService(tokenService: TokenService): SmartContractService {
  try {
    const wallet = WalletService.getConnectedWalletSync();
    const network = wallet?.network || 'preprod';
    
    // Check if contracts are deployed
    const contractsDeployed = areContractsDeployed(network as 'preprod' | 'mainnet');
    
    if (contractsDeployed && wallet) {
      // Use real Plutus contracts
      console.log('✅ Using real Plutus smart contracts');
      const plutusService = new PlutusSmartContractService(tokenService);
      
      // Update contract addresses
      const addresses = getContractAddresses(network as 'preprod' | 'mainnet');
      plutusService.updateContractAddresses(addresses);
      
      return plutusService;
    } else {
      // Fallback to mock contracts
      console.log('⚠️  Using mock smart contracts (real contracts not deployed or wallet not connected)');
      return new MockSmartContractService(tokenService);
    }
  } catch (error) {
    // Safe fallback on any error
    console.warn('⚠️  Error initializing real contracts, using mock:', error);
    return new MockSmartContractService(tokenService);
  }
}

/**
 * Initialize Masumi connection in background (non-blocking)
 */
async function initializeMasumiConnection(): Promise<void> {
  try {
    // Add timeout to prevent hanging (increased to 15 seconds for mobile networks)
    const timeoutPromise = new Promise<boolean>((_, reject) => 
      setTimeout(() => reject(new Error('Masumi health check timeout')), 15000)
    );
    
    const masumiClient = getMasumiClient();
    const { masumiConfig } = await import('../config/masumiConfig');
    console.log(`🔗 Attempting to connect to Masumi network...`);
    console.log(`   Payment: ${masumiConfig.paymentServiceUrl}`);
    console.log(`   Registry: ${masumiConfig.registryServiceUrl}`);
    
    const masumiHealthy = await Promise.race([
      masumiClient.healthCheck(),
      timeoutPromise
    ]) as boolean;
    
    if (masumiHealthy) {
      console.log('✅ Masumi network connected successfully');
      
      // Query registered agents from Masumi (with timeout)
      try {
        // Convert network format: PREPROD -> Preprod, MAINNET -> Mainnet
        // masumiClient.queryAgents will handle the conversion, but we pass the config value
        const networkFormat = masumiConfig.network === 'PREPROD' ? 'Preprod' : 'Mainnet';
        const agentsPromise = masumiClient.queryAgents({ network: networkFormat });
        const agentsTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Query agents timeout')), 5000)
        );
        const agents = await Promise.race([agentsPromise, agentsTimeout]) as any[];
        console.log(`📡 Found ${agents.length} registered agents on Masumi network`);
        
        // Verify our agents are registered
        const ourAgentNames = ['RDM-Medaa1-GoalAgent', 'RDM-Medaa2-TokenAgent', 'RDM-Medaa3-CharityAgent'];
        const registeredOurAgents = agents.filter(a => ourAgentNames.includes(a.agentName));
        if (registeredOurAgents.length > 0) {
          console.log(`✅ Found ${registeredOurAgents.length} of our agents registered on Masumi`);
        }
      } catch (queryError) {
        console.warn('⚠️ Could not query Masumi agents:', queryError);
      }
      
      // Enable Masumi integration in agent network
      const agentNetwork = getAgentNetwork();
      agentNetwork.setMasumiEnabled(true);
    } else {
      console.warn('⚠️ Masumi network unavailable - using local mode only');
      const agentNetwork = getAgentNetwork();
      agentNetwork.setMasumiEnabled(false);
    }
  } catch (error) {
    console.warn('⚠️ Masumi connection failed - using local mode only:', error instanceof Error ? error.message : error);
    const agentNetwork = getAgentNetwork();
    agentNetwork.setMasumiEnabled(false);
  }
}

/**
 * Reset services (for testing)
 */
export function resetRDMServices(): void {
  serviceContainer = null;
}


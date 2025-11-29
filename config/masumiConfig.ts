/**
 * Masumi Network Configuration
 * 
 * Configuration for connecting to Masumi Payment and Registry services
 * 
 * MODES:
 * - LOCAL: Run Masumi services on your machine (localhost) for development
 * - REAL: Connect to real Masumi network (PreProd or Mainnet) for actual blockchain transactions
 * 
 * Set USE_REAL_MASUMI_NETWORK=true in .env to use real network
 */
export interface MasumiConfig {
  paymentServiceUrl: string;
  registryServiceUrl: string;
  network: 'PREPROD' | 'MAINNET';
  apiKey: string;
  agentIds: {
    medaa1: string;
    medaa2: string;
    medaa3: string;
  };
  isRealNetwork: boolean;
}

// Real Masumi Network URLs
const REAL_MASUMI_URLS = {
  PREPROD: {
    payment: 'https://payment.preprod.masumi.network/api/v1',
    registry: 'https://registry.preprod.masumi.network/api/v1',
  },
  MAINNET: {
    payment: 'https://payment.masumi.network/api/v1',
    registry: 'https://registry.masumi.network/api/v1',
  },
};

// Default configuration - will be overridden by environment variables if available
const getConfig = (): MasumiConfig => {
  // ================================================================
  // TOGGLE THIS TO SWITCH BETWEEN LOCAL AND REAL MASUMI NETWORK
  // Set to true to use real Masumi network with actual blockchain transactions
  // ================================================================
  const useRealNetwork = process.env.USE_REAL_MASUMI_NETWORK === 'true' || 
                         process.env.MASUMI_USE_REAL === 'true' ||
                         false; // Change to true for real network
  
  // Network selection (PREPROD for testing, MAINNET for production)
  const network = (process.env.MASUMI_NETWORK || 'PREPROD') as 'PREPROD' | 'MAINNET';
  
  // Local development configuration
  const defaultHostIp = '10.110.141.10'; // Your computer's IP for mobile testing
  const hostIp = process.env.MASUMI_HOST_IP || defaultHostIp;
  
  // Select URLs based on mode
  let paymentUrl: string;
  let registryUrl: string;
  
  if (useRealNetwork) {
    // Real Masumi Network URLs
    paymentUrl = process.env.MASUMI_PAYMENT_SERVICE_URL || REAL_MASUMI_URLS[network].payment;
    registryUrl = process.env.MASUMI_REGISTRY_SERVICE_URL || REAL_MASUMI_URLS[network].registry;
    console.log(`🌐 Using REAL Masumi Network (${network})`);
  } else {
    // Local development URLs
    paymentUrl = process.env.MASUMI_PAYMENT_SERVICE_URL || `http://${hostIp}:3001/api/v1`;
    registryUrl = process.env.MASUMI_REGISTRY_SERVICE_URL || `http://${hostIp}:3000/api/v1`;
    console.log(`🏠 Using LOCAL Masumi Network (localhost)`);
  }
  
  return {
    paymentServiceUrl: paymentUrl,
    registryServiceUrl: registryUrl,
    network: network,
    isRealNetwork: useRealNetwork,
    
    // API key - get from Masumi dashboard for real network
    // For local: curl http://localhost:3001/api/v1/api-key/
    apiKey: process.env.MASUMI_API_KEY || '',
    
    // Agent IDs - get after registering agents on Masumi
    agentIds: {
      medaa1: process.env.MASUMI_AGENT_ID_MEDAA1 || '',
      medaa2: process.env.MASUMI_AGENT_ID_MEDAA2 || '',
      medaa3: process.env.MASUMI_AGENT_ID_MEDAA3 || '',
    },
  };
};

export const masumiConfig: MasumiConfig = getConfig();

// Helper function to get base URL without /api/v1
export const getMasumiBaseUrl = (service: 'payment' | 'registry'): string => {
  const config = masumiConfig;
  if (service === 'payment') {
    return config.paymentServiceUrl.replace('/api/v1', '');
  }
  return config.registryServiceUrl.replace('/api/v1', '');
};


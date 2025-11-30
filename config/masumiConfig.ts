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

import Constants from 'expo-constants';

// Get environment variables from Expo config (set in app.config.js)
const getExpoExtra = () => {
  try {
    return Constants.expoConfig?.extra || Constants.manifest?.extra || {};
  } catch {
    return {};
  }
};
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
  // Get environment variables from both process.env and Expo Constants
  const expoExtra = getExpoExtra();
  const getEnv = (key: string, defaultValue: string = ''): string => {
    return process.env[key] || expoExtra[key] || defaultValue;
  };
  
  // ================================================================
  // TOGGLE THIS TO SWITCH BETWEEN LOCAL AND REAL MASUMI NETWORK
  // Set to true to use real Masumi network with actual blockchain transactions
  // ================================================================
  const useRealNetwork = getEnv('USE_REAL_MASUMI_NETWORK') === 'true' || 
                         getEnv('MASUMI_USE_REAL') === 'true' ||
                         false; // Change to true for real network
  
  // Network selection (PREPROD for testing, MAINNET for production)
  // Normalize network value: Preprod -> PREPROD, Mainnet -> MAINNET
  let networkValue = getEnv('MASUMI_NETWORK', 'PREPROD').toUpperCase();
  if (networkValue === 'PREPROD' || networkValue === 'PRE-PROD') {
    networkValue = 'PREPROD';
  } else if (networkValue === 'MAINNET' || networkValue === 'MAIN-NET') {
    networkValue = 'MAINNET';
  }
  const network = networkValue as 'PREPROD' | 'MAINNET';
  
  // Local development configuration
  const defaultHostIp = '10.110.141.10'; // Your computer's IP for mobile testing
  const hostIp = getEnv('MASUMI_HOST_IP', defaultHostIp);
  
  // Select URLs based on mode
  let paymentUrl: string;
  let registryUrl: string;
  
  if (useRealNetwork) {
    // Real Masumi Network URLs
    paymentUrl = getEnv('MASUMI_PAYMENT_SERVICE_URL') || REAL_MASUMI_URLS[network].payment;
    registryUrl = getEnv('MASUMI_REGISTRY_SERVICE_URL') || REAL_MASUMI_URLS[network].registry;
    console.log(`🌐 Using REAL Masumi Network (${network})`);
  } else {
    // Local development URLs
    paymentUrl = getEnv('MASUMI_PAYMENT_SERVICE_URL') || `http://${hostIp}:3001/api/v1`;
    registryUrl = getEnv('MASUMI_REGISTRY_SERVICE_URL') || `http://${hostIp}:3000/api/v1`;
    console.log(`🏠 Using LOCAL Masumi Network (localhost)`);
  }
  
  // API key - get from Masumi dashboard for real network
  // For local: curl http://localhost:3001/api/v1/api-key/
  // Note: In Expo, environment variables are passed through app.config.js extra section
  const apiKey = getEnv('MASUMI_API_KEY');
  
  if (!apiKey) {
    console.warn('⚠️ MASUMI_API_KEY not found!');
    console.warn('   Make sure your .env file contains: MASUMI_API_KEY=this_should_be_very_secure_and_at_least_15_chars');
    console.warn('   Then restart Expo with: npm run start:go -- --clear');
  } else {
    console.log(`🔑 Masumi API Key loaded: ${apiKey.substring(0, 20)}...`);
  }
  
  return {
    paymentServiceUrl: paymentUrl,
    registryServiceUrl: registryUrl,
    network: network,
    isRealNetwork: useRealNetwork,
    apiKey: apiKey,
    
    // Agent IDs - get after registering agents on Masumi
    agentIds: {
      medaa1: getEnv('MASUMI_AGENT_ID_MEDAA1'),
      medaa2: getEnv('MASUMI_AGENT_ID_MEDAA2'),
      medaa3: getEnv('MASUMI_AGENT_ID_MEDAA3'),
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


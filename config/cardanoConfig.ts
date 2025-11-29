/**
 * Cardano Blockchain Configuration
 * 
 * Configuration for Blockfrost API and Cardano network settings
 */
import Constants from 'expo-constants';

export interface CardanoNetworkConfig {
  name: string;
  blockfrostUrl: string;
  networkId: number;
}

export interface CardanoConfig {
  network: 'testnet' | 'mainnet';
  blockfrost: {
    testnet: string;
    mainnet: string;
  };
  networks: {
    testnet: CardanoNetworkConfig;
    mainnet: CardanoNetworkConfig;
  };
  transaction: {
    minUtxo: number; // Minimum ADA in Lovelace (1.5 ADA = 1,500,000 Lovelace)
    estimatedFee: number; // Estimated transaction fee in Lovelace
  };
}

// Get environment variables from Expo config (set in app.config.js)
const getExpoExtra = () => {
  try {
    return Constants.expoConfig?.extra || Constants.manifest?.extra || {};
  } catch {
    return {};
  }
};

// Get Blockfrost API key from Expo config
const getBlockfrostTestnetKey = (): string => {
  const extra = getExpoExtra();
  const key = extra.BLOCKFROST_TESTNET_KEY || 
              process.env.EXPO_PUBLIC_BLOCKFROST_TESTNET_KEY || 
              process.env.BLOCKFROST_TESTNET_KEY ||
              'preprodHdxaAUbZjQOeUD8YCt421BV4E19zvEno'; // Fallback to default testnet key
  
  console.log('🔑 Blockfrost Testnet Key loaded:', key ? `${key.substring(0, 10)}...` : 'NOT FOUND');
  return key;
};

const getBlockfrostMainnetKey = (): string => {
  const extra = getExpoExtra();
  return extra.BLOCKFROST_MAINNET_KEY ||
         process.env.EXPO_PUBLIC_BLOCKFROST_MAINNET_KEY ||
         process.env.BLOCKFROST_MAINNET_KEY || 
         '';
};

export const cardanoConfig: CardanoConfig = {
  network: (process.env.CARDANO_NETWORK || 'testnet') as 'testnet' | 'mainnet',
  
  blockfrost: {
    testnet: getBlockfrostTestnetKey(),
    mainnet: getBlockfrostMainnetKey(),
  },
  
  networks: {
    testnet: {
      name: 'preprod',
      blockfrostUrl: 'https://cardano-preprod.blockfrost.io/api/v0',
      networkId: 0, // PreProd testnet network ID
    },
    mainnet: {
      name: 'mainnet',
      blockfrostUrl: 'https://cardano-mainnet.blockfrost.io/api/v0',
      networkId: 1, // Mainnet network ID
    },
  },
  
  transaction: {
    // Minimum ADA required in a UTxO (1.5 ADA recommended)
    minUtxo: 1500000,
    
    // Estimated transaction fee in Lovelace
    estimatedFee: 200000,
  },
};

// Helper function to get current network configuration
export const getCurrentNetworkConfig = (): CardanoNetworkConfig => {
  return cardanoConfig.networks[cardanoConfig.network];
};

// Helper function to get current Blockfrost API key
export const getCurrentBlockfrostKey = (): string => {
  return cardanoConfig.blockfrost[cardanoConfig.network];
};

// Helper function to get current Blockfrost URL
export const getCurrentBlockfrostUrl = (): string => {
  return getCurrentNetworkConfig().blockfrostUrl;
};


/**
 * Network Configuration for Cardano Networks
 * Provides network-specific settings and validation
 */

export type CardanoNetwork = 'mainnet' | 'preprod';

export interface NetworkConfig {
  name: string;
  networkId: number;
  addressPrefix: string;
  faucetUrl?: string;
  blockfrostUrl: string;
}

/**
 * Network configurations for each supported network
 */
const NETWORK_CONFIGS: Record<CardanoNetwork, NetworkConfig> = {
  mainnet: {
    name: 'Mainnet',
    networkId: 1,
    addressPrefix: 'addr1',
    blockfrostUrl: 'https://cardano-mainnet.blockfrost.io/api/v0',
  },
  preprod: {
    name: 'PreProd Testnet',
    networkId: 0,
    addressPrefix: 'addr_test1',
    faucetUrl: 'https://docs.cardano.org/cardano-testnet/tools/faucet',
    blockfrostUrl: 'https://cardano-preprod.blockfrost.io/api/v0',
  },
};

/**
 * Gets the network configuration for a specific network
 */
export function getNetworkConfig(network: CardanoNetwork): NetworkConfig {
  return NETWORK_CONFIGS[network];
}

/**
 * Gets the default network (PreProd for development)
 */
export function getDefaultNetwork(): CardanoNetwork {
  return 'preprod';
}

/**
 * Validates that an address matches the expected format for the given network
 */
export function validateAddressForNetwork(
  address: string,
  network: CardanoNetwork
): boolean {
  const config = getNetworkConfig(network);
  
  // Basic validation: check if address starts with the expected prefix
  if (!address.startsWith(config.addressPrefix)) {
    return false;
  }
  
  // Additional validation: Cardano addresses are typically base58 encoded
  // Mainnet addresses: addr1... (length ~103 chars)
  // Testnet addresses: addr_test1... (length ~110 chars)
  // This is a basic check - full validation would require bech32 decoding
  if (network === 'mainnet') {
    // Mainnet addresses should start with addr1 and be roughly the right length
    return address.startsWith('addr1') && address.length > 50;
  } else if (network === 'preprod') {
    // PreProd addresses should start with addr_test1 and be roughly the right length
    return address.startsWith('addr_test1') && address.length > 50;
  }
  
  return false;
}




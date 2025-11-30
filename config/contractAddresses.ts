/**
 * Smart Contract Addresses Configuration
 * 
 * This file stores the deployed contract addresses for each network.
 * After deploying contracts to Cardano testnet/mainnet, update these addresses.
 * 
 * Contract addresses are the script hash addresses of deployed Plutus contracts.
 */

export interface ContractAddresses {
  purseTransfer: string;
  charityDistribution: string;
  goalPledgeLock: string;
  vaultLock: string;
  lpPoolCreation: string;
}

/**
 * PreProd Testnet Contract Addresses
 * Update these after deploying contracts to PreProd testnet
 */
export const PREPROD_CONTRACT_ADDRESSES: ContractAddresses = {
  purseTransfer: 'addr_test1...pursetransfer...',
  charityDistribution: 'addr_test1...charitydistribution...',
  goalPledgeLock: 'addr_test1...goalpledgelock...',
  vaultLock: 'addr_test1...vaultlock...',
  lpPoolCreation: '',
};

/**
 * Mainnet Contract Addresses
 * Update these after deploying contracts to Mainnet
 */
export const MAINNET_CONTRACT_ADDRESSES: ContractAddresses = {
  purseTransfer: '',
  charityDistribution: '',
  goalPledgeLock: '',
  vaultLock: '',
  lpPoolCreation: '',
};

/**
 * Get contract addresses for current network
 */
export function getContractAddresses(network: 'preprod' | 'mainnet'): ContractAddresses {
  return network === 'preprod' 
    ? PREPROD_CONTRACT_ADDRESSES 
    : MAINNET_CONTRACT_ADDRESSES;
}

/**
 * Check if contracts are deployed
 */
export function areContractsDeployed(network: 'preprod' | 'mainnet'): boolean {
  const addresses = getContractAddresses(network);
  return !!(
    addresses.purseTransfer &&
    addresses.charityDistribution &&
    addresses.goalPledgeLock &&
    addresses.vaultLock &&
    addresses.lpPoolCreation
  );
}


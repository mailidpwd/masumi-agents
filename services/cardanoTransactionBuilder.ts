/**
 * Cardano Transaction Builder
 * Builds Cardano transactions for smart contract interactions
 * 
 * This service constructs transactions that interact with Plutus smart contracts
 * on the Cardano blockchain. It handles:
 * - Building transaction structures
 * - Adding contract parameters (datum, redeemer)
 * - Calculating fees
 * - Preparing for wallet signing
 */
import { WalletService } from './walletService';
import { TokenService } from './tokenService';
import { PurseType, TokenAmount, SmartContractTransaction } from '../types/rdm';
import { getContractAddresses, areContractsDeployed } from '../config/contractAddresses';
import { WalletInfo } from '../types/cardano';

export interface ContractAddress {
  purseTransfer: string;
  charityDistribution: string;
  goalPledgeLock: string;
  vaultLock: string;
  lpPoolCreation: string;
}

export interface TransactionRequest {
  contractAddress: string;
  datum?: any;
  redeemer?: any;
  inputs: Array<{
    address: string;
    amount: TokenAmount;
  }>;
  outputs: Array<{
    address: string;
    amount: TokenAmount;
  }>;
  metadata?: Record<string, any>;
}

export class CardanoTransactionBuilder {
  private contractAddresses: ContractAddress;
  private tokenService: TokenService;

  constructor(tokenService: TokenService) {
    this.tokenService = tokenService;
    // Load contract addresses from config (will be set after deployment)
    this.contractAddresses = this.loadContractAddresses();
  }

  /**
   * Load contract addresses from configuration
   * In production, these would be loaded from config file or environment
   */
  private loadContractAddresses(): ContractAddress {
    const wallet = WalletService.getConnectedWalletSync();
    const network = wallet?.network || 'preprod';
    
    // Load addresses from config/contractAddresses.ts
    return getContractAddresses(network as 'preprod' | 'mainnet');
  }

  /**
   * Build transfer transaction between purses
   */
  async buildTransferTransaction(
    fromPurse: PurseType,
    toPurse: PurseType,
    amount: TokenAmount,
    goalId?: string
  ): Promise<TransactionRequest> {
    const fromAddress = this.getPurseAddress(fromPurse);
    const toAddress = this.getPurseAddress(toPurse);

    // Build datum for PurseTransfer contract
    const datum = {
      fromPurse: this.purseTypeToContractEnum(fromPurse),
      toPurse: this.purseTypeToContractEnum(toPurse),
      amount: {
        ada: this.adaToLovelace(amount.ada),
        rdmToken: amount.rdmTokens ? BigInt(amount.rdmTokens) : null,
      },
      goalId: goalId ? this.stringToByteString(goalId) : null,
    };

    // Build redeemer (signature will be added during signing)
    const redeemer = {
      signature: '', // Will be populated during signing
    };

    return {
      contractAddress: this.contractAddresses.purseTransfer,
      datum,
      redeemer,
      inputs: [{
        address: fromAddress,
        amount: {
          ada: amount.ada,
          rdmTokens: amount.rdmTokens,
        },
      }],
      outputs: [{
        address: toAddress,
        amount: {
          ada: amount.ada,
          rdmTokens: amount.rdmTokens,
        },
      }],
      metadata: {
        type: 'purse_transfer',
        fromPurse,
        toPurse,
        goalId,
      },
    };
  }

  /**
   * Build charity distribution transaction
   */
  async buildCharityDistributionTransaction(
    fromPurse: PurseType,
    toAddress: string,
    amount: TokenAmount,
    charityId: string,
    goalId?: string
  ): Promise<TransactionRequest> {
    const fromAddress = this.getPurseAddress(fromPurse);

    // Build datum for CharityDistribution contract
    const datum = {
      fromPurse: this.stringToByteString(fromAddress),
      toAddress,
      amount: {
        ada: this.adaToLovelace(amount.ada),
        rdmToken: amount.rdmTokens ? BigInt(amount.rdmTokens) : null,
      },
      charityId: this.stringToByteString(charityId),
      goalId: goalId ? this.stringToByteString(goalId) : null,
    };

    const redeemer = {
      signature: '',
      timestamp: Date.now(),
    };

    return {
      contractAddress: this.contractAddresses.charityDistribution,
      datum,
      redeemer,
      inputs: [{
        address: fromAddress,
        amount: {
          ada: amount.ada,
          rdmTokens: amount.rdmTokens,
        },
      }],
      outputs: [{
        address: toAddress,
        amount: {
          ada: amount.ada,
          rdmTokens: amount.rdmTokens,
        },
      }],
      metadata: {
        type: 'charity_distribution',
        charityId,
        goalId,
      },
    };
  }

  /**
   * Build goal pledge lock transaction
   */
  async buildGoalPledgeLockTransaction(
    goalId: string,
    userId: string,
    pledgedAmount: TokenAmount,
    lockUntil: Date
  ): Promise<TransactionRequest> {
    const baseAddress = this.getPurseAddress(PurseType.BASE);

    // Build datum for GoalPledgeLock contract
    const datum = {
      goalId: this.stringToByteString(goalId),
      userId: this.stringToByteString(userId),
      pledgedAmount: {
        ada: this.adaToLovelace(pledgedAmount.ada),
        rdmToken: pledgedAmount.rdmTokens ? BigInt(pledgedAmount.rdmTokens) : null,
      },
      lockUntil: Math.floor(lockUntil.getTime() / 1000), // POSIXTime
      createdAt: Math.floor(Date.now() / 1000),
    };

    const redeemer = 'LockPledge';

    return {
      contractAddress: this.contractAddresses.goalPledgeLock,
      datum,
      redeemer,
      inputs: [{
        address: baseAddress,
        amount: pledgedAmount,
      }],
      outputs: [{
        address: this.contractAddresses.goalPledgeLock, // Locked in contract
        amount: pledgedAmount,
      }],
      metadata: {
        type: 'goal_pledge_lock',
        goalId,
      },
    };
  }

  /**
   * Build vault lock transaction
   */
  async buildVaultLockTransaction(
    vaultId: string,
    creatorId: string,
    beneficiaryId: string,
    vaultType: 'personal' | 'generational' | 'institutional',
    lockedAmount: TokenAmount,
    lockDuration: number, // years
    lockEndDate: Date
  ): Promise<TransactionRequest> {
    const baseAddress = this.getPurseAddress(PurseType.BASE);

    const datum = {
      vaultId: this.stringToByteString(vaultId),
      creatorId: this.stringToByteString(creatorId),
      beneficiaryId: this.stringToByteString(beneficiaryId),
      vaultType: this.vaultTypeToContractEnum(vaultType),
      lockedAmount: {
        ada: this.adaToLovelace(lockedAmount.ada),
        rdmToken: lockedAmount.rdmTokens ? BigInt(lockedAmount.rdmTokens) : null,
      },
      lockDuration: lockDuration,
      lockStartDate: Math.floor(Date.now() / 1000),
      lockEndDate: Math.floor(lockEndDate.getTime() / 1000),
      minLockAmount: this.adaToLovelace(100), // Minimum 100 ADA
    };

    const redeemer = 'LockVault';

    return {
      contractAddress: this.contractAddresses.vaultLock,
      datum,
      redeemer,
      inputs: [{
        address: baseAddress,
        amount: lockedAmount,
      }],
      outputs: [{
        address: this.contractAddresses.vaultLock, // Locked in contract
        amount: lockedAmount,
      }],
      metadata: {
        type: 'vault_lock',
        vaultId,
        vaultType,
      },
    };
  }

  /**
   * Build LP pool creation transaction
   */
  async buildLPPoolCreationTransaction(
    poolId: string,
    creatorId: string,
    creatorRating: number,
    habitNFTId: string,
    initialStake: TokenAmount
  ): Promise<TransactionRequest> {
    const baseAddress = this.getPurseAddress(PurseType.BASE);

    const datum = {
      poolId: this.stringToByteString(poolId),
      creatorId: this.stringToByteString(creatorId),
      creatorRating: Math.floor(creatorRating * 10), // Convert to integer (7.5 -> 75)
      habitNFTId: this.stringToByteString(habitNFTId),
      initialStake: {
        ada: this.adaToLovelace(initialStake.ada),
        rdmToken: initialStake.rdmTokens ? BigInt(initialStake.rdmTokens) : null,
      },
      totalShares: 1000000, // 1M shares = 1 LP token unit
      createdAt: Math.floor(Date.now() / 1000),
      ratingThreshold: 75, // 7.5 * 10
    };

    const redeemer = 'CreatePool';

    return {
      contractAddress: this.contractAddresses.lpPoolCreation,
      datum,
      redeemer,
      inputs: [{
        address: baseAddress,
        amount: initialStake,
      }],
      outputs: [{
        address: this.contractAddresses.lpPoolCreation, // Pool contract
        amount: initialStake,
      }],
      metadata: {
        type: 'lp_pool_creation',
        poolId,
        creatorRating,
      },
    };
  }

  /**
   * Get purse address from PurseType
   */
  private getPurseAddress(purseType: PurseType): string {
    const purse = this.tokenService.getPurse(purseType);
    return purse.address || '';
  }

  /**
   * Convert PurseType to contract enum
   */
  private purseTypeToContractEnum(purseType: PurseType): string {
    const mapping: Record<PurseType, string> = {
      [PurseType.BASE]: 'BasePurse',
      [PurseType.REWARD]: 'RewardPurse',
      [PurseType.REMORSE]: 'RemorsePurse',
      [PurseType.CHARITY]: 'CharityPurse',
    };
    return mapping[purseType] || 'BasePurse';
  }

  /**
   * Convert vault type to contract enum
   */
  private vaultTypeToContractEnum(vaultType: string): string {
    const mapping: Record<string, string> = {
      personal: 'PersonalVault',
      generational: 'GenerationalVault',
      institutional: 'InstitutionalVault',
    };
    return mapping[vaultType] || 'PersonalVault';
  }

  /**
   * Convert ADA to Lovelace
   */
  private adaToLovelace(ada: number): bigint {
    return BigInt(Math.floor(ada * 1000000));
  }

  /**
   * Convert string to byte string (for contract parameters)
   */
  private stringToByteString(str: string): string {
    // In production, properly encode string to byte string
    return Buffer.from(str, 'utf-8').toString('hex');
  }

  /**
   * Update contract addresses (after deployment)
   */
  updateContractAddresses(addresses: Partial<ContractAddress>): void {
    this.contractAddresses = {
      ...this.contractAddresses,
      ...addresses,
    };
  }

  /**
   * Get current contract addresses
   */
  getContractAddresses(): ContractAddress {
    return { ...this.contractAddresses };
  }
}


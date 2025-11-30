/**
 * MeshJS Transaction Builder
 * Builds Cardano transactions using MeshJS SDK
 * 
 * This service uses MeshJS to build and submit transactions to Cardano blockchain.
 * MeshJS provides a simpler, TypeScript-friendly way to interact with Cardano.
 * 
 * NOTE: MeshJS requires WebAssembly which is not fully supported in React Native.
 * This service will gracefully degrade when MeshJS is unavailable.
 */
import { Platform } from 'react-native';
import { TokenService } from './tokenService';
import { PurseType, TokenAmount } from '../types/rdm';
import { getContractAddresses } from '../config/contractAddresses';
import { WalletService } from './walletService';

// Lazy import MeshJS - only load when needed and when available (not in React Native)
let MeshJSModule: any = null;
let meshJSLoaded = false;
let meshJSAvailable = false;

async function loadMeshJS(): Promise<boolean> {
  if (meshJSLoaded) {
    return meshJSAvailable;
  }
  
  meshJSLoaded = true;
  
  // Skip MeshJS in React Native - WebAssembly not supported
  if (Platform.OS !== 'web') {
    console.warn('⚠️ MeshJS is not available in React Native. Using fallback transaction builder.');
    meshJSAvailable = false;
    return false;
  }
  
  try {
    // Dynamic import - only load when actually needed
    MeshJSModule = await import('@meshsdk/core');
    meshJSAvailable = true;
    console.log('✅ MeshJS loaded successfully');
    return true;
  } catch (error) {
    console.warn('⚠️ Failed to load MeshJS:', error);
    meshJSAvailable = false;
    return false;
  }
}

export interface MeshTransactionRequest {
  contractAddress?: string;
  datum?: string;
  redeemer?: string;
  inputs: Array<{
    address: string;
    amount: TokenAmount;
  }>;
  outputs: Array<{
    address: string;
    amount: TokenAmount;
    datum?: string;
  }>;
  metadata?: Record<string, any>;
}

export class MeshTransactionBuilder {
  private tokenService: TokenService;
  private contractAddresses: ReturnType<typeof getContractAddresses>;
  private network: 'mainnet' | 'testnet';

  constructor(tokenService: TokenService) {
    this.tokenService = tokenService;
    const wallet = WalletService.getConnectedWalletSync();
    const walletNetwork = wallet?.network || 'preprod';
    this.network = walletNetwork === 'mainnet' ? 'mainnet' : 'testnet';
    this.contractAddresses = getContractAddresses(walletNetwork as 'preprod' | 'mainnet');
  }

  /**
   * Get MeshJS network configuration
   */
  getNetwork(): 'mainnet' | 'testnet' {
    return this.network;
  }

  /**
   * Build transfer transaction between purses
   */
  async buildTransferTransaction(
    fromPurse: PurseType,
    toPurse: PurseType,
    amount: TokenAmount,
    goalId?: string
  ): Promise<MeshTransactionRequest> {
    const fromAddress = this.getPurseAddress(fromPurse);
    const toAddress = this.getPurseAddress(toPurse);

    // Convert ADA to Lovelace
    const lovelaceAmount = Math.floor(amount.ada * 1000000);

    return {
      contractAddress: this.contractAddresses.purseTransfer,
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
  ): Promise<MeshTransactionRequest> {
    const fromAddress = this.getPurseAddress(fromPurse);

    return {
      contractAddress: this.contractAddresses.charityDistribution,
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
  ): Promise<MeshTransactionRequest> {
    const baseAddress = this.getPurseAddress(PurseType.BASE);
    const contractAddress = this.contractAddresses.goalPledgeLock;

    // Build datum for Plutus contract
    const datum = this.buildPledgeDatum(goalId, userId, pledgedAmount, lockUntil);

    return {
      contractAddress,
      datum,
      redeemer: 'LockPledge',
      inputs: [{
        address: baseAddress,
        amount: pledgedAmount,
      }],
      outputs: [{
        address: contractAddress, // Locked in contract
        amount: pledgedAmount,
        datum,
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
    lockDuration: number,
    lockEndDate: Date
  ): Promise<MeshTransactionRequest> {
    const baseAddress = this.getPurseAddress(PurseType.BASE);
    const contractAddress = this.contractAddresses.vaultLock;

    const datum = this.buildVaultDatum(
      vaultId,
      creatorId,
      beneficiaryId,
      vaultType,
      lockedAmount,
      lockDuration,
      lockEndDate
    );

    return {
      contractAddress,
      datum,
      redeemer: 'LockVault',
      inputs: [{
        address: baseAddress,
        amount: lockedAmount,
      }],
      outputs: [{
        address: contractAddress,
        amount: lockedAmount,
        datum,
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
  ): Promise<MeshTransactionRequest> {
    const baseAddress = this.getPurseAddress(PurseType.BASE);
    const contractAddress = this.contractAddresses.lpPoolCreation;

    const datum = this.buildLPPoolDatum(
      poolId,
      creatorId,
      creatorRating,
      habitNFTId,
      initialStake
    );

    return {
      contractAddress,
      datum,
      redeemer: 'CreatePool',
      inputs: [{
        address: baseAddress,
        amount: initialStake,
      }],
      outputs: [{
        address: contractAddress,
        amount: initialStake,
        datum,
      }],
      metadata: {
        type: 'lp_pool_creation',
        poolId,
        creatorRating,
      },
    };
  }

  /**
   * Build transaction using MeshJS
   * Note: This requires a wallet instance from MeshJS wallet integration
   * Note: Only available in web environments, not React Native
   */
  async buildMeshTransaction(
    request: MeshTransactionRequest,
    wallet?: any // MeshJS wallet instance
  ): Promise<string> {
    try {
      const loaded = await loadMeshJS();
      if (!loaded || !MeshJSModule) {
        throw new Error('MeshJS not available in React Native. Use CardanoTransactionBuilder instead.');
      }
      
      if (!wallet) {
        throw new Error('Wallet instance required for MeshJS transaction building');
      }

      // Create MeshJS Transaction instance
      const { Transaction } = MeshJSModule;
      const tx = new Transaction({ initiator: wallet });

      // Add outputs
      for (const output of request.outputs) {
        const lovelace = Math.floor(output.amount.ada * 1000000).toString();
        
        if (output.datum && request.contractAddress) {
          // Send to contract address with datum
          tx.sendLovelace(
            {
              address: output.address,
              datum: { value: output.datum },
            },
            lovelace
          );
        } else {
          // Regular payment
          tx.sendLovelace(output.address, lovelace);
        }
      }

      // Add metadata if provided
      if (request.metadata) {
        tx.setMetadata(request.metadata);
      }

      // Build unsigned transaction
      const unsignedTx = await tx.build();
      return unsignedTx;
    } catch (error) {
      console.error('Error building MeshJS transaction:', error);
      throw error;
    }
  }
  
  /**
   * Check if MeshJS is available
   */
  async isMeshJSAvailable(): Promise<boolean> {
    return await loadMeshJS();
  }

  /**
   * Resolve Plutus script address from compiled contract
   */
  async resolveContractAddress(plutusScript: any): Promise<string> {
    try {
      const loaded = await loadMeshJS();
      if (!loaded || !MeshJSModule) {
        throw new Error('MeshJS not available - cannot resolve contract address');
      }
      
      const script = {
        code: plutusScript.code || plutusScript.compiledCode,
        version: plutusScript.version || 'V2',
      };
      return MeshJSModule.resolvePlutusScriptAddress(script, 0);
    } catch (error) {
      console.error('Error resolving contract address:', error);
      throw error;
    }
  }

  /**
   * Helper: Get purse address
   */
  private getPurseAddress(purseType: PurseType): string {
    const purse = this.tokenService.getPurse(purseType);
    return purse.address || '';
  }

  /**
   * Helper: Build pledge datum (simplified - in production, use proper Plutus datum encoding)
   */
  private buildPledgeDatum(
    goalId: string,
    userId: string,
    pledgedAmount: TokenAmount,
    lockUntil: Date
  ): string {
    // In production, this would properly encode Plutus datum
    // For now, return a JSON representation
    return JSON.stringify({
      goalId,
      userId,
      pledgedAmount: {
        ada: Math.floor(pledgedAmount.ada * 1000000),
        rdmToken: pledgedAmount.rdmTokens || null,
      },
      lockUntil: Math.floor(lockUntil.getTime() / 1000),
      createdAt: Math.floor(Date.now() / 1000),
    });
  }

  /**
   * Helper: Build vault datum
   */
  private buildVaultDatum(
    vaultId: string,
    creatorId: string,
    beneficiaryId: string,
    vaultType: string,
    lockedAmount: TokenAmount,
    lockDuration: number,
    lockEndDate: Date
  ): string {
    return JSON.stringify({
      vaultId,
      creatorId,
      beneficiaryId,
      vaultType,
      lockedAmount: {
        ada: Math.floor(lockedAmount.ada * 1000000),
        rdmToken: lockedAmount.rdmTokens || null,
      },
      lockDuration,
      lockStartDate: Math.floor(Date.now() / 1000),
      lockEndDate: Math.floor(lockEndDate.getTime() / 1000),
      minLockAmount: 100000000, // 100 ADA in Lovelace
    });
  }

  /**
   * Helper: Build LP pool datum
   */
  private buildLPPoolDatum(
    poolId: string,
    creatorId: string,
    creatorRating: number,
    habitNFTId: string,
    initialStake: TokenAmount
  ): string {
    return JSON.stringify({
      poolId,
      creatorId,
      creatorRating: Math.floor(creatorRating * 10),
      habitNFTId,
      initialStake: {
        ada: Math.floor(initialStake.ada * 1000000),
        rdmToken: initialStake.rdmTokens || null,
      },
      totalShares: 1000000,
      createdAt: Math.floor(Date.now() / 1000),
      ratingThreshold: 75,
    });
  }

  /**
   * Update contract addresses
   */
  updateContractAddresses(addresses: Partial<typeof this.contractAddresses>): void {
    this.contractAddresses = {
      ...this.contractAddresses,
      ...addresses,
    };
  }
}


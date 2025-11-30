/**
 * Token Service
 * Manages ADA and RDM tokens across multiple purses (base, reward, remorse, charity)
 */
import { WalletService } from './walletService';
import { Purse, PurseType, TokenAmount } from '../types/rdm';

export class TokenService {
  private purses: Record<PurseType, Purse>;
  private baseAddress: string | null = null;

  constructor() {
    // Initialize purses with default values (zero balances)
    this.purses = {
      [PurseType.BASE]: this.createDefaultPurse(PurseType.BASE),
      [PurseType.REWARD]: this.createDefaultPurse(PurseType.REWARD),
      [PurseType.REMORSE]: this.createDefaultPurse(PurseType.REMORSE),
      [PurseType.CHARITY]: this.createDefaultPurse(PurseType.CHARITY),
    };
    // Balances will be loaded from wallet when initialize() is called
  }

  /**
   * Initialize token service with wallet connection
   */
  async initialize(): Promise<boolean> {
    const wallet = WalletService.getConnectedWalletSync();
    if (!wallet) {
      return false;
    }

    this.baseAddress = wallet.address;
    // For demo, use same address with different suffixes for purses
    // In production, these would be separate addresses or smart contract addresses
    this.purses[PurseType.BASE].address = wallet.address;
    this.purses[PurseType.REWARD].address = `${wallet.address.slice(0, -8)}reward`;
    this.purses[PurseType.REMORSE].address = `${wallet.address.slice(0, -8)}remorse`;
    this.purses[PurseType.CHARITY].address = `${wallet.address.slice(0, -8)}charity`;

    // Load initial balances (mock for now)
    await this.refreshBalances();
    return true;
  }

  /**
   * Create default purse
   */
  private createDefaultPurse(type: PurseType): Purse {
    return {
      type,
      address: '',
      balance: {
        ada: 0,
        rdmTokens: 0,
      },
      lastUpdated: new Date(),
    };
  }

  /**
   * Get balance for a specific purse
   */
  getPurseBalance(purseType: PurseType): TokenAmount {
    return { ...this.purses[purseType].balance };
  }

  /**
   * Get all purses
   */
  getAllPurses(): Record<PurseType, Purse> {
    return { ...this.purses };
  }

  /**
   * Get specific purse
   */
  getPurse(purseType: PurseType): Purse {
    return { ...this.purses[purseType] };
  }

  /**
   * Check if base purse has sufficient balance
   * IMPORTANT: When spending RDM tokens, there's a penalty of 2 ADA per 1 RDM
   */
  hasSufficientBalance(amount: TokenAmount): boolean {
    const baseBalance = this.purses[PurseType.BASE].balance;
    
    // Check ADA requirement
    let requiredADA = amount.ada || 0;
    
    // Apply penalty: 1 RDM = 2 ADA penalty
    if (amount.rdmTokens && amount.rdmTokens > 0) {
      const adaPenalty = amount.rdmTokens * 2; // 2 ADA per RDM
      requiredADA += adaPenalty;
      
      // Also check if we have enough RDM tokens
      if (amount.rdmTokens > (baseBalance.rdmTokens || 0)) {
        return false;
      }
    }
    
    // Check if we have enough ADA (including penalty)
    if (requiredADA > baseBalance.ada) {
      return false;
    }
    
    return true;
  }

  /**
   * Update purse balance (called after transactions)
   */
  updatePurseBalance(purseType: PurseType, newBalance: TokenAmount): void {
    this.purses[purseType].balance = { ...newBalance };
    this.purses[purseType].lastUpdated = new Date();
  }

  /**
   * Deduct from base purse (for pledge/spending)
   * IMPORTANT: When spending RDM tokens, there's a penalty of 2 ADA per 1 RDM
   * Example: Spending 1 RDM costs 1 RDM + 2 ADA
   */
  deductFromBasePurse(amount: TokenAmount): boolean {
    if (!this.hasSufficientBalance(amount)) {
      return false;
    }

    const baseBalance = this.purses[PurseType.BASE].balance;
    
    // Calculate ADA deduction (including penalty for RDM spending)
    let adaToDeduct = amount.ada || 0;
    
    // Apply penalty: 1 RDM = 2 ADA penalty
    if (amount.rdmTokens && amount.rdmTokens > 0) {
      const adaPenalty = amount.rdmTokens * 2; // 2 ADA per RDM
      adaToDeduct += adaPenalty;
      
      console.log(`💰 Spending ${amount.rdmTokens} RDM with penalty: ${adaPenalty} ADA`);
    }
    
    // Deduct RDM tokens
    const rdmToDeduct = amount.rdmTokens || 0;
    
    this.purses[PurseType.BASE].balance = {
      ada: baseBalance.ada - adaToDeduct,
      rdmTokens: baseBalance.rdmTokens
        ? (baseBalance.rdmTokens - rdmToDeduct)
        : undefined,
    };
    this.purses[PurseType.BASE].lastUpdated = new Date();
    
    console.log(`💸 Deducted: ${adaToDeduct} ADA, ${rdmToDeduct} RDM. New balance: ${this.purses[PurseType.BASE].balance.ada} ADA, ${this.purses[PurseType.BASE].balance.rdmTokens || 0} RDM`);
    
    return true;
  }

  /**
   * Simulate balance addition (for rewards/remorse)
   */
  addToPurse(purseType: PurseType, amount: TokenAmount): void {
    const purseBalance = this.purses[purseType].balance;
    this.purses[purseType].balance = {
      ada: purseBalance.ada + amount.ada,
      rdmTokens: (purseBalance.rdmTokens || 0) + (amount.rdmTokens || 0),
    };
    this.purses[purseType].lastUpdated = new Date();
  }

  /**
   * Refresh balances from blockchain using Blockfrost API
   * Gets real ADA balance and RDM token balance from the wallet address
   */
  async refreshBalances(): Promise<void> {
    const wallet = WalletService.getConnectedWalletSync();
    if (!wallet || !this.baseAddress) {
      console.warn('⚠️ Cannot refresh balances: No wallet connected');
      return;
    }

    try {
      // Get real balance from Blockfrost API
      const fullBalance = await WalletService.getFullBalance();
      const currentLocalBalance = this.purses[PurseType.BASE].balance;
      
      // IMPORTANT: Preserve local deductions in test environment
      // Update logic (in priority order):
      // 1. If local balance is 0, ALWAYS update from blockchain (first load or reset)
      // 2. If blockchain balance is LOWER than local, update (real transaction happened)
      // 3. If local balance is LOWER than blockchain AND lastUpdated exists, preserve (local deductions made)
      // 4. Otherwise, update (normal refresh)
      const isZeroBalance = currentLocalBalance.ada === 0;
      const blockchainLower = fullBalance.ada < currentLocalBalance.ada;
      const hasLocalDeductions = currentLocalBalance.ada > 0 && currentLocalBalance.ada < fullBalance.ada && this.purses[PurseType.BASE].lastUpdated;
      
      // Priority: zero balance always updates, then blockchain lower, then check local deductions
      const shouldUpdate = isZeroBalance || blockchainLower || !hasLocalDeductions;
      
      if (shouldUpdate) {
        // Update base purse with real balance
        this.purses[PurseType.BASE].balance = {
          ada: fullBalance.ada, // Real ADA balance from blockchain
          rdmTokens: parseInt(fullBalance.rdmTokens, 10) || 0, // Real RDM token balance
        };
        
        this.purses[PurseType.BASE].lastUpdated = new Date();
        
        // Only log if balance changed significantly (reduce console spam)
        const oldBalance = currentLocalBalance.ada;
        if (Math.abs(fullBalance.ada - oldBalance) > 0.01) {
          console.log(`✅ Refreshed base purse balance: ${fullBalance.ada} ADA (was ${oldBalance} ADA)`);
        }
      } else {
        // Preserve local deductions - blockchain hasn't updated yet (test environment)
        // Local balance is higher because we've made deductions that aren't on blockchain yet
        console.log(`💾 Preserving local balance: ${currentLocalBalance.ada.toFixed(2)} ADA (blockchain: ${fullBalance.ada.toFixed(2)} ADA - local deductions not yet on-chain)`);
      }

      // Other purses (reward, remorse, charity) are managed separately
      // They start at 0 and are updated when rewards/remorse/charity transactions occur
      // For now, keep them at 0 unless they have been set elsewhere
      if (!this.purses[PurseType.REWARD].lastUpdated) {
        this.purses[PurseType.REWARD].balance = { ada: 0, rdmTokens: 0 };
      }
      if (!this.purses[PurseType.REMORSE].lastUpdated) {
        this.purses[PurseType.REMORSE].balance = { ada: 0, rdmTokens: 0 };
      }
      if (!this.purses[PurseType.CHARITY].lastUpdated) {
        this.purses[PurseType.CHARITY].balance = { ada: 0, rdmTokens: 0 };
      }
    } catch (error) {
      console.error('❌ Failed to refresh balances from blockchain:', error);
      // Keep existing balances on error
    }
  }

  /**
   * Get total balance across all purses
   */
  getTotalBalance(): TokenAmount {
    const total: TokenAmount = { ada: 0, rdmTokens: 0 };
    
    Object.values(this.purses).forEach((purse) => {
      total.ada += purse.balance.ada;
      total.rdmTokens = (total.rdmTokens || 0) + (purse.balance.rdmTokens || 0);
    });

    return total;
  }

  /**
   * Format ADA amount for display (convert lovelace to ADA)
   */
  static formatADA(lovelace: number): string {
    return (lovelace / 1000000).toFixed(2);
  }

  /**
   * Convert ADA to lovelace
   */
  static adaToLovelace(ada: number): number {
    return Math.round(ada * 1000000);
  }

  /**
   * Format token amount for display
   * Note: amount.ada is in ADA units (not lovelace), so format directly
   */
  static formatTokenAmount(amount: TokenAmount): string {
    // ADA is already in ADA units, not lovelace, so format directly
    const adaPart = amount.ada > 0 ? `${(amount.ada).toFixed(2)} ADA` : '';
    const rdmPart = amount.rdmTokens ? `${amount.rdmTokens} RDM` : '';
    
    if (adaPart && rdmPart) {
      return `${adaPart} + ${rdmPart}`;
    }
    return adaPart || rdmPart || '0';
  }
}


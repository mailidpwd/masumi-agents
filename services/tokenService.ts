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
    // Initialize purses with default values
    this.purses = {
      [PurseType.BASE]: this.createDefaultPurse(PurseType.BASE),
      [PurseType.REWARD]: this.createDefaultPurse(PurseType.REWARD),
      [PurseType.REMORSE]: this.createDefaultPurse(PurseType.REMORSE),
      [PurseType.CHARITY]: this.createDefaultPurse(PurseType.CHARITY),
    };
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
   */
  hasSufficientBalance(amount: TokenAmount): boolean {
    const baseBalance = this.purses[PurseType.BASE].balance;
    if (amount.ada > baseBalance.ada) {
      return false;
    }
    if (amount.rdmTokens && baseBalance.rdmTokens) {
      if (amount.rdmTokens > baseBalance.rdmTokens) {
        return false;
      }
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
   * Simulate balance deduction (for pledge)
   * In production, this would check on-chain balance
   */
  deductFromBasePurse(amount: TokenAmount): boolean {
    if (!this.hasSufficientBalance(amount)) {
      return false;
    }

    const baseBalance = this.purses[PurseType.BASE].balance;
    this.purses[PurseType.BASE].balance = {
      ada: baseBalance.ada - amount.ada,
      rdmTokens: baseBalance.rdmTokens
        ? (baseBalance.rdmTokens - (amount.rdmTokens || 0))
        : undefined,
    };
    this.purses[PurseType.BASE].lastUpdated = new Date();
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
   * Refresh balances from blockchain (mock for now)
   */
  async refreshBalances(): Promise<void> {
    const wallet = WalletService.getConnectedWalletSync();
    if (!wallet || !this.baseAddress) {
      return;
    }

    // Mock: Simulate fetching balances
    // In production, this would query Cardano blockchain
    // For demo, use default values
    this.purses[PurseType.BASE].balance = {
      ada: 1000, // Mock 1000 ADA
      rdmTokens: 5000, // Mock 5000 RDM tokens
    };

    // Other purses start at 0
    this.purses[PurseType.REWARD].balance = { ada: 0, rdmTokens: 0 };
    this.purses[PurseType.REMORSE].balance = { ada: 0, rdmTokens: 0 };
    this.purses[PurseType.CHARITY].balance = { ada: 0, rdmTokens: 0 };
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
   */
  static formatTokenAmount(amount: TokenAmount): string {
    const adaPart = amount.ada > 0 ? `${this.formatADA(amount.ada)} ADA` : '';
    const rdmPart = amount.rdmTokens ? `${amount.rdmTokens} RDM` : '';
    
    if (adaPart && rdmPart) {
      return `${adaPart} + ${rdmPart}`;
    }
    return adaPart || rdmPart || '0';
  }
}


/**
 * Blockfrost Service
 * 
 * Wrapper for Blockfrost API to query Cardano blockchain
 * Provides methods for address queries, transaction queries, and token balances
 */
import { cardanoConfig, getCurrentBlockfrostKey, getCurrentBlockfrostUrl } from '../config/cardanoConfig';

export interface AddressInfo {
  address: string;
  balance: {
    ada: number; // In Lovelace
    lovelace: string; // Raw lovelace as string
    tokens: TokenBalance[];
  };
  stakeAddress?: string;
  utxos?: UTxO[];
}

export interface TokenBalance {
  unit: string; // Policy ID + Asset Name (hex)
  quantity: string; // Amount as string
  policyId?: string;
  assetName?: string;
}

export interface UTxO {
  txHash: string;
  index: number;
  address: string;
  amount: {
    lovelace: string;
    tokens: TokenBalance[];
  };
}

export interface TransactionInfo {
  txHash: string;
  blockHash?: string;
  blockHeight?: number;
  blockTime: number;
  slot?: number;
  confirmations: number;
  inputs: Array<{
    address: string;
    amount: Array<{
      unit: string;
      quantity: string;
    }>;
  }>;
  outputs: Array<{
    address: string;
    amount: Array<{
      unit: string;
      quantity: string;
    }>;
  }>;
}

export interface TokenInfo {
  unit: string;
  policyId: string;
  assetName: string;
  quantity: string;
  decimals?: number;
}

export class BlockfrostService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = getCurrentBlockfrostKey();
    this.baseUrl = getCurrentBlockfrostUrl();
  }

  /**
   * Convert Lovelace to ADA
   */
  private lovelaceToADA(lovelace: string | number): number {
    const lovelaceNum = typeof lovelace === 'string' ? parseInt(lovelace, 10) : lovelace;
    return lovelaceNum / 1_000_000;
  }

  /**
   * Make API request to Blockfrost
   */
  private async request<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Log for debugging
    console.log(`🔍 Blockfrost API Request: ${url}`);
    console.log(`   API Key: ${this.apiKey ? `${this.apiKey.substring(0, 10)}...` : 'MISSING'}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'project_id': this.apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Blockfrost API Error: ${response.status} ${response.statusText}`);
      console.error(`   Response: ${errorText}`);
      throw new Error(`Blockfrost API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`✅ Blockfrost API Success: ${endpoint}`);
    return data;
  }

  /**
   * Get address information including balance
   */
  async getAddressInfo(address: string): Promise<AddressInfo> {
    try {
      console.log(`📊 Fetching address info for: ${address.substring(0, 20)}...`);
      
      // Get address info
      const addressData = await this.request<any>(`/addresses/${address}`);
      
      console.log(`📦 Address data received:`, JSON.stringify(addressData).substring(0, 200));
      
      // Get UTxOs
      const utxos = await this.getAddressUtxos(address);

      // Parse tokens from amounts
      const tokens: TokenBalance[] = [];
      if (addressData.amount && Array.isArray(addressData.amount)) {
        addressData.amount.forEach((item: any) => {
          if (item.unit !== 'lovelace') {
            tokens.push({
              unit: item.unit,
              quantity: item.quantity,
            });
          }
        });
      }

      // Find lovelace amount
      const lovelaceAmount = addressData.amount?.find((a: any) => a.unit === 'lovelace')?.quantity || '0';
      const adaAmount = this.lovelaceToADA(lovelaceAmount);
      
      console.log(`💰 Balance found: ${adaAmount} ADA (${lovelaceAmount} lovelace)`);
      console.log(`🪙 Tokens found: ${tokens.length}`);

      return {
        address: addressData.address,
        balance: {
          ada: adaAmount,
          lovelace: lovelaceAmount,
          tokens,
        },
        stakeAddress: addressData.stake_address,
        utxos: utxos || [],
      };
    } catch (error: any) {
      // Handle 404 - address not found (new address or not used yet)
      if (error.message?.includes('404') || error.message?.includes('Not Found')) {
        console.log(`⚠️ Address ${address} not found in Blockfrost (may be a new address with no transactions yet)`);
        // Return empty address info for new addresses
        return {
          address,
          balance: {
            ada: 0,
            lovelace: '0',
            tokens: [],
          },
          utxos: [],
        };
      }
      console.error(`❌ Failed to get address info for ${address}:`, error);
      // Don't throw - return empty balance instead to prevent app crash
      return {
        address,
        balance: {
          ada: 0,
          lovelace: '0',
          tokens: [],
        },
        utxos: [],
      };
    }
  }

  /**
   * Get all UTxOs for an address
   */
  async getAddressUtxos(address: string): Promise<UTxO[]> {
    try {
      const utxos = await this.request<any[]>(`/addresses/${address}/utxos`);

      return utxos.map((utxo: any) => ({
        txHash: utxo.tx_hash,
        index: utxo.output_index,
        address: utxo.address,
        amount: {
          lovelace: utxo.amount?.find((a: any) => a.unit === 'lovelace')?.quantity || '0',
          tokens: utxo.amount
            ?.filter((a: any) => a.unit !== 'lovelace')
            .map((a: any) => ({
              unit: a.unit,
              quantity: a.quantity,
            })) || [],
        },
      }));
    } catch (error) {
      console.error(`Failed to get UTxOs for ${address}:`, error);
      return [];
    }
  }

  /**
   * Get transaction details
   */
  async getTransaction(txHash: string): Promise<TransactionInfo> {
    try {
      const tx = await this.request<any>(`/txs/${txHash}`);
      
      // Get transaction UTxOs
      const inputs = await this.request<any[]>(`/txs/${txHash}/utxos`);

      return {
        txHash: tx.hash,
        blockHash: tx.block,
        blockHeight: tx.block_height,
        blockTime: tx.block_time || 0,
        slot: tx.slot,
        confirmations: tx.block_height ? (await this.getLatestBlockHeight()) - tx.block_height + 1 : 0,
        inputs: inputs.inputs?.map((input: any) => ({
          address: input.address,
          amount: input.amount || [],
        })) || [],
        outputs: inputs.outputs?.map((output: any) => ({
          address: output.address,
          amount: output.amount || [],
        })) || [],
      };
    } catch (error) {
      console.error(`Failed to get transaction ${txHash}:`, error);
      throw error;
    }
  }

  /**
   * Get latest block height
   */
  async getLatestBlockHeight(): Promise<number> {
    try {
      const latest = await this.request<any>('/blocks/latest');
      return latest.height || 0;
    } catch (error) {
      console.error('Failed to get latest block height:', error);
      return 0;
    }
  }

  /**
   * Get token balance for a specific token
   */
  async getTokenBalance(address: string, policyId: string, assetName: string): Promise<string> {
    try {
      const addressInfo = await this.getAddressInfo(address);
      
      // Find token matching policy ID and asset name
      const tokenUnit = policyId + assetName;
      const token = addressInfo.balance.tokens.find(t => t.unit === tokenUnit);
      
      return token?.quantity || '0';
    } catch (error) {
      console.error(`Failed to get token balance for ${address}:`, error);
      return '0';
    }
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForConfirmation(txHash: string, confirmations: number = 1, maxWaitSeconds: number = 300): Promise<boolean> {
    const startTime = Date.now();
    const maxWaitMs = maxWaitSeconds * 1000;

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const tx = await this.getTransaction(txHash);
        
        if (tx.confirmations >= confirmations) {
          return true;
        }

        // Wait 5 seconds before next check
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (error) {
        // Transaction might not be found yet, continue waiting
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    return false;
  }

  /**
   * Submit transaction to Cardano network
   * Note: Blockfrost doesn't support transaction submission
   * Transactions must be submitted via wallet or Cardano CLI
   */
  async submitTransaction(txCbor: string): Promise<{ success: boolean; error?: string }> {
    // Blockfrost API doesn't support transaction submission
    // This would need to be done via wallet SDK or Cardano CLI
    return {
      success: false,
      error: 'Transaction submission not supported via Blockfrost. Use wallet SDK or Cardano CLI.',
    };
  }

  /**
   * Get ADA balance for an address
   */
  async getAdaBalance(address: string): Promise<number> {
    try {
      const addressInfo = await this.getAddressInfo(address);
      return addressInfo.balance.ada;
    } catch (error) {
      console.error(`Failed to get ADA balance for ${address}:`, error);
      return 0;
    }
  }

  /**
   * Check if address exists and is valid
   */
  async isValidAddress(address: string): Promise<boolean> {
    try {
      await this.getAddressInfo(address);
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Singleton instance
let blockfrostServiceInstance: BlockfrostService | null = null;

export function getBlockfrostService(): BlockfrostService {
  if (!blockfrostServiceInstance) {
    blockfrostServiceInstance = new BlockfrostService();
  }
  return blockfrostServiceInstance;
}


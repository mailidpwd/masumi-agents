import { 
  WalletInfo, 
  WalletConnectionResult,
  SignTransactionRequest,
  SignTransactionResult,
  SubmitTransactionResult,
} from '../types/cardano';
import { Linking, Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CardanoNetwork, getNetworkConfig, getDefaultNetwork, validateAddressForNetwork } from './networkConfig';
import * as LinkingExpo from 'expo-linking';
import { isExpoGo, FEATURES } from '../utils/featureFlags';

const NETWORK_PREFERENCE_KEY = '@wallet:network_preference';
const WALLET_CONNECTION_KEY = '@wallet:connection';

/**
 * Service for handling Cardano wallet connections
 * Connects to real Cardano wallets via WebView or deep linking
 */
export class WalletService {
  private static connectedWallet: WalletInfo | null = null;
  private static walletAPI: any = null;

  /**
   * Gets the saved network preference from storage
   */
  static async getNetworkPreference(): Promise<CardanoNetwork> {
    try {
      const saved = await AsyncStorage.getItem(NETWORK_PREFERENCE_KEY);
      if (saved === 'mainnet' || saved === 'preprod') {
        return saved as CardanoNetwork;
      }
    } catch (error) {
      console.error('Error loading network preference:', error);
    }
    return getDefaultNetwork();
  }

  /**
   * Saves the network preference to storage
   */
  static async setNetworkPreference(network: CardanoNetwork): Promise<void> {
    try {
      await AsyncStorage.setItem(NETWORK_PREFERENCE_KEY, network);
    } catch (error) {
      console.error('Error saving network preference:', error);
    }
  }

  /**
   * Attempts to connect to a real Cardano wallet
   * Uses WebView with cardano-connect-with-wallet or deep linking for mobile wallets
   * Defaults to PreProd testnet for development
   * 
   * In Expo Go: Only manual address entry is supported
   */
  static async connectWallet(walletName: string = 'nami', network: CardanoNetwork = getDefaultNetwork()): Promise<WalletConnectionResult> {
    try {
      // Check if in Expo Go mode - only manual entry works
      if (isExpoGo()) {
        return {
          success: false,
          error: 'EXPO_GO_MODE: Please use manual address entry to connect your wallet.',
        };
      }

      // Check if we're in a WebView context with cardano API
      const isWebView = typeof window !== 'undefined' && (window as any).cardano;
      
      if (isWebView) {
        return await this.connectViaWebAPI(walletName, network);
      }

      // For mobile/React Native, we need WebView component
      // This will be handled by WalletConnection component
      // Return error to trigger WebView modal
      throw new Error('WEBVIEW_REQUIRED');
    } catch (error) {
      if (error instanceof Error && error.message === 'WEBVIEW_REQUIRED') {
        // Re-throw to trigger WebView in component
        throw error;
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to connect wallet',
      };
    }
  }

  /**
   * Connects to wallet via Web API (for WebView context)
   */
  private static async connectViaWebAPI(walletName: string, network: CardanoNetwork): Promise<WalletConnectionResult> {
    try {
      const cardano = (window as any).cardano;
      
      if (!cardano || !cardano[walletName]) {
        throw new Error(`${walletName} wallet not found. Please install the ${walletName} browser extension.`);
      }

      const walletAPI = cardano[walletName];
      
      // Check if wallet is enabled
      const isEnabled = await walletAPI.isEnabled();
      if (!isEnabled) {
        throw new Error(`${walletName} wallet is not enabled. Please enable it in your browser extension.`);
      }

      // Connect to wallet
      await walletAPI.enable();
      
      // Get network ID from wallet
      const walletNetworkId = await walletAPI.getNetworkId();
      
      // Verify network matches
      const expectedNetworkId = network === 'preprod' ? 0 : 1; // PreProd = 0, Mainnet = 1
      if (walletNetworkId !== expectedNetworkId) {
        throw new Error(`Wallet is on ${walletNetworkId === 0 ? 'PreProd' : 'Mainnet'} but you selected ${network === 'preprod' ? 'PreProd' : 'Mainnet'}. Please switch your wallet network.`);
      }

      // Get real wallet address
      const addresses = await walletAPI.getUsedAddresses();
      if (!addresses || addresses.length === 0) {
        throw new Error('No addresses found in wallet');
      }

      const address = addresses[0];
      
      // Validate address format for network
      if (!validateAddressForNetwork(address, network)) {
        throw new Error(`Address format does not match ${network} network`);
      }

      const walletInfo: WalletInfo = {
        address: address,
        network: network,
        isConnected: true,
        walletName: walletName,
      };

      this.connectedWallet = walletInfo;
      this.walletAPI = walletAPI;
      
        // Save connection and network preference
        await AsyncStorage.setItem(WALLET_CONNECTION_KEY, JSON.stringify(walletInfo));
        await this.setNetworkPreference(network);
        
        // Store wallet API for future use
        this.walletAPI = walletAPI;
        
        return {
          success: true,
          wallet: walletInfo,
        };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to connect wallet',
      };
    }
  }

  /**
   * Connects to wallet via mobile app (deep linking or WebView)
   */
  private static async connectViaMobile(walletName: string, network: CardanoNetwork): Promise<WalletConnectionResult> {
    try {
      // For mobile, we'll use a WebView approach
      // This requires opening a WebView with cardano-connect-with-wallet
      // For now, we'll prompt user to use a browser-based wallet or provide address manually
      
      // Try to open wallet app via deep link
      const walletUrl = this.getWalletUrl(walletName);
      
      if (walletUrl && Platform.OS !== 'web') {
        const canOpen = await Linking.canOpenURL(walletUrl);
        if (canOpen) {
          await Linking.openURL(walletUrl);
        }
      }

      // For mobile, we need to use WebView with cardano-connect-with-wallet
      // This will be handled by the WalletConnection component
      // Return a special result that indicates WebView is needed
      throw new Error('Please connect via WebView. Opening wallet connection page...');
    } catch (error) {
      // If it's our special error, re-throw it
      if (error instanceof Error && error.message.includes('WebView')) {
        throw error;
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to connect wallet on mobile',
      };
    }
  }

  /**
   * Disconnects the current wallet - COMPLETELY clears all wallet data
   */
  static async disconnectWallet(): Promise<void> {
    console.log('🔌 Disconnecting wallet...');
    try {
      // Disable wallet API if connected
      if (this.walletAPI && typeof this.walletAPI.disable === 'function') {
        try {
          await this.walletAPI.disable();
        } catch (error) {
          console.error('Error disabling wallet:', error);
        }
      }
      
      // Clear in-memory wallet
      this.connectedWallet = null;
      this.walletAPI = null;
      
      // Clear ALL wallet-related storage
      await AsyncStorage.removeItem(WALLET_CONNECTION_KEY);
      await AsyncStorage.removeItem(NETWORK_PREFERENCE_KEY);
      
      // Also clear any cached data
      await AsyncStorage.removeItem('@wallet:address');
      await AsyncStorage.removeItem('@rdm:wallet');
      
      console.log('✅ Wallet disconnected and all data cleared');
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      // Force clear anyway
      this.connectedWallet = null;
      this.walletAPI = null;
    }
  }
  
  /**
   * Force clear all wallet data (for debugging)
   */
  static async forceClealAllWalletData(): Promise<void> {
    console.log('🧹 Force clearing ALL wallet data...');
    this.connectedWallet = null;
    this.walletAPI = null;
    
    const keys = await AsyncStorage.getAllKeys();
    const walletKeys = keys.filter(k => k.includes('wallet') || k.includes('Wallet'));
    if (walletKeys.length > 0) {
      await AsyncStorage.multiRemove(walletKeys);
      console.log(`✅ Cleared ${walletKeys.length} wallet-related keys:`, walletKeys);
    }
  }

  /**
   * Gets the currently connected wallet
   * Also loads from storage if not in memory
   */
  static async getConnectedWallet(): Promise<WalletInfo | null> {
    if (this.connectedWallet) {
      return this.connectedWallet;
    }

    // Try to load from storage
    try {
      const stored = await AsyncStorage.getItem(WALLET_CONNECTION_KEY);
      if (stored) {
        const walletInfo = JSON.parse(stored) as WalletInfo;
        this.connectedWallet = walletInfo;
        return walletInfo;
      }
    } catch (error) {
      console.error('Error loading wallet from storage:', error);
    }

    return null;
  }

  /**
   * Synchronous version for backward compatibility
   */
  static getConnectedWalletSync(): WalletInfo | null {
    return this.connectedWallet;
  }

  /**
   * Gets wallet deep link URL or web URL
   */
  private static getWalletUrl(walletName: string): string | null {
    const walletUrls: Record<string, string> = {
      nami: 'nami://',
      eternl: 'eternl://',
      flint: 'flintwallet://',
      // Web-based wallets can use web URLs
      web: 'https://namiwallet.app/',
    };

    return walletUrls[walletName.toLowerCase()] || null;
  }

  /**
   * Gets wallet balance from Blockfrost API (real blockchain query)
   */
  static async getBalance(): Promise<string> {
    if (!this.connectedWallet) {
      throw new Error('No wallet connected');
    }

    try {
      // Try to get balance from wallet API first (if available in WebView)
      if (this.walletAPI && typeof this.walletAPI.getBalance === 'function') {
        try {
          const balance = await this.walletAPI.getBalance();
          // Balance is in Lovelace (1 ADA = 1,000,000 Lovelace)
          const adaBalance = Number(balance) / 1000000;
          return adaBalance.toFixed(2);
        } catch (walletError) {
          console.warn('Wallet API balance failed, falling back to Blockfrost:', walletError);
        }
      }

      // Use Blockfrost API to get real balance from blockchain
      const { getBlockfrostService } = await import('./blockfrostService');
      const blockfrost = getBlockfrostService();
      const adaBalance = await blockfrost.getAdaBalance(this.connectedWallet.address);
      return adaBalance.toFixed(2);
    } catch (error) {
      console.error('Error getting balance:', error);
      return '0.00';
    }
  }

  /**
   * Gets wallet balance with tokens (ADA + RDM tokens)
   */
  static async getFullBalance(): Promise<{ ada: number; rdmTokens: string; lovelace: string }> {
    if (!this.connectedWallet) {
      throw new Error('No wallet connected');
    }

    try {
      const { getBlockfrostService } = await import('./blockfrostService');
      const blockfrost = getBlockfrostService();
      const addressInfo = await blockfrost.getAddressInfo(this.connectedWallet.address);

      // Find RDM tokens if configured
      const rdmTokenUnit = addressInfo.balance.tokens.find(t => 
        t.unit.includes('52444D') // RDM in hex
      );
      const rdmBalance = rdmTokenUnit?.quantity || '0';

      return {
        ada: addressInfo.balance.ada,
        rdmTokens: rdmBalance,
        lovelace: addressInfo.balance.lovelace,
      };
    } catch (error: any) {
      // Handle 404 errors gracefully (new addresses)
      if (error?.message?.includes('404') || error?.message?.includes('Not Found')) {
        console.log('Address not found in Blockfrost (new address with no transactions yet)');
        return { ada: 0, rdmTokens: '0', lovelace: '0' };
      }
      console.error('Error getting full balance:', error);
      return { ada: 0, rdmTokens: '0', lovelace: '0' };
    }
  }

  /**
   * Gets transaction history for the connected wallet
   */
  static async getTransactionHistory(limit: number = 10): Promise<any[]> {
    if (!this.connectedWallet) {
      throw new Error('No wallet connected');
    }

    try {
      const { getBlockfrostService } = await import('./blockfrostService');
      const blockfrost = getBlockfrostService();
      const addressInfo = await blockfrost.getAddressInfo(this.connectedWallet.address);

      // Get UTxOs and convert to transaction history format
      const utxos = addressInfo.utxos || [];
      
      // Group by transaction hash
      const txMap = new Map<string, any>();
      utxos.forEach(utxo => {
        if (!txMap.has(utxo.txHash)) {
          txMap.set(utxo.txHash, {
            txHash: utxo.txHash,
            address: utxo.address,
            amount: utxo.amount,
            timestamp: new Date(), // Blockfrost doesn't provide timestamp in UTxO
          });
        }
      });

      return Array.from(txMap.values()).slice(0, limit);
    } catch (error) {
      console.error('Error getting transaction history:', error);
      return [];
    }
  }

  /**
   * Gets the wallet API instance (for direct API calls)
   */
  static getWalletAPI(): any {
    return this.walletAPI;
  }

  /**
   * Signs a transaction using the connected wallet
   * For mobile wallets, opens the wallet app for signing
   * For WebView wallets, uses CIP-30 API directly
   */
  static async signTransaction(
    request: SignTransactionRequest
  ): Promise<SignTransactionResult> {
    if (!this.connectedWallet) {
      return {
        success: false,
        error: 'No wallet connected. Please connect your wallet first.',
      };
    }

    try {
      // Check if we're in a WebView context with CIP-30 wallet API
      const isWebView = typeof window !== 'undefined' && this.walletAPI;
      
      if (isWebView && this.walletAPI) {
        return await this.signTransactionViaCIP30(request);
      }

      // For mobile, use deep linking to open wallet app
      return await this.signTransactionViaMobile(request);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sign transaction',
      };
    }
  }

  /**
   * Signs transaction via CIP-30 API (WebView context)
   */
  private static async signTransactionViaCIP30(
    request: SignTransactionRequest
  ): Promise<SignTransactionResult> {
    try {
      if (!this.walletAPI) {
        throw new Error('Wallet API not available');
      }

      // Build transaction using CIP-30 API
      // Note: This is a simplified version. Real implementation would use
      // @cardano-foundation/cardano-connect-with-wallet or similar library
      
      // Get UTxOs from wallet
      const utxos = await this.walletAPI.getUtxos();
      if (!utxos || utxos.length === 0) {
        throw new Error('No UTxOs available in wallet');
      }

      // Build transaction CBOR
      // In a real implementation, you would use @emurgo/cardano-serialization-lib
      // or similar to build the transaction properly
      const txCbor = await this.buildTransactionCbor(request, utxos);

      // Sign transaction
      const signedTx = await this.walletAPI.signTx(txCbor, true); // true = partial sign

      return {
        success: true,
        signedTx: signedTx,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sign transaction via CIP-30',
      };
    }
  }

  /**
   * Signs transaction via mobile wallet (deep linking)
   */
  private static async signTransactionViaMobile(
    request: SignTransactionRequest
  ): Promise<SignTransactionResult> {
    try {
      const walletName = this.connectedWallet?.walletName || 'eternl';
      const walletUrl = this.getWalletUrl(walletName);

      if (!walletUrl) {
        throw new Error(`Wallet URL not found for ${walletName}`);
      }

      // Store transaction request temporarily for callback
      const txRequestId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await AsyncStorage.setItem(`@wallet:tx_request:${txRequestId}`, JSON.stringify(request));

      // Build transaction data for deep link
      // Format: wallet://sign?tx=<base64_encoded_tx_data>&callback=cardanodapp://wallet/signed
      const txData = {
        inputs: request.inputs,
        outputs: request.outputs,
        metadata: request.metadata,
        network: this.connectedWallet?.network,
        requestId: txRequestId,
      };

      // Encode transaction data (simplified - real implementation would use proper CBOR encoding)
      const encodedTxData = Buffer.from(JSON.stringify(txData)).toString('base64');

      // Create deep link URL
      // Note: Actual wallet deep link format may vary by wallet
      // This is a generic format - adjust based on wallet documentation
      const deepLinkUrl = `${walletUrl}sign?tx=${encodedTxData}&callback=cardanodapp://wallet/signed?requestId=${txRequestId}`;

      // Check if wallet app can be opened
      const canOpen = await Linking.canOpenURL(walletUrl);
      if (!canOpen) {
        // Wallet not installed - show alert
        Alert.alert(
          'Wallet App Required',
          `Please install ${walletName} wallet app to sign transactions.`,
          [
            {
              text: 'OK',
              onPress: () => {},
            },
          ]
        );
        return {
          success: false,
          error: `Wallet app (${walletName}) not installed`,
        };
      }

      // Open wallet app for signing
      await Linking.openURL(deepLinkUrl);

      // Return pending result - actual signing will be handled via callback
      // In a real implementation, you would:
      // 1. Wait for the callback URL with signed transaction
      // 2. Extract signed transaction from callback
      // 3. Return the signed transaction
      
      // For now, return a pending state
      // The actual implementation would use a Promise that resolves when callback is received
      return {
        success: false,
        error: 'Mobile signing requires callback handling. Transaction opened in wallet app.',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to open wallet for signing',
      };
    }
  }

  /**
   * Builds transaction CBOR (simplified - real implementation needs proper Cardano library)
   */
  private static async buildTransactionCbor(
    request: SignTransactionRequest,
    utxos: any[]
  ): Promise<string> {
    // This is a placeholder - real implementation would use:
    // @emurgo/cardano-serialization-lib or @cardano-foundation/cardano-multiplatform-lib
    // to properly build the transaction CBOR
    
    // For now, return a mock CBOR structure
    // In production, you would:
    // 1. Select UTxOs to cover the outputs
    // 2. Calculate fees
    // 3. Build proper transaction structure
    // 4. Serialize to CBOR
    
    console.warn('buildTransactionCbor: Using placeholder implementation. Install @emurgo/cardano-serialization-lib for real transaction building.');
    
    // Placeholder CBOR (this won't work in production)
    return '84a30081825820' + '00'.repeat(32) + '01a20081825820' + '00'.repeat(28) + '01821a000f4240';
  }

  /**
   * Submits a signed transaction to the Cardano network
   */
  static async submitTransaction(
    signedTx: string
  ): Promise<SubmitTransactionResult> {
    if (!this.connectedWallet) {
      return {
        success: false,
        error: 'No wallet connected',
      };
    }

    try {
      // Try to submit via wallet API first (CIP-30)
      if (this.walletAPI && typeof this.walletAPI.submitTx === 'function') {
        try {
          const txHash = await this.walletAPI.submitTx(signedTx);
          return {
            success: true,
            txHash: txHash,
          };
        } catch (walletError) {
          console.warn('Wallet API submission failed, trying Blockfrost:', walletError);
        }
      }

      // Fallback: Try to submit via Blockfrost (if they add support) or other service
      // Note: Blockfrost doesn't currently support transaction submission
      // You would need to use a different service or Cardano node
      
      return {
        success: false,
        error: 'Transaction submission not available. Use wallet API or Cardano node.',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit transaction',
      };
    }
  }

  /**
   * Signs and submits a transaction in one call
   * Opens wallet app for signing, then submits after signature
   */
  static async signAndSubmitTransaction(
    request: SignTransactionRequest
  ): Promise<SubmitTransactionResult> {
    // Sign transaction
    const signResult = await this.signTransaction(request);
    
    if (!signResult.success || !signResult.signedTx) {
      return {
        success: false,
        error: signResult.error || 'Failed to sign transaction',
      };
    }

    // Submit signed transaction
    return await this.submitTransaction(signResult.signedTx);
  }

  /**
   * Handles callback from wallet app after signing
   * Called when wallet app redirects back with signed transaction
   */
  static async handleSigningCallback(url: string): Promise<SignTransactionResult | null> {
    try {
      const parsed = LinkingExpo.parse(url);
      const requestId = parsed.queryParams?.requestId as string;
      
      if (!requestId) {
        return null;
      }

      // Get original transaction request
      const txRequestKey = `@wallet:tx_request:${requestId}`;
      const txRequestJson = await AsyncStorage.getItem(txRequestKey);
      
      if (!txRequestJson) {
        return {
          success: false,
          error: 'Transaction request not found',
        };
      }

      // Get signed transaction from callback
      const signedTx = parsed.queryParams?.signedTx as string;
      
      if (!signedTx) {
        return {
          success: false,
          error: 'Signed transaction not found in callback',
        };
      }

      // Clean up stored request
      await AsyncStorage.removeItem(txRequestKey);

      return {
        success: true,
        signedTx: signedTx,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to handle signing callback',
      };
    }
  }
}


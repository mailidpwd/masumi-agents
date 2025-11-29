export interface WalletInfo {
  address: string;
  network: 'mainnet' | 'testnet' | 'preview' | 'preprod';
  isConnected: boolean;
  walletName?: string;
}

export interface WalletConnectionResult {
  success: boolean;
  wallet?: WalletInfo;
  error?: string;
}


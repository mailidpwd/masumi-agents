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

export interface TransactionOutput {
  address: string;
  amount: {
    lovelace: number;
    assets?: Array<{
      unit: string;
      quantity: string;
    }>;
  };
}

export interface TransactionInput {
  txHash: string;
  outputIndex: number;
}

export interface TransactionMetadata {
  [key: string]: any;
}

export interface SignTransactionRequest {
  inputs: TransactionInput[];
  outputs: TransactionOutput[];
  metadata?: TransactionMetadata;
  changeAddress?: string;
}

export interface SignTransactionResult {
  success: boolean;
  signedTx?: string; // CBOR hex string
  txHash?: string;
  error?: string;
}

export interface SubmitTransactionResult {
  success: boolean;
  txHash?: string;
  error?: string;
}


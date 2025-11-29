/**
 * Transaction Signer Utility
 * Helper functions for signing and submitting Cardano transactions
 * Automatically opens wallet app for signing on mobile devices
 */
import { WalletService } from '../services/walletService';
import { SignTransactionRequest, SignTransactionResult, SubmitTransactionResult } from '../types/cardano';
import { Alert, Linking, Platform } from 'react-native';

/**
 * Signs a transaction and opens wallet app if needed
 * For mobile: Opens wallet app for user to sign
 * For WebView: Uses CIP-30 API directly
 */
export async function signTransaction(
  request: SignTransactionRequest
): Promise<SignTransactionResult> {
  try {
    const result = await WalletService.signTransaction(request);
    
    if (!result.success && Platform.OS !== 'web') {
      // On mobile, if signing failed because wallet needs to open,
      // show instructions to user
      Alert.alert(
        '📱 Open Wallet App',
        'Please sign the transaction in your wallet app, then return here.',
        [
          {
            text: 'I Signed It',
            onPress: async () => {
              // Check if we can detect the signed transaction
              // This would typically come from a deep link callback
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    }
    
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sign transaction',
    };
  }
}

/**
 * Signs and submits a transaction
 * Opens wallet app for signing, then submits after signature
 */
export async function signAndSubmitTransaction(
  request: SignTransactionRequest
): Promise<SubmitTransactionResult> {
  try {
    // Sign transaction (opens wallet app on mobile)
    const signResult = await WalletService.signTransaction(request);
    
    if (!signResult.success || !signResult.signedTx) {
      return {
        success: false,
        error: signResult.error || 'Failed to sign transaction',
      };
    }

    // Submit signed transaction
    const submitResult = await WalletService.submitTransaction(signResult.signedTx);
    
    if (submitResult.success) {
      Alert.alert(
        '✅ Transaction Submitted',
        `Transaction submitted successfully!\n\nTx Hash: ${submitResult.txHash?.substring(0, 20)}...`,
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        '⚠️ Submission Failed',
        submitResult.error || 'Failed to submit transaction',
        [{ text: 'OK' }]
      );
    }
    
    return submitResult;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sign and submit transaction',
    };
  }
}

/**
 * Creates a simple payment transaction request
 */
export function createPaymentRequest(
  toAddress: string,
  amountLovelace: number,
  fromAddress?: string
): SignTransactionRequest {
  // Note: In a real implementation, you would:
  // 1. Get UTxOs from the wallet/Blockfrost
  // 2. Select appropriate UTxOs to cover the amount + fees
  // 3. Calculate change address
  // 4. Build proper inputs and outputs
  
  return {
    inputs: [], // Would be populated with actual UTxOs
    outputs: [
      {
        address: toAddress,
        amount: {
          lovelace: amountLovelace,
        },
      },
    ],
    changeAddress: fromAddress,
  };
}


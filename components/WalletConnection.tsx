/**
 * Wallet Connection Component (Login-Style)
 * Redesigned as a clean login/email-style connection screen
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { WalletService } from '../services/walletService';
import { WalletInfo } from '../types/cardano';
import { CardanoNetwork, getNetworkConfig, getDefaultNetwork } from '../services/networkConfig';
import { Linking } from 'react-native';
import * as ClipboardExpo from 'expo-clipboard';

interface WalletConnectionProps {
  onWalletConnected?: (wallet: WalletInfo) => void;
}

const WALLET_OPTIONS = [
  { id: 'eternl', name: 'Eternl', icon: 'wallet-outline', deepLink: 'eternl://', color: '#00D4AA' },
  { id: 'nami', name: 'Nami', icon: 'wallet', deepLink: 'nami://', color: '#349EA3' },
  { id: 'flint', name: 'Flint', icon: 'wallet-plus', deepLink: 'flintwallet://', color: '#FF6B35' },
];

export const WalletConnection: React.FC<WalletConnectionProps> = ({
  onWalletConnected,
}) => {
  const [selectedWallet, setSelectedWallet] = useState<string>('eternl');
  const [selectedNetwork, setSelectedNetwork] = useState<CardanoNetwork>(getDefaultNetwork());
  const [isConnecting, setIsConnecting] = useState(false);
  const [showWebView, setShowWebView] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    // Load saved network preference
    const loadNetworkPreference = async () => {
      const savedNetwork = await WalletService.getNetworkPreference();
      setSelectedNetwork(savedNetwork);
    };
    loadNetworkPreference();

    // Check if wallet is already connected
    const checkConnection = async () => {
      const connectedWallet = await WalletService.getConnectedWallet();
    if (connectedWallet) {
      onWalletConnected?.(connectedWallet);
    }
    };
    checkConnection();
  }, [onWalletConnected]);

  // Auto-detect clipboard when app comes back to foreground
  const checkClipboardForAddress = async () => {
    try {
      const clipboardContent = await ClipboardExpo.getStringAsync();
      if (clipboardContent) {
        const trimmed = clipboardContent.trim();
        // Check if it's a valid Cardano address
        if (trimmed.startsWith('addr_test1') || trimmed.startsWith('addr1')) {
          const isCorrectNetwork = selectedNetwork === 'preprod' 
            ? trimmed.startsWith('addr_test1')
            : trimmed.startsWith('addr1');
          
          if (isCorrectNetwork) {
            setManualAddress(trimmed);
            Alert.alert(
              '🎉 Address Found!',
              `Found a valid ${selectedNetwork === 'preprod' ? 'PreProd' : 'Mainnet'} address in your clipboard!\n\n${trimmed.substring(0, 20)}...${trimmed.substring(trimmed.length - 10)}`,
              [
                { text: 'Use This Address', onPress: () => setShowManualEntry(true) },
                { text: 'Cancel', style: 'cancel' }
              ]
            );
          }
        }
      }
    } catch (error) {
      console.log('Clipboard check failed:', error);
    }
  };

  const handleNetworkChange = async (network: CardanoNetwork) => {
    setSelectedNetwork(network);
    await WalletService.setNetworkPreference(network);
  };

  const handleOpenFaucet = async () => {
    const networkConfig = getNetworkConfig('preprod');
    if (networkConfig.faucetUrl) {
      const canOpen = await Linking.canOpenURL(networkConfig.faucetUrl);
      if (canOpen) {
        await Linking.openURL(networkConfig.faucetUrl);
      } else {
        Alert.alert(
          'Open Faucet',
          `Please visit: ${networkConfig.faucetUrl}`,
          [{ text: 'OK' }]
        );
      }
    }
  };


  const handlePasteAddress = async () => {
    try {
      const text = await ClipboardExpo.getStringAsync();
      if (text) {
        setManualAddress(text.trim());
      }
    } catch (error) {
      console.error('Error pasting:', error);
    }
  };

  const handleConnect = async () => {
    // For mobile apps, directly show manual entry with instructions
    Alert.alert(
      'Connect Mobile Wallet',
      `To connect your ${selectedWallet.charAt(0).toUpperCase() + selectedWallet.slice(1)} mobile wallet:\n\n1. Open your ${selectedWallet} app\n2. Go to "Receive" section\n3. Copy your ${selectedNetwork === 'preprod' ? 'PreProd Testnet' : 'Mainnet'} address\n4. Paste it in the manual entry form`,
      [
        { 
          text: 'Enter Address Manually', 
          onPress: () => setShowManualEntry(true),
          style: 'default'
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleManualConnect = async () => {
    if (!manualAddress.trim()) {
      Alert.alert('Error', 'Please enter a valid wallet address');
      return;
    }

    // Validate address format
    const networkConfig = getNetworkConfig(selectedNetwork);
    if (!manualAddress.startsWith(networkConfig.addressPrefix)) {
      Alert.alert(
        'Invalid Address',
        `Address must start with "${networkConfig.addressPrefix}" for ${selectedNetwork === 'preprod' ? 'PreProd Testnet' : 'Mainnet'}`
      );
      return;
    }

    setIsConnecting(true);
    try {
      const walletInfo: WalletInfo = {
        address: manualAddress.trim(),
        network: selectedNetwork,
        isConnected: true,
        walletName: selectedWallet,
      };

      // Save connection
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      await AsyncStorage.default.setItem('@wallet:connection', JSON.stringify(walletInfo));
      await WalletService.setNetworkPreference(selectedNetwork);
      
      // Set connected wallet
      (WalletService as any).connectedWallet = walletInfo;

      setShowManualEntry(false);
      setManualAddress('');
      setIsConnecting(false);
      onWalletConnected?.(walletInfo);
      Alert.alert('Success', `Connected to ${walletInfo.walletName} wallet on ${walletInfo.network === 'preprod' ? 'PreProd Testnet' : 'Mainnet'}!`);
    } catch (error) {
      setIsConnecting(false);
      Alert.alert('Error', 'Failed to save wallet connection');
    }
  };

  // HTML page for wallet connection using cardano-connect-with-wallet
  const getWalletConnectionHTML = (walletName: string, network: CardanoNetwork) => {
    const networkId = network === 'preprod' ? 0 : 1;
    return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.jsdelivr.net/npm/@cardano-foundation/cardano-connect-with-wallet@latest/dist/index.umd.js"></script>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      max-width: 400px;
      margin: 50px auto;
      background: white;
      padding: 30px;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 { color: #0033AD; margin-bottom: 20px; }
    .info {
      padding: 12px;
      background: #FEF3C7;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 14px;
      color: #92400E;
    }
    button {
      width: 100%;
      padding: 15px;
      background: #0033AD;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      cursor: pointer;
      margin: 10px 0;
    }
    button:hover { background: #002288; }
    .status { margin-top: 20px; padding: 10px; background: #f0f0f0; border-radius: 6px; min-height: 40px; }
    .error { background: #FEE2E2; color: #991B1B; }
    .success { background: #D1FAE5; color: #065F46; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Connect ${walletName.charAt(0).toUpperCase() + walletName.slice(1)} Wallet</h1>
    <p>Network: ${network === 'preprod' ? 'PreProd Testnet' : 'Mainnet'}</p>
    <div class="info">
      <strong>Note:</strong> Browser extensions don't work in mobile apps. Please use the "Enter Address Manually" option or open this app in a web browser with the ${walletName} extension installed.
    </div>
    <button id="connectBtn">Try Connect Wallet</button>
    <div id="status" class="status">Click the button above to attempt connection, or close this window and use manual entry.</div>
  </div>
  <script>
    const walletName = '${walletName}';
    const networkId = ${networkId};
    
    async function connectWallet() {
      const statusEl = document.getElementById('status');
      statusEl.className = 'status';
      statusEl.textContent = 'Connecting...';
      
      try {
        if (!window.cardano || !window.cardano[walletName]) {
          throw new Error('${walletName} wallet extension not found. Browser extensions are not available in mobile apps. Please use the "Enter Address Manually" option.');
        }
        
        const wallet = window.cardano[walletName];
        const isEnabled = await wallet.isEnabled();
        
        if (!isEnabled) {
          throw new Error('Please enable ${walletName} wallet in your browser extension.');
        }
        
        await wallet.enable();
        const walletNetworkId = await wallet.getNetworkId();
        
        if (walletNetworkId !== networkId) {
          throw new Error('Wallet network mismatch. Please switch your wallet to ${network === 'preprod' ? 'PreProd Testnet' : 'Mainnet'}.');
        }
        
        const addresses = await wallet.getUsedAddresses();
        if (!addresses || addresses.length === 0) {
          throw new Error('No addresses found in wallet');
        }
        
        const address = addresses[0];
        
        // Send wallet info to React Native
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'WALLET_CONNECTED',
          data: {
            address: address,
            network: '${network}',
            walletName: walletName
          }
        }));
        
        statusEl.className = 'status success';
        statusEl.textContent = 'Connected! Address: ' + address.substring(0, 20) + '...';
      } catch (error) {
        statusEl.className = 'status error';
        statusEl.textContent = 'Error: ' + error.message;
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'WALLET_ERROR',
          error: error.message
        }));
      }
    }
    
    document.getElementById('connectBtn').addEventListener('click', connectWallet);
  </script>
</body>
</html>
    `;
  };

  const handleWebViewMessage = async (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      
      if (message.type === 'WALLET_CONNECTED') {
        const walletInfo: WalletInfo = {
          address: message.data.address,
          network: message.data.network,
          isConnected: true,
          walletName: message.data.walletName,
        };
        
        // Save connection using WalletService method
        const AsyncStorage = await import('@react-native-async-storage/async-storage');
        await AsyncStorage.default.setItem('@wallet:connection', JSON.stringify(walletInfo));
        await WalletService.setNetworkPreference(message.data.network);
        
        // Set connected wallet directly (since WebView already connected)
        // Access private static property via type assertion
        (WalletService as any).connectedWallet = walletInfo;
        
        setShowWebView(false);
        setIsConnecting(false);
        onWalletConnected?.(walletInfo);
        Alert.alert('Success', `Connected to ${walletInfo.walletName} wallet on ${walletInfo.network === 'preprod' ? 'PreProd Testnet' : 'Mainnet'}!`);
      } else if (message.type === 'WALLET_ERROR') {
        setIsConnecting(false);
        Alert.alert('Connection Error', message.error);
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
      setIsConnecting(false);
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.headerSection}>
        <View style={styles.logoContainer}>
          <MaterialCommunityIcons name="wallet" size={64} color="#0033AD" />
        </View>
        <Text style={styles.title}>Connect Your Wallet</Text>
        <Text style={styles.subtitle}>
          Connect your Cardano mobile wallet (Eternl, Nami, Flint) to start using the RDM Ecosystem
        </Text>
      </View>

      <View style={styles.inputSection}>
        <Text style={styles.inputLabel}>Select Network</Text>
        <View style={styles.networkSelector}>
          <TouchableOpacity
            style={[
              styles.networkOption,
              selectedNetwork === 'mainnet' && styles.networkOptionActive,
            ]}
            onPress={() => handleNetworkChange('mainnet')}
            disabled={isConnecting}
          >
            <MaterialCommunityIcons
              name="earth"
              size={20}
              color={selectedNetwork === 'mainnet' ? '#FFFFFF' : '#666'}
            />
            <Text
              style={[
                styles.networkOptionText,
                selectedNetwork === 'mainnet' && styles.networkOptionTextActive,
              ]}
            >
              Mainnet
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.networkOption,
              selectedNetwork === 'preprod' && styles.networkOptionActive,
            ]}
            onPress={() => handleNetworkChange('preprod')}
            disabled={isConnecting}
          >
            <MaterialCommunityIcons
              name="test-tube"
              size={20}
              color={selectedNetwork === 'preprod' ? '#FFFFFF' : '#666'}
            />
            <Text
              style={[
                styles.networkOptionText,
                selectedNetwork === 'preprod' && styles.networkOptionTextActive,
              ]}
            >
              PreProd Testnet
            </Text>
          </TouchableOpacity>
        </View>
        {selectedNetwork === 'preprod' && (
          <View style={styles.testnetWarning}>
            <MaterialCommunityIcons name="alert-circle" size={20} color="#F59E0B" />
            <Text style={styles.testnetWarningText}>
              You are connecting to PreProd Testnet. Use test ADA only.
            </Text>
          </View>
        )}
        {selectedNetwork === 'preprod' && (
          <TouchableOpacity
            style={styles.faucetButton}
            onPress={handleOpenFaucet}
            disabled={isConnecting}
          >
            <MaterialCommunityIcons name="water" size={18} color="#0033AD" />
            <Text style={styles.faucetButtonText}>Get Test ADA from Faucet</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.inputSection}>
        <Text style={styles.inputLabel}>Select Wallet Provider</Text>
        <View style={styles.walletOptions}>
          {WALLET_OPTIONS.map((wallet) => (
            <TouchableOpacity
              key={wallet.id}
              style={[
                styles.walletOption,
                selectedWallet === wallet.id && styles.walletOptionActive,
              ]}
              onPress={() => setSelectedWallet(wallet.id)}
              disabled={isConnecting}
            >
              <MaterialCommunityIcons
                name={wallet.icon as any}
                size={32}
                color={selectedWallet === wallet.id ? '#0033AD' : '#999'}
              />
              <Text
                style={[
                  styles.walletOptionText,
                  selectedWallet === wallet.id && styles.walletOptionTextActive,
                ]}
              >
                {wallet.name}
              </Text>
              {selectedWallet === wallet.id && (
                <View style={styles.checkIcon}>
                  <MaterialCommunityIcons name="check-circle" size={20} color="#0033AD" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.actionSection}>
        {/* Main Easy Connect Button */}
        <TouchableOpacity
          style={styles.easyConnectButton}
          onPress={async () => {
            // First check if there's already an address in clipboard
            await checkClipboardForAddress();
          }}
          disabled={isConnecting}
        >
          <MaterialCommunityIcons name="content-paste" size={28} color="#FFFFFF" />
          <View style={styles.easyConnectTextContainer}>
            <Text style={styles.easyConnectButtonText}>Connect from Clipboard</Text>
            <Text style={styles.easyConnectSubtext}>Copy address in Eternl, then tap here</Text>
          </View>
        </TouchableOpacity>

        {/* Step by step guide */}
        <View style={styles.stepsContainer}>
          <Text style={styles.stepsTitle}>Quick Steps:</Text>
          <View style={styles.stepRow}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
            <Text style={styles.stepText}>Open <Text style={{fontWeight: 'bold', color: '#00D4AA'}}>Eternl</Text> app</Text>
          </View>
          <View style={styles.stepRow}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
            <Text style={styles.stepText}>Go to <Text style={{fontWeight: 'bold'}}>Receive</Text> → Copy address</Text>
          </View>
          <View style={styles.stepRow}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>3</Text></View>
            <Text style={styles.stepText}>Come back here → Tap button above</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.manualEntryButton}
          onPress={() => setShowManualEntry(true)}
          disabled={isConnecting}
        >
          <MaterialCommunityIcons name="keyboard" size={20} color="#FFFFFF" />
          <Text style={styles.manualEntryButtonText}>Or Enter Manually</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoSection}>
        <View style={styles.infoCard}>
          <MaterialCommunityIcons name="shield-check" size={24} color="#10B981" />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>Secure & Read-Only</Text>
            <Text style={styles.infoDescription}>
              We only use your address to show balances. Your keys stay safe in Eternl.
            </Text>
          </View>
        </View>
      </View>

      {/* WebView Modal for Real Wallet Connection */}
      <Modal
        visible={showWebView}
        animationType="slide"
        onRequestClose={() => setShowWebView(false)}
      >
        <View style={styles.webViewContainer}>
          <View style={styles.webViewHeader}>
            <Text style={styles.webViewTitle}>Connect {selectedWallet.charAt(0).toUpperCase() + selectedWallet.slice(1)} Wallet</Text>
            <TouchableOpacity
              onPress={() => setShowWebView(false)}
              style={styles.webViewCloseButton}
            >
              <MaterialCommunityIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <WebView
            ref={webViewRef}
            source={{ html: getWalletConnectionHTML(selectedWallet, selectedNetwork) }}
            onMessage={handleWebViewMessage}
            style={styles.webView}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.webViewLoading}>
                <ActivityIndicator size="large" color="#0033AD" />
                <Text style={styles.webViewLoadingText}>Loading wallet connection...</Text>
              </View>
            )}
          />
        </View>
      </Modal>

      {/* Manual Address Entry Modal */}
      <Modal
        visible={showManualEntry}
        animationType="slide"
        onRequestClose={() => setShowManualEntry(false)}
      >
        <View style={styles.manualEntryContainer}>
          <View style={styles.manualEntryHeader}>
            <Text style={styles.manualEntryTitle}>Enter Wallet Address</Text>
            <TouchableOpacity
              onPress={() => {
                setShowManualEntry(false);
                setManualAddress('');
              }}
              style={styles.manualEntryCloseButton}
            >
              <MaterialCommunityIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.manualEntryContent}>
            <View style={styles.manualEntryInfo}>
              <MaterialCommunityIcons name="information" size={20} color="#0033AD" />
              <Text style={styles.manualEntryInfoText}>
                <Text style={{ fontWeight: 'bold' }}>How to get your address:</Text>{'\n\n'}
                1. Open your {selectedWallet.charAt(0).toUpperCase() + selectedWallet.slice(1)} mobile app{'\n'}
                2. Go to "Receive" section{'\n'}
                3. Make sure you're on {selectedNetwork === 'preprod' ? 'PreProd Testnet' : 'Mainnet'}{'\n'}
                4. Copy your address (starts with {selectedNetwork === 'preprod' ? '"addr_test1..."' : '"addr1..."'}){'\n'}
                5. Paste it below
              </Text>
            </View>

            <View style={styles.manualEntryInputContainer}>
              <View style={styles.labelRow}>
                <Text style={styles.manualEntryLabel}>Wallet Address</Text>
                <TouchableOpacity
                  style={styles.pasteButton}
                  onPress={handlePasteAddress}
                >
                  <MaterialCommunityIcons name="content-paste" size={16} color="#FFFFFF" />
                  <Text style={styles.pasteButtonText}>Paste</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.manualEntryInput}
                value={manualAddress}
                onChangeText={setManualAddress}
                placeholder={`Enter ${selectedNetwork === 'preprod' ? 'addr_test1...' : 'addr1...'}`}
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {manualAddress && (
                <View style={styles.addressPreview}>
                  <MaterialCommunityIcons 
                    name={manualAddress.startsWith(selectedNetwork === 'preprod' ? 'addr_test1' : 'addr1') ? 'check-circle' : 'alert-circle'} 
                    size={16} 
                    color={manualAddress.startsWith(selectedNetwork === 'preprod' ? 'addr_test1' : 'addr1') ? '#10B981' : '#F59E0B'} 
                  />
                  <Text style={[
                    styles.addressPreviewText,
                    { color: manualAddress.startsWith(selectedNetwork === 'preprod' ? 'addr_test1' : 'addr1') ? '#10B981' : '#F59E0B' }
                  ]}>
                    {manualAddress.startsWith(selectedNetwork === 'preprod' ? 'addr_test1' : 'addr1') 
                      ? `Valid ${selectedNetwork === 'preprod' ? 'PreProd' : 'Mainnet'} address format`
                      : `Address should start with ${selectedNetwork === 'preprod' ? 'addr_test1' : 'addr1'}`
                    }
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[styles.manualEntryConnectButton, !manualAddress.trim() && styles.manualEntryConnectButtonDisabled]}
              onPress={handleManualConnect}
              disabled={!manualAddress.trim() || isConnecting}
            >
              {isConnecting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" />
                  <Text style={styles.manualEntryConnectButtonText}>Connect</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0033AD',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  inputSection: {
    marginBottom: 32,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  walletOptions: {
    gap: 12,
  },
  walletOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  walletOptionActive: {
    borderColor: '#0033AD',
    backgroundColor: '#E0E7FF',
  },
  walletOptionText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#666',
    marginLeft: 16,
    flex: 1,
  },
  walletOptionTextActive: {
    color: '#0033AD',
    fontWeight: '600',
  },
  checkIcon: {
    marginLeft: 'auto',
  },
  actionSection: {
    marginBottom: 32,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0E7FF',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#0033AD',
  },
  connectButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
  },
  connectButtonText: {
    color: '#0033AD',
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
  infoSection: {
    gap: 12,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    gap: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 14,
    color: '#666',
  },
  networkSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  networkOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  networkOptionActive: {
    borderColor: '#0033AD',
    backgroundColor: '#0033AD',
  },
  networkOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  networkOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  testnetWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    gap: 8,
    marginBottom: 12,
  },
  testnetWarningText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  faucetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#E0E7FF',
    gap: 8,
    borderWidth: 1,
    borderColor: '#0033AD',
  },
  faucetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0033AD',
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  webViewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  webViewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0033AD',
  },
  webViewCloseButton: {
    padding: 4,
  },
  webView: {
    flex: 1,
  },
  webViewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  webViewLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  manualEntryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#0033AD',
    gap: 8,
    marginBottom: 12,
    shadowColor: '#0033AD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  manualEntryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#E0E7FF',
    gap: 8,
  },
  helpButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0033AD',
  },
  manualEntryContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  manualEntryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  manualEntryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0033AD',
  },
  manualEntryCloseButton: {
    padding: 4,
  },
  manualEntryContent: {
    flex: 1,
    padding: 16,
  },
  manualEntryInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: '#E0E7FF',
    borderRadius: 8,
    gap: 8,
    marginBottom: 24,
  },
  manualEntryInfoText: {
    flex: 1,
    fontSize: 14,
    color: '#0033AD',
    lineHeight: 20,
  },
  manualEntryInputContainer: {
    marginBottom: 24,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  manualEntryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  pasteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#0033AD',
    borderRadius: 8,
    gap: 4,
  },
  pasteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  addressPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  addressPreviewText: {
    fontSize: 14,
    fontWeight: '500',
  },
  manualEntryInput: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#FFFFFF',
    minHeight: 100,
    textAlignVertical: 'top',
    fontFamily: 'monospace',
  },
  manualEntryConnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0033AD',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  manualEntryConnectButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  manualEntryConnectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Easy Connect Styles
  easyConnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: '#00D4AA',
    gap: 16,
    marginBottom: 20,
    shadowColor: '#00D4AA',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  easyConnectTextContainer: {
    flex: 1,
  },
  easyConnectButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  easyConnectSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  stepsContainer: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  stepsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 12,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#00D4AA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  stepText: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
});

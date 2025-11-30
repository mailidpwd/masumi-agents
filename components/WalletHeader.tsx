/**
 * Wallet Header Component
 * Displays wallet icon, ADA balance, and RDM tokens in the app header
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  Clipboard,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { WalletInfo } from '../types/cardano';
import { WalletService } from '../services/walletService';
import { TokenAmount, PurseType } from '../types/rdm';
import { getNetworkConfig } from '../services/networkConfig';

interface WalletHeaderProps {
  wallet: WalletInfo | null;
  onDisconnect?: () => void;
}

export const WalletHeader: React.FC<WalletHeaderProps> = ({
  wallet,
  onDisconnect,
}) => {
  const [balance, setBalance] = useState<TokenAmount>({ ada: 0, rdmTokens: 0 });
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (wallet) {
      loadBalance();
      // Update balance every 10 seconds to stay in sync with Base Purse Balance card
      // Both now read from tokenService, so they'll show the same deducted balance
      const interval = setInterval(loadBalance, 10000);
      return () => clearInterval(interval);
    } else {
      setBalance({ ada: 0, rdmTokens: 0 });
    }
  }, [wallet]);

  const loadBalance = async () => {
    if (!wallet) return;
    
    try {
      setLoading(true);
      
      // PRIMARY: Get base purse balance (with local deductions) to match Base Purse Balance card
      // Both wallet header and Base Purse Balance card show the same deducted balance
      // This makes it clear to users what balance they have available
      try {
        const { getRDMServices, initializeRDMServices } = await import('../services/agentInitializer');
        
        // Try to get services first, initialize if needed
        let services;
        try {
          services = getRDMServices();
        } catch (error) {
          // Services not initialized yet - initialize them first
          console.log('RDM services not initialized yet, initializing...');
          await initializeRDMServices();
          services = getRDMServices();
        }
        
        const basePurse = services.tokenService.getPurseBalance(PurseType.BASE);
        setBalance({
          ada: basePurse.ada || 0,
          rdmTokens: basePurse.rdmTokens || 0,
        });
      } catch (error) {
        console.error('Failed to load balance from token service:', error);
        // Fallback: Try blockchain directly
        try {
          const fullBalance = await WalletService.getFullBalance();
          setBalance({
            ada: fullBalance.ada,
            rdmTokens: parseInt(fullBalance.rdmTokens, 10) || 0,
          });
        } catch {
          setBalance({ ada: 0, rdmTokens: 0 });
        }
      }
    } catch (error) {
      console.error('Failed to load balance:', error);
      setBalance({ ada: 0, rdmTokens: 0 });
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string): string => {
    if (address.length <= 12) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 6)}`;
  };

  const formatNumber = (num: number | undefined): string => {
    if (num === undefined || isNaN(num)) return '0.00';
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const getNetworkBadgeStyle = (network: string) => {
    if (network === 'preprod') {
      return {
        backgroundColor: '#FEF3C7',
        borderColor: '#F59E0B',
        textColor: '#92400E',
      };
    }
    return {
      backgroundColor: '#D1FAE5',
      borderColor: '#10B981',
      textColor: '#065F46',
    };
  };

  const getNetworkDisplayName = (network: string): string => {
    if (network === 'preprod') return 'PreProd';
    if (network === 'mainnet') return 'Mainnet';
    return network;
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect Wallet',
      'Are you sure you want to disconnect your wallet?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            console.log('🔌 User requested wallet disconnect');
            try {
              await WalletService.disconnectWallet();
              console.log('✅ Wallet disconnected successfully');
              setShowDetails(false);
              setBalance({ ada: 0, rdmTokens: 0 });
              onDisconnect?.();
            } catch (error) {
              console.error('❌ Error during disconnect:', error);
              // Force disconnect anyway
              setShowDetails(false);
              onDisconnect?.();
            }
          },
        },
      ]
    );
  };

  if (!wallet) {
    return (
      <View style={styles.container}>
        <Text style={styles.appTitle}>RDM Ecosystem</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.walletInfo}
        onPress={() => setShowDetails(true)}
        activeOpacity={0.7}
      >
        <View style={styles.walletIconContainer}>
          <MaterialCommunityIcons name="wallet" size={24} color="#0033AD" />
        </View>

        {wallet && (
          <View style={[
            styles.networkBadge,
            {
              backgroundColor: getNetworkBadgeStyle(wallet.network).backgroundColor,
              borderColor: getNetworkBadgeStyle(wallet.network).borderColor,
            }
          ]}>
            <MaterialCommunityIcons
              name={wallet.network === 'preprod' ? 'test-tube' : 'earth'}
              size={12}
              color={getNetworkBadgeStyle(wallet.network).textColor}
            />
            <Text style={[
              styles.networkBadgeText,
              { color: getNetworkBadgeStyle(wallet.network).textColor }
            ]}>
              {getNetworkDisplayName(wallet.network)}
            </Text>
          </View>
        )}
        
        <View style={styles.balanceContainer}>
          <View style={styles.adaBalance}>
            <Text style={styles.balanceValue}>
              {loading ? '...' : formatNumber(balance.ada)}
            </Text>
            <Text style={styles.balanceLabel}>ADA</Text>
          </View>
          {/* RDM balance hidden - showing only ADA */}
        </View>

        <MaterialCommunityIcons
          name="chevron-down"
          size={20}
          color="#666"
          style={styles.chevron}
        />
      </TouchableOpacity>

      <Modal
        visible={showDetails}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDetails(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Wallet Details</Text>
              <TouchableOpacity
                onPress={() => setShowDetails(false)}
                style={styles.closeButton}
              >
                <MaterialCommunityIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Wallet:</Text>
                <Text style={styles.detailValue}>{wallet.walletName || 'Unknown'}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Address:</Text>
                <TouchableOpacity
                  style={styles.addressContainer}
                  onPress={() => {
                    Clipboard.setString(wallet.address);
                    Alert.alert('Copied', 'Wallet address copied to clipboard');
                  }}
                >
                  <Text style={styles.fullAddress} numberOfLines={1} ellipsizeMode="middle">
                    {wallet.address}
                  </Text>
                  <MaterialCommunityIcons name="content-copy" size={16} color="#0033AD" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Short Address:</Text>
                <Text style={styles.detailValue}>{formatAddress(wallet.address)}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Network:</Text>
                <View style={[
                  styles.networkBadge,
                  {
                    backgroundColor: getNetworkBadgeStyle(wallet.network).backgroundColor,
                    borderColor: getNetworkBadgeStyle(wallet.network).borderColor,
                  }
                ]}>
                  <MaterialCommunityIcons
                    name={wallet.network === 'preprod' ? 'test-tube' : 'earth'}
                    size={12}
                    color={getNetworkBadgeStyle(wallet.network).textColor}
                  />
                  <Text style={[
                    styles.networkBadgeText,
                    { color: getNetworkBadgeStyle(wallet.network).textColor }
                  ]}>
                    {getNetworkDisplayName(wallet.network)}
                  </Text>
                </View>
              </View>

              <View style={styles.balanceDetails}>
                <View style={styles.balanceDetailsHeader}>
                  <Text style={styles.balanceDetailsTitle}>Balances</Text>
                  <TouchableOpacity
                    onPress={loadBalance}
                    style={styles.refreshButton}
                    disabled={loading}
                  >
                    <MaterialCommunityIcons 
                      name="refresh" 
                      size={18} 
                      color={loading ? '#999' : '#0033AD'} 
                    />
                  </TouchableOpacity>
                </View>
                <View style={styles.balanceRow}>
                  <Text style={styles.balanceRowLabel}>ADA:</Text>
                  <Text style={styles.balanceRowValue}>
                    {loading ? '...' : `${formatNumber(balance.ada)} ADA`}
                  </Text>
                </View>
                <View style={styles.balanceRow}>
                  {/* RDM balance hidden - showing only ADA */}
                </View>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.refreshButtonLarge}
                onPress={loadBalance}
                disabled={loading}
              >
                <MaterialCommunityIcons 
                  name="refresh" 
                  size={20} 
                  color={loading ? '#999' : '#0033AD'} 
                />
                <Text style={[styles.refreshButtonText, loading && styles.refreshButtonTextDisabled]}>
                  Refresh Balance
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.disconnectButton}
                onPress={handleDisconnect}
              >
                <MaterialCommunityIcons name="logout" size={20} color="#FFFFFF" />
                <Text style={styles.disconnectButtonText}>Disconnect Wallet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  appTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0033AD',
  },
  walletInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  walletIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  balanceContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  adaBalance: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  balanceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0033AD',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  rdmBalance: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  rdmValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  rdmLabel: {
    fontSize: 12,
    color: '#666',
  },
  chevron: {
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  detailsContainer: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  balanceDetails: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  balanceDetailsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  balanceRowLabel: {
    fontSize: 14,
    color: '#666',
  },
  balanceRowValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  disconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  disconnectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
    marginRight: 8,
  },
  networkBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingVertical: 4,
  },
  fullAddress: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#333',
    flex: 1,
  },
  refreshButton: {
    padding: 4,
  },
  refreshButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
    marginBottom: 12,
  },
  refreshButtonText: {
    color: '#0033AD',
    fontSize: 16,
    fontWeight: '600',
  },
  refreshButtonTextDisabled: {
    color: '#999',
  },
  modalButtons: {
    marginTop: 16,
  },
});


/**
 * Medaa2 Token Dashboard UI Component
 * Displays purse balances, transaction history, and token management
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Linking,
  Alert,
  Dimensions,
} from 'react-native';
// Note: Victory-native v41 uses different API (Pie, CartesianChart, Bar)
// Chart temporarily disabled - will implement with new API later
// import { Pie } from 'victory-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Medaa2Agent } from '../services/medaa2Agent';
import { PurseType, SmartContractTransaction } from '../types/rdm';
import { TokenService } from '../services/tokenService';
import { BonusToken } from '../types/impact';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_SIZE = SCREEN_WIDTH - 64;

interface Medaa2TokenDashboardProps {
  agent: Medaa2Agent;
  tokenService: TokenService;
}

export const Medaa2TokenDashboard: React.FC<Medaa2TokenDashboardProps> = ({ agent, tokenService }) => {
  const [purses, setPurses] = useState<Record<PurseType, any>>({} as any);
  const [transactions, setTransactions] = useState<SmartContractTransaction[]>([]);
  const [bonusTokens, setBonusTokens] = useState<BonusToken[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await agent.refreshBalances();
    setPurses(agent.getAllPurses());
    setTransactions(agent.getTransactionHistory());
    // Load bonus tokens (would come from LP yields, etc.)
    setBonusTokens([]);
  };

  const handleViewTransaction = (hash: string) => {
    const explorerUrl = `https://cardanoscan.io/transaction/${hash}`;
    Linking.openURL(explorerUrl).catch(() => {
      Alert.alert('Error', 'Could not open blockchain explorer');
    });
  };

  const getPurseChartData = () => {
    const purseEntries = Object.entries(purses);
    const total = purseEntries.reduce((sum, [, purse]) => {
      return sum + (purse.balance?.ada || 0);
    }, 0);

    if (total === 0) return [];

    return purseEntries
      .filter(([, purse]) => (purse.balance?.ada || 0) > 0)
      .map(([type, purse]) => {
        const value = purse.balance?.ada || 0;
        const percentage = (value / total) * 100;
        const colors: Record<string, string> = {
          [PurseType.BASE]: '#6366F1',
          [PurseType.REWARD]: '#10B981',
          [PurseType.REMORSE]: '#EF4444',
          [PurseType.CHARITY]: '#F59E0B',
        };
        return {
          x: type.toUpperCase(),
          y: percentage,
          label: `${type.toUpperCase()}\n${percentage.toFixed(1)}%`,
          color: colors[type] || '#6B7280',
        };
      });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatTransactionStatus = (status: string): string => {
    switch (status) {
      case 'confirmed': return '✅ Confirmed';
      case 'pending': return '⏳ Pending';
      case 'failed': return '❌ Failed';
      default: return status;
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Token Dashboard</Text>
        <Text style={styles.subtitle}>Track your token movements</Text>
      </View>

      {/* Purse Distribution Chart */}
      {getPurseChartData().length > 0 && (
        <View style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Purse Distribution</Text>
          <View style={styles.chartContainer}>
            {/* Chart temporarily replaced with percentage list - will implement Pie chart with victory-native v41 API */}
            {getPurseChartData().map((item, index) => (
              <View key={index} style={styles.distributionItem}>
                <View style={[styles.distributionColor, { backgroundColor: item.color }]} />
                <Text style={styles.distributionLabel}>{item.x}</Text>
                <Text style={styles.distributionValue}>{item.y.toFixed(1)}%</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.pursesContainer}>
        <Text style={styles.sectionTitle}>Purse Balances</Text>
        
        {Object.entries(purses).map(([type, purse]) => (
          <View key={type} style={styles.purseCard}>
            <View style={styles.purseHeader}>
              <Text style={styles.purseType}>{type.toUpperCase()}</Text>
              <Text style={styles.purseBalance}>
                {TokenService.formatTokenAmount(purse.balance)}
              </Text>
            </View>
            <Text style={styles.purseAddress} numberOfLines={1}>
              {purse.address || 'Not initialized'}
            </Text>
          </View>
        ))}
      </View>

      {/* Bonus Tokens Section */}
      {bonusTokens.length > 0 && (
        <View style={styles.bonusSection}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="gift" size={24} color="#F59E0B" />
            <Text style={styles.sectionTitle}>Bonus Tokens</Text>
          </View>
          {bonusTokens.map((bonus) => (
            <View key={bonus.id} style={styles.bonusCard}>
              <View style={styles.bonusHeader}>
                <MaterialCommunityIcons name="star" size={24} color="#F59E0B" />
                <View style={styles.bonusInfo}>
                  <Text style={styles.bonusSource}>{bonus.source.toUpperCase()}</Text>
                  <Text style={styles.bonusAmount}>
                    {TokenService.formatTokenAmount(bonus.amount)}
                  </Text>
                </View>
              </View>
              {bonus.institutionName && (
                <Text style={styles.bonusInstitution}>{bonus.institutionName}</Text>
              )}
              <Text style={styles.bonusReason}>{bonus.reason}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.transactionsContainer}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        
        {transactions.length === 0 ? (
          <Text style={styles.emptyText}>No transactions yet</Text>
        ) : (
          transactions.slice(0, 10).map((tx) => (
            <View key={tx.id} style={styles.transactionCard}>
              <View style={styles.transactionHeader}>
                <Text style={styles.transactionType}>{tx.type.toUpperCase()}</Text>
                <Text style={styles.transactionStatus}>{formatTransactionStatus(tx.status)}</Text>
              </View>
              <Text style={styles.transactionAmount}>
                {TokenService.formatTokenAmount(tx.amount)}
              </Text>
              <Text style={styles.transactionPurses}>
                {tx.fromPurse} → {tx.toPurse || tx.toAddress?.substring(0, 20) + '...'}
              </Text>
              {tx.transactionHash && (
                <TouchableOpacity
                  style={styles.hashLink}
                  onPress={() => handleViewTransaction(tx.transactionHash!)}
                >
                  <MaterialCommunityIcons name="open-in-new" size={16} color="#6366F1" />
                  <Text style={styles.transactionHash} numberOfLines={1}>
                    {tx.transactionHash.substring(0, 20)}...{tx.transactionHash.substring(tx.transactionHash.length - 8)}
                  </Text>
                  <Text style={styles.viewOnChainText}>View on Cardanoscan</Text>
                </TouchableOpacity>
              )}
              {tx.error && (
                <Text style={styles.transactionError}>Error: {tx.error}</Text>
              )}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0033AD',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  pursesContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  purseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  purseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  purseType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0033AD',
  },
  purseBalance: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  purseAddress: {
    fontSize: 12,
    color: '#666',
  },
  transactionsContainer: {
    padding: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    marginTop: 20,
  },
  transactionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  transactionType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0033AD',
  },
  transactionStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  transactionPurses: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  hashLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    padding: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
  },
  transactionHash: {
    flex: 1,
    fontSize: 10,
    color: '#6366F1',
    fontFamily: 'monospace',
  },
  viewOnChainText: {
    fontSize: 10,
    color: '#6366F1',
    fontWeight: '600',
  },
  transactionError: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  bonusSection: {
    padding: 16,
  },
  bonusCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  bonusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  bonusInfo: {
    flex: 1,
  },
  bonusSource: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  bonusAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981',
  },
  bonusInstitution: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  bonusReason: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  distributionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginVertical: 4,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  distributionColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  distributionLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  distributionValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0033AD',
  },
});


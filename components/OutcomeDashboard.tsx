/**
 * Outcome Dashboard Component
 * Displays comprehensive outcome summary with charts, token distribution, charity allocation,
 * smart contract links, bonus tokens, and impact badges
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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { VictoryPie, VictoryChart, VictoryBar, VictoryTheme } from 'victory-native';
import { Svg, Circle } from 'react-native-svg';
import { getRDMServices } from '../services/agentInitializer';
import { TokenService } from '../services/tokenService';
import { DailyGoal, PurseType, TokenAmount } from '../types/rdm';
import { ImpactBadge, BonusToken, BadgeTier } from '../types/impact';
import { Medaa1Agent } from '../services/medaa1Agent';

interface OutcomeDashboardProps {
  goalId?: string; // If provided, shows outcome for specific goal; otherwise shows aggregated
  agent?: Medaa1Agent;
  onNavigate?: (screen: string) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_SIZE = SCREEN_WIDTH - 64;

export const OutcomeDashboard: React.FC<OutcomeDashboardProps> = ({
  goalId,
  agent,
  onNavigate,
}) => {
  const [rewardTokens, setRewardTokens] = useState<TokenAmount>({ ada: 0 });
  const [remorseTokens, setRemorseTokens] = useState<TokenAmount>({ ada: 0 });
  const [charityAllocation, setCharityAllocation] = useState<TokenAmount>({ ada: 0 });
  const [bonusTokens, setBonusTokens] = useState<BonusToken[]>([]);
  const [badges, setBadges] = useState<ImpactBadge[]>([]);
  const [smartContractHashes, setSmartContractHashes] = useState<string[]>([]);
  const [charityDistributions, setCharityDistributions] = useState<
    Array<{ charityName: string; amount: TokenAmount; percentage: number }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadOutcomeData();
  }, [goalId]);

  const loadOutcomeData = async () => {
    try {
      setLoading(true);
      const services = getRDMServices();

      // Load purse balances
      const rewardBalance = services.tokenService.getPurseBalance(PurseType.REWARD);
      const remorseBalance = services.tokenService.getPurseBalance(PurseType.REMORSE);
      const charityBalance = services.tokenService.getPurseBalance(PurseType.CHARITY);

      setRewardTokens(rewardBalance);
      setRemorseTokens(remorseBalance);
      setCharityAllocation(charityBalance);

      // Load transactions and extract smart contract hashes
      const transactions = services.medaa2Agent.getTransactionHistory();
      const hashes = transactions
        .filter((tx) => tx.transactionHash && tx.status === 'confirmed')
        .map((tx) => tx.transactionHash!)
        .slice(0, 5); // Latest 5
      setSmartContractHashes(hashes);

      // Load charity distributions
      const charityState = services.medaa3Agent.getState();
      const distributions = charityState.distributionHistory
        .slice(-5) // Latest 5 distributions
        .flatMap((event) =>
          event.payload.distributions.map((dist) => {
            const charity = charityState.charities.find((c) => c.id === dist.charityId);
            return {
              charityName: charity?.name || 'Unknown',
              amount: dist.amount,
              percentage: (dist.amount.ada / event.payload.totalAmount.ada) * 100,
            };
          })
        );
      setCharityDistributions(distributions);

      // Load badges
      if (agent || !goalId) {
        const medaa1State = services.medaa1Agent.getState();
        const allGoals = medaa1State.goals || [];
        const badgeService = services.medaa2Agent.getBadgeService();
        // Get all badges (in a real implementation, this would be stored)
        const userBadges: ImpactBadge[] = [];
        // For demo, we'll create a mock badge list
        setBadges(userBadges);
      }

      // Load bonus tokens (if any)
      // Bonus tokens would come from LP yield or institutional awards
      setBonusTokens([]);
    } catch (error) {
      console.error('Failed to load outcome data:', error);
      Alert.alert('Error', 'Failed to load outcome data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOutcomeData();
    setRefreshing(false);
  };

  const handleViewTransaction = (hash: string) => {
    // Open blockchain explorer (Cardanoscan or similar)
    const explorerUrl = `https://cardanoscan.io/transaction/${hash}`;
    Linking.openURL(explorerUrl).catch(() => {
      Alert.alert('Error', 'Could not open blockchain explorer');
    });
  };

  const getTierColor = (tier: BadgeTier): string => {
    switch (tier) {
      case BadgeTier.BRONZE:
        return '#CD7F32';
      case BadgeTier.SILVER:
        return '#C0C0C0';
      case BadgeTier.GOLD:
        return '#FFD700';
      case BadgeTier.PLATINUM:
        return '#E5E4E2';
      default:
        return '#6B7280';
    }
  };

  // Prepare chart data
  const totalDistributed = rewardTokens.ada + remorseTokens.ada;
  const pieData = [
    {
      x: 'Reward',
      y: totalDistributed > 0 ? (rewardTokens.ada / totalDistributed) * 100 : 0,
      label: `Reward\n${rewardTokens.ada.toFixed(2)} ADA`,
      color: '#10B981',
    },
    {
      x: 'Remorse',
      y: totalDistributed > 0 ? (remorseTokens.ada / totalDistributed) * 100 : 0,
      label: `Remorse\n${remorseTokens.ada.toFixed(2)} ADA`,
      color: '#EF4444',
    },
  ];

  const charityData = charityDistributions.map((dist, index) => ({
    x: dist.charityName.substring(0, 10),
    y: dist.amount.ada,
    label: `${dist.percentage.toFixed(0)}%`,
  }));

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading outcome data...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Outcome Dashboard</Text>
        <Text style={styles.subtitle}>
          {goalId ? 'Goal Outcome Summary' : 'Overall Token Distribution & Impact'}
        </Text>
      </View>

      {/* Token Distribution Pie Chart */}
      {totalDistributed > 0 && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Token Distribution</Text>
          <View style={styles.chartContainer}>
            <VictoryPie
              data={pieData}
              width={CHART_SIZE}
              height={CHART_SIZE}
              colorScale={[pieData[0].color, pieData[1].color]}
              innerRadius={60}
              labelRadius={({ innerRadius }: any) => innerRadius + 30}
              style={{
                labels: {
                  fill: '#111827',
                  fontSize: 12,
                  fontWeight: '600',
                },
              }}
              animate={{
                duration: 1000,
                onLoad: { duration: 500 },
              }}
            />
          </View>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#10B981' }]} />
              <Text style={styles.legendText}>
                Reward: {TokenService.formatTokenAmount(rewardTokens)}
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#EF4444' }]} />
              <Text style={styles.legendText}>
                Remorse: {TokenService.formatTokenAmount(remorseTokens)}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Charity Allocation */}
      {charityAllocation.ada > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="heart" size={24} color="#EF4444" />
            <Text style={styles.cardTitle}>Charity Allocation</Text>
          </View>
          <Text style={styles.cardValue}>
            {TokenService.formatTokenAmount(charityAllocation)}
          </Text>
          {charityDistributions.length > 0 && (
            <View style={styles.charityChartContainer}>
              <Text style={styles.subSectionTitle}>Distribution Breakdown</Text>
              <VictoryChart
                theme={VictoryTheme.material}
                width={CHART_SIZE}
                height={200}
                padding={{ left: 50, top: 20, right: 20, bottom: 50 }}
              >
                <VictoryBar
                  data={charityData}
                  x="x"
                  y="y"
                  style={{
                    data: { fill: '#6366F1' },
                  }}
                  labels={({ datum }: any) => `$${datum.y.toFixed(2)}`}
                />
              </VictoryChart>
            </View>
          )}
        </View>
      )}

      {/* Smart Contract Hashes */}
      {smartContractHashes.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="link-variant" size={24} color="#6366F1" />
            <Text style={styles.cardTitle}>Smart Contract Transactions</Text>
          </View>
          {smartContractHashes.map((hash, index) => (
            <TouchableOpacity
              key={index}
              style={styles.hashItem}
              onPress={() => handleViewTransaction(hash)}
            >
              <MaterialCommunityIcons name="open-in-new" size={20} color="#6366F1" />
              <Text style={styles.hashText} numberOfLines={1}>
                {hash.substring(0, 20)}...{hash.substring(hash.length - 8)}
              </Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#6B7280" />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Bonus Tokens */}
      {bonusTokens.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="gift" size={24} color="#F59E0B" />
            <Text style={styles.cardTitle}>Bonus Tokens</Text>
          </View>
          {bonusTokens.map((bonus) => (
            <View key={bonus.id} style={styles.bonusItem}>
              <View style={styles.bonusHeader}>
                <Text style={styles.bonusSource}>{bonus.source.toUpperCase()}</Text>
                <Text style={styles.bonusAmount}>
                  {TokenService.formatTokenAmount(bonus.amount)}
                </Text>
              </View>
              {bonus.institutionName && (
                <Text style={styles.bonusInstitution}>{bonus.institutionName}</Text>
              )}
              <Text style={styles.bonusReason}>{bonus.reason}</Text>
              <Text style={styles.bonusDate}>
                Awarded: {bonus.awardedAt.toLocaleDateString()}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Impact Badges */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name="medal" size={24} color="#F59E0B" />
          <Text style={styles.cardTitle}>Impact Badges</Text>
        </View>
        {badges.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="medal-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>No badges earned yet</Text>
            <Text style={styles.emptySubtext}>
              Complete goals to earn impact badges
            </Text>
          </View>
        ) : (
          <View style={styles.badgesGrid}>
            {badges.map((badge) => (
              <View key={badge.id} style={styles.badgeItem}>
                <View
                  style={[
                    styles.badgeIcon,
                    { backgroundColor: getTierColor(badge.tier) + '20' },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="medal"
                    size={32}
                    color={getTierColor(badge.tier)}
                  />
                </View>
                <Text style={styles.badgeName} numberOfLines={1}>
                  {badge.name}
                </Text>
                <Text style={styles.badgeTier} numberOfLines={1}>
                  {badge.tier.toUpperCase()}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Summary Stats */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Summary</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Distributed</Text>
            <Text style={styles.summaryValue}>
              {TokenService.formatTokenAmount({
                ada: rewardTokens.ada + remorseTokens.ada,
              })}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Charity Total</Text>
            <Text style={styles.summaryValue}>
              {TokenService.formatTokenAmount(charityAllocation)}
            </Text>
          </View>
        </View>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Badges Earned</Text>
            <Text style={styles.summaryValue}>{badges.length}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Transactions</Text>
            <Text style={styles.summaryValue}>{smartContractHashes.length}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
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
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
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
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  legendText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6366F1',
    marginBottom: 8,
  },
  charityChartContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
  },
  hashItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
    gap: 8,
  },
  hashText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#111827',
  },
  bonusItem: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 12,
  },
  bonusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bonusSource: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366F1',
    textTransform: 'uppercase',
  },
  bonusAmount: {
    fontSize: 16,
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
    marginBottom: 4,
  },
  bonusDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badgeItem: {
    width: (SCREEN_WIDTH - 88) / 2,
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  badgeIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  badgeTier: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 32,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
});

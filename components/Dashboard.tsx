/**
 * Dashboard Component
 * Main dashboard with overview cards showing Goals, LP Pools, Vaults, and Activity
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { initializeRDMServices, getRDMServices } from '../services/agentInitializer';
import { DailyGoal, GoalStatus } from '../types/rdm';
import { TokenAmount } from '../types/rdm';
import { ImpactBadge, BadgeTier } from '../types/impact';

interface DashboardProps {
  onNavigate?: (screen: string) => void;
}

interface DashboardStats {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  lpPools: number;
  totalLPValue: number;
  vaults: number;
  totalVaulted: number;
  completionRate: number;
  totalPledged: TokenAmount;
  badgeCount: number;
  recentBadges: ImpactBadge[];
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<DashboardStats>({
    totalGoals: 0,
    activeGoals: 0,
    completedGoals: 0,
    lpPools: 0,
    totalLPValue: 0,
    vaults: 0,
    totalVaulted: 0,
    completionRate: 0,
    totalPledged: { ada: 0, rdmTokens: 0 },
    badgeCount: 0,
    recentBadges: [],
  });
  const [recentGoals, setRecentGoals] = useState<DailyGoal[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Ensure services are initialized before accessing them
      let services;
      try {
        // Try to get services first (they might already be initialized)
        services = getRDMServices();
      } catch (error) {
        // Services not initialized yet - initialize them first
        console.log('RDM services not initialized yet, initializing...');
        const { initializeRDMServices } = await import('../services/agentInitializer');
        await initializeRDMServices();
        services = getRDMServices();
      }

      // Load goals statistics
      const medaa1State = services.medaa1Agent.getState();
      const allGoals = medaa1State.goals || [];
      const activeGoals = allGoals.filter(
        (g) => g.status === 'pending' || g.status === 'partially_done'
      );
      const completedGoals = allGoals.filter((g) => g.status === 'done');
      
      // Calculate total pledged
      const totalPledged: TokenAmount = allGoals.reduce(
        (acc, goal) => ({
          ada: acc.ada + goal.pledgedTokens.ada,
          rdmTokens: (acc.rdmTokens || 0) + (goal.pledgedTokens.rdmTokens || 0),
        }),
        { ada: 0, rdmTokens: 0 }
      );

      // Load LP pools
      const lpPools = services.liquidityPoolService.getAllPools() || [];
      const totalLPValue = lpPools.reduce(
        (sum, pool) => sum + (pool.currentValuation?.ada || 0),
        0
      );

      // Load vaults
      const vaults = services.vaultService.getUserVaults('current_user') || [];
      const totalVaulted = vaults.reduce(
        (sum, vault) => sum + (vault.lockedRDM?.ada || 0),
        0
      );

      // Get recent goals (last 5)
      const recent = [...allGoals]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 5);

      // Load badges
      const badgeService = services.medaa2Agent.getBadgeService();
      const allBadges = badgeService.getUserBadges('current_user') || [];
      const recentBadges = allBadges.slice(0, 4).sort(
        (a, b) => b.earnedAt.getTime() - a.earnedAt.getTime()
      );

      setStats({
        totalGoals: allGoals.length,
        activeGoals: activeGoals.length,
        completedGoals: completedGoals.length,
        lpPools: lpPools.length,
        totalLPValue,
        vaults: vaults.length,
        totalVaulted,
        completionRate:
          allGoals.length > 0 ? completedGoals.length / allGoals.length : 0,
        totalPledged,
        badgeCount: allBadges.length,
        recentBadges,
      });

      setRecentGoals(recent);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const formatNumber = (num: number): string => {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getBadgeTierColor = (tier: BadgeTier): string => {
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeTitle}>Welcome Back!</Text>
        <Text style={styles.welcomeSubtitle}>Track your goals, build habits, earn rewards</Text>
      </View>

      {/* Summary Cards with Gradients */}
      <View style={styles.cardsGrid}>
        {/* Active Goals Card - Purple Gradient */}
        <TouchableOpacity
          style={[styles.summaryCard, styles.goalsCard]}
          onPress={() => onNavigate?.('goals')}
          activeOpacity={0.8}
        >
          <View style={styles.cardIconContainer}>
            <MaterialCommunityIcons name="target" size={28} color="#FFFFFF" />
          </View>
          <Text style={styles.summaryCardValue}>{stats.activeGoals}</Text>
          <Text style={styles.summaryCardLabel}>Active Goals</Text>
          <Text style={styles.summaryCardSubtext}>{stats.completedGoals} completed</Text>
        </TouchableOpacity>

        {/* Reward Tokens Card - Green Gradient */}
        <View style={[styles.summaryCard, styles.rewardsCard]}>
          <View style={styles.cardIconContainer}>
            <MaterialCommunityIcons name="wallet" size={28} color="#FFFFFF" />
          </View>
          <Text style={styles.summaryCardValue}>
            {formatNumber((stats.totalPledged.rdmTokens || 0) + (stats.totalPledged.ada || 0))}
          </Text>
          <Text style={styles.summaryCardLabel}>Reward Tokens</Text>
          <Text style={styles.summaryCardSubtext}>RDM available</Text>
        </View>

        {/* Current Streak Card - Orange/Red Gradient */}
        <View style={[styles.summaryCard, styles.streakCard]}>
          <View style={styles.cardIconContainer}>
            <MaterialCommunityIcons name="fire" size={28} color="#FFFFFF" />
          </View>
          <Text style={styles.summaryCardValue}>0</Text>
          <Text style={styles.summaryCardLabel}>Current Streak</Text>
          <Text style={styles.summaryCardSubtext}>Days in a row</Text>
        </View>

        {/* Impact Badges Card - Blue Gradient */}
        <TouchableOpacity
          style={[styles.summaryCard, styles.badgesCard]}
          onPress={() => onNavigate?.('profile')}
          activeOpacity={0.8}
        >
          <View style={styles.cardIconContainer}>
            <MaterialCommunityIcons name="trophy" size={28} color="#FFFFFF" />
          </View>
          <Text style={styles.summaryCardValue}>{stats.badgeCount}</Text>
          <Text style={styles.summaryCardLabel}>Impact Badges</Text>
          <Text style={styles.summaryCardSubtext}>Achievements</Text>
        </TouchableOpacity>
      </View>

      {/* Active Goals Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="target-variant" size={24} color="#0033AD" />
          <Text style={styles.sectionTitle}>Active Goals</Text>
          <TouchableOpacity onPress={() => onNavigate?.('goals')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        {recentGoals.filter((g) => g.status === 'pending' || g.status === 'partially_done').length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="target-variant" size={64} color="#CCC" />
            <Text style={styles.emptyText}>No Active Goals</Text>
            <Text style={styles.emptySubtext}>Create your first goal to start tracking your progress</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => onNavigate?.('goals')}
            >
              <Text style={styles.emptyButtonText}>Create Goal</Text>
            </TouchableOpacity>
          </View>
        ) : (
          recentGoals.filter((g) => g.status === 'pending' || g.status === 'partially_done').map((goal) => (
            <TouchableOpacity
              key={goal.id}
              style={styles.activityItem}
              onPress={() => onNavigate?.('goals')}
            >
              <View style={styles.activityIcon}>
                <MaterialCommunityIcons
                  name={
                    goal.status === 'done'
                      ? 'check-circle'
                      : goal.status === 'partially_done'
                      ? 'progress-check'
                      : 'clock-outline'
                  }
                  size={24}
                  color={
                    goal.status === 'done'
                      ? '#10B981'
                      : goal.status === 'partially_done'
                      ? '#F59E0B'
                      : '#666'
                  }
                />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>{goal.title}</Text>
                <Text style={styles.activitySubtext}>
                  {goal.createdAt ? formatDate(goal.createdAt) : 'Recently'} • {goal.pledgedTokens.ada} RDM
                </Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color="#CCC"
              />
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Recent Badges Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="trophy" size={24} color="#F59E0B" />
          <Text style={styles.sectionTitle}>Recent Badges</Text>
          {stats.badgeCount > 0 && (
            <TouchableOpacity onPress={() => onNavigate?.('profile')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          )}
        </View>
        {stats.recentBadges.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="trophy-outline" size={48} color="#CCC" />
            <Text style={styles.emptyText}>No Badges Yet</Text>
            <Text style={styles.emptySubtext}>Complete goals to earn impact badges</Text>
          </View>
        ) : (
          <View style={styles.badgesGrid}>
            {stats.recentBadges.slice(0, 4).map((badge) => (
              <TouchableOpacity
                key={badge.id}
                style={styles.badgeCard}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.badgeIconContainer,
                    { backgroundColor: getBadgeTierColor(badge.tier) + '20' },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="medal"
                    size={32}
                    color={getBadgeTierColor(badge.tier)}
                  />
                </View>
                <Text style={styles.badgeName} numberOfLines={2}>
                  {badge.name}
                </Text>
                <Text style={styles.badgeTier} numberOfLines={1}>
                  {badge.tier.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Need Help Card */}
      <TouchableOpacity
        style={styles.helpCard}
        onPress={() => onNavigate?.('ai')}
        activeOpacity={0.8}
      >
        <View style={styles.helpCardContent}>
          <MaterialCommunityIcons name="robot" size={32} color="#FFFFFF" />
          <View style={styles.helpCardText}>
            <Text style={styles.helpCardTitle}>Need Help?</Text>
            <Text style={styles.helpCardSubtitle}>Chat with your AI coach</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  welcomeSection: {
    padding: 20,
    paddingTop: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  summaryCard: {
    width: '48%',
    borderRadius: 20,
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  goalsCard: {
    backgroundColor: '#6366F1', // Purple gradient color
  },
  rewardsCard: {
    backgroundColor: '#10B981', // Green gradient color
  },
  streakCard: {
    backgroundColor: '#F59E0B', // Orange/red gradient color
  },
  badgesCard: {
    backgroundColor: '#3B82F6', // Blue gradient color
  },
  cardIconContainer: {
    alignSelf: 'flex-end',
    marginBottom: 12,
    opacity: 0.9,
  },
  summaryCardValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  summaryCardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.95,
    marginBottom: 2,
  },
  summaryCardSubtext: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  seeAllText: {
    fontSize: 14,
    color: '#0033AD',
    fontWeight: '600',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  activitySubtext: {
    fontSize: 14,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#0033AD',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  helpCard: {
    margin: 16,
    marginTop: 8,
    borderRadius: 20,
    backgroundColor: '#0033AD',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
  },
  helpCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  helpCardText: {
    flex: 1,
  },
  helpCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  helpCardSubtitle: {
    fontSize: 14,
    color: '#E0E7FF',
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 4,
  },
  badgeCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  badgeIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
    minHeight: 36,
  },
  badgeTier: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});


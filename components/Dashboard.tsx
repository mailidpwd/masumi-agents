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
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { initializeRDMServices, getRDMServices } from '../services/agentInitializer';
import { DailyGoal, GoalStatus } from '../types/rdm';
import { TokenAmount } from '../types/rdm';
import { ImpactBadge, BadgeTier } from '../types/impact';
import { TokenService } from '../services/tokenService';

interface DashboardProps {
  onNavigate?: (screen: string) => void;
  refreshTrigger?: number; // Add refresh trigger prop
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

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, refreshTrigger }) => {
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

  // Reload dashboard when refreshTrigger changes (e.g., when navigating back from goals tab)
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      loadDashboardData();
    }
  }, [refreshTrigger]);

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
      {/* Welcome Section with Background Pattern */}
      <View style={styles.welcomeSection}>
        <View style={styles.welcomeBackground}>
          <View style={styles.welcomePattern}>
            <View style={styles.patternCircle1} />
            <View style={styles.patternCircle2} />
          </View>
          <View style={styles.welcomeContent}>
            <Text style={styles.welcomeTitle}>Welcome Back!</Text>
            <Text style={styles.welcomeSubtitle}>Track your goals, build habits, earn rewards</Text>
          </View>
        </View>
      </View>

      {/* Summary Cards with iOS-inspired Background */}
      <View style={styles.cardsSection}>
        <View style={styles.cardsBackground}>
          <View style={styles.backgroundGradient1} />
          <View style={styles.backgroundGradient2} />
          <View style={styles.backgroundGradient3} />
        </View>
        <View style={styles.cardsGrid}>
          {/* Active Goals Card - Purple */}
          <TouchableOpacity
            style={[styles.summaryCard, styles.goalsCard]}
            onPress={() => onNavigate?.('goals')}
            activeOpacity={0.85}
          >
            <View style={styles.cardIconContainer}>
              <MaterialCommunityIcons name="target" size={18} color="#6366F1" />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.summaryCardValue}>{stats.activeGoals}</Text>
              <Text style={styles.summaryCardLabel}>Active Goals</Text>
            </View>
            <Text style={styles.summaryCardSubtext}>{stats.completedGoals} completed</Text>
          </TouchableOpacity>

          {/* Reward Tokens Card - Green */}
          <View style={[styles.summaryCard, styles.rewardsCard]}>
            <View style={styles.cardIconContainer}>
              <MaterialCommunityIcons name="wallet" size={18} color="#10B981" />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.summaryCardValue}>
                {formatNumber(stats.totalPledged.ada || 0)}
              </Text>
              <Text style={styles.summaryCardLabel}>Total Pledged</Text>
            </View>
            <Text style={styles.summaryCardSubtext}>ADA pledged</Text>
          </View>

          {/* Current Streak Card - Orange */}
          <View style={[styles.summaryCard, styles.streakCard]}>
            <View style={styles.cardIconContainer}>
              <MaterialCommunityIcons name="fire" size={18} color="#F59E0B" />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.summaryCardValue}>0</Text>
              <Text style={styles.summaryCardLabel}>Current Streak</Text>
            </View>
            <Text style={styles.summaryCardSubtext}>Days in a row</Text>
          </View>

          {/* Impact Badges Card - Blue */}
          <TouchableOpacity
            style={[styles.summaryCard, styles.badgesCard]}
            onPress={() => onNavigate?.('profile')}
            activeOpacity={0.85}
          >
            <View style={styles.cardIconContainer}>
              <MaterialCommunityIcons name="trophy" size={18} color="#3B82F6" />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.summaryCardValue}>{stats.badgeCount}</Text>
              <Text style={styles.summaryCardLabel}>Impact Badges</Text>
            </View>
            <Text style={styles.summaryCardSubtext}>Achievements</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Active Goals Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <View style={styles.sectionIconContainer}>
              <MaterialCommunityIcons name="target-variant" size={20} color="#6366F1" />
            </View>
            <Text style={styles.sectionTitle}>Active Goals</Text>
          </View>
          <TouchableOpacity onPress={() => onNavigate?.('goals')} activeOpacity={0.7}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        {recentGoals.filter((g) => g.status === 'pending' || g.status === 'partially_done').length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <MaterialCommunityIcons name="target-variant" size={40} color="#E5E7EB" />
            </View>
            <Text style={styles.emptyText}>No Active Goals</Text>
            <Text style={styles.emptySubtext}>Create your first goal to start tracking your progress</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => onNavigate?.('goals')}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyButtonText}>Create Goal</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.goalsList}>
            {recentGoals.filter((g) => g.status === 'pending' || g.status === 'partially_done').map((goal) => (
              <TouchableOpacity
                key={goal.id}
                style={styles.goalCard}
                onPress={() => onNavigate?.('goals')}
                activeOpacity={0.7}
              >
                <View style={styles.goalCardContent}>
                  <View style={styles.goalIconContainer}>
                    <MaterialCommunityIcons
                      name={
                        goal.status === 'done'
                          ? 'check-circle'
                          : goal.status === 'partially_done'
                          ? 'progress-check'
                          : 'clock-outline'
                      }
                      size={22}
                      color={
                        goal.status === 'done'
                          ? '#10B981'
                          : goal.status === 'partially_done'
                          ? '#F59E0B'
                          : '#6366F1'
                      }
                    />
                  </View>
                  <View style={styles.goalContent}>
                    <Text style={styles.goalTitle}>{goal.title}</Text>
                    <Text style={styles.goalSubtext}>
                      {goal.createdAt ? formatDate(goal.createdAt) : 'Recently'} • {(goal.pledgedTokens.ada || 0).toFixed(2)} ADA
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={20}
                    color="#D1D5DB"
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Recent Badges Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <View style={[styles.sectionIconContainer, { backgroundColor: '#FEF3C7' }]}>
              <MaterialCommunityIcons name="trophy" size={20} color="#F59E0B" />
            </View>
            <Text style={styles.sectionTitle}>Recent Badges</Text>
          </View>
          {stats.badgeCount > 0 && (
            <TouchableOpacity onPress={() => onNavigate?.('profile')} activeOpacity={0.7}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          )}
        </View>
        {stats.recentBadges.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <MaterialCommunityIcons name="trophy-outline" size={40} color="#E5E7EB" />
            </View>
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
                    { backgroundColor: getBadgeTierColor(badge.tier) + '15' },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="medal"
                    size={28}
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
    padding: 0,
    backgroundColor: '#F9FAFB',
  },
  welcomeBackground: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    position: 'relative',
    overflow: 'hidden',
  },
  welcomePattern: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '100%',
    height: '100%',
    zIndex: 0,
  },
  patternCircle1: {
    position: 'absolute',
    top: -40,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#0033AD',
    opacity: 0.05,
  },
  patternCircle2: {
    position: 'absolute',
    top: 20,
    right: 40,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6366F1',
    opacity: 0.06,
  },
  welcomeContent: {
    position: 'relative',
    zIndex: 1,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 6,
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 20,
  },
  cardsSection: {
    position: 'relative',
    marginTop: 8,
    paddingTop: 24,
    paddingBottom: 24,
    overflow: 'hidden',
  },
  cardsBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  backgroundGradient1: {
    position: 'absolute',
    top: -100,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#6366F1',
    opacity: 0.08,
  },
  backgroundGradient2: {
    position: 'absolute',
    top: 50,
    left: -30,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#10B981',
    opacity: 0.06,
  },
  backgroundGradient3: {
    position: 'absolute',
    bottom: -80,
    right: 20,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#3B82F6',
    opacity: 0.07,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
    justifyContent: 'space-between',
    position: 'relative',
    zIndex: 1,
  },
  summaryCard: {
    width: (Dimensions.get('window').width - 56) / 2,
    height: 132,
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    position: 'relative',
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  goalsCard: {
    borderColor: '#6366F1',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  rewardsCard: {
    borderColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  streakCard: {
    borderColor: '#F59E0B',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  badgesCard: {
    borderColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  cardIconContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  cardTextContainer: {
    paddingRight: 42,
    marginTop: 0,
  },
  summaryCardValue: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    lineHeight: 30,
    letterSpacing: -0.5,
  },
  summaryCardLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    lineHeight: 18,
    marginBottom: 0,
    letterSpacing: -0.2,
  },
  summaryCardSubtext: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 14,
    position: 'absolute',
    bottom: 16,
    left: 16,
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 12,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.3,
  },
  seeAllText: {
    fontSize: 14,
    color: '#0033AD',
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  goalsList: {
    gap: 12,
  },
  goalCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    overflow: 'hidden',
  },
  goalCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  goalIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  goalContent: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  goalSubtext: {
    fontSize: 13,
    color: '#6B7280',
    letterSpacing: -0.1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
    paddingHorizontal: 20,
    letterSpacing: -0.1,
  },
  emptyButton: {
    backgroundColor: '#0033AD',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
    shadowColor: '#0033AD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
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
  },
  badgeCard: {
    width: (Dimensions.get('window').width - 64) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  badgeIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  badgeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 6,
    minHeight: 40,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  badgeTier: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});


/**
 * Liquidity Pool Dashboard Component
 * Create LP pairs and invest in habit journeys
 * Mobile UI inspired by web design
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getRDMServices } from '../services/agentInitializer';
import { LPPoolPair, LPInvestment, LPInvestorPosition } from '../types/liquidityPool';
import { HabitNFT } from '../types/habitNFT';
import { TokenAmount, DailyGoal } from '../types/rdm';

interface LiquidityPoolDashboardProps {
  onNavigate?: (screen: string) => void;
}

interface DummyPool {
  id: string;
  goalTitle: string;
  creatorName: string;
  riskLevel: 'low' | 'medium' | 'high';
  poolSize: number;
  apy: number;
  investors: number;
}

export const LiquidityPoolDashboard: React.FC<LiquidityPoolDashboardProps> = ({ onNavigate }) => {
  const [pools, setPools] = useState<LPPoolPair[]>([]);
  const [dummyPools, setDummyPools] = useState<DummyPool[]>([]);
  const [myInvestments, setMyInvestments] = useState<LPInvestorPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInvestModal, setShowInvestModal] = useState(false);
  const [showGoalDropdown, setShowGoalDropdown] = useState(false);
  const [showMyInvestments, setShowMyInvestments] = useState(false);
  
  // Create LP state
  const [selectedGoal, setSelectedGoal] = useState<DailyGoal | null>(null);
  const [availableGoals, setAvailableGoals] = useState<DailyGoal[]>([]);
  const [initialLiquidity, setInitialLiquidity] = useState('100');
  const [targetAPY, setTargetAPY] = useState('15');
  const [minInvestment, setMinInvestment] = useState('10');
  const [maxInvestment, setMaxInvestment] = useState('1000');
  
  // Invest state
  const [selectedPool, setSelectedPool] = useState<DummyPool | null>(null);
  const [investmentAmount, setInvestmentAmount] = useState('100');

  useEffect(() => {
    loadPools();
    loadDummyPools();
    loadAvailableGoals();
    loadMyInvestments();
  }, []);

  const loadDummyPools = () => {
    // Create dummy pools matching web design
    const dummy: DummyPool[] = [
      {
        id: 'dummy_1',
        goalTitle: 'Run Marathon in 6 months',
        creatorName: 'David Kim',
        riskLevel: 'medium',
        poolSize: 5000,
        apy: 45,
        investors: 12,
      },
      {
        id: 'dummy_2',
        goalTitle: 'Master Spanish Fluency',
        creatorName: 'Sophie Martin',
        riskLevel: 'low',
        poolSize: 3500,
        apy: 38,
        investors: 8,
      },
      {
        id: 'dummy_3',
        goalTitle: 'Launch Startup MVP',
        creatorName: 'Ryan Patel',
        riskLevel: 'high',
        poolSize: 8000,
        apy: 67,
        investors: 24,
      },
    ];
    setDummyPools(dummy);
  };

  const loadAvailableGoals = () => {
    try {
      const services = getRDMServices();
      const todaysGoals = services.medaa1Agent.getTodaysGoals();
      const pendingGoals = services.medaa1Agent.getPendingGoals();
      const allGoals = [...todaysGoals, ...pendingGoals];
      // Filter out goals that already have pools (for now, show all)
      setAvailableGoals(allGoals);
    } catch (error) {
      console.error('Failed to load goals:', error);
    }
  };

  const loadPools = async () => {
    try {
      const services = getRDMServices();
      // Get all active pools (mock - in real app would query service)
      setPools([]);
    } catch (error) {
      console.error('Failed to load pools:', error);
    }
  };

  const loadMyInvestments = async () => {
    try {
      const services = getRDMServices();
      const investments = services.liquidityPoolService.getInvestorPositions('current_user');
      
      const positions: LPInvestorPosition[] = investments.map((inv) => {
        const pool = services.liquidityPoolService.getPool(inv.poolId);
        if (!pool) return null;
        
        return {
          investmentId: inv.id,
          poolId: inv.poolId,
          pool,
          lpTokens: inv.lpTokens,
          sharePercentage: inv.sharePercentage,
          currentValue: {
            ada: inv.rdmAmount.ada + (inv.yieldEarned?.ada || 0),
            rdmTokens: (inv.rdmAmount.rdmTokens || 0) + (inv.yieldEarned?.rdmTokens || 0),
          },
          yieldAccrued: inv.yieldEarned,
          totalReturn: inv.totalReturn,
          roi: inv.totalReturn.ada > 0 ? ((inv.totalReturn.ada - inv.rdmAmount.ada) / inv.rdmAmount.ada) * 100 : 0,
          status: inv.status,
        };
      }).filter(Boolean) as LPInvestorPosition[];

      setMyInvestments(positions);
    } catch (error) {
      console.error('Failed to load investments:', error);
    }
  };

  const createLPPool = async () => {
    if (!selectedGoal) {
      Alert.alert('Required Field', 'Please select a goal');
      return;
    }

    const liquidity = parseFloat(initialLiquidity);
    if (isNaN(liquidity) || liquidity < 10) {
      Alert.alert('Invalid Amount', 'Minimum initial liquidity is 10 RDM');
      return;
    }

    const apy = parseFloat(targetAPY);
    if (isNaN(apy) || apy < 5 || apy > 100) {
      Alert.alert('Invalid APY', 'Target APY must be between 5% and 100%');
      return;
    }

    const minInv = parseFloat(minInvestment);
    const maxInv = parseFloat(maxInvestment);
    if (isNaN(minInv) || isNaN(maxInv) || minInv >= maxInv) {
      Alert.alert('Invalid Investment Range', 'Min investment must be less than max investment');
      return;
    }

    setLoading(true);
    try {
      const services = getRDMServices();
      
      // Check user rating (need 7.5+ to create LP, but allow with warning)
      const profile = services.medaa1Agent.getUserProfile('current_user');
      const userRating = profile?.overallRating || 0;
      
      if (userRating < 7.5) {
        // Allow but show warning (already shown in UI)
      }

      // Mint HabitNFT if not already minted
      let nft: HabitNFT;
      try {
        nft = await services.medaa1Agent.mintHabitNFT(
          selectedGoal,
          'current_user',
          profile?.username || 'user',
          'addr_current_user'
        );
      } catch (error) {
        // If minting fails, create a minimal NFT for pool creation
        nft = {
          id: `nft_${selectedGoal.id}_${Date.now()}`,
          policyId: 'policy_dummy',
          assetName: `habit_${selectedGoal.id}`,
          metadata: {
            habitType: selectedGoal.category || 'general',
            goalDescription: selectedGoal.description || selectedGoal.title,
            userId: 'current_user',
            username: profile?.username || 'user',
            phase: 'commitment',
            status: 'active',
            mintedAt: new Date(),
            startedAt: new Date(),
            milestones: [],
            currentMilestone: 0,
            totalMilestones: 0,
            milestonesCompleted: 0,
            progressPercentage: 0,
            ratings: 0,
            viewCount: 0,
            attributes: [],
          },
          owner: 'addr_current_user',
          mintedAt: new Date(),
          isLPQualified: userRating >= 7.5,
        };
      }

      // Check LP qualification
      services.habitNFTService.checkLPQualification(nft.id, userRating);

      // Create LP pair
      const pool = await services.medaa2Agent.createLPPair(
        'current_user',
        userRating,
        nft,
        { ada: liquidity, rdmTokens: liquidity }
      );

      Alert.alert('Success', `LP Pool created! Pool ID: ${pool.id}`);
      setShowCreateModal(false);
      resetCreateForm();
      loadPools();
      loadDummyPools(); // Refresh dummy pools
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create LP pool');
    } finally {
      setLoading(false);
    }
  };

  const resetCreateForm = () => {
    setSelectedGoal(null);
    setInitialLiquidity('100');
    setTargetAPY('15');
    setMinInvestment('10');
    setMaxInvestment('1000');
  };

  const investInPool = async () => {
    if (!selectedPool) return;

    const amount = parseFloat(investmentAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid investment amount');
      return;
    }

    // For dummy pools, just show success message
    Alert.alert('Success', `Investment of ${amount} RDM submitted!`);
    setShowInvestModal(false);
    setSelectedPool(null);
    setInvestmentAmount('100');
    loadMyInvestments();
  };

  const getUserRating = (): number => {
    try {
      const services = getRDMServices();
      const profile = services.medaa1Agent.getUserProfile('current_user');
      return profile?.overallRating || 0;
    } catch {
      return 0;
    }
  };

  const getRiskColor = (risk: 'low' | 'medium' | 'high'): string => {
    switch (risk) {
      case 'low':
        return '#9CA3AF'; // Gray
      case 'medium':
        return '#60A5FA'; // Light blue
      case 'high':
        return '#EF4444'; // Red
      default:
        return '#9CA3AF';
    }
  };

  const userRating = getUserRating();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Habit Liquidity Pools</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>Invest in human potential - RDM-HabitNFT LP pairs</Text>
        </View>
        <TouchableOpacity
          style={styles.createPoolButton}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
          <Text style={styles.createPoolButtonText} numberOfLines={1}>Create</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Browse Pools */}
        <View style={styles.content}>
          {dummyPools.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="chart-line" size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>No active pools yet</Text>
              <Text style={styles.emptySubtext}>Create a pool to get started</Text>
            </View>
          ) : (
            dummyPools.map((pool) => (
              <TouchableOpacity
                key={pool.id}
                style={styles.poolCard}
                onPress={() => {
                  setSelectedPool(pool);
                  setShowInvestModal(true);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.poolCardHeader}>
                  <View style={styles.poolCardTitleSection}>
                    <Text style={styles.poolGoalTitle}>{pool.goalTitle}</Text>
                    <Text style={styles.poolCreator}>by {pool.creatorName}</Text>
                  </View>
                  <View style={[styles.riskBadge, { backgroundColor: getRiskColor(pool.riskLevel) }]}>
                    <Text style={styles.riskBadgeText}>
                      {pool.riskLevel.charAt(0).toUpperCase() + pool.riskLevel.slice(1)} Risk
                    </Text>
                  </View>
                </View>
                
                <View style={styles.poolMetrics}>
                  <View style={styles.poolMetric}>
                    <Text style={styles.poolMetricLabel}>Pool Size</Text>
                    <Text style={styles.poolMetricValue}>{pool.poolSize.toLocaleString()} RDM</Text>
                  </View>
                  <View style={styles.poolMetric}>
                    <Text style={styles.poolMetricLabel}>APY</Text>
                    <Text style={[styles.poolMetricValue, styles.apyValue]}>{pool.apy}%</Text>
                  </View>
                  <View style={styles.poolMetric}>
                    <Text style={styles.poolMetricLabel}>Investors</Text>
                    <Text style={styles.poolMetricValue}>{pool.investors}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Create Pool Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleSection}>
                  <MaterialCommunityIcons name="lightning-bolt" size={24} color="#6366F1" />
                  <Text style={styles.modalTitle}>Create Habit Liquidity Pool</Text>
                </View>
                <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                  <MaterialCommunityIcons name="close" size={24} color="#111827" />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalDescription}>
                Create an RDM-HabitNFT LP pair. Investors can provide liquidity and earn yield when you succeed.
              </Text>

              {/* Rating Warning */}
              <View style={styles.ratingWarningBox}>
                <View style={styles.ratingWarningHeader}>
                  <MaterialCommunityIcons name="trophy" size={20} color="#F59E0B" />
                  <Text style={styles.ratingWarningTitle}>Athlete Rating</Text>
                </View>
                <View style={styles.ratingBadge}>
                  <Text style={styles.ratingBadgeText}>{userRating.toFixed(1)}/100</Text>
                </View>
                {userRating < 70 && (
                  <View style={styles.ratingWarningMessage}>
                    <MaterialCommunityIcons name="alert-circle" size={16} color="#F59E0B" />
                    <Text style={styles.ratingWarningText}>
                      Your rating is below the recommended threshold (70). You can still create a pool, but if the goal fails, your rating will decrease further. Proceed at your own risk.
                    </Text>
                  </View>
                )}
              </View>

              {/* Goal Selection */}
              <Text style={styles.formLabel}>Select Goal *</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowGoalDropdown(true)}
              >
                <Text style={[styles.dropdownText, !selectedGoal && styles.dropdownPlaceholder]}>
                  {selectedGoal ? selectedGoal.title : 'Choose a goal'}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>

              {/* Initial Liquidity */}
              <Text style={styles.formLabel}>Initial Liquidity (RDM) *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="100"
                value={initialLiquidity}
                onChangeText={setInitialLiquidity}
                keyboardType="numeric"
              />
              <Text style={styles.helperText}>Your initial contribution to the pool</Text>

              {/* Target APY */}
              <Text style={styles.formLabel}>Target APY (%) *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="15"
                value={targetAPY}
                onChangeText={setTargetAPY}
                keyboardType="numeric"
              />
              <Text style={styles.helperText}>Expected annual yield for investors (5-100%)</Text>

              {/* Min Investment */}
              <Text style={styles.formLabel}>Min Investment (RDM)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="10"
                value={minInvestment}
                onChangeText={setMinInvestment}
                keyboardType="numeric"
              />

              {/* Max Investment */}
              <Text style={styles.formLabel}>Max Investment (RDM)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="1000"
                value={maxInvestment}
                onChangeText={setMaxInvestment}
                keyboardType="numeric"
              />

              {/* How it works */}
              <View style={styles.howItWorksBox}>
                <View style={styles.howItWorksHeader}>
                  <MaterialCommunityIcons name="lightning-bolt" size={20} color="#3B82F6" />
                  <Text style={styles.howItWorksTitle}>How it works:</Text>
                </View>
                <Text style={styles.howItWorksItem}>• Investors provide liquidity and earn yield on success</Text>
                <Text style={styles.howItWorksItem}>• You get bonus RDM when goal succeeds</Text>
                <Text style={styles.howItWorksItem}>• On failure: investors lose position, you lose more, rating decreases</Text>
              </View>

              {/* Important Warning */}
              <View style={styles.importantWarningBox}>
                <View style={styles.importantWarningHeader}>
                  <MaterialCommunityIcons name="alert-circle" size={20} color="#F59E0B" />
                  <Text style={styles.importantWarningTitle}>Important:</Text>
                </View>
                <Text style={styles.importantWarningText}>
                  Your current rating is {userRating.toFixed(1)}/100. If you create a pool and the goal fails, your rating will decrease by 5 points. This is your choice - proceed if you're confident in your ability to succeed.
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => {
                    setShowCreateModal(false);
                    resetCreateForm();
                  }}
                >
                  <Text style={styles.modalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalCreateButton, loading && styles.buttonDisabled]}
                  onPress={createLPPool}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="arrow-up" size={18} color="#FFFFFF" />
                      <Text style={styles.modalCreateButtonText}>Create LP Pool</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Goal Selection Dropdown Modal */}
      <Modal
        visible={showGoalDropdown}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGoalDropdown(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dropdownModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose a goal</Text>
              <TouchableOpacity onPress={() => setShowGoalDropdown(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {availableGoals.length === 0 ? (
                <View style={styles.emptyDropdownState}>
                  <Text style={styles.emptyDropdownText}>No available goals</Text>
                  <Text style={styles.emptyDropdownSubtext}>Create a goal first to create a pool</Text>
                </View>
              ) : (
                availableGoals.map((goal) => (
                  <TouchableOpacity
                    key={goal.id}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedGoal(goal);
                      setShowGoalDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{goal.title}</Text>
                    {goal.description && (
                      <Text style={styles.dropdownItemSubtext} numberOfLines={2}>
                        {goal.description}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Investment Modal */}
      <Modal
        visible={showInvestModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowInvestModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invest in Pool</Text>
              <TouchableOpacity onPress={() => setShowInvestModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            {selectedPool && (
              <View style={styles.investModalContent}>
                <ScrollView 
                  style={styles.investModalScroll}
                  contentContainerStyle={styles.investModalScrollContent}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.investPoolCard}>
                    <Text style={styles.investPoolTitle}>{selectedPool.goalTitle}</Text>
                    <Text style={styles.investPoolCreator}>by {selectedPool.creatorName}</Text>
                    <View style={styles.investPoolMetrics}>
                      <View style={styles.investPoolMetric}>
                        <Text style={styles.investPoolMetricLabel}>Pool Size</Text>
                        <Text style={styles.investPoolMetricValue}>{selectedPool.poolSize.toLocaleString()} RDM</Text>
                      </View>
                      <View style={styles.investPoolMetric}>
                        <Text style={styles.investPoolMetricLabel}>APY</Text>
                        <Text style={[styles.investPoolMetricValue, styles.apyValue]}>{selectedPool.apy}%</Text>
                      </View>
                      <View style={styles.investPoolMetric}>
                        <Text style={styles.investPoolMetricLabel}>Investors</Text>
                        <Text style={styles.investPoolMetricValue}>{selectedPool.investors}</Text>
                      </View>
                    </View>
                  </View>

                  <Text style={styles.formLabel}>Investment Amount (RDM) *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="100"
                    value={investmentAmount}
                    onChangeText={setInvestmentAmount}
                    keyboardType="numeric"
                  />

                  <View style={styles.investmentInfo}>
                    <Text style={styles.infoText}>
                      Estimated LP Tokens: ~{(
                        (parseFloat(investmentAmount) / selectedPool.poolSize) * 1000000
                      ).toFixed(2)}
                    </Text>
                    <Text style={styles.infoText}>
                      Share: ~{((parseFloat(investmentAmount) / (selectedPool.poolSize + parseFloat(investmentAmount))) * 100).toFixed(2)}%
                    </Text>
                  </View>
                </ScrollView>

                {/* Sticky Bottom Buttons */}
                <View style={styles.investModalButtons}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => {
                      setShowInvestModal(false);
                      setSelectedPool(null);
                    }}
                  >
                    <Text style={styles.modalCancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalCreateButton, loading && styles.buttonDisabled]}
                    onPress={investInPool}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" />
                        <Text style={styles.modalCreateButtonText}>Invest</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  createPoolButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
    minWidth: 80,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  createPoolButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
  },
  content: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  poolCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  poolCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  poolCardTitleSection: {
    flex: 1,
    marginRight: 12,
  },
  poolGoalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  poolCreator: {
    fontSize: 14,
    color: '#6B7280',
  },
  riskBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  riskBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  poolMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  poolMetric: {
    alignItems: 'center',
    flex: 1,
  },
  poolMetricLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  poolMetricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  apyValue: {
    color: '#10B981',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 18,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingTop: 20,
    flex: 1,
  },
  investModalContent: {
    flex: 1,
  },
  investModalScroll: {
    flex: 1,
  },
  investModalScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  investModalButtons: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  ratingWarningBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  ratingWarningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  ratingWarningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
  },
  ratingBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  ratingBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  ratingWarningMessage: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  ratingWarningText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    marginTop: 16,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
    marginBottom: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  dropdownButton: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#F9FAFB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dropdownText: {
    fontSize: 16,
    color: '#111827',
  },
  dropdownPlaceholder: {
    color: '#9CA3AF',
  },
  howItWorksBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 16,
    marginTop: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  howItWorksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  howItWorksTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
  },
  howItWorksItem: {
    fontSize: 14,
    color: '#1E40AF',
    marginBottom: 8,
    lineHeight: 20,
  },
  importantWarningBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  importantWarningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  importantWarningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
  },
  importantWarningText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  modalCancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  modalCreateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#6366F1',
    gap: 8,
  },
  modalCreateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  dropdownModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  dropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  dropdownItemSubtext: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyDropdownState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyDropdownText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  emptyDropdownSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  investPoolCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  investPoolTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  investPoolCreator: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  investPoolMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  investPoolMetric: {
    alignItems: 'center',
    flex: 1,
  },
  investPoolMetricLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  investPoolMetricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  investmentInfo: {
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#1E40AF',
    marginBottom: 4,
  },
  investmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  investmentGoal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  investmentStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  investmentStat: {
    width: '50%',
    marginBottom: 8,
  },
  investmentStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  investmentStatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  yieldPositive: {
    color: '#10B981',
  },
  investmentStatus: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  statusText: {
    fontSize: 12,
    color: '#6B7280',
  },
});



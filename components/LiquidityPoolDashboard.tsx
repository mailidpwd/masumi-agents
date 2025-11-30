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
import { TokenAmount, DailyGoal, PurseType } from '../types/rdm';

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
        { ada: liquidity, rdmTokens: 0 }
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

    setLoading(true);
    try {
      const services = getRDMServices();
      
      // Check balance
      const baseBalance = services.tokenService.getPurseBalance(PurseType.BASE);
      if (amount > baseBalance.ada) {
        Alert.alert(
          'Insufficient Balance',
          `You need ${amount} ADA. You have ${baseBalance.ada.toFixed(2)} ADA.`
        );
        return;
      }

      // For dummy pools, we still need to deduct tokens
      // Check if it's a real pool or dummy pool
      const realPool = services.liquidityPoolService.getPool(selectedPool.id);
      
      if (realPool) {
        // Real pool - use actual service
        const investment = await services.medaa2Agent.processInvestment(
          selectedPool.id,
          'current_user',
          { ada: amount, rdmTokens: 0 }
        );
        Alert.alert('Success', `Investment of ${amount} ADA submitted! LP Tokens: ${investment.lpTokens.toFixed(2)}`);
      } else {
        // Dummy pool - still deduct tokens for consistency
        const success = services.tokenService.deductFromBasePurse({ ada: amount, rdmTokens: 0 });
        if (!success) {
          Alert.alert('Error', 'Failed to deduct tokens. Insufficient balance.');
          return;
        }
        Alert.alert('Success', `Investment of ${amount} ADA submitted!`);
      }
      
      setShowInvestModal(false);
      setSelectedPool(null);
      setInvestmentAmount('100');
      loadMyInvestments();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to invest in pool');
    } finally {
      setLoading(false);
    }
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
        return '#10B981'; // Green
      case 'medium':
        return '#3B82F6'; // Blue
      case 'high':
        return '#F59E0B'; // Amber
      default:
        return '#6B7280';
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
            {/* Modal Handle Bar */}
            <View style={styles.modalHandleBar} />
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleSection}>
                  <View style={styles.modalIconContainer}>
                    <MaterialCommunityIcons name="lightning-bolt" size={24} color="#6366F1" />
                  </View>
                  <View style={styles.modalTitleWrapper}>
                    <Text style={styles.modalTitle}>Create Habit Liquidity Pool</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setShowCreateModal(false)} activeOpacity={0.7}>
                  <MaterialCommunityIcons name="close" size={22} color="#6B7280" />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalDescription}>
                Create an RDM-HabitNFT LP pair. Investors provide liquidity and earn yield on your success.
              </Text>

              {/* Rating Warning */}
              <View style={styles.ratingWarningBox}>
                <View style={styles.ratingWarningHeader}>
                  <View style={styles.ratingIconContainer}>
                    <MaterialCommunityIcons name="trophy" size={20} color="#F59E0B" />
                  </View>
                  <Text style={styles.ratingWarningTitle}>Athlete Rating</Text>
                  <View style={styles.ratingBadge}>
                    <Text style={styles.ratingBadgeText}>{userRating.toFixed(1)}/100</Text>
                  </View>
                </View>
                {userRating < 70 && (
                  <View style={styles.ratingWarningMessage}>
                    <MaterialCommunityIcons name="alert-circle" size={15} color="#F59E0B" />
                    <Text style={styles.ratingWarningText}>
                      Rating below threshold (70). Goal failure will decrease rating further. Proceed at your own risk.
                    </Text>
                  </View>
                )}
              </View>

              {/* Goal Selection */}
              <View style={styles.formFieldContainer}>
                <Text style={styles.formLabel}>Select Goal *</Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setShowGoalDropdown(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dropdownText, !selectedGoal && styles.dropdownPlaceholder]}>
                    {selectedGoal ? selectedGoal.title : 'Choose a goal'}
                  </Text>
                  <MaterialCommunityIcons name="chevron-down" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              {/* Initial Liquidity */}
              <View style={styles.formFieldContainer}>
                <Text style={styles.formLabel}>Initial Liquidity (RDM) *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="100"
                  value={initialLiquidity}
                  onChangeText={setInitialLiquidity}
                  keyboardType="numeric"
                  placeholderTextColor="#9CA3AF"
                />
                <Text style={styles.helperText}>Your initial pool contribution</Text>
              </View>

              {/* Target APY */}
              <View style={styles.formFieldContainer}>
                <Text style={styles.formLabel}>Target APY (%) *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="15"
                  value={targetAPY}
                  onChangeText={setTargetAPY}
                  keyboardType="numeric"
                  placeholderTextColor="#9CA3AF"
                />
                <Text style={styles.helperText}>Annual yield for investors (5-100%)</Text>
              </View>

              {/* Min Investment */}
              <View style={styles.formFieldContainer}>
                <Text style={styles.formLabel}>Min Investment (RDM)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="10"
                  value={minInvestment}
                  onChangeText={setMinInvestment}
                  keyboardType="numeric"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              {/* Max Investment */}
              <View style={styles.formFieldContainer}>
                <Text style={styles.formLabel}>Max Investment (RDM)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="1000"
                  value={maxInvestment}
                  onChangeText={setMaxInvestment}
                  keyboardType="numeric"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              {/* How it works & Important - Side by Side */}
              <View style={styles.infoBoxesRow}>
                <View style={styles.howItWorksBox}>
                  <View style={styles.howItWorksHeader}>
                    <View style={styles.howItWorksIconContainer}>
                      <MaterialCommunityIcons name="lightning-bolt" size={18} color="#3B82F6" />
                    </View>
                    <Text style={styles.howItWorksTitle}>How it works</Text>
                  </View>
                  <Text style={styles.howItWorksItem}>• Investors earn yield on success</Text>
                  <Text style={styles.howItWorksItem}>• You get bonus RDM on success</Text>
                  <Text style={styles.howItWorksItem}>• On failure: losses for all</Text>
                </View>

                <View style={styles.importantWarningBox}>
                  <View style={styles.importantWarningHeader}>
                    <View style={styles.importantIconContainer}>
                      <MaterialCommunityIcons name="alert-circle" size={18} color="#F59E0B" />
                    </View>
                    <Text style={styles.importantWarningTitle}>Important</Text>
                  </View>
                  <Text style={styles.importantWarningText}>
                    Rating: {userRating.toFixed(1)}/100. If goal fails, rating decreases by 5 points. Proceed if confident.
                  </Text>
                </View>
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
                      <MaterialCommunityIcons name="arrow-up" size={16} color="#FFFFFF" />
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
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    letterSpacing: -0.1,
  },
  createPoolButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
    gap: 6,
    minWidth: 90,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  createPoolButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.15,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 24,
  },
  content: {
    gap: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  poolCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
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
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 5,
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  poolCreator: {
    fontSize: 13,
    color: '#6B7280',
    letterSpacing: -0.1,
  },
  riskBadge: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  riskBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  poolMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1.5,
    borderTopColor: '#F3F4F6',
  },
  poolMetric: {
    alignItems: 'center',
    flex: 1,
  },
  poolMetricLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 6,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  poolMetricValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.3,
  },
  apyValue: {
    color: '#10B981',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
    marginTop: 20,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    marginTop: 20,
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    letterSpacing: -0.1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingTop: 12,
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHandleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
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
    paddingBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitleWrapper: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.4,
    lineHeight: 28,
  },
  modalDescriptionContainer: {
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  modalDescription: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
    letterSpacing: -0.15,
  },
  ratingWarningBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
    marginHorizontal: 20,
    borderWidth: 1.5,
    borderColor: '#FEF3C7',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  ratingWarningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 0,
  },
  ratingIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingWarningTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#92400E',
    letterSpacing: -0.2,
    flex: 1,
  },
  ratingBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  ratingBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.1,
  },
  ratingWarningMessage: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    alignItems: 'flex-start',
  },
  ratingWarningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 19,
    letterSpacing: -0.1,
  },
  formFieldContainer: {
    marginBottom: 4,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    marginTop: 14,
    letterSpacing: -0.15,
  },
  formInput: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    backgroundColor: '#FFFFFF',
    marginBottom: 6,
    color: '#111827',
    letterSpacing: -0.1,
  },
  helperText: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
    letterSpacing: -0.1,
    marginTop: 2,
  },
  dropdownButton: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  dropdownText: {
    fontSize: 15,
    color: '#111827',
    letterSpacing: -0.1,
  },
  dropdownPlaceholder: {
    color: '#9CA3AF',
  },
  infoBoxesRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
    marginBottom: 16,
    marginHorizontal: 20,
    alignItems: 'stretch',
  },
  howItWorksBox: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#DBEAFE',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
    minHeight: 140,
  },
  howItWorksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  howItWorksIconContainer: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  howItWorksTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E40AF',
    letterSpacing: -0.2,
    flex: 1,
  },
  howItWorksItem: {
    fontSize: 11,
    color: '#1E40AF',
    marginBottom: 5,
    lineHeight: 16,
    letterSpacing: -0.1,
    paddingLeft: 2,
  },
  importantWarningBox: {
    flex: 1,
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#FEF3C7',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
    minHeight: 140,
  },
  importantWarningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  importantIconContainer: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  importantWarningTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
    letterSpacing: -0.2,
    flex: 1,
  },
  importantWarningText: {
    fontSize: 11,
    color: '#92400E',
    lineHeight: 16,
    letterSpacing: -0.1,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  modalCancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: -0.15,
  },
  modalCreateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#6366F1',
    gap: 8,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  modalCreateButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.15,
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



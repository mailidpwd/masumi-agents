/**
 * Medaa1 Goal Manager UI Component
 * Interface for goal creation, tracking, and reflection
 * Updated to match Create Goal Feature Specification
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  Switch,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Medaa1Agent } from '../services/medaa1Agent';
import { DailyGoal, GoalStatus, TokenAmount, PurseType } from '../types/rdm';
import { TokenService } from '../services/tokenService';
import { GoalDetail } from './GoalDetail';
import { SDG, getSDGById } from '../types/sdg';
import {
  GoalCategory,
  VerificationMethod,
  CheckInFrequency,
  GoalCategoryLabels,
  VerificationMethodLabels,
  CheckInFrequencyLabels,
  requiresVerifierEmail,
} from '../types/goalForm';
import { TimeWindow, CheckInSchedule, calculateTimeWindow } from '../types/goalWindow';

interface Medaa1GoalManagerProps {
  agent: Medaa1Agent;
  tokenService: TokenService;
  onNavigate?: (screen: string) => void;
}

const GOAL_CATEGORIES = Object.values(GoalCategory);
const VERIFICATION_METHODS = Object.values(VerificationMethod);
const CHECK_IN_FREQUENCIES = Object.values(CheckInFrequency);

type GoalFilter = 'all' | 'active' | 'completed';

export const Medaa1GoalManager: React.FC<Medaa1GoalManagerProps> = ({ agent, tokenService, onNavigate }) => {
  const [goals, setGoals] = useState<DailyGoal[]>([]);
  const [filter, setFilter] = useState<GoalFilter>('all');
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state - matching specification
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<GoalCategory | ''>('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [pledgeAmount, setPledgeAmount] = useState('100');
  const [verificationMethod, setVerificationMethod] = useState<VerificationMethod>(VerificationMethod.self_report);
  const [verifierEmail, setVerifierEmail] = useState('');
  const [checkInFrequency, setCheckInFrequency] = useState<CheckInFrequency>(CheckInFrequency.weekly);
  const [hasBuddy, setHasBuddy] = useState(false);
  
  // Dropdown states
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showVerificationDropdown, setShowVerificationDropdown] = useState(false);
  const [showCheckInDropdown, setShowCheckInDropdown] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = () => {
    const todaysGoals = agent.getTodaysGoals();
    const pendingGoals = agent.getPendingGoals();
    setGoals([...todaysGoals, ...pendingGoals]);
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const parseDate = (dateString: string): Date | null => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  };

  const handleCreateGoal = async () => {
    // Validation
    if (!title.trim()) {
      Alert.alert('Required Field', 'Please enter a goal title');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Required Field', 'Please enter a goal description');
      return;
    }

    if (!category) {
      Alert.alert('Required Field', 'Please select a category');
      return;
    }

    if (!endDate) {
      Alert.alert('Required Field', 'Please select an end date');
      return;
    }

    if (endDate <= startDate) {
      Alert.alert('Invalid Date', 'End date must be after start date');
      return;
    }

    const pledge = parseFloat(pledgeAmount);
    if (isNaN(pledge) || pledge < 10) {
      Alert.alert('Invalid Amount', 'Minimum pledge is 10 RDM tokens');
      return;
    }

    if (requiresVerifierEmail(verificationMethod) && !verifierEmail.trim()) {
      Alert.alert('Required Field', 'Please enter verifier email for peer/buddy verification');
      return;
    }

    const pledgedTokens: TokenAmount = {
      ada: 0,
      rdmTokens: pledge,
    };

    try {
      setIsLoading(true);

      // Create time window
      const timeWindow: TimeWindow = {
        startDate,
        endDate,
        duration: 'custom',
        customDays: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
      };

      // Create check-in schedule
      const checkInSchedule: CheckInSchedule = {
        frequency: checkInFrequency as any,
        remindersEnabled: true,
      };

      // Get SDG alignment from category
      const sdgAlignment: number[] = [];
      // Map category to SDG IDs (simplified mapping)
      if (category.includes('ClimateAction')) sdgAlignment.push(13);
      if (category.includes('ZeroHunger')) sdgAlignment.push(2);
      if (category.includes('GoodHealth')) sdgAlignment.push(3);
      if (category.includes('QualityEducation')) sdgAlignment.push(4);
      if (category.includes('CleanWater')) sdgAlignment.push(6);

      // Create goal using enhanced method
      const newGoal = await agent.createEnhancedGoal(
        title,
        description,
        category,
        pledgedTokens,
        timeWindow,
        checkInSchedule,
        sdgAlignment.length > 0 ? sdgAlignment : undefined,
        undefined, // measurableAction
        verifierEmail ? [verifierEmail] : undefined
      );

      Alert.alert('Success', 'Goal created successfully! 🎯', [
        {
          text: 'OK',
          onPress: () => {
            resetForm();
            loadGoals();
          },
        },
      ]);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create goal');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('');
    setStartDate(new Date());
    setEndDate(null);
    setPledgeAmount('100');
    setVerificationMethod(VerificationMethod.self_report);
    setVerifierEmail('');
    setCheckInFrequency(CheckInFrequency.weekly);
    setHasBuddy(false);
    setShowCreateForm(false);
  };

  const formatStatus = (status: GoalStatus): string => {
    switch (status) {
      case 'done': return '✅ Done';
      case 'not_done': return '❌ Not Done';
      case 'partially_done': return '⚠️ Partially Done';
      default: return '⏳ Pending';
    }
  };

  const getCategoryColor = (category?: string): string => {
    if (!category) return '#6366F1'; // Default purple
    const lowerCategory = category.toLowerCase();
    if (lowerCategory.includes('climate') || lowerCategory.includes('environment')) {
      return '#10B981'; // Green
    }
    if (lowerCategory.includes('health') || lowerCategory.includes('fitness')) {
      return '#EF4444'; // Red
    }
    if (lowerCategory.includes('education') || lowerCategory.includes('learn')) {
      return '#3B82F6'; // Blue
    }
    return '#6366F1'; // Default purple
  };

  const baseBalance = tokenService.getPurseBalance(PurseType.BASE);
  const stats = agent.getStatistics();

  // Filter goals based on selected tab
  const filteredGoals = goals.filter((goal) => {
    if (filter === 'active') {
      return goal.status === 'pending' || goal.status === 'partially_done';
    } else if (filter === 'completed') {
      return goal.status === 'done' || goal.status === 'not_done';
    }
    return true; // 'all'
  });

  // If a goal is selected, show the detail page
  if (selectedGoalId) {
    return (
      <GoalDetail
        goalId={selectedGoalId}
        agent={agent}
        tokenService={tokenService}
        onNavigate={onNavigate}
        onBack={() => {
          setSelectedGoalId(null);
          loadGoals(); // Reload goals when returning
        }}
      />
    );
  }

  // Date picker handlers
  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartDatePicker(false);
    }
    if (selectedDate && event.type !== 'dismissed') {
      setStartDate(selectedDate);
      // Reset end date if it's before or equal to start date
      if (endDate && selectedDate >= endDate) {
        setEndDate(null);
      }
    }
    // For Android, close if dismissed
    if (Platform.OS === 'android' && event.type === 'dismissed') {
      setShowStartDatePicker(false);
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndDatePicker(false);
    }
    if (selectedDate && event.type !== 'dismissed') {
      // Validate that end date is after start date
      if (selectedDate > startDate) {
        setEndDate(selectedDate);
      } else {
        // Don't alert on iOS during selection, only when Done is pressed
        if (Platform.OS === 'android') {
          Alert.alert('Invalid Date', 'End date must be after start date');
        }
      }
    }
    // For Android, close if dismissed
    if (Platform.OS === 'android' && event.type === 'dismissed') {
      setShowEndDatePicker(false);
    }
  };

  return (
    <View style={styles.container}>
      {showCreateForm ? (
        <View style={styles.formContainer}>
          <View style={styles.formHeaderBar}>
            <TouchableOpacity
              onPress={() => setShowCreateForm(false)}
              style={styles.backButton}
            >
              <MaterialCommunityIcons name="arrow-left" size={24} color="#6366F1" />
            </TouchableOpacity>
            <Text style={styles.formHeaderTitle}>Create Goal</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView 
            style={styles.formScrollView}
            contentContainerStyle={styles.formScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.compactForm}>
              {/* Goal Title */}
              <Text style={styles.compactLabel}>Goal Title *</Text>
              <TextInput
                style={styles.compactInput}
                placeholder="e.g., Run a marathon"
                value={title}
                onChangeText={setTitle}
              />
              
              {/* Description */}
              <Text style={styles.compactLabel}>Description *</Text>
              <TextInput
                style={[styles.compactInput, styles.compactTextArea]}
                placeholder="What do you want to achieve?"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />
              
              {/* Category & Dates in Row */}
              <View style={styles.compactRow}>
                <View style={styles.compactRowItem}>
                  <Text style={styles.compactLabel}>Category *</Text>
                  <TouchableOpacity
                    style={styles.compactDropdown}
                    onPress={() => setShowCategoryDropdown(true)}
                  >
                    <Text style={styles.compactDropdownText} numberOfLines={1}>
                      {category ? GoalCategoryLabels[category as GoalCategory].split(' ')[0] : 'Select'}
                    </Text>
                    <MaterialCommunityIcons name="chevron-down" size={16} color="#6366F1" />
                  </TouchableOpacity>
                </View>
                <View style={styles.compactRowItem}>
                  <Text style={styles.compactLabel}>Pledge (RDM) *</Text>
                  <TextInput
                    style={styles.compactInput}
                    placeholder="100"
                    value={pledgeAmount}
                    onChangeText={setPledgeAmount}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Dates Row */}
              <View style={styles.compactRow}>
                <View style={styles.compactRowItem}>
                  <Text style={styles.compactLabel}>Start Date *</Text>
                  <TouchableOpacity
                    style={styles.compactDateButton}
                    onPress={() => setShowStartDatePicker(true)}
                  >
                    <MaterialCommunityIcons name="calendar" size={16} color="#6366F1" />
                    <Text style={styles.compactDateText}>{formatDate(startDate).split(',')[0]}</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.compactRowItem}>
                  <Text style={styles.compactLabel}>End Date *</Text>
                  <TouchableOpacity
                    style={styles.compactDateButton}
                    onPress={() => setShowEndDatePicker(true)}
                  >
                    <MaterialCommunityIcons name="calendar" size={16} color="#6366F1" />
                    <Text style={[styles.compactDateText, !endDate && styles.compactDatePlaceholder]}>
                      {endDate ? formatDate(endDate).split(',')[0] : 'Select'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Verification & Check-in Row */}
              <View style={styles.compactRow}>
                <View style={styles.compactRowItem}>
                  <Text style={styles.compactLabel}>Verification *</Text>
                  <TouchableOpacity
                    style={styles.compactDropdown}
                    onPress={() => setShowVerificationDropdown(true)}
                  >
                    <Text style={styles.compactDropdownText} numberOfLines={1}>
                      {VerificationMethodLabels[verificationMethod].split(' ')[0]}
                    </Text>
                    <MaterialCommunityIcons name="chevron-down" size={16} color="#6366F1" />
                  </TouchableOpacity>
                </View>
                <View style={styles.compactRowItem}>
                  <Text style={styles.compactLabel}>Check-in *</Text>
                  <TouchableOpacity
                    style={styles.compactDropdown}
                    onPress={() => setShowCheckInDropdown(true)}
                  >
                    <Text style={styles.compactDropdownText} numberOfLines={1}>
                      {CheckInFrequencyLabels[checkInFrequency]}
                    </Text>
                    <MaterialCommunityIcons name="chevron-down" size={16} color="#6366F1" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Verifier Email - Conditional */}
              {requiresVerifierEmail(verificationMethod) && (
                <View>
                  <Text style={styles.compactLabel}>Verifier Email *</Text>
                  <TextInput
                    style={styles.compactInput}
                    placeholder="email@example.com"
                    value={verifierEmail}
                    onChangeText={setVerifierEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              )}

              {/* Has Buddy - Compact Switch */}
              <View style={styles.compactSwitchRow}>
                <MaterialCommunityIcons name="account-group" size={18} color="#6366F1" />
                <Text style={styles.compactSwitchLabel}>Match with habit buddy</Text>
                <Switch
                  value={hasBuddy}
                  onValueChange={setHasBuddy}
                  trackColor={{ false: '#E5E7EB', true: '#6366F1' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
          </ScrollView>
          
          {/* Sticky Bottom Button */}
          <View style={styles.stickyBottomBar}>
            <TouchableOpacity
              style={[styles.stickyButton, styles.stickyCancelButton]}
              onPress={resetForm}
            >
              <Text style={styles.stickyCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.stickyButton, styles.stickySubmitButton, isLoading && styles.buttonDisabled]}
              onPress={handleCreateGoal}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" />
                  <Text style={styles.stickySubmitText}>Create</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.title}>My Goals</Text>
              <Text style={styles.subtitle}>Track all your goals and progress.</Text>
            </View>
          </View>

          {/* Filter Tabs */}
          <View style={styles.filterTabs}>
            <TouchableOpacity
              style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
              onPress={() => setFilter('all')}
            >
              <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>
                All Goals
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterTab, filter === 'active' && styles.filterTabActive]}
              onPress={() => setFilter('active')}
            >
              <Text style={[styles.filterTabText, filter === 'active' && styles.filterTabTextActive]}>
                Active
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterTab, filter === 'completed' && styles.filterTabActive]}
              onPress={() => setFilter('completed')}
            >
              <Text style={[styles.filterTabText, filter === 'completed' && styles.filterTabTextActive]}>
                Completed
              </Text>
            </TouchableOpacity>
          </View>

          {/* Balance Card */}
          <View style={styles.balanceCard}>
            <View style={styles.balanceHeader}>
              <MaterialCommunityIcons name="wallet" size={24} color="#6366F1" />
              <Text style={styles.balanceLabel}>Base Purse Balance</Text>
            </View>
            <View style={styles.balanceAmounts}>
              <View style={styles.balanceItem}>
                <Text style={styles.balanceAmount}>
                  {TokenService.formatADA(baseBalance.ada)}
                </Text>
                <Text style={styles.balanceCurrency}>ADA</Text>
              </View>
              {baseBalance.rdmTokens !== undefined && (
                <View style={styles.balanceItem}>
                  <Text style={[styles.balanceAmount, styles.balanceAmountRDM]}>
                    {baseBalance.rdmTokens.toLocaleString()}
                  </Text>
                  <Text style={styles.balanceCurrency}>RDM</Text>
                </View>
              )}
            </View>
          </View>

          {/* Create Button - Always Visible */}
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreateForm(true)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="plus-circle" size={24} color="#FFFFFF" />
            <Text style={styles.createButtonText}>Create New Goal</Text>
          </TouchableOpacity>

          {/* Goals List */}
          <View style={styles.goalsList}>
            {filteredGoals.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyStateIconContainer}>
                  <MaterialCommunityIcons name="target-variant" size={80} color="#D1D5DB" />
                </View>
                <Text style={styles.emptyText}>
                  {goals.length === 0 ? 'No goals yet' : `No ${filter === 'all' ? '' : filter} goals`}
                </Text>
                <Text style={styles.emptySubtext}>
                  {goals.length === 0 ? 'Create your first goal to get started' : 'Try a different filter'}
                </Text>
                {goals.length === 0 && (
                  <TouchableOpacity
                    style={styles.emptyStateButton}
                    onPress={() => setShowCreateForm(true)}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons name="plus-circle" size={20} color="#6366F1" />
                    <Text style={styles.emptyStateButtonText}>Create Your First Goal</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              filteredGoals.map((goal) => {
                const categoryColor = getCategoryColor(goal.category);
                return (
                  <TouchableOpacity
                    key={goal.id}
                    style={[styles.goalCard, { borderLeftColor: categoryColor }]}
                    onPress={() => setSelectedGoalId(goal.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.goalCardHeader}>
                      <View style={styles.goalIconContainer}>
                        <MaterialCommunityIcons name="target" size={24} color={categoryColor} />
                      </View>
                      <View style={styles.goalCardContent}>
                        <Text style={styles.goalTitle}>{goal.title}</Text>
                        {goal.description && (
                          <Text style={styles.goalDescription} numberOfLines={2}>
                            {goal.description}
                          </Text>
                        )}
                      </View>
                    </View>
                    <Text style={styles.goalPledgeAmount}>
                      Pledged: {TokenService.formatTokenAmount(goal.pledgedTokens)}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </ScrollView>
      )}
      
      {/* Category Dropdown Modal */}
      <Modal
        visible={showCategoryDropdown}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategoryDropdown(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setShowCategoryDropdown(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {GOAL_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={styles.modalItem}
                  onPress={() => {
                    setCategory(cat);
                    setShowCategoryDropdown(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{GoalCategoryLabels[cat]}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Verification Method Dropdown Modal */}
      <Modal
        visible={showVerificationDropdown}
        transparent
        animationType="slide"
        onRequestClose={() => setShowVerificationDropdown(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Verification Method</Text>
              <TouchableOpacity onPress={() => setShowVerificationDropdown(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {VERIFICATION_METHODS.map((method) => (
                <TouchableOpacity
                  key={method}
                  style={styles.modalItem}
                  onPress={() => {
                    setVerificationMethod(method);
                    if (!requiresVerifierEmail(method)) {
                      setVerifierEmail('');
                    }
                    setShowVerificationDropdown(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{VerificationMethodLabels[method]}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Check-in Frequency Dropdown Modal */}
      <Modal
        visible={showCheckInDropdown}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCheckInDropdown(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Check-in Frequency</Text>
              <TouchableOpacity onPress={() => setShowCheckInDropdown(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {CHECK_IN_FREQUENCIES.map((freq) => (
                <TouchableOpacity
                  key={freq}
                  style={styles.modalItem}
                  onPress={() => {
                    setCheckInFrequency(freq);
                    setShowCheckInDropdown(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{CheckInFrequencyLabels[freq]}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Android Date Pickers */}
      {Platform.OS === 'android' && showStartDatePicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display="default"
          onChange={handleStartDateChange}
          minimumDate={new Date()}
        />
      )}

      {Platform.OS === 'android' && showEndDatePicker && (
        <DateTimePicker
          value={endDate || new Date(startDate.getTime() + 24 * 60 * 60 * 1000)}
          mode="date"
          display="default"
          onChange={handleEndDateChange}
          minimumDate={new Date(startDate.getTime() + 24 * 60 * 60 * 1000)}
        />
      )}

      {/* iOS Date Picker Modal Overlay */}
      {Platform.OS === 'ios' && (showStartDatePicker || showEndDatePicker) && (
        <Modal
          visible={showStartDatePicker || showEndDatePicker}
          transparent
          animationType="slide"
          onRequestClose={() => {
            setShowStartDatePicker(false);
            setShowEndDatePicker(false);
          }}
        >
          <View style={styles.datePickerModalOverlay}>
            <TouchableOpacity
              style={styles.datePickerModalOverlayTouchable}
              activeOpacity={1}
              onPress={() => {
                setShowStartDatePicker(false);
                setShowEndDatePicker(false);
              }}
            />
            <View style={styles.datePickerModalContent}>
              <View style={styles.datePickerModalHeader}>
                <TouchableOpacity
                  onPress={() => {
                    setShowStartDatePicker(false);
                    setShowEndDatePicker(false);
                  }}
                >
                  <Text style={styles.datePickerModalCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.datePickerModalTitle}>
                  {showStartDatePicker ? 'Select Start Date' : 'Select End Date'}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    if (showStartDatePicker) {
                      setShowStartDatePicker(false);
                    } else if (showEndDatePicker) {
                      // Validate end date before closing
                      const currentEndDate = endDate || new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
                      if (currentEndDate > startDate) {
                        if (!endDate) {
                          setEndDate(currentEndDate);
                        }
                        setShowEndDatePicker(false);
                      } else {
                        Alert.alert('Invalid Date', 'End date must be after start date');
                      }
                    }
                  }}
                >
                  <Text style={styles.datePickerModalDone}>Done</Text>
                </TouchableOpacity>
              </View>
              {showStartDatePicker && (
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  display="spinner"
                  onChange={handleStartDateChange}
                  minimumDate={new Date()}
                  style={styles.datePickerIOS}
                />
              )}
              {showEndDatePicker && (
                <DateTimePicker
                  value={endDate || new Date(startDate.getTime() + 24 * 60 * 60 * 1000)}
                  mode="date"
                  display="spinner"
                  onChange={handleEndDateChange}
                  minimumDate={new Date(startDate.getTime() + 24 * 60 * 60 * 1000)}
                  style={styles.datePickerIOS}
                />
              )}
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  formContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  formHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  formHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  formScrollView: {
    flex: 1,
  },
  formScrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  compactForm: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  compactLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  compactInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#F9FAFB',
    color: '#111827',
  },
  compactTextArea: {
    height: 70,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  compactRow: {
    flexDirection: 'row',
    gap: 12,
  },
  compactRowItem: {
    flex: 1,
  },
  compactDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#F9FAFB',
  },
  compactDropdownText: {
    fontSize: 14,
    color: '#111827',
    flex: 1,
  },
  compactDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#F9FAFB',
  },
  compactDateText: {
    fontSize: 14,
    color: '#111827',
    flex: 1,
  },
  compactDatePlaceholder: {
    color: '#9CA3AF',
  },
  compactSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  compactSwitchLabel: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  stickyBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 20,
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  stickyButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  stickyCancelButton: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  stickySubmitButton: {
    backgroundColor: '#6366F1',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  stickyCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  stickySubmitText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    marginRight: 4,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#6366F1',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 20,
  },
  filterTab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  filterTabActive: {
    borderBottomColor: '#6366F1',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterTabTextActive: {
    color: '#6366F1',
    fontWeight: '600',
  },
  balanceCard: {
    margin: 16,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  balanceAmounts: {
    flexDirection: 'row',
    gap: 24,
  },
  balanceItem: {
    flex: 1,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  balanceAmountRDM: {
    color: '#10B981',
  },
  balanceCurrency: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  createButton: {
    margin: 16,
    padding: 18,
    backgroundColor: '#6366F1',
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  createForm: {
    margin: 16,
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    gap: 16,
  },
  formHeaderIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formHeaderText: {
    flex: 1,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  formSection: {
    marginBottom: 32,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#EDE9FE',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#111827',
  },
  pledgeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  inputIcon: {
    marginLeft: 16,
    marginRight: 8,
  },
  pledgeInput: {
    flex: 1,
    borderWidth: 0,
    marginBottom: 0,
    paddingLeft: 0,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: -8,
    marginBottom: 12,
  },
  dropdownButton: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
  },
  datePickerButton: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  datePickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  datePickerText: {
    fontSize: 16,
    color: '#333',
  },
  datePickerPlaceholder: {
    color: '#999',
  },
  datePickerIOS: {
    width: '100%',
    height: 200,
  },
  datePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  datePickerModalOverlayTouchable: {
    flex: 1,
  },
  datePickerModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  datePickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  datePickerModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  datePickerModalCancel: {
    fontSize: 16,
    color: '#666',
  },
  datePickerModalDone: {
    fontSize: 16,
    color: '#0033AD',
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  switchLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  button: {
    flex: 1,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  submitButton: {
    backgroundColor: '#6366F1',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  createGoalButton: {
    backgroundColor: '#6366F1',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  createGoalButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
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
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalItemText: {
    fontSize: 16,
    color: '#333',
  },
  goalsList: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
    marginTop: 40,
  },
  emptyStateIconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  emptyText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  emptyStateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366F1',
  },
  goalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  goalCardHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  goalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  goalCardContent: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  goalDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  progressSection: {
    marginBottom: 16,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    minWidth: 40,
  },
  goalCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  sdgBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sdgBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  goalFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  goalPledgeAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  streakIcon: {
    marginLeft: 8,
  },
  goalStreak: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
  },
});

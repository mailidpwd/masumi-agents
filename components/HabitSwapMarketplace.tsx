/**
 * Habit Swap Marketplace Component
 * AI-powered habit matching and apprenticeship contracts
 * Designed to work as a tab within MarketplaceHub
 */
import React, { useState, useEffect, useMemo } from 'react';
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
import {
  ApprenticeshipContract,
  MentorshipType,
  Mentor,
  HabitBuddy,
  StrugglingHabit,
} from '../types/marketplace';
import {
  getAllMentors,
  getAllBuddies,
  getMentorsBySpecialties,
  getBuddiesByHabits,
} from '../services/marketplaceDummyData';

interface HabitSwapMarketplaceProps {
  onNavigate?: (screen: string) => void;
}

type TabType = 'mentors' | 'buddies';

// Available habit options (SDG categories + specific habits)
const SDG_HABITS = [
  'SDG_GoodHealth',
  'SDG_ClimateAction',
  'SDG_QualityEducation',
  'SDG_NoPoverty',
  'SDG_GenderEquality',
];

const SPECIFIC_HABITS = [
  'Meditation',
  'Fitness',
  'Yoga',
  'Reading',
  'Journaling',
  'Coding',
  'Language Learning',
  'Plant-Based',
  'Sustainable Living',
  'Eco-Friendly',
];

const ALL_HABITS = [...SDG_HABITS, ...SPECIFIC_HABITS];

export const HabitSwapMarketplace: React.FC<HabitSwapMarketplaceProps> = ({ onNavigate }) => {
  const [view, setView] = useState<'browse' | 'find-match' | 'my-contracts'>('browse');
  const [loading, setLoading] = useState(false);
  const [myContracts, setMyContracts] = useState<ApprenticeshipContract[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('mentors');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStrugglingHabits, setSelectedStrugglingHabits] = useState<StrugglingHabit[]>([]);
  const [showHabitSelector, setShowHabitSelector] = useState(false);
  const [pledgedRDM, setPledgedRDM] = useState('500');
  const [mentorshipType, setMentorshipType] = useState<MentorshipType>('apprenticeship');

  // Load dummy data
  const allMentors = getAllMentors();
  const allBuddies = getAllBuddies();

  useEffect(() => {
    loadMyContracts();
  }, []);

  const loadMyContracts = async () => {
    try {
      const services = getRDMServices();
      const contracts = services.marketplaceService.getUserContracts('current_user');
      setMyContracts(contracts);
    } catch (error) {
      console.error('Failed to load contracts:', error);
    }
  };

  // Filter mentors based on selected struggling habits
  const filteredMentors = useMemo(() => {
    let mentors = selectedStrugglingHabits.length > 0
      ? getMentorsBySpecialties(selectedStrugglingHabits)
      : allMentors;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      mentors = mentors.filter(
        (m) =>
          m.name.toLowerCase().includes(query) ||
          m.category.toLowerCase().includes(query) ||
          m.specialties.some((s) => s.toLowerCase().includes(query))
      );
    }

    return mentors;
  }, [selectedStrugglingHabits, searchQuery, allMentors]);

  // Filter buddies based on selected struggling habits
  const filteredBuddies = useMemo(() => {
    let buddies = selectedStrugglingHabits.length > 0
      ? getBuddiesByHabits(selectedStrugglingHabits)
      : allBuddies;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      buddies = buddies.filter(
        (b) =>
          b.name.toLowerCase().includes(query) ||
          b.habits.toLowerCase().includes(query) ||
          b.habitCategories.some((c) => c.toLowerCase().includes(query))
      );
    }

    return buddies;
  }, [selectedStrugglingHabits, searchQuery, allBuddies]);

  const toggleHabitSelection = (habit: StrugglingHabit) => {
    setSelectedStrugglingHabits((prev) =>
      prev.includes(habit) ? prev.filter((h) => h !== habit) : [...prev, habit]
    );
  };

  const createApprenticeship = async (
    mentorOrBuddyId: string,
    isMentor: boolean,
    category: string
  ) => {
    setLoading(true);
    try {
      const services = getRDMServices();
      const rdmAmount = parseFloat(pledgedRDM) || 500;

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);

      const contract = await services.medaa1Agent.createApprenticeship(
        'current_user',
        isMentor ? mentorOrBuddyId : undefined,
        !isMentor ? mentorOrBuddyId : undefined,
        category,
        `Goal related to ${category}`,
        { ada: rdmAmount, rdmTokens: 0 },
        {
          milestones: ['Complete weekly check-ins', 'Achieve 80% success rate'],
          verificationMethod: 'multi',
          minimumSuccessRate: 0.8,
        },
        {
          startDate,
          endDate,
          days: 30,
        }
      );

      Alert.alert('Success', `Contract created! Contract ID: ${contract.id}`);
      loadMyContracts();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create contract');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const stars = [];

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <MaterialCommunityIcons key={i} name="star" size={16} color="#F59E0B" />
      );
    }
    if (hasHalfStar) {
      stars.push(
        <MaterialCommunityIcons key="half" name="star-half-full" size={16} color="#F59E0B" />
      );
    }
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <MaterialCommunityIcons key={`empty-${i}`} name="star-outline" size={16} color="#D1D5DB" />
      );
    }
    return stars;
  };

  if (view === 'find-match') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setView('browse')} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#0033AD" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Find Habit Match</Text>
        </View>
        {/* Keep existing find-match form */}
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Search for mentors or buddies to find matches</Text>
              <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => setView('browse')}
          >
            <Text style={styles.emptyButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  if (view === 'my-contracts') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setView('browse')} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#0033AD" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Contracts</Text>
        </View>

        {myContracts.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="file-document-outline" size={64} color="#CCC" />
            <Text style={styles.emptyText}>No Contracts Yet</Text>
            <Text style={styles.emptySubtext}>Create your first apprenticeship to get started</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setView('browse')}
            >
              <Text style={styles.emptyButtonText}>Browse Marketplace</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.contractsList}>
            {myContracts.map((contract) => (
              <TouchableOpacity key={contract.id} style={styles.contractCard}>
                <View style={styles.contractHeader}>
                  <View style={styles.contractIcon}>
                    <MaterialCommunityIcons
                      name={contract.type === 'apprenticeship' ? 'account-switch' : 'account-heart'}
                      size={24}
                      color="#0033AD"
                    />
                  </View>
                  <View style={styles.contractInfo}>
                    <Text style={styles.contractTitle}>{contract.habitCategory}</Text>
                    <Text style={styles.contractSubtitle}>
                      {contract.type === 'apprenticeship' ? 'Apprenticeship' : 'Buddy'}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, styles[`statusBadge_${contract.status}` as keyof typeof styles]]}>
                    <Text style={styles.statusText}>{contract.status}</Text>
                  </View>
                </View>
                <View style={styles.contractDetails}>
                  <View style={styles.contractDetailRow}>
                    <Text style={styles.contractDetailLabel}>Pledged:</Text>
                    <Text style={styles.contractDetailValue}>
                      {contract.pledgedRDM.rdmTokens || contract.pledgedRDM.ada} RDM
                    </Text>
                  </View>
                  <View style={styles.contractDetailRow}>
                    <Text style={styles.contractDetailLabel}>Progress:</Text>
                    <Text style={styles.contractDetailValue}>
                      {contract.progressPercentage}%
                    </Text>
                  </View>
                  <View style={styles.contractDetailRow}>
                    <Text style={styles.contractDetailLabel}>End Date:</Text>
                    <Text style={styles.contractDetailValue}>
                      {formatDate(contract.duration.endDate)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <MaterialCommunityIcons name="magnify" size={20} color="#9CA3AF" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search mentors, goals, or habits..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <TouchableOpacity style={styles.filterButton}>
            <MaterialCommunityIcons name="filter" size={20} color="#6366F1" />
          </TouchableOpacity>
        </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => setView('find-match')}
        >
          <MaterialCommunityIcons name="magnify" size={32} color="#0033AD" />
          <Text style={styles.quickActionText}>Find Match</Text>
          <Text style={styles.quickActionSubtext}>AI-powered habit matching</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => setView('my-contracts')}
        >
          <MaterialCommunityIcons name="file-document" size={32} color="#10B981" />
          <Text style={styles.quickActionText}>My Contracts</Text>
          <Text style={styles.quickActionSubtext}>
            {myContracts.length} active
          </Text>
        </TouchableOpacity>
      </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
                <TouchableOpacity
            style={[styles.tab, activeTab === 'mentors' && styles.tabActive]}
            onPress={() => setActiveTab('mentors')}
          >
            <Text style={[styles.tabLabel, activeTab === 'mentors' && styles.tabLabelActive]}>
              Mentors
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'buddies' && styles.tabActive]}
            onPress={() => setActiveTab('buddies')}
          >
            <Text style={[styles.tabLabel, activeTab === 'buddies' && styles.tabLabelActive]}>
              Habit Buddies
            </Text>
          </TouchableOpacity>
                    </View>

        {/* Mentors Tab */}
        {activeTab === 'mentors' && (
          <View style={styles.contentSection}>
            {filteredMentors.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="account-search" size={64} color="#CCC" />
                <Text style={styles.emptyText}>No mentors found</Text>
                <Text style={styles.emptySubtext}>
                  {selectedStrugglingHabits.length > 0
                    ? 'Try selecting different habits or clearing filters'
                    : 'Try adjusting your search'}
                      </Text>
              </View>
            ) : (
              <View style={styles.gridContainer}>
                {filteredMentors.map((mentor) => (
                  <View key={mentor.id} style={styles.mentorCard}>
                    <View style={styles.mentorCardContent}>
                      <View style={[styles.mentorAvatar, mentor.gender === 'female' ? styles.avatarFemale : styles.avatarMale]}>
                        <MaterialCommunityIcons 
                          name={mentor.gender === 'female' ? 'account-circle' : 'account-circle'} 
                          size={32} 
                          color="#FFFFFF" 
                        />
                      </View>
                      <View style={styles.mentorInfo}>
                        <Text style={styles.mentorName} numberOfLines={1}>{mentor.name}</Text>
                        <Text style={styles.mentorCategory} numberOfLines={1}>{mentor.category}</Text>
                        <View style={styles.mentorRating}>
                          <View style={styles.starsContainer}>
                            {renderStars(mentor.rating)}
                    </View>
                          <Text style={styles.mentorRatingText} numberOfLines={1}>
                            {mentor.rating.toFixed(1)} ({mentor.reviews})
                      </Text>
                    </View>
                        <View style={styles.mentorStatsRow}>
                          <View style={styles.mentorStatItem}>
                            <Text style={styles.mentorStatLabel}>Success Rate</Text>
                            <Text style={[styles.mentorStatValue, styles.mentorSuccessRateValue]}>{mentor.successRate}%</Text>
                          </View>
                          <View style={styles.mentorStatDivider} />
                          <View style={styles.mentorStatItem}>
                            <Text style={styles.mentorStatLabel}>Rate</Text>
                            <View style={styles.rateValueContainer}>
                              <Text style={styles.mentorStatValue}>{mentor.rate} RDM</Text>
                              <Text style={styles.rateUnit}>/hr</Text>
                            </View>
                          </View>
                        </View>
                    </View>
                    </View>
                    <TouchableOpacity
                      style={styles.createApprenticeshipButton}
                      onPress={() => createApprenticeship(mentor.id, true, mentor.category)}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.createApprenticeshipButtonText}>Create Apprenticeship</Text>
                  )}
                </TouchableOpacity>
            </View>
          ))}
              </View>
            )}
        </View>
      )}

        {/* Buddies Tab */}
        {activeTab === 'buddies' && (
          <View style={styles.contentSection}>
            {filteredBuddies.length === 0 ? (
        <View style={styles.emptyState}>
                <MaterialCommunityIcons name="account-search" size={64} color="#CCC" />
                <Text style={styles.emptyText}>No buddies found</Text>
          <Text style={styles.emptySubtext}>
                  {selectedStrugglingHabits.length > 0
                    ? 'Try selecting different habits or clearing filters'
                    : 'Try adjusting your search'}
          </Text>
              </View>
            ) : (
              <View style={styles.gridContainer}>
                {filteredBuddies.map((buddy) => (
                  <View key={buddy.id} style={styles.buddyCard}>
                    <View style={styles.buddyCardContent}>
                      <View style={[styles.buddyAvatar, buddy.gender === 'female' ? styles.avatarFemale : styles.avatarMale]}>
                        <MaterialCommunityIcons 
                          name={buddy.gender === 'female' ? 'account-circle' : 'account-circle'} 
                          size={32} 
                          color="#FFFFFF" 
                        />
                      </View>
                      <View style={styles.buddyInfo}>
                        <Text style={styles.buddyName} numberOfLines={1}>{buddy.name}</Text>
                        <Text style={styles.buddyHabits} numberOfLines={2}>{buddy.habits}</Text>
                        <View style={styles.buddyStreak}>
                          <MaterialCommunityIcons name="fire" size={14} color="#F59E0B" />
                          <Text style={styles.buddyStreakText}>{buddy.streak} day streak</Text>
                        </View>
                        <View style={styles.buddyCompatibility}>
                          <Text style={styles.buddyCompatibilityLabel}>Compatibility Score</Text>
                          <Text style={styles.buddyCompatibilityValue}>{buddy.compatibility}%</Text>
                        </View>
                      </View>
                    </View>
          <TouchableOpacity
                      style={styles.connectBuddyButton}
                      onPress={() => createApprenticeship(buddy.id, false, buddy.habitCategories[0] || 'General')}
                      disabled={loading}
          >
                      <MaterialCommunityIcons name="account-plus" size={16} color="#FFFFFF" />
                      <Text style={styles.connectBuddyButtonText}>Connect as Buddy</Text>
          </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
        </View>
      )}
    </ScrollView>

      {/* Habit Selector Modal */}
      <Modal
        visible={showHabitSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowHabitSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Struggling Habits</Text>
              <TouchableOpacity onPress={() => setShowHabitSelector(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.modalSectionTitle}>SDG Categories</Text>
              <View style={styles.habitsGrid}>
                {SDG_HABITS.map((habit) => (
                  <TouchableOpacity
                    key={habit}
                    style={[
                      styles.habitChip,
                      selectedStrugglingHabits.includes(habit) && styles.habitChipSelected,
                    ]}
                    onPress={() => toggleHabitSelection(habit)}
                  >
                    <Text
                      style={[
                        styles.habitChipText,
                        selectedStrugglingHabits.includes(habit) && styles.habitChipTextSelected,
                      ]}
                    >
                      {habit.replace('SDG_', '')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.modalSectionTitle}>Specific Habits</Text>
              <View style={styles.habitsGrid}>
                {SPECIFIC_HABITS.map((habit) => (
                  <TouchableOpacity
                    key={habit}
                    style={[
                      styles.habitChip,
                      selectedStrugglingHabits.includes(habit) && styles.habitChipSelected,
                    ]}
                    onPress={() => toggleHabitSelection(habit)}
                  >
                    <Text
                      style={[
                        styles.habitChipText,
                        selectedStrugglingHabits.includes(habit) && styles.habitChipTextSelected,
                      ]}
                    >
                      {habit}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <TouchableOpacity
              style={styles.modalDoneButton}
              onPress={() => setShowHabitSelector(false)}
            >
              <Text style={styles.modalDoneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.3,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    letterSpacing: -0.1,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  strugglingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  strugglingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  strugglingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  strugglingText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  selectHabitsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  selectHabitsButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  selectedHabitsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  selectedHabitsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  selectedHabitsChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedHabitChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  selectedHabitChipText: {
    fontSize: 12,
    color: '#6366F1',
    fontWeight: '500',
  },
  removeHabitButton: {
    padding: 2,
  },
  autoMatchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  autoMatchBannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065F46',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginTop: 10,
    letterSpacing: -0.2,
  },
  quickActionSubtext: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 3,
    textAlign: 'center',
    letterSpacing: -0.1,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 9,
  },
  tabActive: {
    backgroundColor: '#6366F1',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    letterSpacing: -0.15,
  },
  tabLabelActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  contentSection: {
    marginBottom: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  mentorCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  mentorCardContent: {
    marginBottom: 10,
  },
  mentorAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    alignSelf: 'center',
  },
  avatarMale: {
    backgroundColor: '#3B82F6',
  },
  avatarFemale: {
    backgroundColor: '#EC4899',
  },
  mentorInfo: {
    alignItems: 'center',
  },
  mentorName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 3,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  mentorCategory: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.1,
  },
  mentorRating: {
    alignItems: 'center',
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  mentorRatingText: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
  },
  mentorStatsRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  mentorStatItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mentorStatLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 4,
    letterSpacing: -0.1,
    fontWeight: '500',
  },
  mentorStatValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  rateValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  rateUnit: {
    fontSize: 10,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 2,
    letterSpacing: -0.1,
  },
  mentorSuccessRateValue: {
    color: '#10B981',
  },
  mentorStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 6,
  },
  createApprenticeshipButton: {
    backgroundColor: '#10B981',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  createApprenticeshipButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.15,
  },
  buddyCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  buddyCardContent: {
    marginBottom: 10,
  },
  buddyAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    alignSelf: 'center',
  },
  buddyInfo: {
    alignItems: 'center',
  },
  buddyName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 3,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  buddyHabits: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 8,
    textAlign: 'center',
    minHeight: 28,
    letterSpacing: -0.1,
  },
  buddyStreak: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginBottom: 8,
    gap: 4,
  },
  buddyStreakText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#92400E',
  },
  buddyCompatibility: {
    alignItems: 'center',
  },
  buddyCompatibilityLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 2,
  },
  buddyCompatibilityValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
    letterSpacing: -0.3,
  },
  connectBuddyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    width: '100%',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  connectBuddyButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.15,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
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
  contractsList: {
    gap: 12,
  },
  contractCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  contractHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contractIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contractInfo: {
    flex: 1,
  },
  contractTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  contractSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadge_active: {
    backgroundColor: '#D1FAE5',
  },
  statusBadge_pending: {
    backgroundColor: '#FEF3C7',
  },
  statusBadge_completed: {
    backgroundColor: '#DBEAFE',
  },
  statusBadge_failed: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  contractDetails: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
    gap: 8,
  },
  contractDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  contractDetailLabel: {
    fontSize: 14,
    color: '#666',
  },
  contractDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
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
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalScroll: {
    maxHeight: 400,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    marginTop: 8,
  },
  habitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  habitChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  habitChipSelected: {
    backgroundColor: '#E0E7FF',
    borderColor: '#6366F1',
  },
  habitChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  habitChipTextSelected: {
    color: '#6366F1',
    fontWeight: '600',
  },
  modalDoneButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  modalDoneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

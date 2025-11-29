/**
 * Goal Detail Page Component
 * Comprehensive goal tracking with progress, reflections, and support features
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Medaa1Agent } from '../services/medaa1Agent';
import { TokenService } from '../services/tokenService';
import { DailyGoal, TokenAmount } from '../types/rdm';
import { ReflectionEvidence, VerificationResult, Reflection } from '../types/verification';
import { SDG, getSDGById } from '../types/sdg';
import { getRDMServices } from '../services/agentInitializer';

interface GoalDetailProps {
  goalId: string;
  agent: Medaa1Agent;
  tokenService: TokenService;
  onNavigate?: (screen: string) => void;
  onBack: () => void;
}

// Use Reflection type from verification.ts

export const GoalDetail: React.FC<GoalDetailProps> = ({
  goalId,
  agent,
  tokenService,
  onNavigate,
  onBack,
}) => {
  const [goal, setGoal] = useState<DailyGoal | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [showReflectionModal, setShowReflectionModal] = useState(false);
  const [showMentorModal, setShowMentorModal] = useState(false);
  
  // Reflection form state
  const [activityLog, setActivityLog] = useState('');
  const [reflectionNotes, setReflectionNotes] = useState('');
  const [selfScore, setSelfScore] = useState<'done' | 'not_done' | 'partially_done'>('done');
  const [completionPercentage, setCompletionPercentage] = useState(80);
  const [selectedMedia, setSelectedMedia] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [submittingReflection, setSubmittingReflection] = useState(false);

  useEffect(() => {
    loadGoalData();
  }, [goalId]);

  const loadGoalData = async () => {
    try {
      setLoading(true);
      const goalData = agent.getGoal(goalId);
      if (goalData) {
        setGoal(goalData);
        // Load reflections (for now, we'll track them separately)
        // In a real implementation, these would be stored and retrieved
        loadReflections(goalData);
      } else {
        Alert.alert('Error', 'Goal not found');
        onBack();
      }
    } catch (error) {
      console.error('Failed to load goal:', error);
      Alert.alert('Error', 'Failed to load goal details');
    } finally {
      setLoading(false);
    }
  };

  const loadReflections = (goalData: DailyGoal) => {
    // Load reflections from agent
    const reflectionList = agent.getReflections(goalData.id);
    // Sort by date (newest first)
    reflectionList.sort((a, b) => b.created_date.getTime() - a.created_date.getTime());
    setReflections(reflectionList);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGoalData();
    setRefreshing(false);
  };

  const ensureDate = (date: Date | string | undefined): Date => {
    if (!date) return new Date();
    if (date instanceof Date) return date;
    return new Date(date);
  };

  const calculateProgress = (): number => {
    if (!goal) return 0;
    // Use reflection-based completion_percentage if available, otherwise 0
    return goal.completion_percentage || 0;
  };

  const calculateTimeProgress = (): number => {
    if (!goal) return 0;
    
    const startDate = ensureDate(goal.timeWindow?.startDate || goal.createdAt);
    const endDate = ensureDate(goal.timeWindow?.endDate || goal.targetDate);
    const now = new Date();
    
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysElapsed = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (totalDays <= 0) return 100;
    const progress = Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100));
    
    return progress;
  };

  const getDaysRemaining = (): number => {
    if (!goal) return 0;
    const endDate = ensureDate(goal.timeWindow?.endDate || goal.targetDate);
    const now = new Date();
    const days = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  };

  const getDaysElapsed = (): number => {
    if (!goal) return 0;
    const startDate = ensureDate(goal.timeWindow?.startDate || goal.createdAt);
    const now = new Date();
    const days = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  };

  const formatTokenAmount = (tokens: TokenAmount): string => {
    if (tokens.rdmTokens && tokens.rdmTokens > 0) {
      return `${tokens.rdmTokens} RDM`;
    }
    return `${TokenService.formatADA(tokens.ada)} ADA`;
  };

  const formatDate = (date: Date | string): string => {
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
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

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to upload images');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultiple: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        setSelectedMedia([...selectedMedia, ...result.assets]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const removeMedia = (index: number) => {
    setSelectedMedia(selectedMedia.filter((_, i) => i !== index));
  };

  const handleSubmitReflection = async () => {
    if (!goal || !activityLog.trim()) {
      Alert.alert('Required Field', 'Please tell your story');
      return;
    }

    try {
      setSubmittingReflection(true);
      
      // Convert selected media to MediaEvidence format
      const mediaEvidence = selectedMedia.map((asset, index) => ({
        id: `media_${Date.now()}_${index}`,
        type: asset.type === 'video' ? 'video' : 'photo' as 'photo' | 'video',
        uri: asset.uri,
        thumbnailUri: asset.uri, // Use same URI for thumbnail
        mimeType: asset.mimeType || 'image/jpeg',
        size: asset.fileSize || 0,
        uploadedAt: new Date(),
      }));

      const reflectionEvidence: ReflectionEvidence = {
        activityLog,
        media: mediaEvidence,
        selfScore,
        self_percentage: completionPercentage,
        notes: reflectionNotes,
        submittedAt: new Date(),
        thirdPartyVerifications: [],
        iotVerifications: [],
        verifierInputs: [],
      };

      await agent.submitReflection(goalId, reflectionEvidence);
      
      // Reload goal and reflections to get updated data
      await loadGoalData();
      
      // Reset form
      setActivityLog('');
      setReflectionNotes('');
      setSelfScore('done');
      setCompletionPercentage(80);
      setSelectedMedia([]);
      setShowReflectionModal(false);
      
      Alert.alert('Success', 'Reflection submitted successfully');
    } catch (error) {
      console.error('Failed to submit reflection:', error);
      Alert.alert('Error', 'Failed to submit reflection');
    } finally {
      setSubmittingReflection(false);
    }
  };

  // Update completion percentage when self score changes
  React.useEffect(() => {
    if (selfScore === 'done') {
      setCompletionPercentage(80);
    } else if (selfScore === 'partially_done') {
      setCompletionPercentage(50);
    } else {
      setCompletionPercentage(0);
    }
  }, [selfScore]);

  const handleGetHelp = async () => {
    if (!goal) return;
    
    try {
      const services = getRDMServices();
      const struggle = {
        goalId: goal.id,
        category: goal.category || 'general',
        description: goal.description || goal.title,
        challenges: ['Need motivation and support'],
      };
      
      const criteria = {
        mentorshipType: 'peer' as const,
        minRating: 5,
        category: goal.category || 'general',
      };
      
      // This would call the marketplace service
      // For now, just show the modal
      setShowMentorModal(true);
    } catch (error) {
      console.error('Failed to find matches:', error);
      Alert.alert('Error', 'Failed to find mentors. Please try again.');
    }
  };

  const triggerAIVerification = async () => {
    if (!goal) return;
    
    // Stub function for Veritas AI judgment
    // This will call n8n webhook (agent-veritas) in the future
    const verificationData = {
      goalId: goal.id,
      goalDetails: {
        title: goal.title,
        description: goal.description,
        category: goal.category,
        status: goal.status,
      },
      progressMetrics: {
        progressPercentage: calculateProgress(),
        daysElapsed: getDaysElapsed(),
        daysRemaining: getDaysRemaining(),
      },
      reflections: reflections.map(r => ({
        date: r.date,
        notes: r.notes,
        selfScore: r.selfScore,
      })),
    };
    
    console.log('AI Verification Data (stub):', verificationData);
    // TODO: Implement n8n webhook call to agent-veritas
    Alert.alert('Info', 'AI verification will be processed (stub implementation)');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading goal details...</Text>
      </View>
    );
  }

  if (!goal) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle" size={48} color="#EF4444" />
        <Text style={styles.errorText}>Goal not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const progress = calculateProgress();
  const daysElapsed = getDaysElapsed();
  const daysRemaining = getDaysRemaining();
  const categoryColor = getCategoryColor(goal.category);
  const checkInFrequency = goal.checkInSchedule?.frequency || 'weekly';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{goal.title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Dashboard Card - Goal Overview */}
        <View style={[styles.dashboardCard, { borderLeftColor: categoryColor, shadowColor: categoryColor }]}>
          <View style={styles.dashboardHeader}>
            <MaterialCommunityIcons name="target" size={24} color={categoryColor} />
            <Text style={styles.dashboardTitle}>Goal Overview</Text>
            {goal.sdgAlignment && goal.sdgAlignment.length > 0 && (
              <View style={styles.sdgTag}>
                <Text style={styles.sdgTagText}>
                  SDG {getSDGById(goal.sdgAlignment[0]).name.replace(/\s+/g, '')}
                </Text>
              </View>
            )}
          </View>

          {/* Progress Ring (simplified as percentage display) */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressCircle, { 
              borderColor: categoryColor,
              backgroundColor: progress > 0 ? `${categoryColor}15` : '#F3F4F6',
            }]}>
              <Text style={[styles.progressText, { 
                color: progress > 0 ? categoryColor : '#9CA3AF',
                fontSize: progress > 0 ? 32 : 24,
              }]}>
                {Math.round(progress)}%
              </Text>
              {progress === 0 && (
                <Text style={styles.progressSubtext}>No progress yet</Text>
              )}
            </View>
          </View>

          {/* Stats Grid 2x2 */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <MaterialCommunityIcons name="wallet" size={20} color="#6366F1" />
              <Text style={styles.statValue}>{formatTokenAmount(goal.pledgedTokens)}</Text>
              <Text style={styles.statLabel}>Pledged</Text>
            </View>
            <View style={styles.statCard}>
              <MaterialCommunityIcons name="fire" size={20} color="#F59E0B" />
              <Text style={styles.statValue}>{goal.streak_days || 0}</Text>
              <Text style={styles.statLabel}>Streak</Text>
            </View>
            <View style={styles.statCard}>
              <MaterialCommunityIcons name="message-text" size={20} color="#3B82F6" />
              <Text style={styles.statValue}>{goal.days_with_reflections || reflections.length}</Text>
              <Text style={styles.statLabel}>Reflections</Text>
            </View>
            <View style={styles.statCard}>
              <MaterialCommunityIcons 
                name={goal.status === 'done' ? 'check-circle' : 'clock-outline'} 
                size={20} 
                color={goal.status === 'done' ? '#10B981' : '#6B7280'} 
              />
              <Text style={[styles.statValue, { 
                color: goal.status === 'done' ? '#10B981' : '#6B7280' 
              }]}>
                {goal.status === 'done' ? 'Done' : goal.status === 'pending' ? 'Active' : 'Partial'}
              </Text>
              <Text style={styles.statLabel}>Status</Text>
            </View>
          </View>

          {/* Dates & Verification - Compact Layout */}
          <View style={styles.metaInfoContainer}>
            <View style={styles.metaInfoRow}>
              <View style={styles.metaInfoItem}>
                <MaterialCommunityIcons name="calendar-start" size={16} color="#6B7280" />
                <Text style={styles.metaInfoLabel}>Start</Text>
                <Text style={styles.metaInfoValue}>
                  {formatDate(ensureDate(goal.timeWindow?.startDate || goal.createdAt))}
                </Text>
              </View>
              <View style={styles.metaInfoDivider} />
              <View style={styles.metaInfoItem}>
                <MaterialCommunityIcons name="calendar-end" size={16} color="#6B7280" />
                <Text style={styles.metaInfoLabel}>End</Text>
                <Text style={styles.metaInfoValue}>
                  {formatDate(ensureDate(goal.timeWindow?.endDate || goal.targetDate))}
                </Text>
              </View>
            </View>
            <View style={styles.verificationBadge}>
              <MaterialCommunityIcons name="shield-check" size={14} color="#6366F1" />
              <Text style={styles.verificationBadgeText}>Self Report</Text>
            </View>
          </View>
        </View>

        {/* Timeline Section */}
        <View style={styles.timelineCard}>
          <View style={styles.timelineHeader}>
            <View style={styles.timelineHeaderLeft}>
              <MaterialCommunityIcons name="clock-outline" size={24} color="#6366F1" />
              <Text style={styles.timelineTitle}>Timeline</Text>
            </View>
          </View>

          <View style={styles.timelineContent}>
            <View style={styles.timelineItem}>
              <MaterialCommunityIcons name="flag" size={20} color="#10B981" />
              <Text style={styles.timelineLabel}>Start</Text>
              <Text style={styles.timelineValue}>
                {formatDate(ensureDate(goal.timeWindow?.startDate || goal.createdAt))}
              </Text>
            </View>

            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBackground}>
                <View style={[styles.progressBarFill, { 
                  width: `${calculateTimeProgress()}%`,
                  backgroundColor: categoryColor,
                }]} />
              </View>
              <View style={styles.progressBarLabels}>
                <View style={styles.progressBarLabelItem}>
                  <Text style={styles.progressBarText}>{daysElapsed}</Text>
                  <Text style={styles.progressBarSubtext}>days elapsed</Text>
                </View>
                <View style={styles.progressBarLabelItem}>
                  <Text style={styles.progressBarText}>{daysRemaining}</Text>
                  <Text style={styles.progressBarSubtext}>days left</Text>
                </View>
              </View>
            </View>

            <View style={styles.timelineItem}>
              <MaterialCommunityIcons name="flag" size={20} color="#EF4444" />
              <Text style={styles.timelineLabel}>End</Text>
              <Text style={styles.timelineValue}>
                {formatDate(ensureDate(goal.timeWindow?.endDate || goal.targetDate))}
              </Text>
            </View>

            <View style={styles.timelineMeta}>
              <View style={styles.timelineMetaItem}>
                <Text style={styles.timelineMetaLabel}>Status</Text>
                <View style={[styles.statusPill, { 
                  backgroundColor: goal.status === 'done' ? '#10B981' : '#3B82F6' 
                }]}>
                  <Text style={styles.statusPillText}>
                    {goal.status === 'done' ? 'completed' : 'active'}
                  </Text>
                </View>
              </View>
              <View style={styles.timelineMetaDivider} />
              <View style={styles.timelineMetaItem}>
                <Text style={styles.timelineMetaLabel}>Check-in</Text>
                <Text style={styles.timelineMetaValue}>
                  {checkInFrequency.charAt(0).toUpperCase() + checkInFrequency.slice(1)}
                </Text>
              </View>
            </View>

            {/* Milestones */}
            <View style={styles.milestonesContainer}>
              <Text style={styles.milestonesTitle}>Milestones</Text>
              <View style={styles.milestoneItem}>
                <MaterialCommunityIcons name="check-circle" size={18} color="#10B981" />
                <Text style={styles.milestoneText}>Goal Created</Text>
                <Text style={styles.milestoneDate}>{formatDate(ensureDate(goal.createdAt))}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Struggling Section */}
        <View style={styles.strugglingCard}>
          <View style={styles.strugglingHeader}>
            <View style={styles.strugglingIconContainer}>
              <MaterialCommunityIcons name="alert-circle" size={24} color="#6366F1" />
            </View>
            <Text style={styles.strugglingTitle}>Struggling with this goal?</Text>
          </View>
          <Text style={styles.strugglingText}>
            Get connected with mentors or buddies who are succeeding at similar habits. 
            Automatically connects you with someone succeeding at that habit for peer mentorship 
            OR simply connect to a buddy of your choice.
          </Text>
          <View style={styles.strugglingButtons}>
            <TouchableOpacity 
              style={[styles.helpButton, styles.getHelpButton]} 
              onPress={handleGetHelp}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="star" size={18} color="#FFFFFF" />
              <Text style={styles.helpButtonText}>Get Help</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.helpButton, styles.browseButton]} 
              onPress={() => onNavigate?.('marketplace')}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="open-in-new" size={18} color="#6366F1" />
              <Text style={[styles.helpButtonText, { color: '#6366F1' }]}>Browse Marketplace</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Reflections & Check-ins Section */}
        <View style={styles.reflectionsCard}>
          <View style={styles.reflectionsHeader}>
            <MaterialCommunityIcons name="message-text" size={24} color="#6366F1" />
            <Text style={styles.reflectionsTitle}>Reflections & Check-ins</Text>
            <TouchableOpacity 
              style={styles.addReflectionButton}
              onPress={() => setShowReflectionModal(true)}
            >
              <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
              <Text style={styles.addReflectionButtonText}>Add Reflection</Text>
            </TouchableOpacity>
          </View>

          {reflections.length === 0 ? (
            <View style={styles.emptyReflections}>
              <View style={styles.emptyReflectionsIconContainer}>
                <MaterialCommunityIcons name="message-text-outline" size={64} color="#D1D5DB" />
              </View>
              <Text style={styles.emptyReflectionsText}>No reflections yet</Text>
              <Text style={styles.emptyReflectionsSubtext}>
                Start by adding your first check-in reflection
              </Text>
              <TouchableOpacity 
                style={styles.emptyStateAddButton}
                onPress={() => setShowReflectionModal(true)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="plus" size={20} color="#6366F1" />
                <Text style={styles.emptyStateAddButtonText}>Add First Reflection</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.reflectionsList}>
              {reflections.map((reflection) => (
                <View key={reflection.id} style={styles.reflectionCard}>
                  <View style={styles.reflectionHeader}>
                    <Text style={styles.reflectionDate}>
                      {formatDate(ensureDate(reflection.created_date))}
                    </Text>
                    <View style={[styles.reflectionStatusBadge, {
                      backgroundColor: reflection.self_score === 'done' ? '#10B981' : 
                                       reflection.self_score === 'partially_done' ? '#F59E0B' : '#EF4444'
                    }]}>
                      <Text style={styles.reflectionStatusText}>
                        {reflection.self_score === 'done' ? 'Done' : 
                         reflection.self_score === 'partially_done' ? 'Partial' : 'Not Done'}
                      </Text>
                    </View>
                  </View>
                  {reflection.self_percentage !== undefined && (
                    <Text style={styles.reflectionPercentage}>
                      Completion: {reflection.self_percentage}%
                    </Text>
                  )}
                  {reflection.content && (
                    <Text style={styles.reflectionNotes}>{reflection.content}</Text>
                  )}
                  {reflection.notes && (
                    <Text style={styles.reflectionAdditionalNotes}>{reflection.notes}</Text>
                  )}
                  {reflection.media_urls && reflection.media_urls.length > 0 && (
                    <View style={styles.reflectionMediaContainer}>
                      <Text style={styles.reflectionMediaLabel}>
                        {reflection.media_urls.length} media file(s) attached
                      </Text>
                    </View>
                  )}
                  {reflection.verificationResult && (
                    <View style={styles.verificationBadge}>
                      <MaterialCommunityIcons name="shield-check" size={14} color="#6366F1" />
                      <Text style={styles.verificationBadgeText}>
                        Verified ({Math.round(reflection.verificationResult.verificationScore * 100)}%)
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* FAB for adding reflection */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => setShowReflectionModal(true)}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="plus" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Reflection Modal */}
      <Modal
        visible={showReflectionModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReflectionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleSection}>
                <MaterialCommunityIcons name="message-text" size={24} color="#6366F1" />
                <Text style={styles.modalTitle}>Reflections & Check-ins</Text>
              </View>
              <TouchableOpacity onPress={() => setShowReflectionModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* How did it go? */}
              <Text style={styles.modalLabel}>How did it go? *</Text>
              <View style={styles.scoreButtons}>
                <TouchableOpacity
                  style={[styles.scoreButton, selfScore === 'done' && styles.scoreButtonActive]}
                  onPress={() => setSelfScore('done')}
                >
                  <MaterialCommunityIcons 
                    name="check-circle" 
                    size={20} 
                    color={selfScore === 'done' ? '#10B981' : '#9CA3AF'} 
                  />
                  <Text style={[styles.scoreButtonText, selfScore === 'done' && styles.scoreButtonTextActive]}>
                    Done
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.scoreButton, selfScore === 'partially_done' && styles.scoreButtonActive]}
                  onPress={() => setSelfScore('partially_done')}
                >
                  <MaterialCommunityIcons 
                    name="alert-circle" 
                    size={20} 
                    color={selfScore === 'partially_done' ? '#F59E0B' : '#9CA3AF'} 
                  />
                  <Text style={[styles.scoreButtonText, selfScore === 'partially_done' && styles.scoreButtonTextActive]}>
                    Partially
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.scoreButton, selfScore === 'not_done' && styles.scoreButtonActive]}
                  onPress={() => setSelfScore('not_done')}
                >
                  <MaterialCommunityIcons 
                    name="close-circle" 
                    size={20} 
                    color={selfScore === 'not_done' ? '#EF4444' : '#9CA3AF'} 
                  />
                  <Text style={[styles.scoreButtonText, selfScore === 'not_done' && styles.scoreButtonTextActive]}>
                    Not Done
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Completion Percentage Slider */}
              <Text style={styles.modalLabel}>Completion Percentage: {completionPercentage}%</Text>
              <View style={styles.sliderContainer}>
                <View style={styles.sliderControls}>
                  <TouchableOpacity
                    style={styles.sliderButton}
                    onPress={() => setCompletionPercentage(Math.max(0, completionPercentage - 5))}
                  >
                    <MaterialCommunityIcons name="minus" size={20} color="#6366F1" />
                  </TouchableOpacity>
                  <View style={styles.sliderTrackContainer}>
                    <View style={styles.sliderTrack}>
                      <View style={[styles.sliderFill, { width: `${completionPercentage}%` }]} />
                    </View>
                    <View style={styles.sliderLabels}>
                      <Text style={styles.sliderLabel}>0%</Text>
                      <Text style={styles.sliderLabel}>50%</Text>
                      <Text style={styles.sliderLabel}>100%</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.sliderButton}
                    onPress={() => setCompletionPercentage(Math.min(100, completionPercentage + 5))}
                  >
                    <MaterialCommunityIcons name="plus" size={20} color="#6366F1" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Tell your story */}
              <Text style={styles.modalLabel}>What happened? Tell your story *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Describe your progress, challenges, wins, and learnings..."
                value={activityLog}
                onChangeText={setActivityLog}
                multiline
                numberOfLines={6}
              />

              {/* Additional Notes */}
              <Text style={styles.modalLabel}>Additional Notes (optional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Any other thoughts, feelings, or observations..."
                value={reflectionNotes}
                onChangeText={setReflectionNotes}
                multiline
                numberOfLines={4}
              />

              {/* Upload Evidence */}
              <Text style={styles.modalLabel}>Upload Evidence (Photos/Videos)</Text>
              <TouchableOpacity 
                style={styles.uploadArea}
                onPress={handlePickImage}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="arrow-up-circle" size={48} color="#9CA3AF" />
                <Text style={styles.uploadText}>Click to upload photos or videos</Text>
                <Text style={styles.uploadSubtext}>PNG, JPG, MP4 up to 10MB</Text>
              </TouchableOpacity>

              {/* Selected Media Preview */}
              {selectedMedia.length > 0 && (
                <View style={styles.mediaPreviewContainer}>
                  {selectedMedia.map((asset, index) => (
                    <View key={index} style={styles.mediaPreviewItem}>
                      {asset.type === 'image' ? (
                        <Image 
                          source={{ uri: asset.uri }} 
                          style={styles.mediaPreviewImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.mediaPreviewVideo}>
                          <MaterialCommunityIcons name="video" size={40} color="#6366F1" />
                        </View>
                      )}
                      <TouchableOpacity
                        style={styles.removeMediaButton}
                        onPress={() => removeMedia(index)}
                      >
                        <MaterialCommunityIcons name="close-circle" size={20} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Action Buttons Section */}
              <View style={styles.modalActionsContainer}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => {
                    setShowReflectionModal(false);
                    setActivityLog('');
                    setReflectionNotes('');
                    setSelfScore('done');
                    setCompletionPercentage(80);
                    setSelectedMedia([]);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    submittingReflection && styles.submitButtonDisabled,
                    !activityLog.trim() && styles.submitButtonDisabled
                  ]}
                  onPress={handleSubmitReflection}
                  disabled={submittingReflection || !activityLog.trim()}
                  activeOpacity={0.8}
                >
                  {submittingReflection ? (
                    <View style={styles.submitButtonContent}>
                      <ActivityIndicator color="#FFFFFF" size="small" />
                      <Text style={styles.submitButtonText}>Submitting...</Text>
                    </View>
                  ) : (
                    <View style={styles.submitButtonContent}>
                      <MaterialCommunityIcons name="check-circle" size={20} color="#FFFFFF" />
                      <Text style={styles.submitButtonText}>Submit Reflection</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Mentor Match Modal */}
      <Modal
        visible={showMentorModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMentorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Find Mentor or Buddy</Text>
              <TouchableOpacity onPress={() => setShowMentorModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalScroll}>
              <Text style={styles.modalText}>
                This feature will connect you with mentors or buddies who are succeeding at similar habits.
                Marketplace integration coming soon!
              </Text>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={() => {
                  setShowMentorModal(false);
                  onNavigate?.('marketplace');
                }}
              >
                <Text style={styles.submitButtonText}>Go to Marketplace</Text>
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
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#EF4444',
    marginTop: 16,
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
    gap: 16,
  },
  dashboardCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  dashboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  dashboardTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  sdgTag: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  sdgTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  progressCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  progressText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  progressSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  metaInfoContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  metaInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  metaInfoItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  metaInfoDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  metaInfoLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  metaInfoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
  },
  verificationBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366F1',
  },
  timelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  timelineHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timelineTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  timelineContent: {
    gap: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timelineLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 'auto',
  },
  timelineValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  progressBarContainer: {
    marginVertical: 12,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressBarLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  progressBarLabelItem: {
    alignItems: 'center',
  },
  progressBarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  progressBarSubtext: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  timelineMeta: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  timelineMetaItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  timelineMetaDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
  timelineMetaLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  timelineMetaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  milestonesContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  milestonesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  milestoneText: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  milestoneDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  strugglingCard: {
    backgroundColor: '#EDE9FE',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  strugglingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  strugglingIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  strugglingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  strugglingText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  strugglingButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  helpButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  getHelpButton: {
    backgroundColor: '#6366F1',
  },
  browseButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  helpButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  reflectionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  reflectionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  reflectionsTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  addReflectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  addReflectionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyReflections: {
    alignItems: 'center',
    padding: 48,
  },
  emptyReflectionsIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyReflectionsText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  emptyReflectionsSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyStateAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  emptyStateAddButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366F1',
  },
  reflectionsList: {
    gap: 12,
  },
  reflectionCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#6366F1',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRightWidth: 1,
  },
  reflectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reflectionDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  reflectionStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  reflectionStatusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  reflectionNotes: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
    marginBottom: 8,
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  verificationBadgeText: {
    fontSize: 12,
    color: '#6366F1',
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
  modalScroll: {
    padding: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    marginTop: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  scoreButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  scoreButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  scoreButtonActive: {
    borderColor: '#6366F1',
    backgroundColor: '#EDE9FE',
  },
  scoreButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 6,
  },
  scoreButtonTextActive: {
    color: '#6366F1',
  },
  sliderContainer: {
    marginBottom: 20,
  },
  sliderControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sliderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderTrackContainer: {
    flex: 1,
  },
  sliderTrack: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  uploadArea: {
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    marginBottom: 16,
  },
  uploadText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginTop: 8,
    marginBottom: 4,
  },
  uploadSubtext: {
    fontSize: 12,
    color: '#6B7280',
  },
  mediaPreviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  mediaPreviewItem: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
  },
  mediaPreviewImage: {
    width: '100%',
    height: '100%',
  },
  mediaPreviewVideo: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeMediaButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  modalActionsContainer: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  modalCancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  reflectionPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
    marginBottom: 8,
  },
  reflectionAdditionalNotes: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 8,
    marginBottom: 8,
  },
  reflectionMediaContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
  },
  reflectionMediaLabel: {
    fontSize: 12,
    color: '#3B82F6',
  },
  submitButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    opacity: 0.5,
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modalText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 24,
  },
});


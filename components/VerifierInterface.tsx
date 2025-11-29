/**
 * Verifier Interface Component
 * Screen for peer verifiers to provide ratings and comments on goal completion
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { VerificationService } from '../services/verificationService';
import { VerifierInput } from '../types/verification';

interface VerifierInterfaceProps {
  goalId: string;
  goalTitle: string;
  goalDescription?: string;
  verifierId: string;
  verifierName?: string;
  verificationService: VerificationService;
  visible: boolean;
  onClose: () => void;
  onSubmitSuccess?: () => void;
}

export const VerifierInterface: React.FC<VerifierInterfaceProps> = ({
  goalId,
  goalTitle,
  goalDescription,
  verifierId,
  verifierName,
  verificationService,
  visible,
  onClose,
  onSubmitSuccess,
}) => {
  const [rating, setRating] = useState<number>(5);
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!comments.trim()) {
      Alert.alert('Required Field', 'Please provide comments about the goal completion');
      return;
    }

    try {
      setSubmitting(true);

      const verifierInput: VerifierInput = {
        verifierId,
        verifierName: verifierName || 'Peer Verifier',
        goalId,
        rating,
        comments: comments.trim(),
        submittedAt: new Date(),
        verified: rating >= 3, // Rating 3+ considered verified
      };

      verificationService.submitVerifierInput(verifierInput);

      Alert.alert('Success', 'Verification submitted successfully');
      onSubmitSuccess?.();
      
      // Reset form
      setRating(5);
      setComments('');
      onClose();
    } catch (error) {
      console.error('Failed to submit verification:', error);
      Alert.alert('Error', 'Failed to submit verification');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (comments.trim()) {
      Alert.alert(
        'Discard changes?',
        'You have unsaved comments. Are you sure you want to close?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              setRating(5);
              setComments('');
              onClose();
            },
          },
        ]
      );
    } else {
      onClose();
    }
  };

  const renderStar = (index: number) => {
    const filled = index <= rating;
    return (
      <TouchableOpacity
        key={index}
        onPress={() => setRating(index)}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons
          name={filled ? 'star' : 'star-outline'}
          size={40}
          color={filled ? '#F59E0B' : '#D1D5DB'}
        />
      </TouchableOpacity>
    );
  };

  const getRatingLabel = (): string => {
    switch (rating) {
      case 5:
        return 'Excellent - Fully completed';
      case 4:
        return 'Very Good - Mostly completed';
      case 3:
        return 'Good - Adequately completed';
      case 2:
        return 'Fair - Partially completed';
      case 1:
        return 'Poor - Not completed';
      default:
        return '';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleSection}>
              <MaterialCommunityIcons name="shield-check" size={24} color="#6366F1" />
              <Text style={styles.modalTitle}>Verify Goal Completion</Text>
            </View>
            <TouchableOpacity onPress={handleClose}>
              <MaterialCommunityIcons name="close" size={24} color="#111827" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {/* Goal Information */}
            <View style={styles.goalInfoCard}>
              <Text style={styles.goalInfoLabel}>Goal to Verify</Text>
              <Text style={styles.goalInfoTitle}>{goalTitle}</Text>
              {goalDescription && (
                <Text style={styles.goalInfoDescription}>{goalDescription}</Text>
              )}
            </View>

            {verifierName && (
              <Text style={styles.verifierLabel}>
                Verifying as: <Text style={styles.verifierName}>{verifierName}</Text>
              </Text>
            )}

            {/* Rating Section */}
            <View style={styles.ratingSection}>
              <Text style={styles.sectionTitle}>Rate the Completion</Text>
              <Text style={styles.sectionSubtitle}>
                How well was this goal completed?
              </Text>
              
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((index) => renderStar(index))}
              </View>
              
              <Text style={styles.ratingLabel}>{getRatingLabel()}</Text>
            </View>

            {/* Comments Section */}
            <View style={styles.commentsSection}>
              <Text style={styles.sectionTitle}>Comments *</Text>
              <Text style={styles.sectionSubtitle}>
                Provide detailed feedback about the goal completion
              </Text>
              
              <TextInput
                style={styles.commentsInput}
                placeholder="Enter your observations, feedback, and verification details..."
                value={comments}
                onChangeText={setComments}
                multiline
                numberOfLines={8}
                textAlignVertical="top"
              />
            </View>

            {/* Verification Guidelines */}
            <View style={styles.guidelinesCard}>
              <View style={styles.guidelinesHeader}>
                <MaterialCommunityIcons name="information" size={20} color="#6366F1" />
                <Text style={styles.guidelinesTitle}>Verification Guidelines</Text>
              </View>
              <View style={styles.guidelinesList}>
                <Text style={styles.guidelineItem}>
                  • Check if the goal was completed as stated
                </Text>
                <Text style={styles.guidelineItem}>
                  • Review any provided evidence or documentation
                </Text>
                <Text style={styles.guidelineItem}>
                  • Provide constructive and honest feedback
                </Text>
                <Text style={styles.guidelineItem}>
                  • Consider both effort and outcome in your rating
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActionsContainer}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={handleClose} activeOpacity={0.7}>
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (submitting || !comments.trim()) && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={submitting || !comments.trim()}
                activeOpacity={0.8}
              >
                {submitting ? (
                  <View style={styles.submitButtonContent}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={styles.submitButtonText}>Submitting...</Text>
                  </View>
                ) : (
                  <View style={styles.submitButtonContent}>
                    <MaterialCommunityIcons name="check-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>Submit Verification</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  goalInfoCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  goalInfoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  goalInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  goalInfoDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  verifierLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  verifierName: {
    fontWeight: '600',
    color: '#6366F1',
  },
  ratingSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6366F1',
    textAlign: 'center',
  },
  commentsSection: {
    marginBottom: 24,
  },
  commentsInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
    minHeight: 150,
    marginTop: 12,
  },
  guidelinesCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  guidelinesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  guidelinesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
  },
  guidelinesList: {
    gap: 8,
  },
  guidelineItem: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  modalActionsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 20,
    paddingBottom: 40,
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
  submitButton: {
    flex: 2,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#6366F1',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

/**
 * Reflection Capture Component
 * Standalone component for capturing goal reflections with media upload,
 * self-scoring, and evidence submission
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Medaa1Agent } from '../services/medaa1Agent';
import { ReflectionEvidence } from '../types/verification';

interface ReflectionCaptureProps {
  goalId: string;
  agent: Medaa1Agent;
  visible: boolean;
  onClose: () => void;
  onSubmitSuccess?: () => void;
}

export const ReflectionCapture: React.FC<ReflectionCaptureProps> = ({
  goalId,
  agent,
  visible,
  onClose,
  onSubmitSuccess,
}) => {
  const [activityLog, setActivityLog] = useState('');
  const [reflectionNotes, setReflectionNotes] = useState('');
  const [selfScore, setSelfScore] = useState<'done' | 'not_done' | 'partially_done'>('done');
  const [completionPercentage, setCompletionPercentage] = useState(80);
  const [selectedMedia, setSelectedMedia] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Update completion percentage when self score changes
  useEffect(() => {
    if (selfScore === 'done') {
      setCompletionPercentage(80);
    } else if (selfScore === 'partially_done') {
      setCompletionPercentage(50);
    } else {
      setCompletionPercentage(0);
    }
  }, [selfScore]);

  // Reset form when modal closes
  useEffect(() => {
    if (!visible) {
      resetForm();
    }
  }, [visible]);

  const resetForm = () => {
    setActivityLog('');
    setReflectionNotes('');
    setSelfScore('done');
    setCompletionPercentage(80);
    setSelectedMedia([]);
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

  const handleSubmit = async () => {
    if (!activityLog.trim()) {
      Alert.alert('Required Field', 'Please tell your story');
      return;
    }

    try {
      setSubmitting(true);

      // Convert selected media to MediaEvidence format
      const mediaEvidence = selectedMedia.map((asset, index) => ({
        id: `media_${Date.now()}_${index}`,
        type: asset.type === 'video' ? 'video' : 'photo' as 'photo' | 'video',
        uri: asset.uri,
        thumbnailUri: asset.uri,
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
      resetForm();
      Alert.alert('Success', 'Reflection submitted successfully');
      onSubmitSuccess?.();
      onClose();
    } catch (error) {
      console.error('Failed to submit reflection:', error);
      Alert.alert('Error', 'Failed to submit reflection');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (activityLog.trim() || selectedMedia.length > 0) {
      Alert.alert(
        'Discard changes?',
        'You have unsaved changes. Are you sure you want to close?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              resetForm();
              onClose();
            },
          },
        ]
      );
    } else {
      onClose();
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
              <MaterialCommunityIcons name="message-text" size={24} color="#6366F1" />
              <Text style={styles.modalTitle}>Reflection & Check-in</Text>
            </View>
            <TouchableOpacity onPress={handleClose}>
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
                <Text
                  style={[
                    styles.scoreButtonText,
                    selfScore === 'done' && styles.scoreButtonTextActive,
                  ]}
                >
                  Done
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.scoreButton,
                  selfScore === 'partially_done' && styles.scoreButtonActive,
                ]}
                onPress={() => setSelfScore('partially_done')}
              >
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={20}
                  color={selfScore === 'partially_done' ? '#F59E0B' : '#9CA3AF'}
                />
                <Text
                  style={[
                    styles.scoreButtonText,
                    selfScore === 'partially_done' && styles.scoreButtonTextActive,
                  ]}
                >
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
                <Text
                  style={[
                    styles.scoreButtonText,
                    selfScore === 'not_done' && styles.scoreButtonTextActive,
                  ]}
                >
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
              textAlignVertical="top"
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
              textAlignVertical="top"
            />

            {/* Upload Evidence */}
            <Text style={styles.modalLabel}>Upload Evidence (Photos/Videos)</Text>
            <TouchableOpacity style={styles.uploadArea} onPress={handlePickImage} activeOpacity={0.7}>
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
                      <Image source={{ uri: asset.uri }} style={styles.mediaPreviewImage} resizeMode="cover" />
                    ) : (
                      <View style={styles.mediaPreviewVideo}>
                        <MaterialCommunityIcons name="video" size={40} color="#6366F1" />
                      </View>
                    )}
                    <TouchableOpacity style={styles.removeMediaButton} onPress={() => removeMedia(index)}>
                      <MaterialCommunityIcons name="close-circle" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.modalActionsContainer}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={handleClose} activeOpacity={0.7}>
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (submitting || !activityLog.trim()) && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={submitting || !activityLog.trim()}
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
                    <Text style={styles.submitButtonText}>Submit for Review</Text>
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
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    marginTop: 8,
  },
  scoreButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  scoreButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    gap: 8,
  },
  scoreButtonActive: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  scoreButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
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
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderTrackContainer: {
    flex: 1,
  },
  sliderTrack: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#6366F1',
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
    marginBottom: 20,
    minHeight: 100,
  },
  uploadArea: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    marginBottom: 20,
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 12,
  },
  uploadSubtext: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  mediaPreviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  mediaPreviewItem: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  mediaPreviewImage: {
    width: '100%',
    height: '100%',
  },
  mediaPreviewVideo: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeMediaButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
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

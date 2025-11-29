/**
 * Vault Manager Component
 * Create and manage time-locked commitment vaults
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
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getRDMServices } from '../services/agentInitializer';
import { VaultConfig, VaultType } from '../types/vault';
import { TokenAmount } from '../types/rdm';

interface VaultManagerProps {
  onNavigate?: (screen: string) => void;
}

export const VaultManager: React.FC<VaultManagerProps> = ({ onNavigate }) => {
  const [view, setView] = useState<'my-vaults' | 'create'>('my-vaults');
  const [vaults, setVaults] = useState<VaultConfig[]>([]);
  const [loading, setLoading] = useState(false);

  // Create vault state
  const [vaultType, setVaultType] = useState<VaultType>('personal');
  const [habitGoal, setHabitGoal] = useState('');
  const [goalDescription, setGoalDescription] = useState('');
  const [lockedRDM, setLockedRDM] = useState('10000');
  const [lockDuration, setLockDuration] = useState('5');
  const [beneficiaryId, setBeneficiaryId] = useState('');

  // Verification state
  const [selectedVault, setSelectedVault] = useState<VaultConfig | null>(null);
  const [verificationProof, setVerificationProof] = useState('');
  const [selectedPhotos, setSelectedPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);

  useEffect(() => {
    loadVaults();
  }, []);

  const loadVaults = async () => {
    try {
      const services = getRDMServices();
      const userVaults = services.vaultService.getUserVaults('current_user');
      setVaults(userVaults);
    } catch (error) {
      console.error('Failed to load vaults:', error);
    }
  };

  const createVault = async () => {
    if (!habitGoal.trim() || !goalDescription.trim()) {
      Alert.alert('Required Fields', 'Please enter habit goal and description');
      return;
    }

    const rdmAmount = parseFloat(lockedRDM);
    if (isNaN(rdmAmount) || rdmAmount < 100) {
      Alert.alert('Invalid Amount', 'Minimum lock amount is 100 RDM');
      return;
    }

    const duration = parseInt(lockDuration, 10);
    if (isNaN(duration) || duration < 1 || duration > 10) {
      Alert.alert('Invalid Duration', 'Lock duration must be between 1 and 10 years');
      return;
    }

    if (vaultType === 'generational' && !beneficiaryId.trim()) {
      Alert.alert('Required Field', 'Please enter beneficiary ID for generational vault');
      return;
    }

    setLoading(true);
    try {
      const services = getRDMServices();

      const vault = await services.medaa2Agent.createVault(
        'current_user',
        vaultType === 'generational' ? beneficiaryId : 'current_user',
        vaultType,
        { ada: rdmAmount },
        duration,
        habitGoal,
        goalDescription,
        [], // verification criteria - would be filled in real app
        'multi_source',
        0.8
      );

      Alert.alert('Success', `Vault created! Vault ID: ${vault.id}\nLocked until: ${vault.lockEndDate.toLocaleDateString()}`);
      setView('my-vaults');
      resetForm();
      loadVaults();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create vault');
    } finally {
      setLoading(false);
    }
  };

  const handlePickPhotos = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to upload photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultiple: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        setSelectedPhotos([...selectedPhotos, ...result.assets]);
      }
    } catch (error) {
      console.error('Error picking photos:', error);
      Alert.alert('Error', 'Failed to pick photos');
    }
  };

  const removePhoto = (index: number) => {
    setSelectedPhotos(selectedPhotos.filter((_, i) => i !== index));
  };

  const submitVerification = async () => {
    if (!selectedVault) {
      Alert.alert('Error', 'No vault selected');
      return;
    }

    if (!verificationProof.trim() && selectedPhotos.length === 0) {
      Alert.alert('Required Fields', 'Please provide verification proof (text or photos)');
      return;
    }

    setLoading(true);
    try {
      const services = getRDMServices();

      // Prepare photo URLs/data
      const photoData = selectedPhotos.map((photo, index) => ({
        uri: photo.uri,
        type: 'image',
        name: `verification_${Date.now()}_${index}.jpg`,
        mimeType: photo.mimeType || 'image/jpeg',
      }));

      // Create verification data based on vault type
      const verificationData = [{
        source: selectedVault.verificationMethod,
        data: {
          proof: verificationProof,
          photos: photoData,
          submittedAt: new Date().toISOString(),
        },
        timestamp: new Date(),
        verifiedBy: 'ai' as const,
        confidence: 0.8,
      }];

      const result = await services.medaa2Agent.verifyVaultUnlock(
        selectedVault.id,
        verificationData
      );

      if (result) {
        Alert.alert(
          'Partial Unlock',
          `Unlocked ${(result.unlockPercentage * 100).toFixed(0)}% of vault!`
        );
      } else {
        Alert.alert('Success', 'Verification submitted. Awaiting AI review...');
      }

      setSelectedVault(null);
      setVerificationProof('');
      setSelectedPhotos([]);
      loadVaults();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to submit verification');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setHabitGoal('');
    setGoalDescription('');
    setLockedRDM('10000');
    setLockDuration('5');
    setBeneficiaryId('');
    setVaultType('personal');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'locked':
        return '#6366F1';
      case 'verification_pending':
        return '#F59E0B';
      case 'verified_unlocked':
        return '#10B981';
      case 'partial_unlock':
        return '#3B82F6';
      case 'expired_failed':
        return '#EF4444';
      default:
        return '#666';
    }
  };

  const formatDaysRemaining = (endDate: Date) => {
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? `${days} days` : 'Expired';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Navigation Tabs */}
      <View style={styles.navTabs}>
        <TouchableOpacity
          style={[styles.navTab, view === 'my-vaults' && styles.navTabActive]}
          onPress={() => setView('my-vaults')}
        >
          <Text style={[styles.navTabText, view === 'my-vaults' && styles.navTabTextActive]}>
            My Vaults
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navTab, view === 'create' && styles.navTabActive]}
          onPress={() => setView('create')}
        >
          <Text style={[styles.navTabText, view === 'create' && styles.navTabTextActive]}>
            Create Vault
          </Text>
        </TouchableOpacity>
      </View>

      {/* My Vaults */}
      {view === 'my-vaults' && (
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>My Vaults</Text>

          {selectedVault ? (
            <View style={styles.content}>
              <Text style={styles.sectionTitle}>Submit Verification</Text>
              <View style={styles.vaultCard}>
                <Text style={styles.vaultGoal}>{selectedVault.habitGoal}</Text>
                <Text style={styles.vaultDescription}>{selectedVault.goalDescription}</Text>
                <View style={styles.vaultInfo}>
                  <Text style={styles.vaultInfoText}>
                    Locked: {selectedVault.lockedRDM.ada.toLocaleString()} RDM
                  </Text>
                  <Text style={styles.vaultInfoText}>
                    Duration: {selectedVault.lockDuration} years
                  </Text>
                  <Text style={styles.vaultInfoText}>
                    Unlocks: {selectedVault.lockEndDate.toLocaleDateString()}
                  </Text>
                </View>
              </View>

              <Text style={styles.label}>Verification Proof</Text>
              <Text style={styles.helperText}>
                Provide evidence that you've achieved the goal (e.g., race results URL, certificate, fitness data)
              </Text>
              
              {/* Text Input */}
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter verification proof..."
                value={verificationProof}
                onChangeText={setVerificationProof}
                multiline
                numberOfLines={6}
              />

              {/* Photo Upload Section */}
              <Text style={styles.photoSectionLabel}>Upload Photos (Optional)</Text>
              <TouchableOpacity 
                style={styles.uploadArea}
                onPress={handlePickPhotos}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="camera-plus" size={48} color="#9CA3AF" />
                <Text style={styles.uploadText}>Tap to upload photos</Text>
                <Text style={styles.uploadSubtext}>JPG, PNG up to 10MB each</Text>
              </TouchableOpacity>

              {/* Selected Photos Preview */}
              {selectedPhotos.length > 0 && (
                <View style={styles.photosPreviewContainer}>
                  <Text style={styles.photosPreviewLabel}>
                    {selectedPhotos.length} photo(s) selected
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
                    {selectedPhotos.map((photo, index) => (
                      <View key={index} style={styles.photoPreviewItem}>
                        <Image 
                          source={{ uri: photo.uri }} 
                          style={styles.photoPreviewImage}
                          resizeMode="cover"
                        />
                        <TouchableOpacity
                          style={styles.removePhotoButton}
                          onPress={() => removePhoto(index)}
                        >
                          <MaterialCommunityIcons name="close-circle" size={24} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  loading && styles.submitButtonDisabled,
                  (!verificationProof.trim() && selectedPhotos.length === 0) && styles.submitButtonDisabled
                ]}
                onPress={submitVerification}
                disabled={loading || (!verificationProof.trim() && selectedPhotos.length === 0)}
                activeOpacity={0.8}
              >
                {loading ? (
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

              {/* Cancel Button */}
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setSelectedVault(null);
                  setVerificationProof('');
                  setSelectedPhotos([]);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {vaults.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No vaults created yet</Text>
                  <Text style={styles.emptySubtext}>Create a vault to lock RDM for long-term goals</Text>
                </View>
              ) : (
                vaults.map((vault) => (
                  <TouchableOpacity
                    key={vault.id}
                    style={styles.vaultCard}
                    onPress={() => {
                      if (vault.status === 'locked' || vault.status === 'verification_pending') {
                        setSelectedVault(vault);
                      }
                    }}
                  >
                    <View style={styles.vaultHeader}>
                      <Text style={styles.vaultGoal}>{vault.habitGoal}</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: getStatusColor(vault.status) },
                        ]}
                      >
                        <Text style={styles.statusText}>
                          {vault.status.replace(/_/g, ' ').toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.vaultDescription}>{vault.goalDescription}</Text>

                    <View style={styles.vaultStats}>
                      <View style={styles.vaultStat}>
                        <Text style={styles.vaultStatLabel}>Locked</Text>
                        <Text style={styles.vaultStatValue}>
                          {vault.lockedRDM.ada.toLocaleString()} RDM
                        </Text>
                      </View>
                      <View style={styles.vaultStat}>
                        <Text style={styles.vaultStatLabel}>Duration</Text>
                        <Text style={styles.vaultStatValue}>{vault.lockDuration} years</Text>
                      </View>
                      <View style={styles.vaultStat}>
                        <Text style={styles.vaultStatLabel}>Time Remaining</Text>
                        <Text style={styles.vaultStatValue}>
                          {formatDaysRemaining(vault.lockEndDate)}
                        </Text>
                      </View>
                    </View>

                    {vault.unlockedAmount && vault.unlockedAmount.ada > 0 && (
                      <View style={styles.unlockBadge}>
                        <Text style={styles.unlockText}>
                          Unlocked: {vault.unlockedAmount.ada.toLocaleString()} RDM
                        </Text>
                      </View>
                    )}

                    {vault.vaultType === 'generational' && (
                      <View style={styles.generationalBadge}>
                        <Text style={styles.generationalText}>
                          👨‍👩‍👧‍👦 Generational Vault
                        </Text>
                      </View>
                    )}

                    {(vault.status === 'locked' || vault.status === 'verification_pending') && (
                      <TouchableOpacity
                        style={styles.verifyButton}
                        onPress={() => setSelectedVault(vault)}
                      >
                        <Text style={styles.verifyButtonText}>Submit Verification</Text>
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </>
          )}
        </View>
      )}

      {/* Create Vault */}
      {view === 'create' && (
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Create Time-Locked Vault</Text>
          <Text style={styles.helperText}>
            Lock RDM for 1-10 years. Only unlocked by AI-verified proof of goal achievement.
            Minimum: 100 RDM
          </Text>

          <Text style={styles.label}>Vault Type</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity
              style={[styles.radio, vaultType === 'personal' && styles.radioActive]}
              onPress={() => setVaultType('personal')}
            >
              <Text style={[styles.radioText, vaultType === 'personal' && styles.radioTextActive]}>
                Personal
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.radio, vaultType === 'generational' && styles.radioActive]}
              onPress={() => setVaultType('generational')}
            >
              <Text style={[styles.radioText, vaultType === 'generational' && styles.radioTextActive]}>
                Generational
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Habit Goal</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Run a Marathon"
            value={habitGoal}
            onChangeText={setHabitGoal}
          />

          <Text style={styles.label}>Goal Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe your life-changing goal..."
            value={goalDescription}
            onChangeText={setGoalDescription}
            multiline
            numberOfLines={4}
          />

          <Text style={styles.label}>RDM Amount to Lock</Text>
          <TextInput
            style={styles.input}
            placeholder="10000"
            value={lockedRDM}
            onChangeText={setLockedRDM}
            keyboardType="numeric"
          />

          <Text style={styles.label}>Lock Duration (Years)</Text>
          <TextInput
            style={styles.input}
            placeholder="5"
            value={lockDuration}
            onChangeText={setLockDuration}
            keyboardType="numeric"
          />

          {vaultType === 'generational' && (
            <>
              <Text style={styles.label}>Beneficiary ID</Text>
              <TextInput
                style={styles.input}
                placeholder="Child or beneficiary user ID"
                value={beneficiaryId}
                onChangeText={setBeneficiaryId}
              />
            </>
          )}

          <TouchableOpacity
            style={styles.createButton}
            onPress={createVault}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.createButtonText}>Create Vault</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    padding: 16,
  },
  navTabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  navTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  navTabActive: {
    borderBottomColor: '#0033AD',
  },
  navTabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  navTabTextActive: {
    color: '#0033AD',
    fontWeight: '600',
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  radio: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  radioActive: {
    borderColor: '#0033AD',
    backgroundColor: '#E0E7FF',
  },
  radioText: {
    fontSize: 14,
    color: '#666',
  },
  radioTextActive: {
    color: '#0033AD',
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#0033AD',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  vaultCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  vaultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  vaultGoal: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  vaultDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  vaultInfo: {
    marginBottom: 12,
  },
  vaultInfoText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  vaultStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  vaultStat: {
    alignItems: 'center',
  },
  vaultStatLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  vaultStatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  unlockBadge: {
    backgroundColor: '#10B981',
    padding: 8,
    borderRadius: 6,
    marginTop: 12,
  },
  unlockText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  generationalBadge: {
    backgroundColor: '#E0E7FF',
    padding: 8,
    borderRadius: 6,
    marginTop: 12,
  },
  generationalText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0033AD',
    textAlign: 'center',
  },
  verifyButton: {
    backgroundColor: '#10B981',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  photoSectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  uploadArea: {
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    marginBottom: 16,
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 12,
    marginBottom: 4,
  },
  uploadSubtext: {
    fontSize: 14,
    color: '#6B7280',
  },
  photosPreviewContainer: {
    marginBottom: 20,
  },
  photosPreviewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  photosScroll: {
    marginHorizontal: -4,
  },
  photoPreviewItem: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  photoPreviewImage: {
    width: '100%',
    height: '100%',
  },
  removePhotoButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  submitButton: {
    backgroundColor: '#10B981',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    shadowColor: '#10B981',
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
  cancelButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
});


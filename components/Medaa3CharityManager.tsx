/**
 * Medaa3 Charity Manager UI Component
 * Configure charity allocations and view distribution history
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Medaa3Agent } from '../services/medaa3Agent';
import { Charity, CharityAllocation } from '../types/rdm';
import { TokenService } from '../services/tokenService';

interface Medaa3CharityManagerProps {
  agent: Medaa3Agent;
  tokenService: TokenService;
}

export const Medaa3CharityManager: React.FC<Medaa3CharityManagerProps> = ({ agent, tokenService }) => {
  const [charities, setCharities] = useState<Charity[]>([]);
  const [allocations, setAllocations] = useState<CharityAllocation[]>([]);
  const [thresholdAmount, setThresholdAmount] = useState('20');
  const [charityPurseBalance, setCharityPurseBalance] = useState<{ ada: number; rdmTokens?: number }>({ ada: 0 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const agentState = agent.getState();
    setCharities(agentState.charities);
    setAllocations(agentState.charityPreferences.allocations);
    setThresholdAmount(agentState.charityPreferences.thresholdAmount.toString());
    
    const balance = tokenService.getPurseBalance('charity' as any);
    setCharityPurseBalance(balance);
  };

  const handleUpdateAllocation = (charityId: string, percentage: string) => {
    const newAllocations = allocations.filter(a => a.charityId !== charityId);
    const percentageNum = parseFloat(percentage) || 0;
    
    if (percentageNum > 0) {
      newAllocations.push({ charityId, percentage: percentageNum });
    }
    
    // Normalize to 100%
    const total = newAllocations.reduce((sum, a) => sum + a.percentage, 0);
    if (total > 100) {
      Alert.alert('Error', 'Total allocation cannot exceed 100%');
      return;
    }
    
    setAllocations(newAllocations);
  };

  const handleSaveSettings = () => {
    try {
      agent.updateCharityAllocations(allocations);
      agent.updateCharityPreferences({
        thresholdAmount: parseFloat(thresholdAmount) || 20,
      });
      Alert.alert('Success', 'Charity settings saved!');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save settings');
    }
  };

  const handleManualDistribute = async () => {
    try {
      const result = await agent.manualDistribute();
      if (result) {
        Alert.alert('Success', 'Charity distribution initiated!');
        loadData();
      } else {
        Alert.alert('Info', 'Threshold not met or nothing to distribute');
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Distribution failed');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Charity Manager</Text>
        <Text style={styles.subtitle}>Configure your charitable giving</Text>
      </View>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Charity Purse Balance</Text>
        <Text style={styles.balanceAmount}>
          {TokenService.formatTokenAmount(charityPurseBalance)}
        </Text>
      </View>

      <View style={styles.settingsContainer}>
        <Text style={styles.sectionTitle}>Distribution Settings</Text>
        
        <View style={styles.thresholdRow}>
          <Text style={styles.label}>Threshold Amount (USD)</Text>
          <TextInput
            style={styles.input}
            value={thresholdAmount}
            onChangeText={setThresholdAmount}
            keyboardType="numeric"
          />
        </View>

        <Text style={styles.sectionTitle}>Charity Allocations</Text>
        
        {charities.map((charity) => {
          const allocation = allocations.find(a => a.charityId === charity.id);
          return (
            <View key={charity.id} style={styles.charityCard}>
              <Text style={styles.charityName}>{charity.name}</Text>
              <Text style={styles.charityDescription}>{charity.description}</Text>
              <View style={styles.allocationRow}>
                <Text style={styles.label}>Allocation %:</Text>
                <TextInput
                  style={styles.percentageInput}
                  value={allocation?.percentage.toString() || '0'}
                  onChangeText={(val) => handleUpdateAllocation(charity.id, val)}
                  keyboardType="numeric"
                />
                <Text style={styles.percentageLabel}>%</Text>
              </View>
            </View>
          );
        })}

        <TouchableOpacity style={styles.saveButton} onPress={handleSaveSettings}>
          <Text style={styles.saveButtonText}>Save Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.distributeButton} onPress={handleManualDistribute}>
          <Text style={styles.distributeButtonText}>Manual Distribute Now</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0033AD',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  balanceCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0033AD',
  },
  settingsContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
    marginTop: 8,
  },
  thresholdRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  charityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  charityName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  charityDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  allocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  percentageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 8,
    fontSize: 16,
  },
  percentageLabel: {
    fontSize: 16,
    color: '#666',
  },
  saveButton: {
    backgroundColor: '#0033AD',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  distributeButton: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  distributeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});


/**
 * Marketplace Hub Component
 * Unified marketplace container with tabs for Habit Swap, LP Pools, and Vaults
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { HabitSwapMarketplace } from './HabitSwapMarketplace';
import { LiquidityPoolDashboard } from './LiquidityPoolDashboard';
import { VaultManager } from './VaultManager';

type MarketplaceTab = 'habit-swap' | 'lp-pools' | 'vaults';

interface MarketplaceHubProps {
  onNavigate?: (screen: string) => void;
}

const TABS: { id: MarketplaceTab; label: string; icon: string }[] = [
  { id: 'habit-swap', label: 'Habit Swap', icon: 'account-switch' },
  { id: 'lp-pools', label: 'LP Pools', icon: 'chart-line' },
  { id: 'vaults', label: 'Vaults', icon: 'lock' },
];

export const MarketplaceHub: React.FC<MarketplaceHubProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<MarketplaceTab>('habit-swap');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'habit-swap':
        return <HabitSwapMarketplace onNavigate={onNavigate} />;
      case 'lp-pools':
        return <LiquidityPoolDashboard onNavigate={onNavigate} />;
      case 'vaults':
        return <VaultManager onNavigate={onNavigate} />;
      default:
        return <HabitSwapMarketplace onNavigate={onNavigate} />;
    }
  };

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScrollContent}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name={tab.icon as any}
                  size={20}
                  color={isActive ? '#0033AD' : '#666'}
                  style={styles.tabIcon}
                />
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
                {isActive && <View style={styles.activeIndicator} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Tab Content */}
      <View style={styles.content}>
        {renderTabContent()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  tabContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    marginRight: 8,
    position: 'relative',
  },
  tabActive: {
    backgroundColor: '#E0E7FF',
  },
  tabIcon: {
    marginRight: 6,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  tabLabelActive: {
    color: '#0033AD',
    fontWeight: '600',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -1,
    left: '50%',
    marginLeft: -20,
    width: 40,
    height: 3,
    backgroundColor: '#0033AD',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  content: {
    flex: 1,
  },
});


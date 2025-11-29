import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { StyleSheet, View, StatusBar, ActivityIndicator, Text } from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { SafeAreaView as SafeAreaViewContext } from 'react-native-safe-area-context';
import { WalletConnection } from './components/WalletConnection';
import { WalletHeader } from './components/WalletHeader';
import { Dashboard } from './components/Dashboard';
import { BottomNavigation, TabType } from './components/BottomNavigation';
import { Medaa1GoalManager } from './components/Medaa1GoalManager';
import { Medaa2TokenDashboard } from './components/Medaa2TokenDashboard';
import { Medaa3CharityManager } from './components/Medaa3CharityManager';
import { MarketplaceHub } from './components/MarketplaceHub';
import { LiquidityPoolDashboard } from './components/LiquidityPoolDashboard';
import { VaultManager } from './components/VaultManager';
import { WalletInfo } from './types/cardano';
import { initializeRDMServices, getRDMServices, RDMServiceContainer } from './services/agentInitializer';
import { WalletService } from './services/walletService';

// Suppress Expo Updates errors
if (typeof ErrorUtils !== 'undefined') {
  const originalHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    // Suppress update-related errors
    if (error.message && (
      error.message.includes('Failed to download remote update') ||
      error.message.includes('java.io.IOException') ||
      error.message.includes('expo-updates')
    )) {
      console.warn('Suppressed update error:', error.message);
      return; // Don't show the error
    }
    // Call original handler for other errors
    if (originalHandler) {
      originalHandler(error, isFatal);
    }
  });
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [rdmServices, setRdmServices] = useState<RDMServiceContainer | null>(null);
  const [initializing, setInitializing] = useState(false);
  const [initAttempted, setInitAttempted] = useState(false);

  useEffect(() => {
    // Suppress any update-related errors on startup
    const suppressUpdateErrors = () => {
      if (typeof console !== 'undefined') {
        const originalError = console.error;
        console.error = (...args: any[]) => {
          const message = args.join(' ');
          if (message.includes('Failed to download remote update') || 
              message.includes('java.io.IOException') ||
              message.includes('expo-updates')) {
            // Suppress these errors
            return;
          }
          originalError.apply(console, args);
        };
      }
    };
    suppressUpdateErrors();

    // Check for existing wallet connection on mount
    const checkWallet = async () => {
      try {
        const connectedWallet = await WalletService.getConnectedWallet();
        if (connectedWallet) {
          setWallet(connectedWallet);
        }
      } catch (error: any) {
        // Suppress update-related errors
        if (error?.message?.includes('update') || error?.message?.includes('IOException')) {
          console.warn('Suppressed update error during wallet check');
          return;
        }
        console.error('Error checking wallet:', error);
      }
    };
    checkWallet();
  }, []);

  useEffect(() => {
    // Initialize RDM services when wallet is connected
    if (wallet && !rdmServices && !initializing) {
      initializeServices();
    }
  }, [wallet]);

  const initializeServices = async () => {
    if (initAttempted) {
      return; // Don't retry if we've already attempted
    }
    
    setInitAttempted(true);
    setInitializing(true);
    try {
      // Add timeout to prevent indefinite loading (reduced to 5 seconds)
      const initPromise = initializeRDMServices();
      const timeoutPromise = new Promise<RDMServiceContainer>((_, reject) => 
        setTimeout(() => reject(new Error('Initialization timeout')), 5000)
      );
      
      const services = await Promise.race([initPromise, timeoutPromise]);
      setRdmServices(services);
    } catch (error) {
      console.error('Failed to initialize RDM services:', error);
      // Even if initialization fails, try to get services (they might be partially initialized)
      try {
        const services = getRDMServices();
        setRdmServices(services);
      } catch {
        // If services aren't available, show error but allow app to continue
        console.warn('RDM services not available, but continuing anyway');
        // Set a minimal service container or show error message
      }
    } finally {
      setInitializing(false);
    }
  };

  const handleWalletConnected = (walletInfo: WalletInfo) => {
    console.log('Wallet connected:', walletInfo);
    setWallet(walletInfo);
    // After wallet connects, show dashboard
    setActiveTab('home');
  };

  const handleWalletDisconnected = () => {
    console.log('🔌 Handling wallet disconnection in App...');
    setWallet(null);
    setRdmServices(null);
    setInitAttempted(false); // Reset so new wallet can initialize
    setInitializing(false);
    setActiveTab('home');
    console.log('✅ App state reset for new wallet connection');
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  const handleDashboardNavigate = (screen: string) => {
    // Map dashboard navigation to bottom nav tabs
    switch (screen) {
      case 'goals':
        setActiveTab('goals');
        break;
      case 'marketplace':
        setActiveTab('marketplace');
        break;
      case 'lp':
        setActiveTab('lp');
        break;
      case 'vault':
        // Vault is in profile section for now
        setActiveTab('profile');
        break;
      case 'ai':
        // AI coach navigation - for now, just log (could add AI tab later)
        console.log('Navigate to AI coach');
        break;
    }
  };

  const renderContent = () => {
    // Show wallet connection screen if not connected
    if (!wallet) {
      return <WalletConnection onWalletConnected={handleWalletConnected} />;
    }

    // Show loading state while initializing (with timeout)
    if (initializing) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0033AD" />
          <Text style={styles.loadingText}>Initializing RDM Agents...</Text>
          <Text style={styles.loadingSubtext}>This may take a few moments</Text>
        </View>
      );
    }
    
    // If services failed to initialize, show dashboard anyway (with limited functionality)
    if (!rdmServices) {
      // Only show loading if we haven't attempted initialization yet
      if (!initAttempted && wallet) {
        // Start initialization in background
        initializeServices();
        return (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0033AD" />
            <Text style={styles.loadingText}>Loading services...</Text>
          </View>
        );
      }
      // If initialization failed or timed out, show dashboard anyway
      // Services will be created on-demand if needed
      console.warn('RDM services not initialized, showing dashboard with limited functionality');
      return <Dashboard onNavigate={handleDashboardNavigate} />;
    }

    // Render content based on active tab
    switch (activeTab) {
      case 'home':
        return <Dashboard onNavigate={handleDashboardNavigate} />;
      case 'goals':
        return (
          <Medaa1GoalManager
            agent={rdmServices.medaa1Agent}
            tokenService={rdmServices.tokenService}
            onNavigate={handleDashboardNavigate}
          />
        );
      case 'marketplace':
        return <MarketplaceHub onNavigate={handleDashboardNavigate} />;
      case 'lp':
        // LP is now in MarketplaceHub, but keeping for backward compatibility
        return <LiquidityPoolDashboard onNavigate={handleDashboardNavigate} />;
      case 'profile':
        // Profile tab shows vault manager (for now)
        return <VaultManager onNavigate={handleDashboardNavigate} />;
      default:
        return <Dashboard onNavigate={handleDashboardNavigate} />;
    }
  };

  return (
    <SafeAreaViewContext style={styles.container}>
      <ExpoStatusBar style="auto" />
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header with Wallet Balance */}
      {wallet && <WalletHeader wallet={wallet} onDisconnect={handleWalletDisconnected} />}

      {/* Main Content */}
      <View style={styles.content}>
        {renderContent()}
      </View>

      {/* Bottom Navigation (only show when wallet is connected) */}
      {wallet && rdmServices && (
        <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />
      )}
    </SafeAreaViewContext>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
  },
});

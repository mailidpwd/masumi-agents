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

// Suppress Expo Updates errors completely
if (typeof ErrorUtils !== 'undefined') {
  const originalHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    // Suppress ALL update-related errors (including IOException)
    const errorMessage = error?.message || '';
    const errorStack = error?.stack || '';
    const fullError = (errorMessage + ' ' + errorStack).toLowerCase();
    
    if (
      fullError.includes('failed to download remote update') ||
      fullError.includes('java.io.ioexception') ||
      fullError.includes('expo-updates') ||
      fullError.includes('remote update') ||
      fullError.includes('update download')
    ) {
      console.warn('Suppressed update error (ignoring):', errorMessage);
      // Return without calling original handler - completely ignore
      return;
    }
    // Call original handler for other errors
    if (originalHandler) {
      originalHandler(error, isFatal);
    }
  });
}

// Also suppress at React Native level
if (typeof console !== 'undefined' && console.error) {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    const errorStr = args.join(' ').toLowerCase();
    if (
      errorStr.includes('failed to download remote update') ||
      errorStr.includes('java.io.ioexception') ||
      errorStr.includes('expo-updates')
    ) {
      // Silently ignore
      return;
    }
    originalError.apply(console, args);
  };
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [rdmServices, setRdmServices] = useState<RDMServiceContainer | null>(null);
  const [initializing, setInitializing] = useState(false);
  const [initAttempted, setInitAttempted] = useState(false);
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0);

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
      // Add timeout to prevent indefinite loading (increased to 20 seconds for slow networks)
      const initPromise = initializeRDMServices();
      const timeoutPromise = new Promise<RDMServiceContainer>((_, reject) => 
        setTimeout(() => reject(new Error('Initialization timeout')), 20000)
      );
      
      const services = await Promise.race([initPromise, timeoutPromise]);
      setRdmServices(services);
    } catch (error) {
      // Silently handle timeout - services may still be partially initialized
      // Try to get services even if initialization timed out
      try {
        const services = getRDMServices();
        if (services) {
          setRdmServices(services);
        }
      } catch {
        // Services will be initialized on next attempt
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
    // Reload dashboard when navigating to home tab
    // This ensures goals created in other tabs show up immediately
    if (tab === 'home') {
      setDashboardRefreshKey(prev => prev + 1);
    }
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
      return <Dashboard onNavigate={handleDashboardNavigate} refreshTrigger={dashboardRefreshKey} />;
    }

    // Render content based on active tab
    switch (activeTab) {
      case 'home':
        return <Dashboard onNavigate={handleDashboardNavigate} refreshTrigger={dashboardRefreshKey} />;
      case 'goals':
        // Ensure services are initialized before rendering goal manager
        if (!rdmServices) {
          // Try to initialize services if not already attempted
          if (!initAttempted && wallet) {
            initializeServices();
            return (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0033AD" />
                <Text style={styles.loadingText}>Loading services...</Text>
              </View>
            );
          }
          // If initialization failed, try to get services anyway
          try {
            const services = getRDMServices();
            return (
              <Medaa1GoalManager
                agent={services.medaa1Agent}
                tokenService={services.tokenService}
                onNavigate={handleDashboardNavigate}
              />
            );
          } catch (error) {
            // If services still not available, show error
            return (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Services not available</Text>
                <Text style={styles.loadingSubtext}>Please try again</Text>
              </View>
            );
          }
        }
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
        return <Dashboard onNavigate={handleDashboardNavigate} refreshTrigger={dashboardRefreshKey} />;
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

/**
 * Feature Flags Utility
 * Detects runtime environment and enables/disables features accordingly
 * 
 * Expo Go Limitations:
 * - No custom native modules (react-native-webview)
 * - No custom deep linking schemes
 * - Limited camera/media access
 */
import Constants from 'expo-constants';

// Detect if running in Expo Go
export const isExpoGo = (): boolean => {
  return Constants.appOwnership === 'expo';
};

// Detect if running in development build (APK with expo-dev-client)
// In SDK 50+, appOwnership is null for standalone builds
export const isDevelopmentBuild = (): boolean => {
  return Constants.appOwnership !== 'expo';
};

// Feature availability based on environment
export const FEATURES = {
  /**
   * WebView-based wallet connection (CIP-30)
   * Only available in native builds, not Expo Go
   */
  get WALLET_WEBVIEW() {
    return !isExpoGo();
  },

  /**
   * Custom deep linking (cardanodapp://)
   * Only works in native builds
   */
  get DEEP_LINKING() {
    return !isExpoGo();
  },

  /**
   * Wallet app detection (canOpenURL for eternl://, nami://, etc.)
   * Works better in native builds, limited in Expo Go
   */
  get WALLET_APP_DETECTION() {
    return !isExpoGo();
  },

  /**
   * Camera for verification photos
   * Works in both, but may have permission differences
   */
  get CAMERA() {
    return true;
  },

  /**
   * Image picker from gallery
   * Works in both Expo Go and native builds
   */
  get IMAGE_PICKER() {
    return true;
  },

  /**
   * Document picker
   * Works in both Expo Go and native builds
   */
  get DOCUMENT_PICKER() {
    return true;
  },

  /**
   * File system access
   * Works in both but with different paths
   */
  get FILE_SYSTEM() {
    return true;
  },
};

// Environment info for debugging
export const getEnvironmentInfo = () => {
  return {
    appOwnership: Constants.appOwnership,
    isExpoGo: isExpoGo(),
    isDevelopmentBuild: isDevelopmentBuild(),
    expoVersion: Constants.expoVersion,
    features: {
      walletWebView: FEATURES.WALLET_WEBVIEW,
      deepLinking: FEATURES.DEEP_LINKING,
      walletAppDetection: FEATURES.WALLET_APP_DETECTION,
      camera: FEATURES.CAMERA,
      imagePicker: FEATURES.IMAGE_PICKER,
    },
  };
};

// Log environment info on import (for debugging)
console.log('📱 Environment:', isExpoGo() ? 'Expo Go' : 'Native Build');


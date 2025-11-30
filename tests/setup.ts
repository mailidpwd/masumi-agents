/**
 * Test Setup - Mocks for React Native dependencies
 * This file sets up mocks for running tests in Node.js environment
 */

// Mock window before anything loads (for walletService checks)
(global as any).window = undefined;

// Mock Buffer if not available
if (typeof Buffer === 'undefined') {
  (global as any).Buffer = require('buffer').Buffer;
}

// Mock AsyncStorage
const asyncStorageData = new Map<string, string>();
const mockAsyncStorage = {
  getItem: async (key: string) => asyncStorageData.get(key) || null,
  setItem: async (key: string, value: string) => { asyncStorageData.set(key, value); },
  removeItem: async (key: string) => { asyncStorageData.delete(key); },
  getAllKeys: async () => Array.from(asyncStorageData.keys()),
  multiRemove: async (keys: string[]) => { keys.forEach(k => asyncStorageData.delete(k)); },
  clear: async () => { asyncStorageData.clear(); },
};

// Mock React Native modules
const mockReactNative = {
  Linking: {
    canOpenURL: async () => false,
    openURL: async () => {},
  },
  Platform: {
    OS: 'node',
  },
  Alert: {
    alert: () => {},
  },
};

// Mock Expo modules
const mockExpoLinking = {
  parse: (url: string) => ({ queryParams: {} }),
  createURL: (path: string) => `exp://localhost:8081/${path}`,
};

const mockExpoImagePicker = {
  launchCameraAsync: async () => ({ canceled: true, assets: [] }),
  launchImageLibraryAsync: async () => ({ canceled: true, assets: [] }),
  MediaTypeOptions: { All: 'All', Images: 'Images', Videos: 'Videos' },
  requestCameraPermissionsAsync: async () => ({ granted: true }),
  requestMediaLibraryPermissionsAsync: async () => ({ granted: true }),
};

const mockExpoDocumentPicker = {
  getDocumentAsync: async () => ({ canceled: true }),
  DocumentPickerResult: {},
};

const mockExpoFileSystem = {
  documentDirectory: '/mock/documents/',
  cacheDirectory: '/mock/cache/',
  readAsStringAsync: async () => '',
  writeAsStringAsync: async () => {},
  deleteAsync: async () => {},
  getInfoAsync: async () => ({ exists: false }),
  makeDirectoryAsync: async () => {},
};

const mockExpoConstants = {
  default: {
    expoConfig: { extra: {} },
    manifest: {},
  },
  Constants: {
    expoConfig: { extra: {} },
    manifest: {},
  },
};

// Mock fetch for Gemini API (returns mock success response)
const mockFetch = async (url: string, options?: any): Promise<Response> => {
  // Return a mock successful response for Gemini API
  const mockResponse = {
    candidates: [{
      content: {
        parts: [{
          text: JSON.stringify({
            strugglePattern: 'Standard habit struggle',
            recommendedApproach: 'Peer support recommended',
            confidence: 0.7,
          }),
        }],
      },
      finishReason: 'STOP',
    }],
  };

  return {
    ok: true,
    status: 200,
    json: async () => mockResponse,
    text: async () => JSON.stringify(mockResponse),
  } as Response;
};

// Setup mock modules
export function setupMocks() {
  // Mock require for React Native and Expo modules
  const Module = require('module');
  const originalRequire = Module.prototype.require;

  Module.prototype.require = function(id: string) {
    // React Native mocks
    if (id === '@react-native-async-storage/async-storage') {
      return { default: mockAsyncStorage };
    }
    if (id === 'react-native') {
      return mockReactNative;
    }
    
    // Expo module mocks
    if (id === 'expo-linking') {
      return mockExpoLinking;
    }
    if (id === 'expo-image-picker') {
      return mockExpoImagePicker;
    }
    if (id === 'expo-document-picker') {
      return mockExpoDocumentPicker;
    }
    if (id === 'expo-file-system') {
      return mockExpoFileSystem;
    }
    if (id === 'expo-constants') {
      return mockExpoConstants;
    }
    if (id === 'expo-camera') {
      return { Camera: {}, CameraType: {}, FlashMode: {} };
    }
    if (id === 'expo-clipboard') {
      return { setStringAsync: async () => {}, getStringAsync: async () => '' };
    }
    
    // Skip expo-modules-core and related
    if (id.includes('expo-modules-core') || id.includes('@expo/')) {
      return {};
    }
    
    return originalRequire.apply(this, arguments);
  };

  // Set global fetch mock
  (global as any).fetch = mockFetch;

  console.log('✅ Test mocks initialized');
}

// Export mocks for direct use
export { mockAsyncStorage, mockFetch };


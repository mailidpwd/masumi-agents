/**
 * Gemini API Configuration
 * 
 * Note: In production, store the API key securely using environment variables
 * or a secure configuration service.
 */
import Constants from 'expo-constants';

// Get environment variables from Expo config (set in app.config.js)
const getExpoExtra = () => {
  try {
    return Constants.expoConfig?.extra || Constants.manifest?.extra || {};
  } catch {
    return {};
  }
};

// Get Gemini API key from both process.env and Expo Constants
const getGeminiApiKey = (): string => {
  const expoExtra = getExpoExtra();
  return process.env.GEMINI_API_KEY || 
         process.env.EXPO_PUBLIC_GEMINI_API_KEY || 
         expoExtra.GEMINI_API_KEY || 
         'AIzaSyDeUK1O40U2-odUcPivjmEXFdsuhposGwM';
};

export const GEMINI_API_KEY = getGeminiApiKey();

export const GEMINI_CONFIG = {
  apiKey: GEMINI_API_KEY,
  model: 'gemini-2.5-flash', // Using gemini-2.5-flash for faster responses
};


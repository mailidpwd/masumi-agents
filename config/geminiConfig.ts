/**
 * Gemini API Configuration
 * 
 * Note: In production, store the API key securely using environment variables
 * or a secure configuration service.
 */
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY || 'AIzaSyAnBD52mLTP6EgOpfHnmz284T2K2p9mcYo';

export const GEMINI_CONFIG = {
  apiKey: GEMINI_API_KEY,
  model: 'gemini-2.5-flash', // Using gemini-2.5-flash for faster responses
};


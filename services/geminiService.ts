import { GEMINI_CONFIG } from '../config/geminiConfig';
import { AgentMessage, AgentResponse } from '../types/agent';

/**
 * Gemini AI Service
 * Handles communication with Google's Gemini AI API using REST API
 * (React Native compatible implementation)
 */
export class GeminiService {
  private apiKey: string;
  private apiUrl: string;

  constructor() {
    this.apiKey = GEMINI_CONFIG.apiKey;
    // Use Gemini REST API endpoint
    const modelName = GEMINI_CONFIG.model;
    this.apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${this.apiKey}`;
  }

  /**
   * Send a message to Gemini and get a response
   */
  async sendMessage(
    prompt: string,
    conversationHistory: AgentMessage[] = []
  ): Promise<AgentResponse> {
    try {
      // Build conversation context from history
      const contents: any[] = conversationHistory
        .filter(msg => msg.role !== 'system')
        .map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        }));

      // Add current user message
      contents.push({
        role: 'user',
        parts: [{ text: prompt }],
      });

      // Prepare request body
      // Increased maxOutputTokens for gemini-2.5-flash which uses internal reasoning tokens
      const requestBody = {
        contents: contents,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192, // Increased to accommodate reasoning tokens
        },
      };

      // Make API request using fetch (React Native compatible)
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || `API request failed with status ${response.status}`;
        
        // Handle leaked API key error gracefully
        if (errorMessage.includes('leaked') || errorMessage.includes('reported')) {
          console.warn('⚠️ Gemini API key is invalid or leaked. AI features will be disabled. Please update GEMINI_API_KEY in .env');
          return {
            success: false,
            error: 'Gemini API key is invalid. Please update your API key in the .env file.',
            message: 'AI features are temporarily unavailable. Please contact support to update your API key.',
          };
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // Log full response for debugging
      console.log('Gemini API Response:', JSON.stringify(data, null, 2));
      
      // Extract text from response FIRST (even if finishReason is not STOP)
      const candidate = data.candidates?.[0];
      let text: string | undefined;
      
      // Try different response paths
      if (candidate?.content?.parts?.[0]?.text) {
        text = candidate.content.parts[0].text;
      } else if (candidate?.content?.parts) {
        // Try all parts in case there are multiple
        for (const part of candidate.content.parts) {
          if (part.text) {
            text = part.text;
            break;
          }
        }
      } else if (candidate?.text) {
        text = candidate.text;
      } else if (data.text) {
        text = data.text;
      } else if (data.response?.text) {
        text = data.response.text;
      }
      
      // Check finish reason after extracting text
      if (candidate?.finishReason) {
        if (candidate.finishReason === 'SAFETY') {
          throw new Error('Response was blocked due to safety filters. Please rephrase your question.');
        }
        if (candidate.finishReason === 'RECITATION') {
          throw new Error('Response was blocked due to recitation concerns.');
        }
        if (candidate.finishReason === 'MAX_TOKENS' && !text) {
          throw new Error('Response exceeded token limit. The question may be too complex. Please try a shorter or simpler question.');
        }
        // If we have text even with MAX_TOKENS, we can still return it (partial but usable)
        if (candidate.finishReason === 'MAX_TOKENS' && text) {
          console.warn('Response was truncated due to token limit, but partial response available');
        }
      }
      
      if (!text) {
        // Log the actual structure for debugging
        const finishReason = candidate?.finishReason || 'unknown';
        const errorMessage = finishReason === 'MAX_TOKENS'
          ? 'Response exceeded token limit. Please try a shorter question.'
          : finishReason !== 'STOP'
          ? `Response finished with reason: ${finishReason}`
          : 'No text in response from Gemini API';
        console.error('Unable to extract text. Response structure:', JSON.stringify(data, null, 2));
        throw new Error(errorMessage);
      }

      return {
        success: true,
        message: text,
      };
    } catch (error) {
      // Handle leaked/invalid API key errors gracefully
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('leaked') || errorMessage.includes('reported') || errorMessage.includes('invalid')) {
        console.warn('⚠️ Gemini API key issue detected. AI features disabled.');
        return {
          success: false,
          error: 'Gemini API key is invalid',
          message: 'AI features are temporarily unavailable. Please update your API key.',
        };
      }
      console.error('Gemini API Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get response from Gemini',
      };
    }
  }

  /**
   * Get a response with system instructions for Cardano expertise
   */
  async sendCardanoQuery(
    prompt: string,
    conversationHistory: AgentMessage[] = []
  ): Promise<AgentResponse> {
    const systemInstruction = `You are a helpful Cardano blockchain assistant. You have deep knowledge about:
- Cardano blockchain technology and architecture
- ADA cryptocurrency and transactions
- Cardano wallets (Nami, Eternl, Flint, etc.)
- Smart contracts and Plutus
- DApp development on Cardano
- Staking and delegation
- Cardano ecosystem and projects

Provide clear, accurate, and helpful answers about Cardano. If asked about something outside Cardano, politely redirect or explain that you specialize in Cardano.`;

    // Build contents with system instruction using systemInstruction parameter
    let contents: any[] = conversationHistory
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      }));

    // Add current user prompt
    contents.push({
      role: 'user',
      parts: [{ text: prompt }],
    });

    try {
      const requestBody = {
        contents: contents,
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192, // Increased to accommodate reasoning tokens in gemini-2.5-flash
        },
      };

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || `API request failed with status ${response.status}`;
        
        // Handle leaked API key error gracefully
        if (errorMessage.includes('leaked') || errorMessage.includes('reported')) {
          console.warn('⚠️ Gemini API key is invalid or leaked. AI features will be disabled. Please update GEMINI_API_KEY in .env');
          return {
            success: false,
            error: 'Gemini API key is invalid. Please update your API key in the .env file.',
            message: 'AI features are temporarily unavailable. Please contact support to update your API key.',
          };
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // Log full response for debugging
      console.log('Gemini API Response (Cardano):', JSON.stringify(data, null, 2));
      
      // Extract text from response FIRST (even if finishReason is not STOP)
      const candidate = data.candidates?.[0];
      let text: string | undefined;
      
      // Try different response paths
      if (candidate?.content?.parts?.[0]?.text) {
        text = candidate.content.parts[0].text;
      } else if (candidate?.content?.parts) {
        // Try all parts in case there are multiple
        for (const part of candidate.content.parts) {
          if (part.text) {
            text = part.text;
            break;
          }
        }
      } else if (candidate?.text) {
        text = candidate.text;
      } else if (data.text) {
        text = data.text;
      } else if (data.response?.text) {
        text = data.response.text;
      }
      
      // Check finish reason after extracting text
      if (candidate?.finishReason) {
        if (candidate.finishReason === 'SAFETY') {
          throw new Error('Response was blocked due to safety filters. Please rephrase your question.');
        }
        if (candidate.finishReason === 'RECITATION') {
          throw new Error('Response was blocked due to recitation concerns.');
        }
        if (candidate.finishReason === 'MAX_TOKENS' && !text) {
          throw new Error('Response exceeded token limit. The question may be too complex. Please try a shorter or simpler question.');
        }
        // If we have text even with MAX_TOKENS, we can still return it (partial but usable)
        if (candidate.finishReason === 'MAX_TOKENS' && text) {
          console.warn('Response was truncated due to token limit, but partial response available');
        }
      }
      
      if (!text) {
        // Log the actual structure for debugging
        const finishReason = candidate?.finishReason || 'unknown';
        const errorMessage = finishReason === 'MAX_TOKENS'
          ? 'Response exceeded token limit. Please try a shorter question.'
          : finishReason !== 'STOP'
          ? `Response finished with reason: ${finishReason}`
          : 'No text in response from Gemini API';
        console.error('Unable to extract text. Response structure:', JSON.stringify(data, null, 2));
        throw new Error(errorMessage);
      }

      return {
        success: true,
        message: text,
      };
    } catch (error) {
      // Handle leaked/invalid API key errors gracefully
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('leaked') || errorMessage.includes('reported') || errorMessage.includes('invalid')) {
        console.warn('⚠️ Gemini API key issue detected. AI features disabled.');
        return {
          success: false,
          error: 'Gemini API key is invalid',
          message: 'AI features are temporarily unavailable. Please update your API key.',
        };
      }
      console.error('Gemini API Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get response from Gemini',
      };
    }
  }

  /**
   * Test the Gemini API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.sendMessage('Say "Hello, I am connected!" in one sentence.');
      return result.success;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}


/**
 * Masumi Network Client
 * 
 * Handles communication with Masumi Payment and Registry services
 * Provides methods for event publishing, agent querying, and payment processing
 */
import { masumiConfig } from '../config/masumiConfig';

export interface MasumiEvent {
  eventType: string;
  agentId: string;
  payload: any;
  timestamp: Date;
}

export interface MasumiPayment {
  fromAgent: string;
  toAgent: string;
  amount: number;
  currency: 'ADA' | 'TADA' | 'RDM';
  txHash?: string;
}

export interface MasumiAgent {
  agentId: string;
  agentName: string;
  description?: string;
  version?: string;
  status: 'active' | 'inactive';
  endpoint?: string;
  nftTokenId?: string;
}

export interface MasumiPaymentSource {
  network: string;
  walletVkey: string;
  balance: number;
}

export interface MasumiHealthResponse {
  status: 'ok' | 'error';
  service: string;
  timestamp?: string;
}

export interface MasumiApiKeyResponse {
  apiKey: string;
  created: string;
}

export class MasumiClient {
  private paymentServiceUrl: string;
  private registryServiceUrl: string;
  private apiKey: string;

  constructor() {
    this.paymentServiceUrl = masumiConfig.paymentServiceUrl;
    this.registryServiceUrl = masumiConfig.registryServiceUrl;
    this.apiKey = masumiConfig.apiKey;
  }

  /**
   * Set API key for authentication
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * Get API key from Payment Service
   */
  async getApiKey(): Promise<MasumiApiKeyResponse | null> {
    try {
      const response = await fetch(`${this.paymentServiceUrl.replace('/api/v1', '')}/api/v1/api-key/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get API key: ${response.statusText}`);
      }

      const data = await response.json();
      return data as MasumiApiKeyResponse;
    } catch (error) {
      console.error('Failed to get API key from Masumi:', error);
      return null;
    }
  }

  /**
   * Health check for Payment Service
   */
  async checkPaymentServiceHealth(): Promise<boolean> {
    try {
      const healthUrl = `${this.paymentServiceUrl.replace('/api/v1', '')}/api/v1/health`;
      console.log(`🔍 Checking Payment service health at: ${healthUrl}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`Payment service returned status ${response.status}`);
        return false;
      }

      const data = await response.json() as any;
      // Payment service returns: {"status":"success","data":{"status":"ok"}}
      const isHealthy = data.status === 'success' && (data.data?.status === 'ok' || data.data?.status === 'success');
      console.log(`✅ Payment service health check: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`);
      return isHealthy;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('Payment service health check timeout (10s)');
      } else {
        console.error('Payment service health check failed:', error.message || error);
      }
      return false;
    }
  }

  /**
   * Health check for Registry Service
   */
  async checkRegistryServiceHealth(): Promise<boolean> {
    try {
      const healthUrl = `${this.registryServiceUrl.replace('/api/v1', '')}/api/v1/health`;
      console.log(`🔍 Checking Registry service health at: ${healthUrl}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`Registry service returned status ${response.status}`);
        return false;
      }

      const data = await response.json() as any;
      // Registry service returns: {"status":"success","data":{"type":"masumi-registry","version":"0.1.2"}}
      const isHealthy = data.status === 'success' && data.data?.type === 'masumi-registry';
      console.log(`✅ Registry service health check: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`);
      return isHealthy;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('Registry service health check timeout (10s)');
      } else {
        console.error('Registry service health check failed:', error.message || error);
      }
      return false;
    }
  }

  /**
   * Combined health check for both services
   */
  async healthCheck(): Promise<boolean> {
    try {
      const [paymentHealthy, registryHealthy] = await Promise.all([
        this.checkPaymentServiceHealth(),
        this.checkRegistryServiceHealth(),
      ]);

      return paymentHealthy && registryHealthy;
    } catch (error) {
      console.error('Masumi health check failed:', error);
      return false;
    }
  }

  /**
   * Get payment source information
   */
  async getPaymentSource(): Promise<MasumiPaymentSource[] | null> {
    try {
      const response = await fetch(`${this.paymentServiceUrl}/payment-source/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'token': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get payment source: ${response.statusText}`);
      }

      const data = await response.json();
      return data.paymentSources || [];
    } catch (error) {
      console.error('Failed to get payment source:', error);
      return null;
    }
  }

  /**
   * Publish an event to Masumi network
   */
  async publishEvent(event: MasumiEvent): Promise<{ success: boolean; eventId?: string; error?: string }> {
    try {
      const response = await fetch(`${this.paymentServiceUrl}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token': this.apiKey,
        },
        body: JSON.stringify({
          agentId: event.agentId,
          eventType: event.eventType,
          payload: event.payload,
          timestamp: event.timestamp.toISOString(),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to publish event: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      return {
        success: true,
        eventId: data.eventId || data.id,
      };
    } catch (error) {
      console.error('Failed to publish event to Masumi:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Query registered agents
   */
  async queryAgents(filters?: { agentName?: string; status?: string }): Promise<MasumiAgent[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.agentName) {
        params.append('agentName', filters.agentName);
      }
      if (filters?.status) {
        params.append('status', filters.status);
      }

      const url = `${this.registryServiceUrl}/registry/${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to query agents: ${response.statusText}`);
      }

      const data = await response.json();
      return data.agents || [];
    } catch (error) {
      console.error('Failed to query agents from Masumi:', error);
      return [];
    }
  }

  /**
   * Get agent by ID
   */
  async getAgent(agentId: string): Promise<MasumiAgent | null> {
    try {
      const response = await fetch(`${this.registryServiceUrl}/registry/${agentId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get agent: ${response.statusText}`);
      }

      const data = await response.json();
      return data as MasumiAgent;
    } catch (error) {
      console.error(`Failed to get agent ${agentId}:`, error);
      return null;
    }
  }

  /**
   * Register an agent on Masumi network
   */
  async registerAgent(agentData: {
    agentName: string;
    description: string;
    version: string;
    capabilities: string[];
    endpoint: string;
    walletVkey: string;
    network: 'PREPROD' | 'MAINNET';
  }): Promise<{ success: boolean; agentId?: string; nftTxHash?: string; error?: string }> {
    try {
      const response = await fetch(`${this.paymentServiceUrl}/registry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token': this.apiKey,
        },
        body: JSON.stringify(agentData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to register agent: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      return {
        success: true,
        agentId: data.agentId,
        nftTxHash: data.nftTxHash,
      };
    } catch (error) {
      console.error('Failed to register agent:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Process a payment between agents
   */
  async processPayment(payment: MasumiPayment): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      const response = await fetch(`${this.paymentServiceUrl}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token': this.apiKey,
        },
        body: JSON.stringify({
          fromAgent: payment.fromAgent,
          toAgent: payment.toAgent,
          amount: payment.amount,
          currency: payment.currency,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to process payment: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      return {
        success: true,
        txHash: data.txHash || data.transactionHash,
      };
    } catch (error) {
      console.error('Failed to process payment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(txHash: string): Promise<{ status: string; confirmed: boolean }> {
    try {
      const response = await fetch(`${this.paymentServiceUrl}/payments/${txHash}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'token': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get payment status: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        status: data.status || 'unknown',
        confirmed: data.confirmed || false,
      };
    } catch (error) {
      console.error('Failed to get payment status:', error);
      return { status: 'unknown', confirmed: false };
    }
  }
}

// Singleton instance
let masumiClientInstance: MasumiClient | null = null;

export function getMasumiClient(): MasumiClient {
  if (!masumiClientInstance) {
    masumiClientInstance = new MasumiClient();
  }
  return masumiClientInstance;
}


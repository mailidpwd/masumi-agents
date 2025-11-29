# Complete Masumi Integration Guide: From Test Tokens to Live Agent

**A Step-by-Step Guide to Connect Real Test Tokens with Masumi Integration and Deploy Your AI Agents**

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Understanding the Architecture](#understanding-the-architecture)
3. [Phase 1: Setting Up Cardano Testnet & Test Tokens](#phase-1-setting-up-cardano-testnet--test-tokens)
4. [Phase 2: Setting Up Masumi Development Environment](#phase-2-setting-up-masumi-development-environment)
5. [Phase 3: Registering Your AI Agents on Masumi](#phase-3-registering-your-ai-agents-on-masumi)
6. [Phase 4: Integrating Masumi with Your Code](#phase-4-integrating-masumi-with-your-code)
7. [Phase 5: Making Your Agent Live](#phase-5-making-your-agent-live)
8. [Phase 6: Testing with Real Test Tokens](#phase-6-testing-with-real-test-tokens)
9. [Troubleshooting](#troubleshooting)

---

## Overview

### What You'll Achieve

By following this guide, you will:

1. ✅ Set up a Cardano testnet wallet with real test ADA
2. ✅ Configure Masumi Payment Service and Registry Service
3. ✅ Register your 3 AI agents (Medaa1, Medaa2, Medaa3) on Masumi network
4. ✅ Integrate Masumi APIs into your existing code
5. ✅ Make your agents live and interactable on the Masumi network
6. ✅ Test real token transactions using test ADA

### Timeline

- **Phase 1-2**: 1-2 hours (Setup)
- **Phase 3-4**: 2-3 hours (Integration)
- **Phase 5-6**: 1-2 hours (Testing & Deployment)
- **Total**: 4-7 hours

---

## Understanding the Architecture

### Current Architecture (What You Have Now)

```
┌─────────────────────────────────────────────────────┐
│           Your React Native App                      │
├─────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │ Medaa1   │  │ Medaa2   │  │ Medaa3   │          │
│  │ Agent    │  │ Agent    │  │ Agent    │          │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘          │
│       │             │             │                  │
│       └─────────────┼─────────────┘                  │
│                     │                                 │
│             ┌───────▼────────┐                       │
│             │ Local Event    │                       │
│             │ Bus (Memory)   │                       │
│             └────────────────┘                       │
│                                                       │
│  Services:                                           │
│  - TokenService (Mock)                               │
│  - WalletService (Browser-based)                     │
│  - GeminiService (AI)                                │
└─────────────────────────────────────────────────────┘
```

### Target Architecture (After Masumi Integration)

```
┌─────────────────────────────────────────────────────────────────┐
│              Your React Native App                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │
│  │ Medaa1   │  │ Medaa2   │  │ Medaa3   │                      │
│  │ Agent    │  │ Agent    │  │ Agent    │                      │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                      │
│       │             │             │                              │
│       └─────────────┼─────────────┘                              │
│                     │                                             │
│             ┌───────▼────────────┐                               │
│             │ Masumi Integration │                               │
│             │ Service Layer      │                               │
│             └──────┬─────────────┘                               │
└────────────────────┼───────────────────────────────────────────┘
                     │
         ┌───────────▼───────────┐
         │  Masumi Network APIs  │
         ├───────────────────────┤
         │ - Payment Service     │
         │ - Registry Service    │
         └──────┬────────────────┘
                │
    ┌───────────▼────────────┐
    │  Cardano Blockchain     │
    │  (PreProd Testnet)      │
    ├─────────────────────────┤
    │  - Real Test ADA        │
    │  - Agent NFTs           │
    │  - Transactions         │
    │  - Smart Contracts      │
    └─────────────────────────┘
```

---

## Phase 1: Setting Up Cardano Testnet & Test Tokens

### Step 1.1: Install a Cardano Testnet Wallet

You'll need a wallet that supports the Cardano **PreProd Testnet**.

#### Recommended Wallets:

1. **Eternl Wallet** (Best for testnet)
   - Download: https://eternl.io/
   - Supports mobile and browser extension
   - Easy testnet switching

2. **Nami Wallet**
   - Download: https://namiwallet.io/
   - Browser extension only
   - User-friendly interface

3. **Typhon Wallet**
   - Download: https://typhonwallet.io/
   - Full-featured
   - Good for developers

#### Installation Steps (Using Eternl):

```bash
# For Browser Extension (Recommended for Testing)
1. Go to https://eternl.io/
2. Click "Download" → Select your browser (Chrome/Firefox/Brave)
3. Install the extension
4. Click the extension icon
5. Select "Create New Wallet"
6. Save your recovery phrase (24 words) - CRITICAL!
7. Set a spending password
```

### Step 1.2: Switch Wallet to PreProd Testnet

> [!IMPORTANT]
> By default, wallets connect to **Mainnet**. You MUST switch to **PreProd Testnet** for testing.

#### In Eternl Wallet:

```
1. Open Eternl extension
2. Click on "Mainnet" at the top
3. Select "Pre-Production Testnet" from dropdown
4. Wallet will reload on testnet network
5. You'll see "PreProd" indicated at the top
```

#### In Nami Wallet:

```
1. Open Nami
2. Go to Settings (gear icon)
3. Scroll to "Network"
4. Toggle to "Preprod Testnet"
5. Return to main screen
```

### Step 1.3: Get Your Testnet Wallet Address

```
1. In your wallet, click "Receive"
2. Copy your wallet address
3. It should start with: addr_test1...
4. Save this address - you'll need it multiple times
```

**Example Testnet Address Format:**
```
addr_test1qz5g2x8p3w4m9n7v6c5b4a3s2d1f0g9h8j7k6l5m4n3b2c1d0e9f8g7h6j5k4l3m2n1b0c9d8e7f6g5h4j3k2l1m0n9b8
```

### Step 1.4: Get Test ADA from Faucet

> [!NOTE]
> Test ADA has **NO real-world value**. It's free and used only for testing.

#### Official Cardano Testnet Faucet:

**URL**: https://docs.cardano.org/cardano-testnet/tools/faucet/

#### Step-by-Step Process:

```
1. Go to https://docs.cardano.org/cardano-testnet/tools/faucet/
2. Select Environment: "Preprod"
3. Select Action: "Receive test ADA"
4. Paste your testnet address (addr_test1...)
5. Leave "API Key (Optional)" blank
6. Complete the "I'm not a robot" captcha
7. Click "Request funds"
8. Wait 30-60 seconds
```

#### What You'll Receive:

- **Amount**: ~1000 test ADA
- **Limit**: Once per day per IP address
- **Time**: Usually arrives within 1 minute

#### Verify Receipt:

```
1. Open your wallet
2. Check balance
3. You should see 1000 tADA (test ADA)
4. View transaction in wallet history
```

#### Alternative Faucets (if official is down):

- **Gimbalabs**: https://gimbalabs.com/faucet
- **BuildOnCardano**: https://builtoncardano.com/faucet

### Step 1.5: Verify Your Testnet Setup

**Checklist:**

- [ ] Wallet installed
- [ ] Wallet switched to PreProd Testnet
- [ ] Testnet address obtained (starts with addr_test1)
- [ ] Test ADA received (check balance = 1000 tADA)
- [ ] Wallet recovery phrase saved securely

---

## Phase 2: Setting Up Masumi Development Environment

### Step 2.1: Understanding Masumi Services

Masumi network has **two core services** you need to run:

1. **Payment Service** (Port 3001)
   - Handles wallet management
   - Processes transactions
   - Agent registration
   - API authentication

2. **Registry Service** (Port 3000)
   - Queries registered agents
   - Agent discovery
   - Health checks
   - Read-only operations

### Step 2.2: Clone Masumi Services

Masumi services are available on GitHub:

```bash
# Navigate to your development folder
cd ~/development  # or wherever you keep projects

# Clone Payment Service
git clone https://github.com/masumi-network/masumi-payment-service.git
cd masumi-payment-service
npm install

# Clone Registry Service (in a new terminal)
cd ~/development
git clone https://github.com/masumi-network/masumi-registry-service.git
cd masumi-registry-service
npm install
```

> [!WARNING]
> If repositories are private or not found, you may need to:
> - Request access from Masumi team
> - Join Masumi Discord: https://discord.gg/masumi
> - Check alternative documentation at: https://masumi.network

### Step 2.3: Configure Environment Variables

#### For Payment Service:

Create `.env` file in `masumi-payment-service/`:

```env
# Network Configuration
NETWORK=Preprod
NODE_ENV=development

# Payment Service Configuration
PORT=3001
API_VERSION=v1

# Cardano Configuration
BLOCKFROST_PROJECT_ID=your_blockfrost_preprod_key_here
CARDANO_NETWORK=preprod

# Database (if required)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=masumi_payment
```

#### For Registry Service:

Create `.env` file in `masumi-registry-service/`:

```env
# Network Configuration
NETWORK=Preprod
NODE_ENV=development

# Registry Service Configuration
PORT=3000
API_VERSION=v1

# Cardano Configuration
BLOCKFROST_PROJECT_ID=your_blockfrost_preprod_key_here
CARDANO_NETWORK=preprod

# Payment Service Connection
PAYMENT_SERVICE_URL=http://localhost:3001/api/v1
```

### Step 2.4: Get Blockfrost API Key

Blockfrost provides Cardano blockchain API access:

```
1. Go to https://blockfrost.io/
2. Click "Sign Up" (free tier available)
3. Verify your email
4. Log in to dashboard
5. Click "Add Project"
6. Select "Cardano PreProd"
7. Name your project (e.g., "RDM Masumi Test")
8. Copy your Project ID (starts with "preprod...")
9. Replace "your_blockfrost_preprod_key_here" in .env files
```

**Example Blockfrost Project ID:**
```
preprodabcdef1234567890abcdef1234567890
```

### Step 2.5: Start Masumi Services

#### Terminal 1 - Payment Service:

```bash
cd masumi-payment-service
npm run dev
# Should see: "Payment Service running on http://localhost:3001"
```

#### Terminal 2 - Registry Service:

```bash
cd masumi-registry-service
npm run dev
# Should see: "Registry Service running on http://localhost:3000"
```

### Step 2.6: Verify Services Are Running

```bash
# Test Payment Service
curl http://localhost:3001/api/v1/health
# Expected: {"status":"ok","service":"payment"}

# Test Registry Service
curl http://localhost:3000/api/v1/health
# Expected: {"status":"ok","service":"registry"}
```

---

## Phase 3: Registering Your AI Agents on Masumi

### Step 3.1: Create Payment API Key

First, you need an API key to authenticate with Masumi:

```bash
# Get your Payment API Key
curl -X GET http://localhost:3001/api/v1/api-key/
```

**Response:**
```json
{
  "apiKey": "msk_1234567890abcdef...",
  "created": "2024-11-26T14:52:24Z"
}
```

**Save this API key!** You'll use it for all subsequent requests.

### Step 3.2: Get Payment Source Information

Before registering agents, get your wallet information:

```bash
curl -X GET http://localhost:3001/api/v1/payment-source/ \
  -H "token: msk_1234567890abcdef..."
```

**Response:**
```json
{
  "paymentSources": [
    {
      "network": "PREPROD",
      "walletVkey": "addr_test1qz5g2x8p3w4m9n7...",
      "balance": 1000000000
    }
  ]
}
```

**Copy the `walletVkey`** - this is needed for registration.

### Step 3.3: Fund Your Payment Wallet

The Payment Service creates a wallet for transactions. You need to fund it:

```bash
# 1. Get the payment wallet address from payment-source response
# 2. Send test ADA from your testnet wallet to this address
# 3. Send at least 50 test ADA (registration costs ~5 ADA)

# You can do this via your wallet UI:
# - Open Eternl wallet
# - Click "Send"
# - Paste payment wallet address
# - Amount: 50 ADA
# - Confirm transaction
```

### Step 3.4: Register Medaa1 Agent (Goal Setting Agent)

Now register your first agent!

```bash
curl -X POST http://localhost:3001/api/v1/registry \
  -H "Content-Type: application/json" \
  -H "token: msk_1234567890abcdef..." \
  -d '{
    "agentName": "RDM-Medaa1-GoalAgent",
    "description": "AI agent for goal creation, tracking, and reflection capture",
    "version": "1.0.0",
    "capabilities": [
      "goal_creation",
      "progress_tracking",
      "reflection_capture",
      "reminder_management",
      "ai_goal_suggestions"
    ],
    "endpoint": "https://your-app-domain.com/api/medaa1",
    "walletVkey": "addr_test1qz5g2x8p3w4m9n7...",
    "network": "PREPROD"
  }'
```

**Response:**
```json
{
  "success": true,
  "agentId": "agent_medaa1_1234567890",
  "nftTxHash": "abc123def456...",
  "registrationCost": 5000000,
  "message": "Agent registered successfully. NFT minted."
}
```

> [!IMPORTANT]
> **Save `agentId`** - This is your agent's unique identifier on Masumi network!

### Step 3.5: Register Medaa2 Agent (Token Management Agent)

```bash
curl -X POST http://localhost:3001/api/v1/registry \
  -H "Content-Type: application/json" \
  -H "token: msk_1234567890abcdef..." \
  -d '{
    "agentName": "RDM-Medaa2-TokenAgent",
    "description": "Handles token transfers, smart contract execution, and reward distribution",
    "version": "1.0.0",
    "capabilities": [
      "token_transfer",
      "smart_contract_execution",
      "reward_distribution",
      "penalty_enforcement",
      "balance_tracking"
    ],
    "endpoint": "https://your-app-domain.com/api/medaa2",
    "walletVkey": "addr_test1qz5g2x8p3w4m9n7...",
    "network": "PREPROD"
  }'
```

**Save the returned `agentId` for Medaa2.**

### Step 3.6: Register Medaa3 Agent (Charity Distribution Agent)

```bash
curl -X POST http://localhost:3001/api/v1/registry \
  -H "Content-Type: application/json" \
  -H "token: msk_1234567890abcdef..." \
  -d '{
    "agentName": "RDM-Medaa3-CharityAgent",
    "description": "Manages periodic charity distributions from reward and remorse purses",
    "version": "1.0.0",
    "capabilities": [
      "charity_distribution",
      "purse_monitoring",
      "allocation_management",
      "impact_tracking"
    ],
    "endpoint": "https://your-app-domain.com/api/medaa3",
    "walletVkey": "addr_test1qz5g2x8p3w4m9n7...",
    "network": "PREPROD"
  }'
```

**Save the returned `agentId` for Medaa3.**

### Step 3.7: Verify Agent Registrations

Check that all agents are registered:

```bash
# Query Registry Service
curl -X GET http://localhost:3000/api/v1/registry/
```

**Response:**
```json
{
  "agents": [
    {
      "agentId": "agent_medaa1_1234567890",
      "agentName": "RDM-Medaa1-GoalAgent",
      "status": "active",
      "nftTokenId": "..."
    },
    {
      "agentId": "agent_medaa2_1234567891",
      "agentName": "RDM-Medaa2-TokenAgent",
      "status": "active",
      "nftTokenId": "..."
    },
    {
      "agentId": "agent_medaa3_1234567892",
      "agentName": "RDM-Medaa3-CharityAgent",
      "status": "active",
      "nftTokenId": "..."
    }
  ]
}
```

---

## Phase 4: Integrating Masumi with Your Code

### Step 4.1: Install Required Dependencies

Add Masumi client libraries to your React Native project:

```bash
cd c:\Users\Michael\Desktop\Cardano

# Install HTTP client (if not already installed)
npm install axios

# Install Cardano serialization library
npm install @emurgo/cardano-serialization-lib-browser

# Update package.json
npm install
```

### Step 4.2: Create Masumi Configuration

Create a new file: `config/masumiConfig.ts`

```typescript
/**
 * Masumi Network Configuration
 */
export interface MasumiConfig {
  paymentServiceUrl: string;
  registryServiceUrl: string;
  network: 'PREPROD' | 'MAINNET';
  apiKey: string;
  agentIds: {
    medaa1: string;
    medaa2: string;
    medaa3: string;
  };
}

export const masumiConfig: MasumiConfig = {
  paymentServiceUrl: 'http://localhost:3001/api/v1',
  registryServiceUrl: 'http://localhost:3000/api/v1',
  network: 'PREPROD',
  apiKey: process.env.MASUMI_API_KEY || 'msk_1234567890abcdef...',
  agentIds: {
    medaa1: 'agent_medaa1_1234567890',  // Replace with your actual agent IDs
    medaa2: 'agent_medaa2_1234567891',
    medaa3: 'agent_medaa3_1234567892',
  },
};
```

### Step 4.3: Create Masumi Service Client

Create: `services/masumiClient.ts`

```typescript
/**
 * Masumi Network Client
 * Handles communication with Masumi Payment and Registry services
 */
import axios, { AxiosInstance } from 'axios';
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

export class MasumiClient {
  private paymentClient: AxiosInstance;
  private registryClient: AxiosInstance;

  constructor() {
    this.paymentClient = axios.create({
      baseURL: masumiConfig.paymentServiceUrl,
      headers: {
        'Content-Type': 'application/json',
        'token': masumiConfig.apiKey,
      },
    });

    this.registryClient = axios.create({
      baseURL: masumiConfig.registryServiceUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Publish an event to Masumi network
   */
  async publishEvent(event: MasumiEvent): Promise<{ success: boolean; eventId?: string }> {
    try {
      const response = await this.paymentClient.post('/events', {
        agentId: event.agentId,
        eventType: event.eventType,
        payload: event.payload,
        timestamp: event.timestamp.toISOString(),
      });

      return {
        success: true,
        eventId: response.data.eventId,
      };
    } catch (error) {
      console.error('Failed to publish event to Masumi:', error);
      return { success: false };
    }
  }

  /**
   * Query registered agents
   */
  async queryAgents(filters?: { agentName?: string; status?: string }): Promise<any[]> {
    try {
      const response = await this.registryClient.get('/registry/', { params: filters });
      return response.data.agents || [];
    } catch (error) {
      console.error('Failed to query agents from Masumi:', error);
      return [];
    }
  }

  /**
   * Get agent by ID
   */
  async getAgent(agentId: string): Promise<any | null> {
    try {
      const response = await this.registryClient.get(`/registry/${agentId}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to get agent ${agentId}:`, error);
      return null;
    }
  }

  /**
   * Process a payment between agents
   */
  async processPayment(payment: MasumiPayment): Promise<{ success: boolean; txHash?: string }> {
    try {
      const response = await this.paymentClient.post('/payments', {
        fromAgent: payment.fromAgent,
        toAgent: payment.toAgent,
        amount: payment.amount,
        currency: payment.currency,
      });

      return {
        success: true,
        txHash: response.data.txHash,
      };
    } catch (error) {
      console.error('Failed to process payment:', error);
      return { success: false };
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(txHash: string): Promise<{ status: string; confirmed: boolean }> {
    try {
      const response = await this.paymentClient.get(`/payments/${txHash}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get payment status:', error);
      return { status: 'unknown', confirmed: false };
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const [paymentHealth, registryHealth] = await Promise.all([
        this.paymentClient.get('/health'),
        this.registryClient.get('/health'),
      ]);

      return (
        paymentHealth.data.status === 'ok' &&
        registryHealth.data.status === 'ok'
      );
    } catch (error) {
      console.error('Masumi health check failed:', error);
      return false;
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
```

### Step 4.4: Update Agent Network to Use Masumi

Modify: `services/agentNetwork.ts`

```typescript
import { getMasumiClient, MasumiEvent } from './masumiClient';
import { masumiConfig } from '../config/masumiConfig';

// ... existing imports and types ...

export class AgentNetwork {
  // ... existing code ...
  private masumiClient = getMasumiClient();
  private useMasumi = true; // Toggle Masumi integration

  /**
   * Publish event to both local bus and Masumi network
   */
  async publish(event: AgentEvent): Promise<void> {
    // Local event bus (for immediate UI updates)
    this.eventHistory.push(event);
    const handlers = this.subscribers.get(event.type) || [];
    handlers.forEach((handler) => handler(event));

    // Publish to Masumi network (for blockchain persistence)
    if (this.useMasumi) {
      const agentIdMap: Record<string, string> = {
        'medaa1': masumiConfig.agentIds.medaa1,
        'medaa2': masumiConfig.agentIds.medaa2,
        'medaa3': masumiConfig.agentIds.medaa3,
      };

      const masumiEvent: MasumiEvent = {
        eventType: event.type,
        agentId: agentIdMap[event.agentId] || event.agentId,
        payload: event.payload,
        timestamp: event.timestamp,
      };

      try {
        const result = await this.masumiClient.publishEvent(masumiEvent);
        if (result.success) {
          console.log(`Event published to Masumi: ${result.eventId}`);
        }
      } catch (error) {
        console.error('Failed to publish to Masumi:', error);
        // Continue - don't fail local operations
      }
    }
  }

  /**
   * Enable/Disable Masumi integration
   */
  setMasumiEnabled(enabled: boolean): void {
    this.useMasumi = enabled;
  }
}
```

### Step 4.5: Update Agent Initializer

Modify: `services/agentInitializer.ts`

```typescript
import { getMasumiClient } from './masumiClient';

export async function initializeRDMServices(): Promise<RDMServiceContainer> {
  // ... existing initialization ...

  // Initialize Masumi connection
  const masumiClient = getMasumiClient();
  const masumiHealthy = await masumiClient.healthCheck();
  
  if (masumiHealthy) {
    console.log('✅ Masumi network connected');
  } else {
    console.warn('⚠️ Masumi network unavailable - using local mode');
  }

  // ... rest of initialization ...
}
```

---

## Phase 5: Making Your Agent Live

### Step 5.1: Create Agent API Endpoints

Your agents need HTTP endpoints to be accessible on Masumi network. You have two options:

#### Option A: Use Expo + Tunneling (For Development)

```bash
# Install ngrok for tunneling
npm install -g ngrok

# Start your Expo app
npm start

# In another terminal, expose via tunnel
ngrok http 19000

# You'll get a URL like: https://abc123.ngrok.io
# Use this as your agent endpoint
```

#### Option B: Deploy to Cloud (For Production)

Use a service like:
- **Vercel**: https://vercel.com
- **Railway**: https://railway.app
- **Heroku**: https://heroku.com

### Step 5.2: Create Agent Server (Express.js)

Create: `server/agentServer.ts`

```typescript
/**
 * Agent HTTP Server for Masumi Integration
 * Exposes agents as HTTP endpoints for Masumi network
 */
import express from 'express';
import { getRDMServices } from '../services/agentInitializer';

const app = express();
app.use(express.json());

const PORT = process.env.AGENT_PORT || 4000;

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', agents: ['medaa1', 'medaa2', 'medaa3'] });
});

// Medaa1 Agent Endpoints
app.get('/api/medaa1/input_schema', (req, res) => {
  res.json({
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['create_goal', 'log_reflection', 'get_goal'] },
      goalData: { type: 'object' },
      userId: { type: 'string' },
    },
    required: ['action', 'userId'],
  });
});

app.post('/api/medaa1/start_job', async (req, res) => {
  const { action, goalData, userId } = req.body;
  const services = getRDMServices();

  try {
    let result;
    switch (action) {
      case 'create_goal':
        result = await services.medaa1Agent.createGoal(userId, goalData);
        break;
      case 'log_reflection':
        result = await services.medaa1Agent.logReflection(userId, goalData);
        break;
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    res.json({
      success: true,
      jobId: `job_${Date.now()}`,
      result,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Medaa2 Agent Endpoints
app.post('/api/medaa2/start_job', async (req, res) => {
  const { action, transactionData } = req.body;
  const services = getRDMServices();

  try {
    let result;
    switch (action) {
      case 'transfer_tokens':
        result = await services.medaa2Agent.executeTransfer(transactionData);
        break;
      case 'distribute_rewards':
        result = await services.medaa2Agent.distributeRewards(transactionData);
        break;
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    res.json({
      success: true,
      jobId: `job_${Date.now()}`,
      result,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Medaa3 Agent Endpoints
app.post('/api/medaa3/start_job', async (req, res) => {
  const { action, distributionData } = req.body;
  const services = getRDMServices();

  try {
    let result;
    switch (action) {
      case 'distribute_charity':
        result = await services.medaa3Agent.distributeToCharity(distributionData);
        break;
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    res.json({
      success: true,
      jobId: `job_${Date.now()}`,
      result,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Agent server running on http://localhost:${PORT}`);
  console.log(`📡 Agents accessible on Masumi network`);
});
```

### Step 5.3: Start Agent Server

```bash
# Install dependencies
npm install express @types/express

# Add to package.json scripts:
{
  "scripts": {
    "start:agents": "ts-node server/agentServer.ts"
  }
}

# Start the agent server
npm run start:agents
```

### Step 5.4: Update Agent Endpoints in Registry

Update the endpoint URLs with your actual server address:

```bash
# If using ngrok
AGENT_ENDPOINT="https://abc123.ngrok.io"

# Update Medaa1
curl -X PATCH http://localhost:3001/api/v1/registry/agent_medaa1_1234567890 \
  -H "token: msk_1234567890abcdef..." \
  -d "{\"endpoint\": \"$AGENT_ENDPOINT/api/medaa1\"}"

# Update Medaa2
curl -X PATCH http://localhost:3001/api/v1/registry/agent_medaa2_1234567891 \
  -H "token: msk_1234567890abcdef..." \
  -d "{\"endpoint\": \"$AGENT_ENDPOINT/api/medaa2\"}"

# Update Medaa3
curl -X PATCH http://localhost:3001/api/v1/registry/agent_medaa3_1234567892 \
  -H "token: msk_1234567890abcdef..." \
  -d "{\"endpoint\": \"$AGENT_ENDPOINT/api/medaa3\"}"
```

---

## Phase 6: Testing with Real Test Tokens

### Step 6.1: Test Goal Creation with Token Pledge

```bash
# Test creating a goal with RDM token pledge
curl -X POST http://localhost:4000/api/medaa1/start_job \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create_goal",
    "userId": "test_user_1",
    "goalData": {
      "title": "Exercise Daily",
      "category": "SDG_GoodHealth",
      "duration": 30,
      "pledgedRDM": 100,
      "verificationMethod": "self"
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "jobId": "job_1732622544000",
  "result": {
    "goalId": "goal_abc123",
    "status": "active",
    "pledgedTokens": 100,
    "purses": {
      "rewardPurse": 50,
      "remorsePurse": 50
    }
  }
}
```

### Step 6.2: Test Token Transfer via Masumi

```bash
# Simulate goal completion and token transfer
curl -X POST http://localhost:4000/api/medaa2/start_job \
  -H "Content-Type: application/json" \
  -d '{
    "action": "transfer_tokens",
    "transactionData": {
      "goalId": "goal_abc123",
      "outcome": "success",
      "amount": 50,
      "fromPurse": "rewardPurse",
      "toAddress": "addr_test1qz5g2x8p3w4m9n7..."
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "jobId": "job_1732622545000",
  "result": {
    "txHash": "def456abc789...",
    "amount": 50,
    "status": "pending"
  }
}
```

### Step 6.3: Verify Transaction on Blockchain

```bash
# Check transaction status on Cardano PreProd
# Go to: https://preprod.cardanoscan.io/

# Enter your transaction hash: def456abc789...
# You should see:
# - Status: Success
# - Block: #12345678
# - Timestamp: 2024-11-26 14:52:24
# - From: Payment Service Wallet
# - To: Your wallet address
# - Amount: 50 tADA
```

### Step 6.4: Test Charity Distribution

```bash
# Test Medaa3 charity distribution
curl -X POST http://localhost:4000/api/medaa3/start_job \
  -H "Content-Type: application/json" \
  -d '{
    "action": "distribute_charity",
    "distributionData": {
      "purseType": "remorsePurse",
      "totalAmount": 100,
      "charities": [
        {
          "name": "Test Charity 1",
          "address": "addr_test1charity1...",
          "percentage": 50
        },
        {
          "name": "Test Charity 2",
          "address": "addr_test1charity2...",
          "percentage": 50
        }
      ]
    }
  }'
```

### Step 6.5: Monitor Agent Activity

```bash
# Check all events published by your agents
curl -X GET http://localhost:3000/api/v1/registry/?agentName=RDM-Medaa1-GoalAgent

# View agent transaction history
curl -X GET http://localhost:3001/api/v1/payments?agentId=agent_medaa1_1234567890
```

### Step 6.6: Full Integration Test

Now test from your React Native app:

```typescript
// In your app component
import { getMasumiClient } from './services/masumiClient';
import { getRDMServices } from './services/agentInitializer';

const testMasumiIntegration = async () => {
  console.log('🧪 Starting Masumi Integration Test...');

  // 1. Check Masumi connection
  const masumiClient = getMasumiClient();
  const isHealthy = await masumiClient.healthCheck();
  console.log('Masumi Health:', isHealthy);

  // 2. Create a goal
  const services = getRDMServices();
  const goal = await services.medaa1Agent.createGoal('test_user', {
    title: 'Test Goal',
    category: 'SDG_GoodHealth',
    duration: 7,
    pledgedRDM: 50,
    verificationMethod: 'self',
  });
  console.log('Goal Created:', goal);

  // 3. Complete the goal
  await services.medaa1Agent.logReflection('test_user', {
    goalId: goal.id,
    day: 7,
    status: 'success',
    reflection: 'Completed successfully!',
    verificationData: {},
  });

  // 4. Trigger token distribution
  const distribution = await services.medaa2Agent.executeTransfer({
    goalId: goal.id,
    outcome: 'success',
  });
  console.log('Tokens Distributed:', distribution);

  console.log('✅ Integration test complete!');
};

// Run test
testMasumiIntegration();
```

---

## Troubleshooting

### Common Issues & Solutions

#### 1. "Cannot connect to Masumi services"

**Problem**: App can't reach localhost:3001 or localhost:3000

**Solutions**:
```bash
# Check if services are running
curl http://localhost:3001/api/v1/health
curl http://localhost:3000/api/v1/health

# If not running, restart them
cd masumi-payment-service && npm run dev
cd masumi-registry-service && npm run dev

# Check firewall isn't blocking ports 3000, 3001
```

#### 2. "Agent registration failed"

**Problem**: Registration returns error

**Solutions**:
```bash
# Check wallet has sufficient test ADA
# Need at least 10 tADA for registration

# Verify Blockfrost API key is correct
echo $BLOCKFROST_PROJECT_ID

# Check Payment Service logs for errors
# Look for wallet or transaction errors
```

#### 3. "Test ADA not received from faucet"

**Problem**: Faucet request succeeded but no tokens in wallet

**Solutions**:
```
1. Wait 5 minutes (sometimes delayed)
2. Check you're on PreProd testnet in wallet
3. Verify address starts with "addr_test1"
4. Try alternative faucet: https://gimbalabs.com/faucet
5. Request in Discord: https://discord.gg/cardano
```

#### 4. "Transaction not confirming"

**Problem**: Token transfer stuck in pending

**Solutions**:
```bash
# Check transaction on blockchain explorer
# https://preprod.cardanoscan.io/transaction/YOUR_TX_HASH

# If not found after 10 minutes:
# - May have failed
# - Check Payment Service wallet has funds
# - Retry transaction
```

#### 5. "Agent endpoint not accessible"

**Problem**: Masumi can't reach your agent endpoints

**Solutions**:
```bash
# If using ngrok:
# 1. Check ngrok is still running
# 2. Get new URL if it expired
# 3. Update registry with new URL

# If using cloud deployment:
# 1. Check server is running
# 2. Verify firewall rules allow HTTP
# 3. Test endpoint manually:
curl https://your-endpoint.com/health
```

#### 6. "API Key invalid"

**Problem**: Masumi rejects your API key

**Solutions**:
```bash
# Generate new API key
curl -X GET http://localhost:3001/api/v1/api-key/

# Update in masumiConfig.ts
# Update in .env file
# Restart your app
```

---

## Summary & Next Steps

### What You've Accomplished ✅

1. ✅ Set up Cardano PreProd testnet wallet
2. ✅ Obtained real test ADA from faucet
3. ✅ Installed and configured Masumi services
4. ✅ Registered 3 AI agents on Masumi network
5. ✅ Integrated Masumi APIs with your React Native app
6. ✅ Created agent HTTP endpoints
7. ✅ Tested real token transactions on testnet

### Your Agents Are Now:

- 🌐 **Live on Masumi Network**: Discoverable by other agents
- 🔐 **Blockchain-Verified**: Registered via NFTs on Cardano
- 💰 **Handling Real Test Tokens**: Actual testnet transactions
- 📡 **Accessible via APIs**: HTTP endpoints for interaction
- 🔄 **Event-Driven**: Publishing events to decentralized network

### Next Steps for Production

1. **Security Hardening**
   - Use environment variables for all secrets
   - Implement proper authentication
   - Add rate limiting
   - Set up monitoring

2. **Move to Mainnet**
   - Get real ADA
   - Update config to MAINNET
   - Register agents on mainnet
   - Deploy to production servers

3. **Scaling**
   - Use cloud infrastructure
   - Add load balancers
   - Implement caching
   - Set up CDN

4. **Monitoring**
   - Set up Sentry for error tracking
   - Use DataDog/NewRelic for metrics
   - Monitor blockchain transactions
   - Track agent uptime

---

## Resources

### Official Documentation
- **Masumi Network**: https://masumi.network
- **Cardano Docs**: https://docs.cardano.org
- **Blockfrost**: https://docs.blockfrost.io

### Community
- **Masumi Discord**: https://discord.gg/masumi
- **Cardano Forum**: https://forum.cardano.org
- **r/Cardano**: https://reddit.com/r/cardano

### Tools
- **PreProd Explorer**: https://preprod.cardanoscan.io
- **Blockfrost Dashboard**: https://blockfrost.io/dashboard
- **Testnet Faucet**: https://docs.cardano.org/cardano-testnet/tools/faucet/

---

**You're now fully integrated with Masumi and ready to build on Cardano! 🚀**

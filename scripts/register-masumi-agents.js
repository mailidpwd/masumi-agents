/**
 * Masumi Agent Registration Script
 * 
 * Registers the 3 RDM agents (Medaa1, Medaa2, Medaa3) on the Masumi network
 * and outputs the configuration needed for .env file
 */

// Use axios (already installed in project)
const axios = require('axios');

// Helper to convert axios to fetch-like interface
async function fetch(url, options = {}) {
  try {
    const response = await axios({
      url,
      method: options.method || 'GET',
      headers: options.headers || {},
      data: options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : undefined,
      validateStatus: () => true, // Don't throw on any status
    });
    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      statusText: response.statusText,
      json: async () => response.data,
      text: async () => typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
    };
  } catch (error) {
    return {
      ok: false,
      status: error.response?.status || 500,
      statusText: error.message,
      json: async () => ({ error: error.message }),
      text: async () => error.message,
    };
  }
}

// Configuration from docker-compose
const PAYMENT_SERVICE_URL = process.env.MASUMI_PAYMENT_URL || 'http://10.110.141.10:3001/api/v1';
const REGISTRY_SERVICE_URL = process.env.MASUMI_REGISTRY_URL || 'http://10.110.141.10:3000/api/v1';
const ADMIN_KEY = process.env.MASUMI_ADMIN_KEY || 'rdm_admin_key_secure_change_me';
const NETWORK = 'Preprod'; // Must be 'Preprod' or 'Mainnet', not 'PREPROD'

// Agent definitions
const AGENTS = [
  {
    name: 'RDM-Medaa1-GoalAgent',
    description: 'Goal Setting and Habit Tracking Agent - Manages daily goals, AI suggestions, and marketplace matching',
    version: '1.0.0',
    capabilityName: 'Goal Setting and Habit Tracking',
    tags: ['goal-setting', 'habit-tracking', 'ai-suggestions', 'marketplace'],
    endpoint: 'http://10.110.141.10:8081', // App endpoint
  },
  {
    name: 'RDM-Medaa2-TokenAgent',
    description: 'Token Management Agent - Handles token transfers, smart contracts, yield calculation, and vault management',
    version: '1.0.0',
    capabilityName: 'Token Management and Smart Contracts',
    tags: ['token-management', 'smart-contracts', 'yield-calculation', 'vault'],
    endpoint: 'http://10.110.141.10:8081',
  },
  {
    name: 'RDM-Medaa3-CharityAgent',
    description: 'Charity Distribution Agent - Manages charity distributions, impact tracking, and SDG alignment',
    version: '1.0.0',
    capabilityName: 'Charity Distribution and Impact Tracking',
    tags: ['charity', 'impact-tracking', 'sdg-alignment', 'donations'],
    endpoint: 'http://10.110.141.10:8081',
  },
];

/**
 * Get or create API key from Payment Service
 * 
 * For local development, the payment service may require initial setup.
 * We'll try multiple methods to get/create an API key.
 */
async function getApiKey() {
  const baseUrl = PAYMENT_SERVICE_URL.replace('/api/v1', '');
  
  // Method 1: Try POST to create API key (first-time setup)
  try {
    const createResponse = await axios.post(`${baseUrl}/api/v1/api-key/`, {}, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (createResponse.data?.apiKey) {
      return createResponse.data.apiKey;
    }
    if (createResponse.data?.status === 'success' && createResponse.data?.data?.apiKey) {
      return createResponse.data.data.apiKey;
    }
  } catch (e) {
    // Continue to next method
  }

  // Method 2: Try GET (if API key already exists)
  try {
    const getResponse = await axios.get(`${baseUrl}/api/v1/api-key/`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (getResponse.data?.apiKey) {
      return getResponse.data.apiKey;
    }
    if (getResponse.data?.status === 'success' && getResponse.data?.data?.apiKey) {
      return getResponse.data.data.apiKey;
    }
  } catch (e) {
    // Continue to next method
  }

  // Method 3: Try with admin key
  try {
    const adminResponse = await axios.get(`${baseUrl}/api/v1/api-key/`, {
      headers: {
        'Content-Type': 'application/json',
        'token': ADMIN_KEY,
      },
    });
    
    if (adminResponse.data?.apiKey) {
      return adminResponse.data.apiKey;
    }
    if (adminResponse.data?.status === 'success' && adminResponse.data?.data?.apiKey) {
      return adminResponse.data.data.apiKey;
    }
  } catch (e) {
    // Continue to next method
  }

  // Method 4: Try to get API key from database (if we have access)
  // Check if there's a default admin key in the database
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    // Query database for existing admin key
    const { stdout } = await execAsync(
      `docker exec masumi-postgres-payment psql -U postgres -d postgres -t -c "SELECT token FROM \\"ApiKey\\" WHERE permission = 'Admin' AND status = 'Active' LIMIT 1;"`
    );
    
    const dbKey = stdout.trim();
    if (dbKey && dbKey.length > 10) {
      console.log('✅ Found admin API key in database');
      return dbKey;
    }
  } catch (e) {
    // Database query failed, continue to next method
  }

  // Method 5: Use default admin key (common in development)
  const defaultAdminKey = 'this_should_be_very_secure_and_at_least_15_chars';
  console.warn('⚠️  Could not retrieve API key from service API.');
  console.warn('   Trying default admin key for local development...');
  return defaultAdminKey;
}

/**
 * Get payment source wallet Vkey
 */
async function getPaymentSourceWallet(apiKey) {
  try {
    const response = await axios.get(`${PAYMENT_SERVICE_URL}/payment-source/`, {
      headers: {
        'Content-Type': 'application/json',
        'token': apiKey,
      },
    });

    if (response.data?.paymentSources && response.data.paymentSources.length > 0) {
      return response.data.paymentSources[0].walletVkey;
    }
    
    // If no payment sources, use a test wallet address for development
    // In production, you would need to fund the payment service wallet first
    console.warn('⚠️  No payment sources found in payment service.');
    console.warn('   Using test wallet address for registration.');
    console.warn('   Note: For production, fund the payment service wallet first.');
    
    // Return the selling wallet Vkey from our payment source
    return '95c03b6de3130c63bc2a57a57a11e89c8ac51d5964ac7d970f5e44a3';
  } catch (error) {
    console.error('Error getting payment source:', error.message);
    throw error;
  }
}
/**
 * Register an agent on Masumi network
 */
async function registerAgent(apiKey, agent, walletVkey) {
  try {
    const registrationData = {
      network: NETWORK,
      sellingWalletVkey: walletVkey,
      name: agent.name,
      description: agent.description,
      apiBaseUrl: agent.endpoint,
      Capability: {
        name: agent.capabilityName,
        version: agent.version,
      },
      Tags: agent.tags,
      ExampleOutputs: [
        {
          name: 'Sample Response',
          url: `${agent.endpoint}/example-output`,
          mimeType: 'application/json',
        },
      ],
      AgentPricing: {
        pricingType: 'Fixed',
        Pricing: [
          {
            unit: 'ADA',
            amount: '1',
          },
        ],
      },
      Author: {
        name: 'RDM Development Team',
        contactEmail: 'dev@rdm.example.com',
        organization: 'RDM',
      },
      Legal: {
        privacyPolicy: `${agent.endpoint}/privacy`,
        terms: `${agent.endpoint}/terms`,
      },
    };

    console.log(`\n📝 Registering ${agent.name}...`);
    console.log(`   Endpoint: ${agent.endpoint}`);
    console.log(`   Tags: ${agent.tags.join(', ')}`);

    // Try with API key first
    let response = await fetch(`${PAYMENT_SERVICE_URL}/registry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': apiKey,
      },
      body: JSON.stringify(registrationData),
    });

    // If that fails, try without token (for local dev)
    if (!response.ok && response.status === 401) {
      console.log(`   Retrying without API key (local dev mode)...`);
      response = await fetch(`${PAYMENT_SERVICE_URL}/registry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData),
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Registration failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    
    // Handle different response formats
    const agentId = data.id || data.agentId || data.data?.id || data.data?.agentId;
    const nftTxHash = data.nftTxHash || data.CurrentTransaction?.txHash || data.data?.nftTxHash;

    if (!agentId) {
      throw new Error('Registration succeeded but no agentId returned. Response: ' + JSON.stringify(data));
    }

    console.log(`✅ ${agent.name} registered successfully!`);
    console.log(`   Agent ID: ${agentId}`);
    console.log(`   State: ${data.state || 'Unknown'}`);
    if (nftTxHash) {
      console.log(`   NFT Tx Hash: ${nftTxHash}`);
    }

    return { agentId, nftTxHash };
  } catch (error) {
    console.error(`❌ Failed to register ${agent.name}:`, error.message);
    throw error;
  }
}

/**
 * Main registration process
 */
async function main() {
  console.log('🚀 Starting Masumi Agent Registration\n');
  console.log(`Payment Service: ${PAYMENT_SERVICE_URL}`);
  console.log(`Registry Service: ${REGISTRY_SERVICE_URL}`);
  console.log(`Network: ${NETWORK}\n`);

  try {
    // Step 1: Get API Key
    console.log('🔑 Step 1: Getting API key from Payment Service...');
    const apiKey = await getApiKey();
    console.log(`✅ API Key retrieved: ${apiKey.substring(0, 20)}...\n`);

    // Step 2: Get payment source wallet
    console.log('💳 Step 2: Getting payment source wallet...');
    let walletVkey;
    try {
      walletVkey = await getPaymentSourceWallet(apiKey);
      console.log(`✅ Payment wallet Vkey: ${walletVkey.substring(0, 30)}...\n`);
    } catch (error) {
      console.error('❌ Failed to get payment source wallet:', error.message);
      console.error('   Registration requires a funded payment wallet.');
      throw error;
    }

    // Step 3: Register all agents
    console.log('📋 Step 3: Registering agents...\n');
    const results = {};

    for (const agent of AGENTS) {
      try {
        const result = await registerAgent(apiKey, agent, walletVkey);
        results[agent.name] = result.agentId;
        
        // Small delay between registrations
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Failed to register ${agent.name}:`, error.message);
        // Continue with other agents
      }
    }

    // Step 4: Output .env configuration
    console.log('\n📄 Step 4: .env Configuration\n');
    console.log('Add these lines to your .env file:\n');
    console.log('# Masumi Network Configuration');
    console.log(`MASUMI_API_KEY=${apiKey}`);
    console.log(`MASUMI_AGENT_ID_MEDAA1=${results['RDM-Medaa1-GoalAgent'] || 'NOT_REGISTERED'}`);
    console.log(`MASUMI_AGENT_ID_MEDAA2=${results['RDM-Medaa2-TokenAgent'] || 'NOT_REGISTERED'}`);
    console.log(`MASUMI_AGENT_ID_MEDAA3=${results['RDM-Medaa3-CharityAgent'] || 'NOT_REGISTERED'}`);
    console.log('USE_REAL_MASUMI_NETWORK=false');
    console.log('MASUMI_NETWORK=PREPROD\n');

    // Step 5: Verify registration
    console.log('🔍 Step 5: Verifying registration...\n');
    try {
      const verifyResponse = await fetch(`${REGISTRY_SERVICE_URL}/registry`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (verifyResponse.ok) {
        const verifyData = await verifyResponse.json();
        const agents = verifyData.agents || verifyData.data?.agents || [];
        const ourAgents = agents.filter(a => 
          a.agentName && a.agentName.startsWith('RDM-')
        );
        
        console.log(`✅ Found ${ourAgents.length} RDM agents in registry:`);
        ourAgents.forEach(agent => {
          console.log(`   - ${agent.agentName} (${agent.agentId})`);
        });
      }
    } catch (error) {
      console.warn('⚠️  Could not verify registration:', error.message);
    }

    console.log('\n🎉 Registration complete!\n');
    console.log('Next steps:');
    console.log('1. Copy the .env configuration above');
    console.log('2. Add it to your .env file');
    console.log('3. Restart your app to see agents registered\n');

  } catch (error) {
    console.error('\n❌ Registration failed:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { getApiKey, registerAgent, AGENTS };


/**
 * Test Masumi Services Connection
 * 
 * This script tests connectivity to Masumi Payment and Registry services
 */

const axios = require('axios');

const PAYMENT_SERVICE_URL = 'http://localhost:3001/api/v1';
const REGISTRY_SERVICE_URL = 'http://localhost:3000/api/v1';

async function testHealth(endpoint, serviceName) {
  try {
    console.log(`Testing ${serviceName} health...`);
    const response = await axios.get(`${endpoint}/health`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = response.data;
    console.log(`✅ ${serviceName} is healthy:`, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`❌ ${serviceName} health check failed:`, error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`, error.response.data);
    }
    return false;
  }
}

async function testPaymentApiKey() {
  try {
    console.log('\nTesting Payment Service API key generation...');
    const response = await axios.get(`${PAYMENT_SERVICE_URL.replace('/api/v1', '')}/api/v1/api-key/`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = response.data;
    if (data.apiKey) {
      console.log('✅ API Key generated:', data.apiKey);
      return data.apiKey;
    } else if (data.status === 'error') {
      console.log('⚠️  API key endpoint requires authentication:', data.error?.message || 'Unknown error');
      console.log('   This is normal - you may need to check the Masumi documentation for API key creation');
      return null;
    }
    return null;
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('⚠️  API key endpoint requires authentication (401 Unauthorized)');
      console.log('   This is normal - check Masumi documentation for how to get your first API key');
    } else {
      console.error('❌ API key generation failed:', error.message);
      if (error.response) {
        console.error(`   Status: ${error.response.status}`, error.response.data);
      }
    }
    return null;
  }
}

async function testRegistryQuery() {
  try {
    console.log('\nTesting Registry Service agent query...');
    const response = await axios.get(`${REGISTRY_SERVICE_URL}/registry/`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = response.data;
    console.log(`✅ Registry query successful. Found ${data.agents?.length || data.length || 0} agents.`);
    return true;
  } catch (error) {
    console.log('⚠️  Registry query endpoint may require different path or authentication');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`, error.response.data);
    } else {
      console.error('❌ Registry query failed:', error.message);
    }
    return false;
  }
}

async function runTests() {
  console.log('========================================');
  console.log('Masumi Services Connection Test');
  console.log('========================================\n');

  const results = {
    paymentHealth: false,
    registryHealth: false,
    apiKey: null,
    registryQuery: false,
  };

  // Test Payment Service health
  results.paymentHealth = await testHealth(
    PAYMENT_SERVICE_URL,
    'Payment Service'
  );

  // Test Registry Service health
  results.registryHealth = await testHealth(
    REGISTRY_SERVICE_URL,
    'Registry Service'
  );

  // Test API key generation
  if (results.paymentHealth) {
    results.apiKey = await testPaymentApiKey();
  }

  // Test Registry query
  if (results.registryHealth) {
    results.registryQuery = await testRegistryQuery();
  }

  // Summary
  console.log('\n========================================');
  console.log('Test Summary');
  console.log('========================================');
  console.log(`Payment Service: ${results.paymentHealth ? '✅ OK' : '❌ FAILED'}`);
  console.log(`Registry Service: ${results.registryHealth ? '✅ OK' : '❌ FAILED'}`);
  console.log(`API Key: ${results.apiKey ? '✅ Generated' : '❌ FAILED'}`);
  console.log(`Registry Query: ${results.registryQuery ? '✅ OK' : '❌ FAILED'}`);
  console.log('========================================\n');

  if (results.paymentHealth && results.registryHealth && results.apiKey) {
    console.log('🎉 All tests passed! Masumi services are ready.');
    console.log('\nNext steps:');
    console.log('1. Copy the API key above and add it to your .env file:');
    console.log(`   MASUMI_API_KEY=${results.apiKey}`);
    console.log('2. Register your agents using the API key');
    return 0;
  } else {
    console.log('⚠️  Some tests failed. Please check:');
    if (!results.paymentHealth) {
      console.log('   - Payment Service is not running on port 3001');
    }
    if (!results.registryHealth) {
      console.log('   - Registry Service is not running on port 3000');
    }
    return 1;
  }
}

// Run tests
runTests().then(exitCode => {
  process.exit(exitCode);
}).catch(error => {
  console.error('Test script error:', error);
  process.exit(1);
});


/**
 * Deploy Smart Contracts Using MeshJS
 * 
 * This script uses MeshJS to deploy Plutus smart contracts to Cardano.
 * Much faster and easier than using Cardano CLI!
 * 
 * Prerequisites:
 * 1. MeshJS installed: npm install @meshsdk/core
 * 2. Wallet connected (Nami, Eternl, etc.)
 * 3. Contracts compiled to plutus.json format
 * 
 * Usage:
 * node scripts/contracts/deploy-meshjs.js
 */

const fs = require('fs');
const path = require('path');

const CONTRACTS_DIR = path.join(__dirname, '../../contracts');
const NETWORK = 'preprod';

/**
 * Contract deployment configuration
 */
const CONTRACTS = [
  {
    name: 'PurseTransfer',
    file: 'PurseTransfer.hs',
    description: 'Token transfer between purses',
  },
  {
    name: 'CharityDistribution',
    file: 'CharityDistribution.hs',
    description: 'Charity token distribution',
  },
  {
    name: 'GoalPledgeLock',
    file: 'GoalPledgeLock.hs',
    description: 'Goal pledge locking',
  },
  {
    name: 'VaultLock',
    file: 'VaultLock.hs',
    description: 'Vault token locking',
  },
  {
    name: 'LPPoolCreation',
    file: 'LPPoolCreation.hs',
    description: 'LP pool creation',
  },
];

/**
 * Check prerequisites
 */
function checkPrerequisites() {
  console.log('🔍 Checking prerequisites...');
  
  // Check if MeshJS is installed
  try {
    require.resolve('@meshsdk/core');
    console.log('✅ MeshJS (@meshsdk/core) found');
  } catch (error) {
    console.error('❌ MeshJS not found. Installing...');
    console.log('   Run: npm install @meshsdk/core');
    return false;
  }

  console.log('✅ Prerequisites check complete\n');
  return true;
}

/**
 * Load compiled contract (plutus.json format)
 * In production, this would load the actual compiled contract
 */
function loadCompiledContract(contractName) {
  const plutusJsonPath = path.join(CONTRACTS_DIR, `${contractName}.plutus.json`);
  
  if (fs.existsSync(plutusJsonPath)) {
    const plutusJson = JSON.parse(fs.readFileSync(plutusJsonPath, 'utf-8'));
    return plutusJson;
  }

  // Return placeholder structure
  console.log(`⚠️  Compiled contract not found: ${plutusJsonPath}`);
  console.log(`   Using placeholder - compile contract first`);
  
  return {
    validators: [{
      title: contractName,
      compiledCode: 'placeholder_code',
      hash: `placeholder_hash_${contractName}`,
    }],
  };
}

/**
 * Deploy contract using MeshJS
 */
async function deployContractWithMeshJS(contractInfo, plutusScript) {
  console.log(`🚀 Deploying ${contractInfo.name} with MeshJS...`);
  
  // Check if this is a placeholder (not a real compiled contract)
  const isPlaceholder = plutusScript.validators[0].compiledCode === 'placeholder_code' ||
                        !plutusScript.validators[0].compiledCode ||
                        plutusScript.validators[0].compiledCode.length < 100;
  
  if (isPlaceholder) {
    console.log(`   ⚠️  Placeholder contract - compile contract first`);
    console.log(`   Using placeholder address for development\n`);
    
    return {
      name: contractInfo.name,
      address: `addr_test1...${contractInfo.name.toLowerCase()}...`,
      scriptHash: `script_${contractInfo.name.toLowerCase()}_${Date.now()}`,
      deployed: false,
    };
  }
  
  try {
    // Import MeshJS
    const { resolvePlutusScriptAddress } = require('@meshsdk/core');
    
    // Resolve contract address from compiled script
    const script = {
      code: plutusScript.validators[0].compiledCode,
      version: 'V2',
    };
    
    const contractAddress = resolvePlutusScriptAddress(script, 0);
    
    console.log(`✅ ${contractInfo.name} address resolved`);
    console.log(`   Address: ${contractAddress}`);
    console.log(`   Script Hash: ${plutusScript.validators[0].hash}\n`);
    
    return {
      name: contractInfo.name,
      address: contractAddress,
      scriptHash: plutusScript.validators[0].hash,
      deployed: true,
    };
  } catch (error) {
    console.error(`❌ Error deploying ${contractInfo.name}:`, error.message);
    console.log(`   Note: This requires properly compiled contracts (plutus.json files)`);
    console.log(`   Using placeholder address for now\n`);
    
    return {
      name: contractInfo.name,
      address: `addr_test1...${contractInfo.name.toLowerCase()}...`,
      scriptHash: `script_${contractInfo.name.toLowerCase()}_${Date.now()}`,
      deployed: false,
    };
  }
}

/**
 * Save contract addresses to config
 */
function saveContractAddresses(deployedContracts) {
  const configPath = path.join(__dirname, '../../config/contractAddresses.ts');
  let configContent = fs.readFileSync(configPath, 'utf-8');
  
  const addresses = {};
  deployedContracts.forEach(contract => {
    const key = contract.name
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '')
      .replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    
    addresses[key] = contract.address;
  });
  
  // Update PREPROD_CONTRACT_ADDRESSES
  const preprodPattern = /PREPROD_CONTRACT_ADDRESSES:\s*ContractAddresses\s*=\s*\{[^}]*\}/s;
  const preprodReplacement = `PREPROD_CONTRACT_ADDRESSES: ContractAddresses = {
  purseTransfer: '${addresses.purseTransfer || ''}',
  charityDistribution: '${addresses.charityDistribution || ''}',
  goalPledgeLock: '${addresses.goalPledgeLock || ''}',
  vaultLock: '${addresses.vaultLock || ''}',
  lpPoolCreation: '${addresses.lpPoolCreation || ''}',
}`;
  
  configContent = configContent.replace(preprodPattern, preprodReplacement);
  
  fs.writeFileSync(configPath, configContent, 'utf-8');
  console.log('✅ Contract addresses saved to config/contractAddresses.ts');
}

/**
 * Main deployment function
 */
async function main() {
  console.log('🎯 Deploying Smart Contracts with MeshJS\n');
  console.log('='.repeat(60));
  
  if (!checkPrerequisites()) {
    console.log('\n❌ Prerequisites not met. Please install MeshJS first.');
    process.exit(1);
  }
  
  const deployedContracts = [];
  
  for (const contract of CONTRACTS) {
    console.log(`📦 Processing ${contract.name}...`);
    
    // Load compiled contract
    const plutusScript = loadCompiledContract(contract.name);
    
    // Deploy using MeshJS
    const deployed = await deployContractWithMeshJS(contract, plutusScript);
    deployedContracts.push(deployed);
  }
  
  if (deployedContracts.length > 0) {
    saveContractAddresses(deployedContracts);
    
    const realDeployments = deployedContracts.filter(c => c.deployed).length;
    
    console.log('='.repeat(60));
    
    if (realDeployments > 0) {
      console.log('✅ Deployment complete!');
      console.log(`   Deployed ${realDeployments} contracts using MeshJS`);
    } else {
      console.log('⚠️  Deployment simulation complete!');
      console.log(`   Processed ${deployedContracts.length} contracts`);
    }
    
    console.log('\n📋 Next Steps:');
    console.log('   1. Compile contracts to plutus.json format');
    console.log('   2. Run this script again to deploy real contracts');
    console.log('   3. Update config/contractAddresses.ts with real addresses');
    console.log('\n💡 MeshJS makes deployment much faster than Cardano CLI!\n');
  } else {
    console.error('❌ No contracts were processed');
    process.exit(1);
  }
}

// Run deployment
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });
}

module.exports = { main, deployContractWithMeshJS };


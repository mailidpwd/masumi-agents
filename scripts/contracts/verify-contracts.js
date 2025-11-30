/**
 * Verify Smart Contracts Setup
 * 
 * This script verifies that all smart contract files are in place
 * and the system is ready for compilation and deployment.
 */

const fs = require('fs');
const path = require('path');

const CONTRACTS_DIR = path.join(__dirname, '../../contracts');
const SERVICES_DIR = path.join(__dirname, '../../services');
const CONFIG_DIR = path.join(__dirname, '../../config');

const REQUIRED_CONTRACTS = [
  'PurseTransfer.hs',
  'CharityDistribution.hs',
  'GoalPledgeLock.hs',
  'VaultLock.hs',
  'LPPoolCreation.hs',
];

const REQUIRED_SERVICES = [
  'plutusSmartContract.ts',
  'cardanoTransactionBuilder.ts',
];

const REQUIRED_CONFIG = [
  'contractAddresses.ts',
];

console.log('🔍 Verifying Smart Contracts Setup\n');
console.log('='.repeat(60));

let allGood = true;

// Check contract files
console.log('\n📄 Checking Plutus Contract Files:');
REQUIRED_CONTRACTS.forEach(contract => {
  const filePath = path.join(CONTRACTS_DIR, contract);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`  ✅ ${contract} (${stats.size} bytes)`);
  } else {
    console.log(`  ❌ ${contract} - MISSING`);
    allGood = false;
  }
});

// Check service files
console.log('\n🔧 Checking TypeScript Service Files:');
REQUIRED_SERVICES.forEach(service => {
  const filePath = path.join(SERVICES_DIR, service);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`  ✅ ${service} (${stats.size} bytes)`);
  } else {
    console.log(`  ❌ ${service} - MISSING`);
    allGood = false;
  }
});

// Check config files
console.log('\n⚙️  Checking Configuration Files:');
REQUIRED_CONFIG.forEach(config => {
  const filePath = path.join(CONFIG_DIR, config);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`  ✅ ${config} (${stats.size} bytes)`);
  } else {
    console.log(`  ❌ ${config} - MISSING`);
    allGood = false;
  }
});

// Check README
console.log('\n📖 Checking Documentation:');
const readmePath = path.join(CONTRACTS_DIR, 'README.md');
if (fs.existsSync(readmePath)) {
  console.log(`  ✅ README.md exists`);
} else {
  console.log(`  ⚠️  README.md - MISSING (optional)`);
}

// Check deployment scripts
console.log('\n🚀 Checking Deployment Scripts:');
const deployScript = path.join(__dirname, 'deploy-testnet.js');
const compileScript = path.join(__dirname, 'compile-contracts.sh');
if (fs.existsSync(deployScript)) {
  console.log(`  ✅ deploy-testnet.js exists`);
} else {
  console.log(`  ❌ deploy-testnet.js - MISSING`);
  allGood = false;
}
if (fs.existsSync(compileScript)) {
  console.log(`  ✅ compile-contracts.sh exists`);
} else {
  console.log(`  ⚠️  compile-contracts.sh - MISSING (optional)`);
}

// Summary
console.log('\n' + '='.repeat(60));
if (allGood) {
  console.log('✅ All required files are in place!');
  console.log('\n📋 Next Steps:');
  console.log('  1. Compile contracts: ./scripts/contracts/compile-contracts.sh');
  console.log('  2. Deploy to testnet: node scripts/contracts/deploy-testnet.js');
  console.log('  3. Update contract addresses in config/contractAddresses.ts');
  console.log('  4. Test contract interactions');
  console.log('\n✨ System is ready for contract deployment!\n');
  process.exit(0);
} else {
  console.log('❌ Some required files are missing!');
  console.log('   Please ensure all contract files are created.\n');
  process.exit(1);
}


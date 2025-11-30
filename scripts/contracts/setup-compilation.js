/**
 * Setup Contract Compilation Environment
 * 
 * This script helps set up the environment for compiling Plutus contracts.
 * It checks for required tools and provides installation instructions.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Setting Up Contract Compilation Environment\n');
console.log('='.repeat(60));

// Check for compilation tools
const tools = {
  aiken: { command: 'aiken --version', name: 'Aiken', recommended: true },
  cabal: { command: 'cabal --version', name: 'Cabal', recommended: false },
  nix: { command: 'nix --version', name: 'Nix', recommended: false },
};

console.log('\n📦 Checking Compilation Tools:\n');

const availableTools = [];
const missingTools = [];

for (const [key, tool] of Object.entries(tools)) {
  try {
    execSync(tool.command, { stdio: 'ignore' });
    console.log(`  ✅ ${tool.name} found`);
    availableTools.push(key);
  } catch (error) {
    console.log(`  ❌ ${tool.name} not found`);
    missingTools.push({ key, ...tool });
  }
}

console.log('\n' + '='.repeat(60));

if (availableTools.length === 0) {
  console.log('\n⚠️  No compilation tools found!\n');
  console.log('📋 Recommended: Install Aiken (easiest option)\n');
  console.log('   Install Aiken:');
  console.log('   curl -L https://github.com/aiken-lang/aiken/releases/latest/download/aiken-x86_64-pc-windows-msvc.zip -o aiken.zip');
  console.log('   unzip aiken.zip');
  console.log('   Add to PATH\n');
  
  console.log('   OR use Docker:');
  console.log('   docker run -it --rm aikenlang/aiken:latest\n');
  
  console.log('📚 Alternative: Use Plutus tools (more complex)');
  console.log('   See: docs/CARDANO_CLI_SETUP.md\n');
} else {
  console.log('\n✅ Compilation tools available!\n');
  
  if (availableTools.includes('aiken')) {
    console.log('🎯 Using Aiken for compilation\n');
    console.log('📝 To compile contracts:');
    console.log('   1. Create aiken project: aiken new contracts');
    console.log('   2. Copy .hs files to contracts/validators/');
    console.log('   3. Build: aiken build');
    console.log('   4. Output will be in build/ directory\n');
  }
}

// Check contract files
console.log('📄 Checking Contract Files:\n');
const contractsDir = path.join(__dirname, '../../contracts');
const contractFiles = [
  'PurseTransfer.hs',
  'CharityDistribution.hs',
  'GoalPledgeLock.hs',
  'VaultLock.hs',
  'LPPoolCreation.hs',
];

contractFiles.forEach(file => {
  const filePath = path.join(contractsDir, file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - MISSING`);
  }
});

// Check plutus.json files
console.log('\n📦 Checking Compiled Contracts:\n');
contractFiles.forEach(file => {
  const jsonFile = file.replace('.hs', '.plutus.json');
  const jsonPath = path.join(contractsDir, jsonFile);
  if (fs.existsSync(jsonPath)) {
    const content = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    const isPlaceholder = content.validators[0].compiledCode === '4e4d0100ff0000' ||
                          content.validators[0].compiledCode.length < 100;
    if (isPlaceholder) {
      console.log(`  ⚠️  ${jsonFile} - Placeholder (needs compilation)`);
    } else {
      console.log(`  ✅ ${jsonFile} - Compiled`);
    }
  } else {
    console.log(`  ❌ ${jsonFile} - MISSING`);
  }
});

console.log('\n' + '='.repeat(60));
console.log('\n📋 Next Steps:\n');

if (availableTools.length > 0) {
  console.log('1. Compile contracts using available tools');
  console.log('2. Replace placeholder plutus.json files with compiled versions');
  console.log('3. Run: node scripts/contracts/deploy-meshjs.js');
} else {
  console.log('1. Install Aiken or Plutus compilation tools');
  console.log('2. Compile contracts');
  console.log('3. Run: node scripts/contracts/deploy-meshjs.js');
}

console.log('\n💡 Tip: MeshJS will automatically use compiled contracts when available!\n');


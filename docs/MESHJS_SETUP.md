# MeshJS Setup and Deployment Guide

MeshJS is a TypeScript SDK that makes Cardano development much easier and faster than using Cardano CLI. This guide shows how to use MeshJS for smart contract deployment.

## ✅ Why MeshJS?

- **Faster**: No need to install Cardano CLI (which can take days)
- **TypeScript Native**: Built for TypeScript/JavaScript projects
- **Simpler API**: Easy-to-use transaction building
- **Wallet Integration**: Built-in support for Cardano wallets
- **React Native Compatible**: Works with React Native apps

## 📦 Installation

MeshJS is already installed in this project:

```bash
npm install @meshsdk/core
```

✅ **Status**: Installed and ready to use!

## 🚀 Quick Start

### 1. Deploy Contracts with MeshJS

```bash
node scripts/contracts/deploy-meshjs.js
```

This script:
- Checks if MeshJS is installed
- Loads compiled contracts (plutus.json format)
- Resolves contract addresses
- Saves addresses to config

### 2. Use MeshJS in Your Code

```typescript
import { Transaction, resolvePlutusScriptAddress } from '@meshsdk/core';
import { MeshTransactionBuilder } from './services/meshTransactionBuilder';

// Initialize builder
const meshBuilder = new MeshTransactionBuilder(tokenService);

// Build transaction
const txRequest = await meshBuilder.buildTransferTransaction(
  PurseType.BASE,
  PurseType.REWARD,
  { ada: 10 }
);

// Build with MeshJS (requires wallet)
const unsignedTx = await meshBuilder.buildMeshTransaction(txRequest, wallet);
```

## 📋 Contract Deployment Workflow

### Step 1: Compile Contracts

First, compile your Plutus contracts to `plutus.json` format:

```bash
# Using Aiken (recommended)
aiken build

# Or using Plutus tools
cabal build contracts
```

This generates `plutus.json` files for each contract.

### Step 2: Deploy with MeshJS

```bash
node scripts/contracts/deploy-meshjs.js
```

The script will:
1. Load compiled contracts from `contracts/*.plutus.json`
2. Resolve contract addresses using MeshJS
3. Save addresses to `config/contractAddresses.ts`

### Step 3: Use Contracts

Once deployed, the system automatically uses real contracts:

```typescript
// System automatically uses MeshJS when contracts are deployed
const services = getRDMServices();
const tx = await services.smartContractService.transferTokens(
  PurseType.BASE,
  PurseType.REWARD,
  { ada: 10 }
);
```

## 🔧 Integration

### MeshJS Transaction Builder

The `MeshTransactionBuilder` service provides:

- `buildTransferTransaction()` - Build purse-to-purse transfers
- `buildCharityDistributionTransaction()` - Build charity distributions
- `buildGoalPledgeLockTransaction()` - Build goal pledge locks
- `buildVaultLockTransaction()` - Build vault locks
- `buildLPPoolCreationTransaction()` - Build LP pool creation
- `buildMeshTransaction()` - Build transaction using MeshJS
- `resolveContractAddress()` - Resolve contract address from script

### Automatic Fallback

The system automatically:
- Uses **MeshJS** when contracts are deployed
- Falls back to **mock contracts** for development
- No code changes needed!

## 📝 Example: Deploy a Contract

```typescript
import { resolvePlutusScriptAddress } from '@meshsdk/core';
import plutusScript from './contracts/PurseTransfer.plutus.json';

// Resolve contract address
const script = {
  code: plutusScript.validators[0].compiledCode,
  version: 'V2',
};
const contractAddress = resolvePlutusScriptAddress(script, 0);

console.log('Contract Address:', contractAddress);
```

## 🔐 Wallet Integration

MeshJS supports multiple wallet types:

- **Browser Wallets**: Nami, Eternl, Flint
- **Mobile Wallets**: Via wallet connect
- **Hardware Wallets**: Ledger, Trezor

Example with wallet:

```typescript
import { Transaction } from '@meshsdk/core';

// Connect wallet (in browser)
const wallet = await window.cardano.nami.enable();

// Build transaction
const tx = new Transaction({ initiator: wallet })
  .sendLovelace(contractAddress, '10000000')
  .setMetadata({ type: 'goal_pledge' });

// Sign and submit
const unsignedTx = await tx.build();
const signedTx = await wallet.signTx(unsignedTx);
const txHash = await wallet.submitTx(signedTx);
```

## 🎯 Benefits Over Cardano CLI

| Feature | Cardano CLI | MeshJS |
|---------|-------------|--------|
| Installation | Days (complex) | Minutes (npm install) |
| TypeScript | No | Yes |
| Transaction Building | Complex | Simple API |
| Wallet Integration | Manual | Built-in |
| React Native | No | Yes |
| Development Speed | Slow | Fast |

## 📚 Resources

- **MeshJS Documentation**: https://meshjs.dev/
- **MeshJS GitHub**: https://github.com/MeshJS/mesh
- **Cardano Developer Portal**: https://developers.cardano.org/
- **Aiken (Smart Contract Language)**: https://aiken-lang.org/

## ⚠️ Important Notes

1. **Contract Compilation**: Contracts must be compiled to `plutus.json` format first
2. **Wallet Required**: For transaction building, a wallet instance is needed
3. **Network**: MeshJS automatically detects network from wallet
4. **Fallback**: System uses mock contracts if real contracts aren't deployed

## 🚀 Next Steps

1. **Compile Contracts**: Use Aiken or Plutus tools to compile contracts
2. **Deploy**: Run `node scripts/contracts/deploy-meshjs.js`
3. **Test**: Test contract interactions
4. **Update Config**: Verify addresses in `config/contractAddresses.ts`

---

**Status**: ✅ MeshJS installed and ready!
**Deployment**: Use `node scripts/contracts/deploy-meshjs.js`


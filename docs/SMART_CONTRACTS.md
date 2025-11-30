# Smart Contracts Implementation Guide

This document describes the smart contract implementation for the RDM ecosystem on Cardano.

## Overview

The RDM ecosystem uses Plutus smart contracts on Cardano to handle:
- Token transfers between purses
- Charity distributions
- Goal pledge locking/unlocking
- Vault locking/unlocking
- Liquidity pool creation and management

## Architecture

### Contract Structure

```
contracts/
├── PurseTransfer.hs          # Token transfers between purses
├── CharityDistribution.hs    # Charity token distributions
├── GoalPledgeLock.hs         # Goal pledge locking
├── VaultLock.hs               # Vault token locking
├── LPPoolCreation.hs          # LP pool creation
└── README.md                  # Contract documentation

services/
├── plutusSmartContract.ts     # Real contract service (with mock fallback)
├── cardanoTransactionBuilder.ts  # Transaction building
└── mockSmartContract.ts       # Mock service (fallback)

config/
└── contractAddresses.ts       # Deployed contract addresses

scripts/contracts/
├── deploy-testnet.js         # Deployment script
└── compile-contracts.sh      # Compilation script
```

## Contract Details

### 1. PurseTransfer Contract

**Purpose**: Transfer tokens between purses (BASE, REWARD, REMORSE, CHARITY)

**Parameters**:
- `fromPurse`: Source purse type
- `toPurse`: Destination purse type
- `amount`: Token amount (ADA + optional RDM tokens)
- `goalId`: Optional goal ID for tracking

**Usage**:
- Called when goal completes (BASE → REWARD/REMORSE)
- Called for charity distributions (REWARD/REMORSE → CHARITY)

**File**: `contracts/PurseTransfer.hs`

### 2. CharityDistribution Contract

**Purpose**: Distribute tokens from charity purse to external charity addresses

**Parameters**:
- `fromPurse`: Charity purse address
- `toAddress`: Charity recipient address
- `amount`: Token amount
- `charityId`: Charity identifier
- `goalId`: Optional goal ID

**Usage**:
- Called by Medaa3Agent when charity threshold is met

**File**: `contracts/CharityDistribution.hs`

### 3. GoalPledgeLock Contract

**Purpose**: Lock pledged tokens when a goal is created

**Parameters**:
- `goalId`: Goal identifier
- `userId`: User identifier
- `pledgedAmount`: Amount to lock
- `lockUntil`: Target date for goal

**Operations**:
- `LockPledge`: Lock tokens
- `UnlockPledge`: Unlock after completion
- `CancelPledge`: Cancel before lock period

**File**: `contracts/GoalPledgeLock.hs`

### 4. VaultLock Contract

**Purpose**: Lock tokens in vaults (personal, generational, institutional)

**Parameters**:
- `vaultId`: Vault identifier
- `creatorId`: Creator identifier
- `beneficiaryId`: Beneficiary identifier
- `vaultType`: Type of vault
- `lockedAmount`: Amount to lock
- `lockDuration`: Duration in years
- `lockEndDate`: End date for lock

**Operations**:
- `LockVault`: Lock tokens
- `UnlockVault`: Full unlock
- `PartialUnlock`: Partial unlock based on milestones

**File**: `contracts/VaultLock.hs`

### 5. LPPoolCreation Contract

**Purpose**: Create liquidity pool pairs (RDM + HabitNFT)

**Parameters**:
- `poolId`: Pool identifier
- `creatorId`: Creator identifier
- `creatorRating`: Creator rating (must be >= 7.5)
- `habitNFTId`: Habit NFT identifier
- `initialStake`: Initial RDM stake
- `totalShares`: Initial shares (1M = 1 LP token)

**Operations**:
- `CreatePool`: Create new pool
- `ClosePool`: Close existing pool
- `UpdatePool`: Update pool parameters

**File**: `contracts/LPPoolCreation.hs`

## Service Integration

### PlutusSmartContractService

The `PlutusSmartContractService` provides a unified interface for smart contract interactions:

```typescript
import { PlutusSmartContractService } from './services/plutusSmartContract';
import { TokenService } from './services/tokenService';

const tokenService = new TokenService();
const contractService = new PlutusSmartContractService(tokenService);

// Transfer tokens
const transaction = await contractService.transferTokens(
  PurseType.BASE,
  PurseType.REWARD,
  { ada: 10, rdmTokens: 0 },
  'goal_123'
);
```

**Features**:
- Automatic fallback to mock contracts if real contracts not deployed
- Transaction building and submission
- Transaction confirmation polling
- Error handling and retry logic

### CardanoTransactionBuilder

The `CardanoTransactionBuilder` constructs Cardano transactions:

```typescript
import { CardanoTransactionBuilder } from './services/cardanoTransactionBuilder';

const builder = new CardanoTransactionBuilder(tokenService);

const txRequest = await builder.buildTransferTransaction(
  PurseType.BASE,
  PurseType.REWARD,
  { ada: 10 },
  'goal_123'
);
```

## Deployment

### Prerequisites

1. **Cardano CLI**: Install and configure
2. **Plutus Tools**: Cabal, Nix, Plutus dependencies
3. **Testnet Wallet**: Wallet with test ADA for fees
4. **Network Access**: Access to Cardano PreProd testnet

### Deployment Steps

1. **Compile Contracts**:
   ```bash
   ./scripts/contracts/compile-contracts.sh
   ```

2. **Deploy to Testnet**:
   ```bash
   node scripts/contracts/deploy-testnet.js
   ```

3. **Update Contract Addresses**:
   After deployment, update `config/contractAddresses.ts` with the deployed contract addresses:
   ```typescript
   export const PREPROD_CONTRACT_ADDRESSES: ContractAddresses = {
     purseTransfer: 'addr_test1...',
     charityDistribution: 'addr_test1...',
     goalPledgeLock: 'addr_test1...',
     vaultLock: 'addr_test1...',
     lpPoolCreation: 'addr_test1...',
   };
   ```

4. **Verify Deployment**:
   - Check contract addresses on Cardano testnet explorer
   - Test contract interactions
   - Verify transaction confirmations

## Configuration

### Contract Addresses

Contract addresses are stored in `config/contractAddresses.ts`:

```typescript
import { getContractAddresses, areContractsDeployed } from '../config/contractAddresses';

const network = 'preprod';
const addresses = getContractAddresses(network);
const deployed = areContractsDeployed(network);
```

### Network Configuration

The system automatically detects the network from the connected wallet:
- **PreProd**: Testnet (default for development)
- **Mainnet**: Production network

## Fallback Mechanism

The system includes a safe fallback mechanism:

1. **Real Contracts**: If contracts are deployed and wallet is connected, uses real Plutus contracts
2. **Mock Contracts**: If contracts not deployed or wallet not connected, falls back to mock contracts

This ensures:
- Development can continue without deployed contracts
- Production automatically uses real contracts when available
- No breaking changes during development

## Testing

### Test Contract Interactions

```typescript
// Test transfer
const tx = await contractService.transferTokens(
  PurseType.BASE,
  PurseType.REWARD,
  { ada: 1 }
);

// Wait for confirmation
await contractService.waitForConfirmation(tx.id, 30000);

// Check transaction status
const status = contractService.getTransaction(tx.id);
```

### Test on Testnet

1. Deploy contracts to PreProd testnet
2. Test all contract functions
3. Verify transaction confirmations
4. Check gas costs and execution times
5. Test error scenarios

## Security Considerations

### Current Implementation

- ✅ Amount validation (positive amounts only)
- ✅ Address validation
- ✅ Time-based validation (prevent replay attacks)
- ⚠️ Signature validation (simplified - needs proper cryptography)
- ⚠️ Authorization checks (simplified - needs proper implementation)

### Production Requirements

Before mainnet deployment:

1. **Cryptographic Signatures**: Implement proper signature verification
2. **Authorization**: Add proper authorization checks
3. **Gas Optimization**: Optimize contract code for gas efficiency
4. **Audit**: Professional security audit
5. **Testing**: Comprehensive test coverage
6. **Error Handling**: Robust error handling and recovery
7. **Monitoring**: Transaction monitoring and alerting

## Troubleshooting

### Contracts Not Deployed

**Symptom**: System uses mock contracts instead of real contracts

**Solution**:
1. Check `config/contractAddresses.ts` - addresses should be set
2. Verify wallet is connected
3. Check network matches contract deployment network
4. Verify `areContractsDeployed()` returns true

### Transaction Failures

**Symptom**: Transactions fail to submit

**Solution**:
1. Check wallet has sufficient ADA for fees
2. Verify contract addresses are correct
3. Check network connectivity
4. Review transaction parameters
5. Check contract validation logic

### Compilation Errors

**Symptom**: Contracts fail to compile

**Solution**:
1. Verify Plutus tools are installed
2. Check contract syntax
3. Verify dependencies are available
4. Review compilation logs

## Next Steps

1. **Compile Contracts**: Use Plutus tools to compile contracts
2. **Deploy to Testnet**: Deploy contracts to PreProd testnet
3. **Update Addresses**: Update contract addresses in config
4. **Test Integration**: Test all contract interactions
5. **Optimize**: Optimize contracts for gas efficiency
6. **Audit**: Professional security audit
7. **Mainnet**: Deploy to mainnet after testing

## Support

For issues or questions:
- Check contract logs in console
- Review transaction hashes on Cardano explorer
- Check `config/contractAddresses.ts` for correct addresses
- Verify wallet connection and network

## References

- [Plutus Documentation](https://plutus.readthedocs.io/)
- [Cardano Developer Portal](https://developers.cardano.org/)
- [Plutus Playground](https://playground.plutus.iohkdev.io/)


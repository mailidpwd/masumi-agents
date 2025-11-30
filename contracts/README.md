# Plutus Smart Contracts for RDM Ecosystem

This directory contains Plutus smart contracts for the Cardano RDM (Reward, Disincentive, Motivation) ecosystem.

## Contract Files

### 1. PurseTransfer.hs
**Purpose**: Transfer tokens between purses (BASE, REWARD, REMORSE, CHARITY)

**Functions**:
- `validateTransfer`: Validates token transfers between purses
- Supports ADA and RDM token transfers
- Includes goal ID tracking for audit trail

**Usage**:
- Called when goal completes (BASE → REWARD/REMORSE)
- Called for charity distributions (REWARD/REMORSE → CHARITY)

### 2. CharityDistribution.hs
**Purpose**: Distribute tokens from charity purse to external charity addresses

**Functions**:
- `validateCharityDistribution`: Validates charity token distributions
- Validates recipient address
- Includes timestamp validation to prevent replay attacks

**Usage**:
- Called by Medaa3Agent when charity threshold is met
- Distributes tokens to configured charity addresses

### 3. GoalPledgeLock.hs
**Purpose**: Lock pledged tokens when a goal is created

**Functions**:
- `validateGoalPledge`: Validates goal pledge locking/unlocking
- Supports lock, unlock, and cancel operations
- Time-based validation for lock periods

**Usage**:
- Called when user creates a goal (locks pledge)
- Called when goal completes (unlocks and distributes)

### 4. VaultLock.hs
**Purpose**: Lock tokens in vaults (personal, generational, institutional)

**Functions**:
- `validateVaultLock`: Validates vault locking/unlocking
- Supports full and partial unlocks
- Validates minimum lock amounts and durations

**Usage**:
- Called when user creates a vault
- Called when vault is unlocked (full or partial)

### 5. LPPoolCreation.hs
**Purpose**: Create liquidity pool pairs (RDM + HabitNFT)

**Functions**:
- `validateLPPool`: Validates LP pool creation
- Validates creator rating threshold (7.5 minimum)
- Manages pool shares and initial stake

**Usage**:
- Called when high-rating user creates LP pool
- Validates NFT qualification and rating requirements

## Compilation

These contracts need to be compiled using Plutus tools:

```bash
# Install Plutus dependencies
cabal update
cabal install plutus-tx plutus-ledger-api

# Compile contracts
cabal build contracts
```

Or use the provided script:
```bash
./scripts/contracts/compile-contracts.sh
```

## Deployment

Contracts are deployed using the deployment scripts in `scripts/contracts/`:

1. Compile contracts to Plutus script
2. Calculate script hash
3. Deploy to Cardano testnet/mainnet
4. Store contract addresses in configuration

**Deploy to testnet**:
```bash
node scripts/contracts/deploy-testnet.js
```

After deployment, update `config/contractAddresses.ts` with the deployed addresses.

## Security Considerations

- All contracts include:
  - Signature validation (to be implemented with proper cryptography)
  - Amount validation (positive amounts only)
  - Time-based validation (prevent replay attacks)
  - Address validation (correct recipient addresses)

- **Important**: These are simplified contracts for development. Production contracts should include:
  - Proper cryptographic signature verification
  - More comprehensive validation logic
  - Gas optimization
  - Comprehensive error handling
  - Audit trail and logging

## Integration

Contracts are integrated via:
- `services/plutusSmartContract.ts` - TypeScript service wrapper
- `services/cardanoTransactionBuilder.ts` - Transaction building
- Contract addresses stored in `config/contractAddresses.ts`

The system automatically uses real contracts when deployed, or falls back to mock contracts for development.

## Testing

Test contracts on Cardano testnet before mainnet deployment:
- Use `scripts/contracts/deploy-testnet.js` for testnet deployment
- Test all contract functions thoroughly
- Verify gas costs and execution times
- Check transaction confirmations on Cardano explorer

## Current Status

✅ All contract files created
✅ TypeScript services integrated
✅ Safe fallback mechanism implemented
✅ Deployment scripts ready
⏳ Contracts ready for compilation and deployment


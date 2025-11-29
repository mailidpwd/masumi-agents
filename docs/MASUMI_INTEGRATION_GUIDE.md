# Masumi Integration Guide

## Current Architecture (Backend Flow)

Our agents are structured exactly like real-world agent systems work:

### How Agents Work in Real Life (Like We Built):

1. **Decentralized Agent Network**
   - Each agent (Medaa1, Medaa2, Medaa3) is an independent service
   - Agents register themselves with the network
   - Agents communicate via events (pub/sub pattern)
   - No direct agent-to-agent dependencies

2. **Event-Driven Architecture**
   - Agents publish events when something happens
   - Other agents subscribe to events they care about
   - This is exactly how Masumi agents work in production
   - Events are immutable and logged (like blockchain transactions)

3. **State Management**
   - Each agent maintains its own state
   - State can be persisted to blockchain (in real Masumi)
   - Agents are stateless except for their internal state

4. **Smart Contract Integration**
   - Token movements happen via smart contracts
   - Currently mocked, but structured identically to real Plutus contracts
   - Transactions are tracked and verifiable

### Current Flow (Matches Real Masumi Pattern):

```
User Action → Medaa1 Agent
    ↓
Event: GOAL_COMPLETED
    ↓
Medaa2 Agent (subscribes to GOAL_COMPLETED)
    ↓
Execute Smart Contract → Move Tokens
    ↓
Event: TOKEN_TRANSFERRED
    ↓
Medaa3 Agent (subscribes to PURSE_BALANCE_UPDATED)
    ↓
Check Threshold → Distribute to Charities
    ↓
Event: CHARITY_DISTRIBUTION
```

## Integration with Real Masumi Network

### What We Built (Compatible Structure):

1. **Agent Network** (`services/agentNetwork.ts`)
   - Currently: Local event bus
   - Real Masumi: Replace with Masumi Agent Registry API
   - Same interface, different implementation

2. **Smart Contracts** (`services/mockSmartContract.ts`)
   - Currently: Mocked transactions
   - Real Masumi: Replace with Plutus smart contracts
   - Same transaction structure

3. **Agent Communication**
   - Currently: In-memory event bus
   - Real Masumi: On-chain events + Masumi messaging protocol
   - Events can be logged to blockchain

### Migration Path to Real Masumi:

1. **Replace Event Bus**
   ```typescript
   // Current: Local event bus
   agentNetwork.publish(event);
   
   // Real Masumi: Register events on-chain
   await masumiSDK.publishEvent(agentId, eventType, payload);
   ```

2. **Replace Smart Contracts**
   ```typescript
   // Current: Mock
   mockSmartContract.transferTokens(...)
   
   // Real Masumi: Real Plutus contract
   await cardanoSDK.executeContract(contractAddress, parameters);
   ```

3. **Agent Registration**
   ```typescript
   // Current: Local registry
   agentNetwork.registerAgent('medaa1');
   
   // Real Masumi: Register on Masumi network
   await masumiSDK.registerAgent({
     name: 'Medaa1',
     endpoint: 'https://your-agent-api.com',
     capabilities: ['goal_tracking'],
   });
   ```

4. **Token Integration**
   - Current: Mock ADA and RDM tokens
   - Real Masumi: Use testnet tokens or real Cardano tokens
   - Same TokenService interface, different implementation

## Real Masumi Integration Steps:

### Phase 1: Agent Registration
- Register each agent on Masumi network
- Get agent IDs and authentication
- Set up agent endpoints

### Phase 2: On-Chain Events
- Convert local events to on-chain events
- Use Masumi's event logging
- Events become verifiable on blockchain

### Phase 3: Smart Contracts
- Deploy Plutus contracts for token transfers
- Replace mock contracts with real ones
- Same interface, real execution

### Phase 4: Token Integration
- Use real Cardano testnet tokens
- Integrate with Masumi's payment infrastructure
- Test with testnet ADA first

### Phase 5: Agent Discovery
- Use Masumi's agent discovery mechanism
- Agents can find each other on the network
- Enable cross-user agent interactions

## Current vs Real Masumi:

| Component | Current (Mock) | Real Masumi |
|-----------|---------------|-------------|
| Event Bus | Local in-memory | Masumi network events |
| Smart Contracts | Mocked | Plutus contracts on Cardano |
| Agent Registry | Local Set | Masumi Agent Registry |
| Token Transfers | Simulated | Real Cardano transactions |
| Communication | Direct calls | Masumi messaging protocol |
| State Persistence | AsyncStorage | Blockchain + Masumi storage |

## Key Design Decisions (Masumi-Compatible):

1. **Agent Independence**: Each agent can run separately
2. **Event-Driven**: Communication via events (not direct calls)
3. **Stateless Operations**: Agents maintain minimal state
4. **Contract Interface**: Smart contract calls match Plutus structure
5. **Token Abstraction**: TokenService can work with real tokens

## Testing with Test Tokens:

When ready to test with real Masumi:

1. Get Masumi SDK/API credentials
2. Register agents on Masumi testnet
3. Deploy test Plutus contracts
4. Use testnet ADA and test RDM tokens
5. Monitor on-chain events

The architecture is **100% compatible** - just swap implementations!


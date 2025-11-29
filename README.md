# Cardano RDM Ecosystem DApp

A comprehensive React Native mobile application built with Expo that integrates with the Cardano blockchain to provide a Reward, Disincentive, and Motivation (RDM) ecosystem. This app enables users to set goals, earn tokens, participate in liquidity pools, manage vaults, and interact with AI-powered agents.

## 📱 Features

### Core Features
- **Wallet Connection**: Connect Cardano wallets (Nami, Eternl, Flint) via manual address entry
- **Goal Management**: Create and track daily goals with AI-powered assistance
- **Token System**: Earn and manage RDM tokens based on goal completion
- **Liquidity Pools**: Participate in liquidity pools for token trading
- **Vault Management**: Lock tokens in vaults for future use
- **Marketplace**: Trade habit NFTs and participate in the marketplace
- **AI Agents**: Three specialized AI agents (Medaa1, Medaa2, Medaa3) for different functions
- **Real-time Balance**: View ADA and RDM token balances from Blockfrost API

### Network Support
- **PreProd Testnet**: Default network for development and testing
- **Mainnet**: Production network support (when configured)

## 🏗️ Architecture

### Tech Stack
- **Framework**: React Native with Expo (~54.0.0)
- **Language**: TypeScript
- **State Management**: React Hooks (useState, useEffect)
- **UI Components**: React Native components + Expo Vector Icons
- **Blockchain**: Cardano (via Blockfrost API)
- **AI**: Google Gemini API integration
- **Storage**: AsyncStorage for local data persistence

### Application Flow

```
App Startup
    ↓
Check for Saved Wallet Connection
    ↓
Show Wallet Connection Screen (if not connected)
    ↓
Wallet Connected
    ↓
Initialize RDM Services (with timeout protection)
    ↓
Show Dashboard with Bottom Navigation
```

## 📁 Project Structure

```
Cardano/
├── App.tsx                      # Main application entry point
├── app.json                     # Expo configuration
├── package.json                 # Dependencies and scripts
├── tsconfig.json                # TypeScript configuration
├── metro.config.js              # Metro bundler configuration
│
├── components/                  # React components
│   ├── App.tsx                  # Main app component
│   ├── WalletConnection.tsx     # Wallet connection screen
│   ├── WalletHeader.tsx         # Wallet balance header
│   ├── Dashboard.tsx             # Main dashboard
│   ├── BottomNavigation.tsx     # Bottom tab navigation
│   ├── Medaa1GoalManager.tsx    # Goal management interface
│   ├── Medaa2TokenDashboard.tsx # Token management
│   ├── Medaa3CharityManager.tsx # Charity management
│   ├── MarketplaceHub.tsx        # Marketplace interface
│   ├── LiquidityPoolDashboard.tsx # LP interface
│   └── VaultManager.tsx         # Vault management
│
├── services/                    # Business logic services
│   ├── agentInitializer.ts      # Initializes all RDM services
│   ├── walletService.ts         # Wallet connection & balance
│   ├── tokenService.ts          # Token management
│   ├── blockfrostService.ts     # Cardano blockchain queries
│   ├── geminiService.ts         # AI/Gemini API integration
│   ├── medaa1Agent.ts           # Goal agent
│   ├── medaa2Agent.ts           # Token agent
│   ├── medaa3Agent.ts           # Charity agent
│   ├── marketplaceService.ts    # Marketplace logic
│   ├── liquidityPoolService.ts  # LP operations
│   ├── vaultService.ts          # Vault operations
│   ├── networkConfig.ts         # Network configuration
│   └── masumiClient.ts           # Masumi network integration
│
├── config/                      # Configuration files
│   ├── cardanoConfig.ts         # Cardano network config
│   ├── geminiConfig.ts          # Gemini API config
│   └── masumiConfig.ts          # Masumi network config
│
├── types/                       # TypeScript type definitions
│   ├── cardano.ts               # Cardano wallet types
│   ├── rdm.ts                   # RDM system types
│   ├── agent.ts                 # Agent types
│   ├── marketplace.ts           # Marketplace types
│   └── ...                      # Other type definitions
│
├── assets/                      # Images and static assets
│   ├── icon.png                 # App icon
│   ├── splash.png               # Splash screen
│   └── adaptive-icon.png        # Android adaptive icon
│
└── scripts/                     # Utility scripts
    ├── start-expo.bat           # Start Expo in LAN mode
    ├── start-expo-tunnel.bat    # Start Expo in tunnel mode
    └── ...                      # Other setup scripts
```

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18 or higher
- **npm** or **yarn**: Package manager
- **Expo CLI**: `npm install -g expo-cli`
- **Expo Go App**: Install on your mobile device ([iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
- **Cardano Wallet**: Nami, Eternl, or Flint (for wallet addresses)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Cardano
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables** (optional)
   Create a `.env` file in the root directory:
   ```env
   BLOCKFROST_TESTNET_KEY=your_testnet_key
   BLOCKFROST_MAINNET_KEY=your_mainnet_key
   GEMINI_API_KEY=your_gemini_key
   CARDANO_NETWORK=testnet
   ```

### Running the App

#### Option 1: LAN Mode (Recommended - Fastest)
```bash
# Windows
start-expo.bat

# Or manually
npx expo start --clear --lan
```

**Requirements:**
- Phone and computer on same Wi-Fi network
- Scan QR code with Expo Go app

#### Option 2: Tunnel Mode (Slower, works across networks)
```bash
# Windows
start-expo-tunnel.bat

# Or manually
npx expo start --clear --tunnel
```

**Note:** Tunnel mode is slower due to ngrok routing. Use only if LAN mode doesn't work.

#### Option 3: Localhost (For emulator)
```bash
npx expo start --localhost
```

### First Run

1. **Start the Expo server** using one of the methods above
2. **Open Expo Go** on your mobile device
3. **Scan the QR code** shown in the terminal
4. **Connect Wallet**: Enter your Cardano wallet address manually
   - Open your wallet app (Nami, Eternl, or Flint)
   - Go to "Receive" section
   - Copy your PreProd testnet address (starts with `addr_test1...`)
   - Paste it in the app's wallet connection screen
5. **Wait for initialization**: RDM services will initialize automatically
6. **Start using the app**: Navigate through tabs using bottom navigation

## 🧩 Components Explained

### App.tsx
Main application component that:
- Manages wallet connection state
- Initializes RDM services when wallet connects
- Handles navigation between tabs
- Shows loading states during initialization

**Key State:**
- `wallet`: Current wallet connection
- `rdmServices`: Initialized RDM services container
- `activeTab`: Current active tab
- `initializing`: Loading state

### WalletConnection.tsx
Login-style wallet connection screen:
- Network selection (Mainnet/PreProd)
- Wallet provider selection (Nami, Eternl, Flint)
- Manual address entry
- Address validation
- Connection persistence

### WalletHeader.tsx
Header component showing:
- Wallet balance (ADA and RDM tokens)
- Network badge (PreProd/Mainnet)
- Wallet details modal
- Disconnect functionality

### Dashboard.tsx
Main dashboard displaying:
- Goal statistics
- Liquidity pool overview
- Vault summary
- Recent activity
- Quick navigation cards

### BottomNavigation.tsx
Bottom tab bar with 5 tabs:
- **Home**: Dashboard
- **Goals**: Goal management (Medaa1)
- **Marketplace**: Marketplace and LP
- **LP**: Liquidity pools (legacy)
- **Profile**: Vault management

## 🔧 Services Explained

### agentInitializer.ts
**Purpose**: Central service initializer

**What it does:**
- Creates all RDM services (agents, token service, marketplace, etc.)
- Initializes agents with dependencies
- Connects to Masumi network (optional, non-blocking)
- Returns service container for app use

**Key Functions:**
- `initializeRDMServices()`: Main initialization function
- `getRDMServices()`: Get initialized services
- `resetRDMServices()`: Reset for testing

**Initialization Flow:**
1. Create core services (Gemini, Token, Smart Contract)
2. Create specialized services (Marketplace, LP, Vault)
3. Initialize token service
4. Create and initialize agents (Medaa1, Medaa2, Medaa3)
5. Connect to Masumi network (background, non-blocking)

### walletService.ts
**Purpose**: Wallet connection and balance management

**Features:**
- Wallet connection/disconnection
- Network preference storage
- Balance queries (via Blockfrost)
- Transaction history
- Address validation

**Key Functions:**
- `getConnectedWallet()`: Get current wallet
- `connectWallet()`: Connect wallet (WebView/mobile)
- `disconnectWallet()`: Disconnect wallet
- `getBalance()`: Get ADA balance
- `getFullBalance()`: Get ADA + RDM tokens

### tokenService.ts
**Purpose**: Token management across purses

**Features:**
- Multiple purse types (Base, Reward, Remorse, Charity)
- Balance tracking per purse
- Token transfers between purses
- Initialization with wallet address

### blockfrostService.ts
**Purpose**: Cardano blockchain queries

**Features:**
- Address balance queries
- Transaction history
- UTxO information
- Network-specific queries (PreProd/Mainnet)

### geminiService.ts
**Purpose**: AI/Gemini API integration

**Features:**
- Goal creation assistance
- AI-powered suggestions
- Natural language processing
- Context-aware responses

### medaa1Agent.ts (Goal Agent)
**Purpose**: Goal management and tracking

**Features:**
- Create daily goals
- Track goal completion
- Reward distribution
- Goal verification

### medaa2Agent.ts (Token Agent)
**Purpose**: Token operations and liquidity

**Features:**
- Token minting/burning
- Liquidity pool management
- Token transfers
- Smart contract interactions

### medaa3Agent.ts (Charity Agent)
**Purpose**: Charity and impact management

**Features:**
- Charity goal creation
- Impact tracking
- Donation management
- SDG alignment

## ⚙️ Configuration

### Cardano Configuration (`config/cardanoConfig.ts`)
- Network selection (testnet/mainnet)
- Blockfrost API keys
- Network URLs
- Transaction parameters

### Gemini Configuration (`config/geminiConfig.ts`)
- API key
- Model selection
- Temperature settings
- Response parameters

### Network Configuration (`services/networkConfig.ts`)
- Network types (mainnet/preprod)
- Address prefixes
- Faucet URLs
- Address validation

## 🔄 Development Workflow

### Making Changes

1. **Edit files** in your IDE
2. **Save changes** - Metro bundler will auto-reload
3. **Shake device** or press `r` in terminal to reload
4. **Check console** for errors

### Adding New Components

1. Create component in `components/` directory
2. Export component
3. Import in `App.tsx` or parent component
4. Add to navigation if needed

### Adding New Services

1. Create service in `services/` directory
2. Add to `agentInitializer.ts` initialization
3. Add to `RDMServiceContainer` interface
4. Use in components via `getRDMServices()`

### Testing

- **Component testing**: Use Expo Go's reload feature
- **Network testing**: Switch between PreProd and Mainnet
- **Error handling**: Check console logs
- **Backend testing**: Use `BackendTestPanel` component

## 🐛 Troubleshooting

### App Won't Load

**Problem**: Stuck on loading screen
- **Solution**: Check if RDM services initialized (check console)
- **Solution**: Restart app and try again
- **Solution**: Check network connection

### Wallet Won't Connect

**Problem**: Address validation fails
- **Solution**: Ensure address starts with correct prefix (`addr_test1` for PreProd, `addr1` for Mainnet)
- **Solution**: Copy full address from wallet app
- **Solution**: Check network selection matches wallet network

### Slow Loading

**Problem**: App loads very slowly
- **Solution**: Use LAN mode instead of tunnel (`start-expo.bat`)
- **Solution**: Ensure phone and computer on same Wi-Fi
- **Solution**: Check internet connection speed

### Tunnel Connection Issues

**Problem**: "Tunnel connection has been closed"
- **Solution**: Stop server (Ctrl+C) and use LAN mode
- **Solution**: Check ngrok status
- **Solution**: Restart tunnel mode

### Services Not Initializing

**Problem**: "Services unavailable" error
- **Solution**: Check console for initialization errors
- **Solution**: Ensure all API keys are configured
- **Solution**: Check Masumi connection (optional, won't block app)

### Balance Not Showing

**Problem**: Balance shows 0.00
- **Solution**: Check Blockfrost API key is valid
- **Solution**: Verify wallet address is correct
- **Solution**: Check network selection (PreProd vs Mainnet)
- **Solution**: Wait a few seconds for balance to load

## 📚 Key Concepts

### RDM System
- **Reward**: Tokens earned for completing goals
- **Disincentive**: Tokens lost for not completing goals
- **Motivation**: System designed to motivate behavior change

### Purses
Four types of token purses:
- **Base**: Main wallet balance
- **Reward**: Tokens earned from goals
- **Remorse**: Tokens lost from missed goals
- **Charity**: Tokens donated to charity

### Agents
Three AI agents:
- **Medaa1**: Goal management and tracking
- **Medaa2**: Token operations and liquidity
- **Medaa3**: Charity and impact management

### Networks
- **PreProd Testnet**: Development network (default)
- **Mainnet**: Production network (requires mainnet API keys)

## 🔐 Security Notes

- **Wallet Keys**: Never stored in app - only addresses
- **API Keys**: Store in environment variables, not in code
- **Network**: Use PreProd for testing, Mainnet for production
- **Addresses**: Always validate addresses before use

## 📝 Scripts Reference

- `start-expo.bat`: Start in LAN mode (fast)
- `start-expo-tunnel.bat`: Start in tunnel mode (slow)
- `start-expo-localhost.bat`: Start for emulator
- `npm start`: Default Expo start
- `npm run android`: Start Android emulator
- `npm run ios`: Start iOS simulator

## 🎯 Best Practices

1. **Always use LAN mode** for development (faster)
2. **Test on PreProd** before using Mainnet
3. **Check console logs** for debugging
4. **Validate addresses** before wallet operations
5. **Handle errors gracefully** in components
6. **Use TypeScript types** for type safety
7. **Keep services modular** and testable

## 📖 Additional Documentation

- `TUNNEL_TROUBLESHOOTING.md`: Tunnel mode issues
- `QUICK_START_CHECKLIST.md`: Quick setup guide
- `ARCHITECTURE_WORKFLOW.md`: Architecture details
- `MASUMI_INTEGRATION_GUIDE.md`: Masumi network setup

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Test thoroughly
4. Submit pull request

## 📄 License

[Your License Here]

## 🙏 Acknowledgments

- Cardano Foundation
- Blockfrost API
- Google Gemini
- Expo Team
- React Native Community

---

**Built with ❤️ using React Native, Expo, TypeScript, and Cardano**




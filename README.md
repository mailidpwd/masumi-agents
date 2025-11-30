# 🎯 Masumi Agents - Complete Beginner's Guide

## 📖 What is This App?

Imagine you have a **personal coach app** that:
- ✅ **Rewards you with tokens** when you complete your daily goals
- 💰 **Takes tokens away** when you skip your goals (to motivate you!)
- 🎁 **Lets you trade tokens** with other people
- 🤖 **Uses AI** to help you create better goals
- 🏦 **Works on the Cardano blockchain** (like a digital bank that's secure and transparent)

**In simple terms:** This is a mobile app that helps you stay motivated by using digital tokens (cryptocurrency) as rewards and penalties.

---

## 🌟 Main Features (In Simple Terms)

| Feature | What It Does | Real-World Example |
|---------|-------------|-------------------|
| 🎯 **Goal Setting** | Create daily goals with AI help | "Exercise for 30 minutes today" |
| 💰 **Token Rewards** | Earn tokens when you complete goals | Get 10 tokens for finishing your workout |
| 😔 **Token Penalties** | Lose tokens when you skip goals | Lose 5 tokens for not exercising |
| 🏪 **Marketplace** | Trade tokens and habit NFTs | Swap your fitness tokens for someone else's reading tokens |
| 🏦 **Vault** | Lock tokens away for future use | Save 100 tokens for next month |
| 🤖 **AI Coach** | Get personalized goal suggestions | AI suggests "Try yoga instead of running" |

---

## 🚀 Quick Start Guide (5 Minutes!)

### Step 1: Install Required Software ⬇️

**You need these on your computer:**

1. **Node.js** (version 18 or newer)
   - 🔗 Download: https://nodejs.org/
   - 💡 **What is it?** It's like a translator that helps your computer understand the app code
   - ✅ **Check if installed:** Open terminal/command prompt and type: `node --version`

2. **Git** (optional, but helpful)
   - 🔗 Download: https://git-scm.com/
   - 💡 **What is it?** A tool to download code from GitHub

3. **Expo Go App** (on your phone)
   - 📱 **iOS:** [Download from App Store](https://apps.apple.com/app/expo-go/id982107779)
   - 📱 **Android:** [Download from Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - 💡 **What is it?** An app that lets you run this app on your phone without installing it permanently

### Step 2: Download the App Code 📥

**Option A: Using Git (Recommended)**
```bash
git clone https://github.com/mailidpwd/masumi-agents.git
cd masumi-agents
```

**Option B: Download ZIP**
1. Go to: https://github.com/mailidpwd/masumi-agents
2. Click the green "Code" button
3. Click "Download ZIP"
4. Extract the ZIP file
5. Open a terminal in the extracted folder

### Step 3: Install App Dependencies 📦

**Open terminal/command prompt in the project folder, then type:**

```bash
npm install
```

⏱️ **This takes 2-5 minutes** - it's downloading all the code pieces the app needs to work.

💡 **What's happening?** Think of it like downloading all the ingredients you need to bake a cake.

### Step 4: Start the App 🎬

**In the same terminal, type:**

**Windows:**
```bash
start-expo.bat
```

**Mac/Linux:**
```bash
npx expo start --clear --lan
```

📱 **What happens:** A QR code appears in your terminal!

### Step 5: Connect Your Phone 📲

1. **Make sure your phone and computer are on the same Wi-Fi network**
   - 💡 Your computer and phone need to "talk" to each other

2. **Open Expo Go app** on your phone

3. **Scan the QR code** that appeared in your terminal
   - 📱 iOS: Use Camera app
   - 📱 Android: Use Expo Go app's built-in scanner

4. **Wait for the app to load** (30-60 seconds)

🎉 **You're done!** The app should now open on your phone!

---

## 📱 Using the App for the First Time

### Connecting Your Wallet 💳

**What is a wallet?** Think of it like a bank account, but for digital tokens instead of dollars.

**You'll need a Cardano wallet address:**

1. **Install a Cardano wallet app** on your phone:
   - Nami Wallet
   - Eternl Wallet  
   - Flint Wallet

2. **Get your wallet address:**
   - Open your wallet app
   - Look for "Receive" or "My Address"
   - Copy the address (it looks like: `addr_test1qxy...`)

3. **Connect in the app:**
   - Select "PreProd Testnet" (this is like a practice mode)
   - Paste your wallet address
   - Click "Connect"

### Understanding the App Screens 🖥️

**The app has 5 main tabs:**

1. **🏠 Home Tab**
   - See your goals, tokens, and stats
   - Like a dashboard in your car

2. **🎯 Goals Tab**
   - Create new goals
   - Check off completed goals
   - See your progress

3. **🏪 Marketplace Tab**
   - Trade tokens with others
   - Buy/sell habit NFTs
   - Like a digital marketplace

4. **💧 Liquidity Pools Tab**
   - Advanced: Trade tokens in pools
   - Think of it like a stock exchange

5. **👤 Profile Tab**
   - Manage your vaults
   - Lock tokens for later
   - Like a savings account

---

## 🎓 Understanding Key Concepts

### What Are Tokens? 🪙

**Simple explanation:** Tokens are like digital coins or points in a video game.

- ✅ **Earn tokens** = Complete your goals
- ❌ **Lose tokens** = Skip your goals
- 💰 **Use tokens** = Trade with others or save for later

**Real example:** 
- You set a goal: "Exercise today"
- You complete it → Get 10 tokens 🎉
- You skip it → Lose 5 tokens 😔

### What is a Blockchain? ⛓️

**Simple explanation:** A blockchain is like a public digital notebook that everyone can see, but no one can change.

**Why it matters:**
- ✅ Your tokens are safe and secure
- ✅ No one can cheat or steal
- ✅ Everything is transparent
- ✅ Works without a bank

**Real example:** 
- When you earn 10 tokens, it's written in the "notebook" forever
- Everyone can see it happened
- You can prove you earned those tokens

### What Are Smart Contracts? 📜

**Simple explanation:** Smart contracts are like vending machines - they automatically do something when certain conditions are met.

**Real example:**
- **Condition:** You complete your goal
- **Smart contract automatically:** Gives you tokens
- **No human needed!** It just works automatically

### What Are AI Agents? 🤖

**Simple explanation:** AI agents are like smart assistants that help you:

1. **Medaa1** (Goal Agent)
   - Helps you create better goals
   - Tracks your progress
   - Suggests improvements

2. **Medaa2** (Token Agent)
   - Manages your tokens
   - Handles rewards and penalties
   - Runs the token economy

3. **Medaa3** (Charity Agent)
   - Helps you donate tokens to charity
   - Tracks your impact
   - Connects goals to good causes

---

## 🔧 Common Questions

### ❓ "The app won't load on my phone"

**Try these steps:**
1. ✅ Make sure phone and computer are on the same Wi-Fi
2. ✅ Restart the Expo server (Ctrl+C, then run `start-expo.bat` again)
3. ✅ Close and reopen Expo Go app
4. ✅ Try scanning the QR code again

### ❓ "I see an error about WebAssembly or .wasm files"

**Good news:** This was already fixed! If you see this error:
1. ✅ Clear the cache: `npx expo start --clear`
2. ✅ Delete `node_modules` folder and run `npm install` again
3. ✅ Check that you have the latest code from GitHub

### ❓ "My wallet balance shows 0.00"

**This is normal if:**
- You're on testnet (practice mode)
- You haven't received any test tokens yet
- Your wallet address is new

**To get test tokens:**
1. Find a Cardano testnet faucet (Google: "Cardano testnet faucet")
2. Enter your testnet wallet address
3. Request test tokens (they're free for testing!)

### ❓ "What's the difference between PreProd and Mainnet?"

| PreProd (Testnet) | Mainnet (Real) |
|-------------------|----------------|
| 🧪 Practice mode | 💰 Real money |
| 🆓 Free test tokens | 💵 Costs real ADA |
| ✅ Safe to experiment | ⚠️ Be careful! |
| 🎯 For learning | 🏦 For real use |

**Start with PreProd!** It's like a practice mode for learning.

---

## 📂 Project Structure (Simple Explanation)

**Think of the project like a house with different rooms:**

```
masumi-agents/                    ← The whole house
├── components/                   ← The rooms (different screens)
│   ├── Dashboard.tsx            ← Living room (main screen)
│   ├── WalletConnection.tsx     ← Front door (login screen)
│   └── ...                      ← Other rooms
│
├── services/                     ← The workers (code that does things)
│   ├── walletService.ts         ← Handles wallet stuff
│   ├── tokenService.ts          ← Handles tokens
│   └── ...                      ← Other workers
│
├── config/                       ← Settings (like light switches)
│   ├── cardanoConfig.ts         ← Cardano settings
│   └── ...                      ← Other settings
│
└── contracts/                    ← Smart contracts (the rules)
    └── ...                      ← Contract files
```

**You don't need to understand this to use the app!** This is just if you want to see how it works.

---

## 🛠️ Advanced Setup (Optional)

### Setting Up API Keys 🔑

**What are API keys?** They're like passwords that let the app talk to other services.

**You might need:**
- **Blockfrost API Key** - To read blockchain data
- **Gemini API Key** - To use AI features
- **Masumi API Key** - To connect to Masumi network

**How to set them up:**
1. Create a file called `.env` in the project root
2. Add your keys like this:
```env
BLOCKFROST_TESTNET_KEY=your_key_here
GEMINI_API_KEY=your_key_here
```

**Don't worry if you don't have these yet!** The app can still work for basic testing.

---

## 🎯 Step-by-Step: Your First Goal

**Let's walk through creating your first goal:**

1. **Open the app** on your phone
2. **Go to the "Goals" tab** (second tab at bottom)
3. **Click "Create New Goal"**
4. **Type a simple goal:**
   - Example: "Drink 8 glasses of water today"
5. **Set how much you'll earn/lose:**
   - Earn: 10 tokens
   - Lose: 5 tokens
6. **Click "Create Goal"**
7. **Complete the goal** and check it off
8. **See your tokens increase!** 🎉

**That's it!** You just used the app for the first time!

---

## 🐛 Troubleshooting Guide

### Problem: "npm install" fails

**Solution:**
1. Make sure Node.js is installed (`node --version`)
2. Try deleting `node_modules` folder and `package-lock.json`
3. Run `npm install` again
4. If still failing, try `npm install --legacy-peer-deps`

### Problem: QR code won't scan

**Solution:**
1. Make sure terminal window is big enough to see full QR code
2. Try zooming in on your phone
3. Check that you're using Expo Go app (not Camera app on iOS)
4. Try restarting Expo server

### Problem: "Cannot connect to server"

**Solution:**
1. Check Wi-Fi connection on both devices
2. Make sure both devices are on same network
3. Try using tunnel mode: `npx expo start --tunnel`
4. Check firewall settings (might be blocking connection)

### Problem: App loads but shows errors

**Solution:**
1. Check the terminal/console for error messages
2. Shake your phone to open developer menu
3. Click "Reload" in developer menu
4. Check that all dependencies installed correctly

---

## 📚 Learning Resources

### For Complete Beginners:

1. **What is Blockchain?**
   - YouTube: Search "blockchain explained simply"
   - Great for understanding the basics

2. **What is Cardano?**
   - Website: https://cardano.org/learn
   - Official learning resources

3. **React Native Basics**
   - If you want to modify the code
   - Website: https://reactnative.dev/docs/getting-started

### For Developers:

1. **Cardano Developer Docs**
   - https://developers.cardano.org/

2. **React Native Docs**
   - https://reactnative.dev/

3. **Expo Docs**
   - https://docs.expo.dev/

---

## 🎉 You're Ready!

**Congratulations!** You now understand:
- ✅ What this app does
- ✅ How to install and run it
- ✅ How to use it
- ✅ How to fix common problems

**Next Steps:**
1. 🚀 Install the app and run it
2. 🎯 Create your first goal
3. 💰 Earn your first tokens
4. 🎓 Explore the different features
5. 🤝 Share it with friends!

---

## 🤝 Need Help?

**If you get stuck:**
1. 📖 Re-read the relevant section above
2. 🔍 Check the Troubleshooting section
3. 💬 Ask questions in issues (GitHub)
4. 🐛 Report bugs if you find them

**Remember:** Everyone was a beginner once! Don't be afraid to ask questions.

---

## 📄 Technical Details (For Developers)

<details>
<summary>Click to expand technical information</summary>

### Tech Stack

- **Framework:** React Native with Expo (~54.0.0)
- **Language:** TypeScript
- **Blockchain:** Cardano (via Blockfrost API)
- **AI:** Google Gemini API
- **State Management:** React Hooks

### Project Structure

```
masumi-agents/
├── App.tsx                      # Main entry point
├── components/                  # React components
├── services/                    # Business logic
├── config/                      # Configuration
├── contracts/                   # Plutus smart contracts
├── types/                       # TypeScript types
├── scripts/                     # Utility scripts
└── docs/                        # Documentation
```

### Available Scripts

```bash
npm start                 # Start Expo in default mode
npm run start:go         # Start with Expo Go
npm run android          # Run on Android emulator
npm run ios              # Run on iOS simulator
npm test                 # Run tests
```

### Configuration Files

- `app.config.js` - Expo configuration
- `metro.config.js` - Metro bundler config
- `tsconfig.json` - TypeScript config
- `.env` - Environment variables (create this)

</details>

---

## 📝 License

[Your License Here]

---

## 🙏 Acknowledgments

Built with ❤️ using:
- React Native & Expo
- TypeScript
- Cardano Blockchain
- Google Gemini AI

**Special thanks to:**
- Cardano Foundation
- Blockfrost API
- Expo Team
- React Native Community

---

**Happy goal-setting! 🎯✨**

*Last updated: 2024*

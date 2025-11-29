// Dynamic Expo configuration
// This allows us to read environment variables at build time

export default {
  expo: {
    name: "Cardano DApp",
    slug: "cardano-dapp",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#0033AD"
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.cardanodapp"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#0033AD"
      },
      package: "com.cardanodapp"
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    updates: {
      enabled: false,
      checkAutomatically: "NEVER",
      fallbackToCacheTimeout: 0
    },
    // Pass environment variables to the app
    extra: {
      BLOCKFROST_TESTNET_KEY: process.env.BLOCKFROST_TESTNET_KEY || "",
      BLOCKFROST_MAINNET_KEY: process.env.BLOCKFROST_MAINNET_KEY || "",
      CARDANO_NETWORK: process.env.CARDANO_NETWORK || "testnet",
      GEMINI_API_KEY: process.env.GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY || "",
    }
  }
};


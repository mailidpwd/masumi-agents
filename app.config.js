// Dynamic Expo configuration
// This allows us to read environment variables at build time
// 
// Expo Go Compatible: This config works in both Expo Go and native builds
// Native-only features (deep linking) are still configured but won't work in Expo Go

export default {
  expo: {
    name: "Cardano DApp",
    slug: "cardano-dapp",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: false, // Disable new architecture for better Expo Go compatibility
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#0033AD"
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.cardanodapp",
      // Add wallet URL schemes so iOS can detect installed wallet apps
      // Note: These only work in native builds, not Expo Go
      infoPlist: {
        LSApplicationQueriesSchemes: [
          "eternl",
          "eternlwallet",
          "nami",
          "namiwallet",
          "flint",
          "flintwallet"
        ]
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#0033AD"
      },
      package: "com.cardanodapp",
      // Intent filters only work in native builds, not Expo Go
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "cardanodapp",
            },
            {
              scheme: "cardanodapp",
              host: "wallet",
            },
          ],
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
      queries: {
        schemes: [
          "eternl",
          "eternlwallet",
          "nami",
          "namiwallet",
          "flint",
          "flintwallet"
        ],
        // Note: Package queries are added manually in AndroidManifest.xml
        // as Expo config doesn't fully support package queries yet
      }
    },
    // Custom URL scheme - only works in native builds
    scheme: "cardanodapp",
    // Linking configuration - only works in native builds
    linking: {
      prefixes: [
        "cardanodapp://",
        "eternl://",
        "nami://",
        "flintwallet://"
      ],
      config: {
        screens: {
          "wallet/eternl-callback": "wallet/eternl-callback",
          "wallet/signed": "wallet/signed",
        },
      },
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
      eas: {
        projectId: "88248636-a7a0-4a49-bbc4-58b8e4aabf2e"
      },
      BLOCKFROST_TESTNET_KEY: process.env.BLOCKFROST_TESTNET_KEY || "",
      BLOCKFROST_MAINNET_KEY: process.env.BLOCKFROST_MAINNET_KEY || "",
      CARDANO_NETWORK: process.env.CARDANO_NETWORK || "testnet",
      GEMINI_API_KEY: process.env.GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY || "",
      // Masumi Network Configuration
      MASUMI_API_KEY: process.env.MASUMI_API_KEY || "",
      MASUMI_AGENT_ID_MEDAA1: process.env.MASUMI_AGENT_ID_MEDAA1 || "",
      MASUMI_AGENT_ID_MEDAA2: process.env.MASUMI_AGENT_ID_MEDAA2 || "",
      MASUMI_AGENT_ID_MEDAA3: process.env.MASUMI_AGENT_ID_MEDAA3 || "",
      USE_REAL_MASUMI_NETWORK: process.env.USE_REAL_MASUMI_NETWORK || "false",
      MASUMI_NETWORK: process.env.MASUMI_NETWORK || "PREPROD",
      MASUMI_HOST_IP: process.env.MASUMI_HOST_IP || "10.110.141.10",
    },
    // Plugins - these are only applied in native builds
    // Expo Go ignores these
    plugins: [
      // Add any native plugins here - they'll be skipped in Expo Go
    ]
  }
};
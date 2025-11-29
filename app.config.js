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
      bundleIdentifier: "com.cardanodapp",
      // Add wallet URL schemes so iOS can detect installed wallet apps
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
    scheme: "cardanodapp",
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
    }
  }
};
// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Configure Metro to prevent WebAssembly bundling errors
// MeshJS includes WebAssembly files which aren't supported in React Native
config.resolver = {
  ...config.resolver,
  // Custom resolver to handle problematic imports
  resolveRequest: (context, moduleName, platform) => {
    // Block all .wasm file imports - return empty module
    if (moduleName && typeof moduleName === 'string') {
      if (moduleName.endsWith('.wasm') || moduleName.includes('.wasm')) {
        return {
          type: 'empty',
        };
      }
      
      // Block the specific problematic WebAssembly browser package
      if (moduleName === '@sidan-lab/sidan-csl-rs-browser' || 
          moduleName.includes('sidan-csl-rs-browser')) {
        return {
          type: 'empty',
        };
      }
    }
    
    // Use default resolver for everything else
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;

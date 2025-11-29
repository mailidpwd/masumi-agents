/**
 * Script to generate placeholder assets for Expo
 * Run with: node scripts/generate-assets.js
 * 
 * Note: This creates minimal placeholder assets.
 * For production, replace with proper branded assets.
 */

const fs = require('fs');
const path = require('path');

// Create a minimal 1x1 PNG in base64 (transparent pixel)
const minimalPNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

const assetsDir = path.join(__dirname, '..', 'assets');
const assets = [
  'icon.png',
  'splash.png',
  'adaptive-icon.png',
  'favicon.png'
];

// Ensure assets directory exists
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Create placeholder assets
assets.forEach(asset => {
  const assetPath = path.join(assetsDir, asset);
  if (!fs.existsSync(assetPath)) {
    fs.writeFileSync(assetPath, minimalPNG);
    console.log(`✓ Created placeholder: ${asset}`);
  } else {
    console.log(`- Already exists: ${asset}`);
  }
});

console.log('\n✓ Placeholder assets created!');
console.log('Note: Replace these with proper assets before production.');


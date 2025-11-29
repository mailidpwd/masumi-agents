# Expo Tunnel Mode Troubleshooting

## Problems

### Problem 1: `ngrok tunnel took too long to connect`
Error when running `npx expo start --tunnel`

### Problem 2: `Tunnel connection has been closed`
The tunnel disconnects after bundling completes. This is often related to intermittent connection issues between the dev server and ngrok.

## Solutions (in order of preference)

### 1. Use LAN Mode (Recommended if on same network)
```bash
npx expo start --lan
```
Or use the provided script:
```bash
start-expo.bat
```

**Requirements:**
- Your phone and computer must be on the same Wi-Fi network
- Firewall may need to allow Expo on your network

### 2. Use Localhost Mode (For emulator/same device)
```bash
npx expo start --localhost
```
Or use:
```bash
start-expo-localhost.bat
```

### 3. Fix Tunnel Mode Issues

#### Option A: Check Firewall
- Windows Firewall may be blocking ngrok
- Try temporarily disabling firewall to test
- Add Expo/ngrok to firewall exceptions

#### Option B: Check Network Connection
- Ensure stable internet connection
- Some corporate networks block ngrok
- Try different network (mobile hotspot)

#### Option C: Use ngrok directly
If Expo's built-in tunnel fails, you can use ngrok manually:
1. Install ngrok: `npm install -g ngrok`
2. Start Expo normally: `npx expo start --lan`
3. In another terminal: `ngrok http 8082` (or your Expo port)
4. Use the ngrok URL shown

#### Option D: Increase Timeout (if using tunnel)
The tunnel script now uses `--max-workers 1` which can help with stability.

### 4. Alternative: Use Expo Go with QR Code
1. Start with LAN mode: `npx expo start --lan`
2. Scan QR code with Expo Go app
3. If QR code doesn't work, manually enter the IP address shown

## Quick Commands

- **LAN Mode**: `start-expo.bat` or `npx expo start --lan`
- **Tunnel Mode**: `start-expo-tunnel.bat` or `npx expo start --tunnel`
- **Localhost Mode**: `start-expo-localhost.bat` or `npx expo start --localhost`

## Most Common Solution
If you're on the same Wi-Fi network, use **LAN mode** instead of tunnel mode. It's faster and more reliable.

## If Tunnel Keeps Disconnecting

If you see "Tunnel connection has been closed" after bundling:

1. **Stop the current server** (Ctrl+C)
2. **Use LAN mode instead**: Run `start-expo.bat` or `npx expo start --lan`
3. **Make sure your phone and computer are on the same Wi-Fi**
4. **Scan the QR code** or enter the IP address manually in Expo Go

**Why LAN mode is better:**
- ✅ More stable (no tunnel disconnections)
- ✅ Faster (direct connection)
- ✅ Works reliably on same network
- ✅ No ngrok dependency

**When to use tunnel mode:**
- Only if you're on different networks (e.g., phone on mobile data, computer on Wi-Fi)
- If LAN mode doesn't work due to network restrictions


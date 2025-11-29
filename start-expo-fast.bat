@echo off
echo ========================================
echo ULTRA FAST MODE - LAN Connection
echo ========================================
echo.
echo STOP THE TUNNEL SERVER FIRST (Ctrl+C)!
echo.
echo This will start Expo in LAN mode (10x FASTER than tunnel)
echo.
echo Requirements:
echo - Phone and computer MUST be on same Wi-Fi network
echo - Firewall may need to allow Expo
echo.
echo Starting Expo in optimized LAN mode...
echo.
npx expo start --clear --lan


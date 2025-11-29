@echo off
echo Starting Expo in TUNNEL mode (works even if not on same network)...
echo.
echo Note: Tunnel mode is slower and may have connection issues
echo If tunnel fails or disconnects, press Ctrl+C and run: start-expo.bat
echo.
echo Attempting tunnel connection (this may take a moment)...
echo If you see "Tunnel connection has been closed", restart with: start-expo.bat
echo.
npx expo start --clear --tunnel --max-workers 1


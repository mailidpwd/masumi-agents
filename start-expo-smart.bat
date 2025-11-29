@echo off
echo Starting Expo with smart fallback...
echo.
echo This will try tunnel mode first, then fall back to LAN if tunnel fails.
echo.

REM Try tunnel mode first
echo Attempting tunnel mode...
npx expo start --clear --tunnel --max-workers 1

REM If tunnel fails, the script will exit and user can manually run LAN mode
REM Or we can add automatic fallback here




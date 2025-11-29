@echo off
REM Start Masumi Services
REM This script starts both Payment and Registry services

echo ========================================
echo Starting Masumi Services
echo ========================================
echo.

cd /d "%~dp0\.."

REM Check if repositories exist
if not exist "masumi-payment-service" (
    echo ERROR: Payment Service not found. Run setup-masumi-services.bat first.
    pause
    exit /b 1
)

if not exist "masumi-registry-service" (
    echo ERROR: Registry Service not found. Run setup-masumi-services.bat first.
    pause
    exit /b 1
)

REM Start Payment Service in new window
echo Starting Payment Service on port 3001...
start "Masumi Payment Service" cmd /k "cd masumi-payment-service && npm run dev"

timeout /t 3 /nobreak >nul

REM Start Registry Service in new window
echo Starting Registry Service on port 3000...
start "Masumi Registry Service" cmd /k "cd masumi-registry-service && npm run dev"

echo.
echo ========================================
echo Services Started!
echo ========================================
echo.
echo Payment Service: http://localhost:3001
echo Registry Service: http://localhost:3000
echo.
echo Press any key to exit (services will continue running in background windows)...
pause >nul


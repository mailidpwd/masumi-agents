@echo off
REM Setup Masumi Services
REM This script clones Masumi repositories and sets up environment

echo ========================================
echo Masumi Services Setup Script
echo ========================================
echo.

cd /d "%~dp0\.."

REM Check if repositories already exist
if exist "masumi-payment-service" (
    echo Payment Service already exists. Skipping clone.
) else (
    echo Cloning Payment Service...
    git clone https://github.com/masumi-network/masumi-payment-service.git
    if errorlevel 1 (
        echo ERROR: Failed to clone Payment Service
        pause
        exit /b 1
    )
)

if exist "masumi-registry-service" (
    echo Registry Service already exists. Skipping clone.
) else (
    echo Cloning Registry Service...
    git clone https://github.com/masumi-network/masumi-registry-service.git
    if errorlevel 1 (
        echo ERROR: Failed to clone Registry Service
        pause
        exit /b 1
    )
)

echo.
echo Installing Payment Service dependencies...
cd masumi-payment-service
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install Payment Service dependencies
    pause
    exit /b 1
)
cd ..

echo.
echo Installing Registry Service dependencies...
cd masumi-registry-service
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install Registry Service dependencies
    pause
    exit /b 1
)
cd ..

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Configure .env files in both service directories
echo 2. Set up PostgreSQL database
echo 3. Run database migrations
echo 4. Start services using start-masumi-services.bat
echo.
pause


@echo off
REM Complete Masumi Setup Script
REM This script sets up everything automatically

echo ========================================
echo Masumi Complete Setup Script
echo ========================================
echo.

cd /d "%~dp0\.."

REM Step 1: Check Docker
echo [1/6] Checking Docker...
docker ps >nul 2>&1
if errorlevel 1 (
    echo WARNING: Docker is not running or not installed.
    echo Please start Docker Desktop and wait for it to be ready.
    echo Press any key after Docker Desktop is running...
    pause
)

REM Step 2: Create PostgreSQL Container
echo.
echo [2/6] Setting up PostgreSQL database...
docker ps -a --filter "name=masumi-postgres" | findstr masumi-postgres >nul
if errorlevel 1 (
    echo Creating PostgreSQL container...
    docker run --name masumi-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_USER=postgres -e POSTGRES_DB=masumi_payment -p 5432:5432 -d postgres:16-alpine
    if errorlevel 1 (
        echo ERROR: Failed to create PostgreSQL container
        pause
        exit /b 1
    )
    echo Waiting for PostgreSQL to start...
    timeout /t 10 /nobreak >nul
) else (
    echo PostgreSQL container already exists, starting it...
    docker start masumi-postgres
)

REM Step 3: Create Registry Database
echo.
echo [3/6] Creating registry database...
docker exec -i masumi-postgres psql -U postgres -c "CREATE DATABASE masumi_registry;" 2>nul
echo Database setup complete.

REM Step 4: Configure Environment Files
echo.
echo [4/6] Configuring environment files...
echo Environment files should already be configured.
echo Blockfrost API key: preprodHdxaAUbZjQOeUD8YCt421BV4E19zvEno

REM Step 5: Run Migrations
echo.
echo [5/6] Running database migrations...
cd "%~dp0\..\masumi-payment-service"
call npm run prisma:generate
if errorlevel 1 (
    echo ERROR: Failed to generate Prisma client for Payment Service
    pause
    exit /b 1
)
call npm run prisma:migrate
if errorlevel 1 (
    echo WARNING: Migration may have failed, but continuing...
)

cd "%~dp0\..\..\masumi-registry-service"
call npm run prisma:generate
if errorlevel 1 (
    echo ERROR: Failed to generate Prisma client for Registry Service
    pause
    exit /b 1
)
call npm run prisma:migrate
if errorlevel 1 (
    echo WARNING: Migration may have failed, but continuing...
)

REM Step 6: Start Services
echo.
echo [6/6] Starting Masumi services...
echo.
echo Services will start in separate windows.
echo Please check those windows for any errors.
echo.

cd "%~dp0\.."
call "%~dp0start-masumi-services.bat"

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Wait for services to start (check the two windows that opened)
echo 2. Get API key: curl http://localhost:3001/api/v1/api-key/
echo 3. Register your agents (see MASUMI_MOBILE_INTEGRATION_GUIDE.md)
echo.
pause


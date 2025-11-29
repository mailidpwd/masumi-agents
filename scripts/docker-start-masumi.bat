@echo off
REM Start Masumi Services using Docker Compose

echo ========================================
echo Starting Masumi Services with Docker
echo ========================================
echo.

cd /d "%~dp0\.."

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not running. Please start Docker Desktop.
    pause
    exit /b 1
)

REM Check if docker-compose file exists
if not exist "docker-compose.masumi.yml" (
    echo ERROR: docker-compose.masumi.yml not found.
    pause
    exit /b 1
)

echo Starting Masumi services...
docker-compose -f docker-compose.masumi.yml up -d

if errorlevel 1 (
    echo ERROR: Failed to start services
    pause
    exit /b 1
)

echo.
echo ========================================
echo Services Started!
echo ========================================
echo.
echo Payment Service: http://localhost:3001
echo Registry Service: http://localhost:3000
echo.
echo To view logs:
echo   docker-compose -f docker-compose.masumi.yml logs -f
echo.
echo To stop services:
echo   docker-compose -f docker-compose.masumi.yml down
echo.
pause


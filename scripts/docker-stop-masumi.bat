@echo off
REM Stop Masumi Services using Docker Compose

echo ========================================
echo Stopping Masumi Services
echo ========================================
echo.

cd /d "%~dp0\.."

docker-compose -f docker-compose.masumi.yml down

echo.
echo Services stopped.
pause


# Cardano CLI Quick Setup Script for Windows
# This script helps set up Cardano CLI for smart contract deployment

Write-Host ""
Write-Host "🔧 Cardano CLI Setup Assistant" -ForegroundColor Cyan
Write-Host "=" -repeat 60 -ForegroundColor Cyan
Write-Host ""

# Check if WSL2 is installed
Write-Host "🔍 Checking prerequisites..." -ForegroundColor Yellow
$wslInstalled = Get-Command wsl -ErrorAction SilentlyContinue
if (-not $wslInstalled) {
    Write-Host "❌ WSL2 not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "📦 To install WSL2:" -ForegroundColor Yellow
    Write-Host "   1. Run: wsl --install" -ForegroundColor White
    Write-Host "   2. Restart your computer" -ForegroundColor White
    Write-Host "   3. Run this script again" -ForegroundColor White
    Write-Host ""
    $installWSL = Read-Host "Would you like to install WSL2 now? (y/n)"
    if ($installWSL -eq 'y' -or $installWSL -eq 'Y') {
        Write-Host "Installing WSL2..." -ForegroundColor Yellow
        wsl --install
        Write-Host "✅ WSL2 installation started. Please restart and run this script again." -ForegroundColor Green
    }
    exit
} else {
    Write-Host "✅ WSL2 is installed" -ForegroundColor Green
}

# Check if Docker is available
$dockerInstalled = Get-Command docker -ErrorAction SilentlyContinue
if ($dockerInstalled) {
    Write-Host "✅ Docker is available" -ForegroundColor Green
    Write-Host ""
    Write-Host "🐳 RECOMMENDED: Use Docker for Cardano CLI (easiest option)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   To use Cardano CLI with Docker:" -ForegroundColor White
    Write-Host "   docker run -it --rm inputoutput/cardano-node:latest cardano-cli --version" -ForegroundColor Gray
    Write-Host ""
    $useDocker = Read-Host "Would you like to test Docker Cardano CLI now? (y/n)"
    if ($useDocker -eq 'y' -or $useDocker -eq 'Y') {
        Write-Host "Testing Docker Cardano CLI..." -ForegroundColor Yellow
        docker run --rm inputoutput/cardano-node:latest cardano-cli --version
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✅ Docker Cardano CLI works!" -ForegroundColor Green
            Write-Host ""
            Write-Host "💡 Tip: You can modify deploy-testnet.js to use Docker instead of native CLI" -ForegroundColor Cyan
        }
    }
} else {
    Write-Host "⚠️  Docker not found (optional)" -ForegroundColor Yellow
    Write-Host "   Install Docker Desktop for easier Cardano CLI setup" -ForegroundColor Gray
}

Write-Host ""
Write-Host "📋 Installation Options:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. 🐳 Docker (Easiest - Recommended)" -ForegroundColor Green
Write-Host "   - Install Docker Desktop" -ForegroundColor Gray
Write-Host "   - Use: docker run -it --rm inputoutput/cardano-node:latest" -ForegroundColor Gray
Write-Host ""
Write-Host "2. 🐧 WSL2 + Native Build" -ForegroundColor Yellow
Write-Host "   - Install in WSL2 Ubuntu" -ForegroundColor Gray
Write-Host "   - Follow: docs/CARDANO_CLI_SETUP.md" -ForegroundColor Gray
Write-Host ""
Write-Host "3. 📦 Pre-built Binaries" -ForegroundColor Yellow
Write-Host "   - Download from GitHub releases" -ForegroundColor Gray
Write-Host "   - Extract and add to PATH" -ForegroundColor Gray
Write-Host ""

# Check if cardano-cli is already in PATH
$cardanoCli = Get-Command cardano-cli -ErrorAction SilentlyContinue
if ($cardanoCli) {
    Write-Host "✅ Cardano CLI found in PATH!" -ForegroundColor Green
    Write-Host "   Location: $($cardanoCli.Source)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Testing version..." -ForegroundColor Yellow
    cardano-cli --version
    Write-Host ""
    Write-Host "✅ Cardano CLI is ready to use!" -ForegroundColor Green
} else {
    Write-Host "❌ Cardano CLI not found in PATH" -ForegroundColor Red
    Write-Host ""
    Write-Host "📖 For detailed installation instructions, see:" -ForegroundColor Cyan
    Write-Host "   docs/CARDANO_CLI_SETUP.md" -ForegroundColor White
    Write-Host ""
    Write-Host "💡 Alternative: Continue development with mock contracts" -ForegroundColor Cyan
    Write-Host "   The system will automatically use mock contracts until real contracts are deployed" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=" -repeat 60 -ForegroundColor Cyan
Write-Host ""


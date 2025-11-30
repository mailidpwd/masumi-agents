# Cardano CLI Setup Guide

This guide explains how to install and configure Cardano CLI for smart contract deployment.

## Prerequisites

- Windows 10/11 (for Windows installation)
- WSL2 (Windows Subsystem for Linux) - Recommended for easier setup
- OR use Docker (easiest option)

## Installation Options

### Option 1: Docker (Recommended - Easiest)

Docker provides a pre-configured Cardano environment without complex setup.

1. **Install Docker Desktop**:
   - Download from: https://www.docker.com/products/docker-desktop
   - Install and start Docker Desktop

2. **Use Cardano Docker Image**:
   ```bash
   # Try official IOG image (may require authentication)
   docker pull inputoutput/cardano-node:latest
   
   # OR use community image
   docker pull cardanocommunity/cardano-node:latest
   
   # Run Cardano CLI in container
   docker run -it --rm cardanocommunity/cardano-node:latest cardano-cli --version
   ```
   
   **Note**: Docker images may require authentication or use different names. Check:
   - https://hub.docker.com/r/inputoutput/cardano-node
   - https://hub.docker.com/r/cardanocommunity/cardano-node

3. **Create Docker Compose Setup**:
   Create `docker-compose.cardano.yml`:
   ```yaml
   version: '3.8'
   services:
     cardano-cli:
       image: inputoutput/cardano-node:latest
       volumes:
         - ./contracts:/contracts
         - ./scripts:/scripts
       working_dir: /workspace
       command: cardano-cli --version
   ```

### Option 2: WSL2 + Native Installation (For Windows)

1. **Install WSL2**:
   ```powershell
   wsl --install
   ```

2. **Install Ubuntu** (if not already installed):
   ```powershell
   wsl --install -d Ubuntu
   ```

3. **Inside WSL2 Ubuntu, install dependencies**:
   ```bash
   sudo apt-get update
   sudo apt-get install -y build-essential pkg-config libffi-dev libgmp-dev libssl-dev libtinfo-dev libsystemd-dev zlib1g-dev
   ```

4. **Install GHCup and Haskell**:
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://get-ghcup.haskell.org | sh
   source ~/.ghcup/env
   ghcup install ghc 8.10.7
   ghcup set ghc 8.10.7
   ```

5. **Install Cabal**:
   ```bash
   ghcup install cabal 3.6.2.0
   ghcup set cabal 3.6.2.0
   ```

6. **Install Cardano Node and CLI**:
   ```bash
   # Clone cardano-node repository
   git clone https://github.com/input-output-hk/cardano-node.git
   cd cardano-node
   
   # Checkout latest stable version
   git fetch --all --tags
   git checkout tags/8.1.2  # Use latest stable tag
   
   # Build
   cabal build all
   
   # Install
   cabal install cardano-cli cardano-node
   ```

### Option 3: Pre-built Binaries (Easiest for Windows)

1. **Download Pre-built Binaries**:
   - Visit: https://github.com/input-output-hk/cardano-node/releases
   - Download latest Windows release (if available)
   - OR use Linux binaries in WSL2

2. **Extract and Add to PATH**:
   ```powershell
   # Extract to a folder (e.g., C:\cardano-cli)
   # Add to PATH:
   $env:PATH += ";C:\cardano-cli"
   ```

### Option 4: Use Nix (Advanced)

If you have Nix installed:

```bash
nix-shell -p cardano-cli
```

## Verification

After installation, verify Cardano CLI:

```bash
cardano-cli --version
```

Expected output:
```
cardano-cli 8.1.2 - linux-x86_64 - ghc-8.10
git rev abc123...
```

## Configuration

### Set Up Testnet

1. **Create config directory**:
   ```bash
   mkdir -p ~/.cardano-testnet
   ```

2. **Download testnet config files**:
   ```bash
   cd ~/.cardano-testnet
   wget https://book.world.dev.cardano.org/environments/preprod/config.json
   wget https://book.world.dev.cardano.org/environments/preprod/topology.json
   wget https://book.world.dev.cardano.org/environments/preprod/byron-genesis.json
   wget https://book.world.dev.cardano.org/environments/preprod/shelley-genesis.json
   wget https://book.world.dev.cardano.org/environments/preprod/alonzo-genesis.json
   ```

3. **Set environment variable**:
   ```bash
   export CARDANO_NODE_SOCKET_PATH=~/.cardano-testnet/node.socket
   ```

## Quick Setup Script for Windows

Create `scripts/setup-cardano-cli.ps1`:

```powershell
# Cardano CLI Quick Setup Script
Write-Host "🔧 Setting up Cardano CLI..." -ForegroundColor Cyan

# Check if WSL2 is installed
$wslInstalled = Get-Command wsl -ErrorAction SilentlyContinue
if (-not $wslInstalled) {
    Write-Host "⚠️  WSL2 not found. Installing..." -ForegroundColor Yellow
    wsl --install
    Write-Host "✅ WSL2 installed. Please restart and run this script again." -ForegroundColor Green
    exit
}

Write-Host "✅ WSL2 is installed" -ForegroundColor Green

# Check if Docker is available (easier option)
$dockerInstalled = Get-Command docker -ErrorAction SilentlyContinue
if ($dockerInstalled) {
    Write-Host "✅ Docker is available - Recommended for Cardano CLI" -ForegroundColor Green
    Write-Host "   You can use: docker run -it --rm inputoutput/cardano-node:latest cardano-cli" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Use Docker (easiest): docker run -it --rm inputoutput/cardano-node:latest"
Write-Host "   2. OR install in WSL2: Follow Option 2 in docs/CARDANO_CLI_SETUP.md"
Write-Host ""
```

## Using Cardano CLI with Our Scripts

Once Cardano CLI is installed, you can:

1. **Compile contracts**:
   ```bash
   ./scripts/contracts/compile-contracts.sh
   ```

2. **Deploy to testnet**:
   ```bash
   node scripts/contracts/deploy-testnet.js
   ```

## Troubleshooting

### "Cardano CLI not found"

- **Windows**: Use WSL2 or Docker
- **Linux/Mac**: Install via package manager or build from source
- **Docker**: Use Docker container (easiest)

### "Permission denied"

```bash
chmod +x scripts/contracts/compile-contracts.sh
```

### "Cannot connect to node"

- Ensure Cardano node is running
- Check socket path: `$CARDANO_NODE_SOCKET_PATH`
- Verify network configuration

## Alternative: Use Blockfrost API

If Cardano CLI setup is too complex, you can use Blockfrost API for:
- Querying blockchain data
- Submitting transactions (if supported)
- Checking transaction status

Our system already uses Blockfrost for balance queries, so you can continue development without Cardano CLI for now.

## Resources

- **Cardano Node GitHub**: https://github.com/input-output-hk/cardano-node
- **Cardano Docs**: https://docs.cardano.org/
- **Testnet Info**: https://book.world.dev.cardano.org/
- **Docker Hub**: https://hub.docker.com/r/inputoutput/cardano-node


#!/bin/bash

# Compile Plutus Contracts Using Docker Aiken
# This script uses Docker to compile contracts without installing Aiken locally

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CONTRACTS_DIR="$PROJECT_ROOT/contracts"
BUILD_DIR="$PROJECT_ROOT/build"

echo "🔨 Compiling Contracts with Docker Aiken"
echo "========================================"
echo ""

# Create build directory
mkdir -p "$BUILD_DIR"

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker Desktop."
    exit 1
fi

echo "✅ Docker found"
echo ""

# Create temporary Aiken project structure
TEMP_DIR=$(mktemp -d)
echo "📦 Creating temporary Aiken project..."

cd "$TEMP_DIR"
aiken new temp_contracts 2>/dev/null || {
    # If aiken command not found, use Docker
    echo "Using Docker Aiken..."
    docker run --rm -v "$CONTRACTS_DIR:/contracts" -v "$BUILD_DIR:/build" \
        aikenlang/aiken:latest new temp_contracts || true
}

# Copy contract files
echo "📄 Copying contract files..."
for contract in PurseTransfer CharityDistribution GoalPledgeLock VaultLock LPPoolCreation; do
    if [ -f "$CONTRACTS_DIR/${contract}.hs" ]; then
        echo "  Copying ${contract}.hs..."
        # Copy to validators directory
        mkdir -p "$TEMP_DIR/temp_contracts/validators"
        cp "$CONTRACTS_DIR/${contract}.hs" "$TEMP_DIR/temp_contracts/validators/${contract}.aiken" 2>/dev/null || \
        cp "$CONTRACTS_DIR/${contract}.hs" "$TEMP_DIR/temp_contracts/validators/${contract}.hs"
    fi
done

# Build with Docker Aiken
echo ""
echo "🔨 Building contracts..."
docker run --rm \
    -v "$TEMP_DIR/temp_contracts:/workspace" \
    -v "$BUILD_DIR:/build" \
    -w /workspace \
    aikenlang/aiken:latest build

# Copy compiled files
echo ""
echo "📦 Copying compiled contracts..."
if [ -d "$TEMP_DIR/temp_contracts/build" ]; then
    cp -r "$TEMP_DIR/temp_contracts/build"/* "$BUILD_DIR/" 2>/dev/null || true
fi

# Cleanup
rm -rf "$TEMP_DIR"

echo ""
echo "✅ Compilation complete!"
echo "   Check build/ directory for compiled contracts"
echo ""


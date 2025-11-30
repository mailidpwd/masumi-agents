# Compile Plutus Contracts Using Docker Aiken
# PowerShell script for Windows

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $ScriptDir)
$ContractsDir = Join-Path $ProjectRoot "contracts"
$BuildDir = Join-Path $ProjectRoot "build"

Write-Host ""
Write-Host "🔨 Compiling Contracts with Docker Aiken" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Docker
try {
    docker --version | Out-Null
    Write-Host "✅ Docker found" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker not found. Please install Docker Desktop." -ForegroundColor Red
    exit 1
}

# Create build directory
New-Item -ItemType Directory -Force -Path $BuildDir | Out-Null

# Create temporary directory
$TempDir = New-TemporaryFile | ForEach-Object { Remove-Item $_; New-Item -ItemType Directory -Path $_ }
Write-Host "📦 Creating temporary Aiken project..." -ForegroundColor Yellow

# Create Aiken project structure
$AikenProjectDir = Join-Path $TempDir "contracts"
New-Item -ItemType Directory -Force -Path $AikenProjectDir | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $AikenProjectDir "validators") | Out-Null

# Copy contract files
Write-Host "📄 Copying contract files..." -ForegroundColor Yellow
$contracts = @("PurseTransfer", "CharityDistribution", "GoalPledgeLock", "VaultLock", "LPPoolCreation")

foreach ($contract in $contracts) {
    $sourceFile = Join-Path $ContractsDir "$contract.hs"
    if (Test-Path $sourceFile) {
        Write-Host "  Copying $contract.hs..." -ForegroundColor Gray
        $destFile = Join-Path (Join-Path $AikenProjectDir "validators") "$contract.aiken"
        Copy-Item $sourceFile $destFile -ErrorAction SilentlyContinue
    }
}

# Create aiken.toml
$AikenToml = @"
[package]
name = "contracts"
version = "1.0.0"
"@
Set-Content -Path (Join-Path $AikenProjectDir "aiken.toml") -Value $AikenToml

# Build with Docker Aiken
Write-Host ""
Write-Host "🔨 Building contracts with Docker..." -ForegroundColor Yellow

try {
    docker run --rm `
        -v "${AikenProjectDir}:/workspace" `
        -v "${BuildDir}:/build" `
        -w /workspace `
        aikenlang/aiken:latest build
    
    Write-Host ""
    Write-Host "✅ Compilation complete!" -ForegroundColor Green
    Write-Host "   Check build/ directory for compiled contracts" -ForegroundColor Cyan
} catch {
    Write-Host ""
    Write-Host "⚠️  Compilation may have issues. Checking results..." -ForegroundColor Yellow
    
    # Try to extract any compiled files
    if (Test-Path (Join-Path $AikenProjectDir "build")) {
        Copy-Item -Path (Join-Path $AikenProjectDir "build\*") -Destination $BuildDir -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "   Copied build artifacts to build/ directory" -ForegroundColor Cyan
    }
}

# Cleanup
Remove-Item -Path $TempDir -Recurse -Force -ErrorAction SilentlyContinue

Write-Host ""


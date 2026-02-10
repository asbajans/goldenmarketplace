# Docker Build & Test Script for Local Development
# Windows PowerShell

$ErrorActionPreference = "Stop"

# Colors
$colors = @{
    success = "Green"
    error   = "Red"
    warning = "Yellow"
    info    = "Cyan"
}

function Write-Status {
    param([string]$message, [string]$type = "info")
    $color = $colors[$type]
    Write-Host $message -ForegroundColor $color
}

Write-Host "`n🐳 Golden Crafters - Docker Build & Test" -ForegroundColor Cyan
Write-Host "=========================================`n"

# Check Docker
Write-Status "Checking Docker..." "info"
try {
    $dockerVersion = docker --version
    Write-Status "✓ Docker: $dockerVersion" "success"
} catch {
    Write-Status "✗ Docker not found! Install Docker Desktop." "error"
    exit 1
}

# Check Docker daemon
try {
    docker ps | Out-Null
    Write-Status "✓ Docker daemon running" "success"
} catch {
    Write-Status "✗ Docker daemon not running! Start Docker Desktop." "error"
    exit 1
}

# Paths
$projectRoot = (Get-Location).Path
$backendPath = "$projectRoot\backend"
$frontendPath = "$projectRoot\frontend"

Write-Host "`n📦 Building Docker Images...`n"

# Backend Build
Write-Status "1. Building Backend..." "info"
try {
    Push-Location $backendPath
    docker build -f Dockerfile.prod -t golden-api:latest .
    if ($LASTEXITCODE -eq 0) {
        Write-Status "✓ Backend built successfully" "success"
    } else {
        Write-Status "✗ Backend build failed" "error"
        exit 1
    }
    Pop-Location
} catch {
    Write-Status "✗ Backend build error: $_" "error"
    exit 1
}

# Seller Panel Build
Write-Status "2. Building Seller Panel..." "info"
try {
    Push-Location "$frontendPath\seller-panel"
    docker build -f Dockerfile -t golden-seller-panel:latest .
    if ($LASTEXITCODE -eq 0) {
        Write-Status "✓ Seller Panel built successfully" "success"
    } else {
        Write-Status "✗ Seller Panel build failed" "error"
        exit 1
    }
    Pop-Location
} catch {
    Write-Status "✗ Seller Panel build error: $_" "error"
    exit 1
}

# Admin Panel Build
Write-Status "3. Building Admin Panel..." "info"
try {
    Push-Location "$frontendPath\admin-panel"
    docker build -f Dockerfile -t golden-admin-panel:latest .
    if ($LASTEXITCODE -eq 0) {
        Write-Status "✓ Admin Panel built successfully" "success"
    } else {
        Write-Status "✗ Admin Panel build failed" "error"
        exit 1
    }
    Pop-Location
} catch {
    Write-Status "✗ Admin Panel build error: $_" "error"
    exit 1
}

# Marketplace Build
Write-Status "4. Building Marketplace..." "info"
try {
    Push-Location "$frontendPath\marketplace"
    docker build -f Dockerfile -t golden-marketplace:latest .
    if ($LASTEXITCODE -eq 0) {
        Write-Status "✓ Marketplace built successfully" "success"
    } else {
        Write-Status "✗ Marketplace build failed" "error"
        exit 1
    }
    Pop-Location
} catch {
    Write-Status "✗ Marketplace build error: $_" "error"
    exit 1
}

Write-Host "`n📊 Images Built Successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Images:" -ForegroundColor Yellow
docker images | Select-String "golden-" | ForEach-Object { Write-Host "  $_" }

Write-Host ""
Write-Host "✅ Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Test: docker run --rm -p 3000:3000 golden-api:latest"
Write-Host "  2. Tag:  docker tag golden-api:latest ghcr.io/USERNAME/golden-marketplace/backend:latest"
Write-Host "  3. Push: docker push ghcr.io/USERNAME/golden-marketplace/backend:latest"
Write-Host ""
Write-Host "Or push code to GitHub to trigger auto-build with GitHub Actions" -ForegroundColor Cyan
Write-Host ""

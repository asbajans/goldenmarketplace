# Docker & Build Files Verification Script
# PowerShell

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

Write-Host "`n📋 Golden Crafters - Docker Setup Verification" -ForegroundColor Cyan
Write-Host "==============================================`n"

$projectRoot = (Get-Location).Path
$passes = 0
$fails = 0

# Check Dockerfiles
Write-Status "Checking Dockerfiles..." "info"

$dockerfiles = @(
    "backend\Dockerfile",
    "backend\Dockerfile.prod",
    "frontend\marketplace\Dockerfile",
    "frontend\seller-panel\Dockerfile",
    "frontend\admin-panel\Dockerfile"
)

foreach ($file in $dockerfiles) {
    $path = Join-Path $projectRoot $file
    if (Test-Path $path) {
        Write-Status "  ✓ $file" "success"
        $passes++
    }
    else {
        Write-Status "  ✗ $file NOT FOUND" "error"
        $fails++
    }
}

# Check .dockerignore files
Write-Host ""
Write-Status "Checking .dockerignore files..." "info"

$dockerignores = @(
    ".dockerignore",
    "backend\.dockerignore",
    "frontend\marketplace\.dockerignore",
    "frontend\seller-panel\.dockerignore",
    "frontend\admin-panel\.dockerignore"
)

foreach ($file in $dockerignores) {
    $path = Join-Path $projectRoot $file
    if (Test-Path $path) {
        Write-Status "  ✓ $file" "success"
        $passes++
    } else {
        Write-Status "  ✗ $file NOT FOUND" "error"
        $fails++
    }
}

# Check build scripts
Write-Host ""
Write-Status "Checking PowerShell scripts..." "info"

$scripts = @(
    "build-docker.ps1",
    "push-docker-ghcr.ps1"
)

foreach ($script in $scripts) {
    $path = Join-Path $projectRoot $script
    if (Test-Path $path) {
        Write-Status "  ✓ $script" "success"
        $passes++
    } else {
        Write-Status "  ✗ $script NOT FOUND" "error"
        $fails++
    }
}

# Check GitHub Actions workflow
Write-Host ""
Write-Status "Checking GitHub Actions workflow..." "info"

$workflowPath = Join-Path $projectRoot ".github\workflows\docker-build.yml"
if (Test-Path $workflowPath) {
    Write-Status "  ✓ .github/workflows/docker-build.yml" "success"
    $passes++
} else {
    Write-Status "  ✗ GitHub Actions workflow NOT FOUND" "error"
    $fails++
}

# Check documentation
Write-Host ""
Write-Status "Checking documentation..." "info"

$docs = @(
    "DOCKER_BUILD_GUIDE.md",
    "DOCKER_BUILD_CHECKLIST.md",
    "DOCKER_BUILD_QUICKSTART.md"
)

foreach ($doc in $docs) {
    $path = Join-Path $projectRoot $doc
    if (Test-Path $path) {
        Write-Status "  ✓ $doc" "success"
        $passes++
    } else {
        Write-Status "  ✗ $doc NOT FOUND" "error"
        $fails++
    }
}

# Check git configuration
Write-Host ""
Write-Status "Checking git configuration..." "info"

try {
    $branch = git rev-parse --abbrev-ref HEAD
    $remote = git remote -v
    Write-Status "  ✓ Git branch: $branch" "success"
    Write-Status "  ✓ Git remote: $($remote | Select-Object -First 1)" "success"
    $passes += 2
} catch {
    Write-Status "  ✗ Git not configured or not in repo" "error"
    $fails++
}

# Check Docker
Write-Host ""
Write-Status "Checking Docker..." "info"

try {
    $dockerVersion = docker --version
    Write-Status "  ✓ Docker: $dockerVersion" "success"
    $passes++
} catch {
    Write-Status "  ✗ Docker not installed" "warning"
}

try {
    $psVersion = $PSVersionTable.PSVersion
    Write-Status "  ✓ PowerShell: $psVersion" "success"
    $passes++
} catch {
    Write-Status "  ✗ PowerShell version check failed" "warning"
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Status "Summary: $passes passed, $fails failed" "info"
Write-Host "========================================" -ForegroundColor Cyan

if ($fails -eq 0) {
    Write-Status "`n✅ All checks passed! Ready to build Docker images." "success"
    Write-Status "`nNext steps:" "info"
    Write-Host "  1. Option A: git push → GitHub Actions auto-builds"
    Write-Host "  2. Option B: .\build-docker.ps1 → .\push-docker-ghcr.ps1"
    Write-Host "`nChoose one and follow [DOCKER_BUILD_QUICKSTART.md]" -ForegroundColor Cyan
} else {
    Write-Status "`n❌ Some files are missing! Please check above." "error"
    Write-Host ""
}

Write-Host ""

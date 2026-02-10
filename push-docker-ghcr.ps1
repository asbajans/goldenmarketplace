# Docker Login & Push to GitHub Container Registry
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

Write-Host "`n🐳 Docker Push to GitHub Container Registry (GHCR)" -ForegroundColor Cyan
Write-Host "===================================================`n"

# Validate inputs
Write-Status "Enter your GitHub username:" "info"
$githubUser = Read-Host

Write-Status "Enter your Personal Access Token (PAT - with 'write:packages' scope):" "info"
$githubToken = Read-Host -AsSecureString
$plainToken = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToCoTaskMemUnicode($githubToken))

$registry = "ghcr.io"
$imageName = "$registry/$githubUser/golden-marketplace"

# Login to GHCR
Write-Status "`nLogging in to GitHub Container Registry..." "info"
$plainToken | docker login $registry -u $githubUser --password-stdin

if ($LASTEXITCODE -eq 0) {
    Write-Status "✓ Login successful" "success"
} else {
    Write-Status "✗ Login failed! Check your token." "error"
    exit 1
}

Write-Host ""
Write-Status "🏷️  Tagging Images..." "info"
Write-Host ""

# Tag images
@{
    "golden-api:latest" = "backend"
    "golden-seller-panel:latest" = "seller-panel"
    "golden-admin-panel:latest" = "admin-panel"
    "golden-marketplace:latest" = "marketplace"
} | ForEach-Object {
    $localImage = $_.Keys[0]
    $remoteImage = $_.Values[0]
    $fullTag = "$imageName/$remoteImage/latest"
    
    Write-Status "Tagging: $localImage → $fullTag" "info"
    docker tag $localImage $fullTag
    if ($LASTEXITCODE -eq 0) {
        Write-Status "✓ Tagged" "success"
    } else {
        Write-Status "✗ Tag failed" "error"
    }
}

Write-Host ""
Write-Status "📤 Pushing Images to GHCR..." "info"
Write-Host ""

# Push images
@(
    "$imageName/backend:latest",
    "$imageName/seller-panel:latest",
    "$imageName/admin-panel:latest",
    "$imageName/marketplace:latest"
) | ForEach-Object {
    $image = $_
    Write-Status "Pushing: $image" "info"
    docker push $image
    if ($LASTEXITCODE -eq 0) {
        Write-Status "✓ Pushed successfully" "success"
    } else {
        Write-Status "✗ Push failed" "error"
    }
    Write-Host ""
}

Write-Status "✅ All images pushed successfully!" "success"
Write-Host ""
Write-Status "Your images are available at:" "info"
Write-Host "  • $imageName/backend:latest"
Write-Host "  • $imageName/seller-panel:latest"
Write-Host "  • $imageName/admin-panel:latest"
Write-Host "  • $imageName/marketplace:latest"
Write-Host ""

# Logout
Write-Status "Logging out from GHCR..." "info"
docker logout $registry
Write-Status "✓ Logged out" "success"

Write-Host ""
Write-Status "💡 Next Steps:" "info"
Write-Host "  1. Update docker-compose.prod.yml with your image tags"
Write-Host "  2. Deploy to Portainer/Coolify with new image tags"
Write-Host "  3. Or enable GitHub Actions for CI/CD auto-push"
Write-Host ""

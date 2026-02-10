# 🚀 DOCKER BUILD - QUICK START

**Choose an option below and follow it:**

---

## ⭐ OPTION A: GitHub Actions (Recommended - Fastest)

### 3 Simple Commands:

```powershell
# 1. Navigate to project
cd "c:\Users\EXCALIBUR\Documents\golden crafters\golden-marketplace"

# 2. Commit and push
git add .
git commit -m "Add Docker images and GitHub Actions CI/CD"
git push origin main

# 3. Watch GitHub Actions auto-build all images
# GitHub → Actions → "Build & Push Docker Images"
# Wait 15-20 minutes...
# ✅ Done! Images auto-pushed to GHCR!
```

**What happens:**
- ✅ GitHub Actions detects push
- ✅ Builds 4 Docker images in parallel
- ✅ Auto-pushes to GHCR (GitHub Container Registry)
- ✅ No manual work needed!
- ⏱️ Total time: 15-20 minutes

---

## 💻 OPTION B: Local Build & Manual Push

### Step 1: Build Locally

```powershell
# PowerShell Admin required

cd "c:\Users\EXCALIBUR\Documents\golden crafters\golden-marketplace"

# Run build script
.\build-docker.ps1

# Wait 20-30 minutes for all builds...
# Then see: "✅ All builds successful!"
```

### Step 2: Push to GHCR

```powershell
# Run push script
.\push-docker-ghcr.ps1

# Script will ask for:
# 1. GitHub username
# 2. Personal Access Token (with write:packages)

# Wait 5-10 minutes...
# Then see: "✅ All images pushed successfully!"
```

**What happens:**
- ✅ Builds all 4 images locally
- ✅ Tags them with GHCR names
- ✅ Pushes to GitHub Container Registry
- ⏱️ Total time: 30-45 minutes

---

## 🎯 WHICH SHOULD YOU CHOOSE?

| Scenario | Best Option |
|----------|-------------|
| **First time, want easiest** | ⭐ Option A |
| **Want to test locally first** | Option B |
| **Both (recommended)** | A + B (CI/CD + Local testing) |

---

## 📊 Comparison

```
GitHub Actions (Option A):
  ✅ Fully automated
  ✅ No manual work
  ✅ Runs on GitHub servers (not your PC)
  ✅ Auto-tags (latest, main, sha, etc)
  ✅ Fastest setup
  ❌ Less control
  Time: 15 min

Local Build (Option B):
  ✅ Full control
  ✅ Test before push
  ✅ Works offline
  ✅ Fast feedback loop
  ❌ Uses your Windows PC resources
  ❌ Longer wait
  Time: 45 min
```

---

## ⚠️ Requirements Check

### For Option A (GitHub Actions):
```
✅ GitHub account
✅ Git installed
✅ Code in GitHub
✅ That's it!
```

### For Option B (Local Build):
```
✅ Docker Desktop installed & running
✅ 50GB+ disk space
✅ Internet connection
✅ PowerShell Admin access
✅ (Optional) GitHub PAT token
```

---

## 🔑 GitHub PAT Token (If using Option B)

**Only needed once:**

1. GitHub.com → Settings → Developer settings
2. Personal access tokens → Tokens (classic)
3. Generate new token
4. Check: `write:packages` + `read:packages`
5. Copy token
6. Save to password manager
7. Use in Step 2 above

---

## 📈 What Gets Built

```
4 Docker images created:

1. Backend API (Node.js)
   - Port: 3000
   - Size: ~250MB
   - Registry: ghcr.io/user/.../backend:latest

2. Seller Panel (React)
   - Port: 5173
   - Size: ~180MB
   - Registry: ghcr.io/user/.../seller-panel:latest

3. Admin Panel (React)
   - Port: 5174
   - Size: ~180MB
   - Registry: ghcr.io/user/.../admin-panel:latest

4. Marketplace (React)
   - Port: 5175
   - Size: ~180MB
   - Registry: ghcr.io/user/.../marketplace:latest
```

---

## ✅ Verify Images Built

### After Building:

```powershell
# Check Docker images (local)
docker images | Select-String "golden-"

# Expected output:
# golden-api                latest    abc123    1 min ago    250MB
# golden-seller-panel       latest    def456    1 min ago    180MB
# golden-admin-panel        latest    ghi789    1 min ago    180MB
# golden-marketplace        latest    jkl012    1 min ago    180MB
```

### After Pushing:

```powershell
# Check in GitHub (browser)
# GitHub → Packages → Container registry
# Should see 4 images with tags: latest, main, sha-...
```

---

## 🎬 NEXT STEPS

### After Images Are Built & Pushed:

1. ✅ Update `docker-compose.prod.yml` with new image tags
2. ✅ Go to Portainer (https://192.168.0.243:9443)
3. ✅ Update stack with new image tags
4. ✅ Pull latest images
5. ✅ Restart containers
6. ✅ Test endpoints: `curl https://yourdomain.com/api/health`
7. ✅ 🎉 Live!

---

## 📊 Timeline

```
Option A Timeline (GitHub Actions):
  T+0min:   git push
  T+2min:   GitHub Actions starts
  T+5min:   4 parallel builds begin
  T+15min:  Builds complete
  T+20min:  Images pushed to GHCR ✅

Option B Timeline (Local Build):
  T+0min:   .\build-docker.ps1
  T+30min:  All builds complete
  T+30min:  .\push-docker-ghcr.ps1
  T+40min:  Images pushed to GHCR ✅
```

---

## 📚 More Details

For detailed information, see:
- **[DOCKER_BUILD_GUIDE.md](DOCKER_BUILD_GUIDE.md)** ← Full guide
- **[DOCKER_BUILD_CHECKLIST.md](DOCKER_BUILD_CHECKLIST.md)** ← Checklist
- **[.github/workflows/docker-build.yml](.github/workflows/docker-build.yml)** ← CI/CD config

---

## 🆘 Troubleshooting

### "Docker not found"
→ Install Docker Desktop:
https://www.docker.com/products/docker-desktop

### "Build failed"
→ Check Docker logs:
```powershell
docker logs <container_id>
```

### "GitHub Actions failed"
→ Check GitHub Actions logs:
GitHub → Actions → Workflow job → Detailed logs

### "Push failed (401 Unauthorized)"
→ Token expired? Create new PAT at github.com/settings/tokens

---

## 🎯 READY?

### Pick an option and GO:

**⭐ RECOMMENDED:**
```powershell
git add .
git commit -m "Docker images ready"
git push origin main
# Wait 20 min → Done!
```

**OR**

**🔧 MANUAL:**
```powershell
.\build-docker.ps1
# Wait 30 min
.\push-docker-ghcr.ps1
# Enter credentials
# Wait 10 min → Done!
```

---

**Status:** ✅ Ready to build  
**Time:** 15-45 min depending on choice  
**Result:** 4 Docker images in GHCR  
**Next:** Deploy to Portainer  

**Let's go! 🐳**

---

*Guide: DOCKER_BUILD_QUICKSTART.md*  
*Date: February 10, 2026*  
*Platform: Windows + Docker + GitHub*

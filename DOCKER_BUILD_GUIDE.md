# 🐳 DOCKER BUILD & PUSH GUIDE

**Tarih:** February 10, 2026  
**Platform:** GitHub Container Registry (GHCR)  
**Otomasyoon:** GitHub Actions CI/CD  

---

## 📋 3 Seçenek

### Option 1: GitHub Actions (Tavsiye Edilen - Otomatik)
- ✅ Otomatik build & push
- ✅ Main branch'e push ettikçe otomatik
- ✅ Zero manual work
- ✅ Version tagging
- ⏱️ 5 dakika setup

### Option 2: Local Build + Manual Push
- ✅ Full kontrol
- ✅ Local test sonrası push
- ✅ Windows PowerShell scripts
- ⏱️ 10-15 dakika per build

### Option 3: Hybrid (Recommended)
- ✅ Local test (development)
- ✅ GitHub Actions (production)
- ✅ Best of both worlds
- ⏱️ Fast & reliable

---

## 🚀 OPTION 1: GitHub Actions (Otomatik)

### Adım 1: GitHub'a Push Et

```bash
cd "c:\Users\EXCALIBUR\Documents\golden crafters\golden-marketplace"
git add .
git commit -m "Add Docker images and GitHub Actions CI/CD"
git push origin main
```

### Adım 2: GitHub Actions Çalışacak

- Workflow file: `.github/workflows/docker-build.yml`
- Trigger: Kod push'ladığında otomatik
- Actions: 4 parallel build job
  - Backend
  - Seller Panel
  - Admin Panel
  - Marketplace

### Adım 3: Images GitHub'da Olacak

Otomatik olarak GHCR'ye push olacak:
```
ghcr.io/YOUR_USERNAME/golden-marketplace/backend:latest
ghcr.io/YOUR_USERNAME/golden-marketplace/seller-panel:latest
ghcr.io/YOUR_USERNAME/golden-marketplace/admin-panel:latest
ghcr.io/YOUR_USERNAME/golden-marketplace/marketplace:latest
```

---

## 💻 OPTION 2: Local Build (Manual)

### Adım 1: Docker Kurulu mu Kontrol Et

```powershell
docker --version
docker ps
```

Eğer hata alırsan: Docker Desktop başlat!

### Adım 2: Local Build Script Çalıştır

PowerShell'i Administrator olarak aç:

```powershell
# Windows PowerShell Admin
cd c:\Users\EXCALIBUR\Documents\golden crafters\golden-marketplace

# Build script çalıştır
.\build-docker.ps1
```

**Script ne yapar:**
1. Docker kontrol eder
2. Backend image build eder
3. 4 Frontend image build eder
4. Logs gösterir
5. Success/error bildiri

### Adım 3: Build Durumunu Kontrol Et

```powershell
docker images | Select-String "golden-"
```

Expected output:
```
REPOSITORY                    TAG       IMAGE ID      CREATED      SIZE
golden-api                    latest    abc123...    1 min ago    250MB
golden-marketplace            latest    def456...    1 min ago    180MB
golden-seller-panel           latest    ghi789...    1 min ago    180MB
golden-admin-panel            latest    jkl012...    1 min ago    180MB
```

### Adım 4: Local Test Et

```bash
# Backend API test
docker run --rm -p 3000:3000 golden-api:latest

# Another terminal:
curl http://localhost:3000/health
# Expected: {"status":"ok"}
```

### Adım 5: Push to GitHub

```powershell
# GitHub credentials gerekli
# Personal Access Token (PAT) ile

# Push script çalıştır
.\push-docker-ghcr.ps1

# Sorulacak:
# 1. GitHub username
# 2. Personal Access Token (with write:packages scope)
```

**What script does:**
1. GHCR login
2. Images'ı ghcr.io tag'la
3. GHCR'ye push et
4. Logout

---

## 🔑 GitHub Personal Access Token (PAT)

**Gerekli 1 kez:**

1. GitHub → Settings → Developer settings → Personal access tokens
2. "Generate new token" (classic)
3. Scopes check:
   - ☑️ `write:packages` (push images)
   - ☑️ `read:packages` (pull images)
   - ☑️ `delete:packages` (delete old)
4. Token copy et
5. Safely save (password manager)

---

## 📊 GitHub Actions Workflow

**File:** `.github/workflows/docker-build.yml`

**Triggers:**
- Main branch'e push
- Develop branch'e push
- PR açıldığında
- Manual trigger (workflow_dispatch)

**Paths:**
- Sadece backend/ değişmişse → backend build
- Sadece frontend/seller-panel/ değişmişse → seller-panel build
- Tamamı değişmişse → tüm 4 build

**Features:**
- Parallel builds (hızlı)
- Layer caching (ekonomik)
- Semantic versioning
- SHA tagging
- Latest tag (main branch)

---

## 🏗️ Docker Compose Integration

### Updated docker-compose.prod.yml

```yaml
services:
  api:
    image: ghcr.io/YOUR_USERNAME/golden-marketplace/backend:latest
    # ... rest config
  
  seller-panel:
    image: ghcr.io/YOUR_USERNAME/golden-marketplace/seller-panel:latest
    # ... rest config
  
  marketplace:
    image: ghcr.io/YOUR_USERNAME/golden-marketplace/marketplace:latest
    # ... rest config
  
  admin-panel:
    image: ghcr.io/YOUR_USERNAME/golden-marketplace/admin-panel:latest
    # ... rest config
```

### Portainer'de Deploy

```
Stacks → Add Stack → Paste docker-compose.prod.yml
Environment: GHCR_USERNAME=your_github_username
```

---

## ✅ Checklist

### Setup Aşaması
- [ ] GitHub'a push ettim
- [ ] GitHub Actions workflow başladı
- [ ] Actions → Jobs → waiting/completed
- [ ] Tüm 4 image build başladı

### Build Aşaması
- [ ] Backend build: ✓
- [ ] Seller Panel build: ✓
- [ ] Admin Panel build: ✓
- [ ] Marketplace build: ✓

### Push Aşaması
- [ ] GHCR login successful
- [ ] backend:latest pushed
- [ ] seller-panel:latest pushed
- [ ] admin-panel:latest pushed
- [ ] marketplace:latest pushed

### Verification
- [ ] GitHub Packages → Private/public?
- [ ] docker pull ghcr.io/username/golden-marketplace/backend:latest
- [ ] Docker images locally available
- [ ] docker-compose.prod.yml güncellenmiş
- [ ] Portainer'de deploy tested

---

## 🐛 Troubleshooting

### "Docker not found"
```
Çözüm: Docker Desktop yükle ve başlat
Windows: https://www.docker.com/products/docker-desktop
```

### "Cannot connect to Docker daemon"
```
Çözüm: 
1. Docker Desktop açık mı?
2. WSL2 working mı?
3. Restart Docker
```

### "Build failed: npm install timeout"
```
Çözüm:
1. internet connection kontrol
2. npm cache clean: docker builder prune
3. Dockerfile'da package-lock.json kontrol
```

### "GitHub Actions failed"
```
Çözüm:
1. GitHub Actions logs kontrol et
2. Dockerfile syntax error kontrol
3. paths: konfiguration kontrol et
```

### "GHCR push failed: 401 Unauthorized"
```
Çözüm:
1. PAT token kontrol (still valid?)
2. write:packages scope var mı?
3. Token expired? Yeni bir tane yap
4. Login properly: echo $PAT | docker login
```

### "Image layers too large"
```
Çözüm:
1. .dockerignore file oluştur
2. node_modules exclude et
3. Build cache optimize et
```

---

## 💾 Docker Images URLs

```
Backend (API):
  ghcr.io/YOUR_USERNAME/golden-marketplace/backend:latest
  ghcr.io/YOUR_USERNAME/golden-marketplace/backend:main
  ghcr.io/YOUR_USERNAME/golden-marketplace/backend:sha-abc123

Seller Panel:
  ghcr.io/YOUR_USERNAME/golden-marketplace/seller-panel:latest
  ghcr.io/YOUR_USERNAME/golden-marketplace/seller-panel:main

Admin Panel:
  ghcr.io/YOUR_USERNAME/golden-marketplace/admin-panel:latest
  ghcr.io/YOUR_USERNAME/golden-marketplace/admin-panel:main

Marketplace:
  ghcr.io/YOUR_USERNAME/golden-marketplace/marketplace:latest
  ghcr.io/YOUR_USERNAME/golden-marketplace/marketplace:main
```

---

## 📈 Version Strategy

### Tagging Scheme

```
Tag Format: ghcr.io/user/repo/service:TAG

Latest:    :latest         → Always main branch
Branch:    :main           → From main branch
           :develop        → From develop branch
Semantic:  :v1.0.0         → Git tag v1.0.0
SHA:       :sha-abc123     → Git commit SHA
```

### Example Workflow

```
git tag v1.0.0
git push origin v1.0.0

→ GitHub Actions triggers
→ Builds all images
→ Tags as :v1.0.0
→ Pushes to GHCR
```

---

## 🚀 Full Workflow (CI/CD)

```
Developer Push Code        →  git push origin main
          ↓
GitHub detects change     →  .github/workflows/docker-build.yml
          ↓
GitHub Actions starts     →  4 parallel jobs
          ↓
Build Backend             →  node:18-alpine → Dockerfile.prod
Build Frontends (x3)      →  node:18-alpine → Dockerfile
          ↓
Push to GHCR              →  ghcr.io/user/...
          ↓
Images Ready              →  docker pull & deploy
          ↓
Portainer deploys         →  Update image tag → Restart
          ↓
Live!                     →  🎉
```

---

## 📚 References

- **GitHub Container Registry:** https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- **Docker Build Action:** https://github.com/docker/build-push-action
- **GitHub Actions:** https://github.com/features/actions
- **Docker Best Practices:** https://docs.docker.com/develop/dev-best-practices/

---

## ✨ Next Steps

### Immediately
1. Local test: `.\build-docker.ps1`
2. GitHub push (triggers Actions)
3. Monitor Actions workflow
4. Verify images in GHCR

### This Week
1. Setup PAT token
2. Manual push test: `.\push-docker-ghcr.ps1`
3. Docker-compose.prod.yml update
4. Portainer deployment test

### This Month
1. Automate all builds with Actions
2. Setup dev/staging/prod environments
3. Version tagging strategy
4. Rollback procedures

---

## 📞 Summary

**Option 1 (GitHub Actions - Recommended):**
- Push code → Auto-build & push
- No manual work
- Best for production

**Option 2 (Local PowerShell - Development):**
- Full control
- Test before push
- Good for testing

**Option 3 (Hybrid - Best Practice):**
- Local test + GitHub Actions
- Fast & reliable
- DevOps best practice

---

**Status:** ✅ Docker build & push system ready  
**Next:** Push code to GitHub or run local build script  

**Let's build! 🐳**

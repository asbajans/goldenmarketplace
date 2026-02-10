# Vercel Deployment Guide

## ✅ Kurulum Adımları

### 1. GitHub'a Push Et
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/golden-marketplace.git
git push -u origin main
```

### 2. Vercel'e Bağlan
- https://vercel.com adresine git
- "Sign in with GitHub" tıkla
- Repository'ni import et

### 3. Frontend Deployment

#### Seller Panel
```bash
vercel --cwd=frontend/seller-panel
```

#### Admin Panel
```bash
vercel --cwd=frontend/admin-panel
```

#### Marketplace
```bash
vercel --cwd=frontend/marketplace
```

---

## Backend Deployment (Railway.app)

### 1. Railway'e Kaydol
- https://railway.app adresine git
- GitHub ile bağlan

### 2. Yeni Proje Oluştur
- "New Project" → "Deploy from GitHub repo"
- golden-marketplace repo seç
- Root directory: `backend`

### 3. Environment Variables
Railway dashboardda ekle:
```
DB_HOST=your_railway_postgres_host
DB_PORT=5432
DB_NAME=golden_marketplace
DB_USER=postgres
DB_PASSWORD=your_password
REDIS_URL=your_railway_redis_url
JWT_SECRET=your_secret
STRIPE_SECRET_KEY=sk_test_...
GOLD_API_KEY=your_key
```

### 4. PostgreSQL Ekle
- Railway project'inde "New" → "Database" → "PostgreSQL"
- Otomatik olarak `DATABASE_URL` oluşturulur

### 5. Redis Ekle
- Railway project'inde "New" → "Database" → "Redis"
- Otomatik olarak `REDIS_URL` oluşturulur

---

## Frontend Environment Variables

Her frontend app'in `.env.production` dosyası:

### Seller Panel (.env.production)
```
VITE_API_BASE_URL=https://your-backend-railway.railway.app/api
```

### Admin Panel (.env.production)
```
VITE_API_BASE_URL=https://your-backend-railway.railway.app/api
```

### Marketplace (.env.production)
```
VITE_API_BASE_URL=https://your-backend-railway.railway.app/api
```

---

## Deployed URLs

- **Seller Panel**: https://seller-panel-yourusername.vercel.app
- **Admin Panel**: https://admin-panel-yourusername.vercel.app
- **Marketplace**: https://marketplace-yourusername.vercel.app
- **Backend API**: https://your-backend-railway.railway.app

---

## Vercel Configuration (vercel.json)

Herbir frontend folder'da bu dosyayı oluştur:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "env": {
    "VITE_API_BASE_URL": "@vite_api_base_url"
  },
  "redirects": [
    {
      "source": "/:path*",
      "destination": "/"
    }
  ]
}
```

---

## GitHub Actions für Auto Deployment

Frontend'i push'landığında otomatik deploy:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy Seller Panel
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
        run: |
          npm i -g vercel
          vercel deploy --prod --cwd=frontend/seller-panel --token=$VERCEL_TOKEN
```

---

## Cost Estimation

- **Vercel Frontend**: Free (ucretsiz)
- **Railway Backend**: ~$5/month (Starter plan)
- **Total**: ~$5/month

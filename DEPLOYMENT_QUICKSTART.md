# 🚀 Deployment Quick Start

## ⚡ 5 Dakika Seçim Yap

### ✨ **Seçenek 1: Vercel (EN KOLAY)**
- Frontend: Vercel (Free)
- Backend: Railway ($5/month)
- Toplam: ~$5/month
- Kurulum: 15 dakika
- Skil: Kolay
- GitHub pushlama yeterli

**👉 [Vercel Guide'ı Aç](./DEPLOYMENT_VERCEL.md)**

---

### 🖥️ **Seçenek 2: Linux Sunucu (EN KONTROL)**
- Tüm: Self-hosted
- Sunucu: Linode/DigitalOcean ($5-20/month)
- Toplam: $5-20/month
- Kurulum: 1 saat
- Skil: Orta
- Full kontrol

**👉 [Linux Guide'ı Aç](./DEPLOYMENT_LINUX.md)**

---

### 🟣 **Seçenek 3: Fly.io (HIBRIT)**
- Frontend: Vercel
- Backend: Fly.io
- Toplam: ~$5/month
- Kurulum: 20 dakika
- Skil: Orta

**→ [Fly.io Deploy](#flyio-quick-setup)**

---

## ✅ Vercel ile 15 Dakika

### Adım 1: GitHub'a Push (2 dakika)
```bash
cd golden-marketplace
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/golden-marketplace.git
git push -u origin main
```

### Adım 2: Railway Setup (5 dakika)
1. https://railway.app → GitHub ile bağlan
2. "New Project" → Repository seç
3. Backend: `/backend` ayarla
4. PostgreSQL + Redis ekle
5. Environment variables (Railway dashboard'da):
   ```
   DB_HOST=your-postgres-host
   DB_NAME=golden_marketplace
   DB_USER=postgres
   DB_PASSWORD=....
   JWT_SECRET=your-secret
   STRIPE_SECRET_KEY=sk_...
   GOLD_API_KEY=...
   ```

### Adım 3: Vercel Deploy (5 dakika)
1. https://vercel.com → GitHub ile giriş yap
2. "New Project" → Repository seç
3. Seller Panel:
   - Framework: React
   - Root Directory: `frontend/seller-panel`
   - Build: `npm run build`
   - Env: `VITE_API_BASE_URL=https://your-backend.railway.app/api`
   - **Deploy**

4. Admin Panel aynı şekilde
5. Marketplace aynı şekilde

### Selesai! ✨
- Seller: `https://seller-panel.vercel.app`
- Admin: `https://admin-panel.vercel.app`
- Marketplace: `https://marketplace.vercel.app`
- Backend: `https://golden-api.railway.app`

---

## 🖥️ Linux ile 1 Saat

### Adım 1: Server Hazırlık (15 dakika)
```bash
# SSH ile bağlan
ssh root@your_server_ip

# System update
sudo apt update && sudo apt upgrade -y

# Node, PostgreSQL, Redis kur
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs postgresql redis-server git nginx

# Services başlat
sudo systemctl start postgresql redis-server nginx
```

### Adım 2: App Deploy (30 dakika)
```bash
cd /var/www
git clone https://github.com/YOUR_USERNAME/golden-marketplace.git
cd golden-marketplace

# Backend
cd backend
npm install --production
npm run build

# PM2 ile start
sudo npm install -g pm2
pm2 start dist/server.js --name "golden-api"
pm2 startup
pm2 save

cd ../frontend/seller-panel
npm install --production
npm run build

cd ../admin-panel
npm install --production
npm run build

cd ../marketplace
npm install --production
npm run build
```

### Adım 3: Nginx Setup (10 dakika)
```bash
# API proxy
sudo tee /etc/nginx/sites-available/api << EOF
server {
    listen 80;
    server_name api.yourdomain.com;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOF

# Frontend
sudo tee /etc/nginx/sites-available/frontend << EOF
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/golden-marketplace/frontend/marketplace/dist;
    
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://127.0.0.1:3000;
    }
}
EOF

# Enable & restart
sudo ln -s /etc/nginx/sites-available/api /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/frontend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Adım 4: SSL Setup (5 dakika)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com -d yourdomain.com
```

### Selesai! ✨
- API: `https://api.yourdomain.com`
- Frontend: `https://yourdomain.com`

---

## 🟣 Fly.io Quick Setup

### 1. CLI Kur
```bash
brew install flyctl  # Mac
curl -L https://fly.io/install.sh | sh  # Linux/WSL
```

### 2. Backend Deploy
```bash
cd golden-marketplace/backend
fly auth login
fly launch
# Soruları cevapla
fly secrets set \
  DB_HOST=your_db \
  JWT_SECRET=secret \
  STRIPE_SECRET_KEY=sk_...

fly deploy
```

### 3. Frontend Deploy (Vercel)
```bash
# Adım 1 ve 2'deki Vercel steps
```

---

## 📊 Karşılaştırma Tablosu

| Feature | Vercel | Linux | Fly.io |
|---------|--------|-------|--------|
| Frontend | Free | $5+ | $5+ |
| Backend | Railway $5 | $5-20 | Free |
| Kurulum | 15 min | 60 min | 20 min |
| Skil | Kolay | Orta | Orta |
| Kontrol | Az | Çok | Orta |
| Support | ✅ | İnternette | ✅ |

---

## ⚠️ Önemli: Environment Variables

Hiçbir zaman bu dosyalarda gizli bilgi saklamayın:
- `.env` dosyasını `.gitignore`'a ekle ✅
- Production secret'ları platform dashboard'da kur ✅
- API keys'i hardcode etme ❌
- Public repo'da secret yapıştırma ❌

---

## 🔗 Sonraki Adımlar

1. **Bir seçenek seç** (Vercel önerilir)
2. **Seçtiğin guide'ı takip et**
3. **Domain al** (opcional)
4. **SSL sertifika kur**
5. **Custom domain bağla**
6. **API testing yap**

---

## 📞 Problem?

- **Vercel sorun**: https://vercel.com/docs
- **Railway sorun**: https://railway.app/docs
- **Linux sorun**: `journalctl -u nginx -n 20`
- **PM2 sorun**: `pm2 logs`

---

**Başlamaya hazır? Seç ve başlayalım!** 🚀

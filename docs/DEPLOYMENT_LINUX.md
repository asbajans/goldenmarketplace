# Linux Sunucusu Deployment Guide

## 📋 Ön Gereksinimler

- Ubuntu 20.04 LTS veya üzeri
- Root veya sudo erişimi
- Domain adı (optional)
- SSH erişimi

---

## 🚀 Server Kurulumu

### 1. Sistem Güncelleştir
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git nano build-essential
```

### 2. Node.js Kur (v18)
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node --version
npm --version
```

### 3. PostgreSQL Kur
```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# PostgreSQL user oluştur
sudo -u postgres createuser golden_user
sudo -u postgres createdb golden_marketplace -O golden_user

# Password ayarla
sudo -u postgres psql
\password golden_user
# Password gir: golden_secure_password_123
\q
```

### 4. Redis Kur
```bash
sudo apt install -y redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
redis-cli ping  # Should return PONG
```

### 5. Nginx Kur (Reverse Proxy)
```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

## 📦 Uygulamayı Deploy Et

### 1. Repository Klonla
```bash
cd /var/www
sudo git clone https://github.com/yourusername/golden-marketplace.git
cd golden-marketplace
sudo chown -R $USER:$USER .
```

### 2. Backend Kurulumu

```bash
cd backend

# Dependencies yükle
npm install --production

# .env dosyasını oluştur
cat > .env << EOF
NODE_ENV=production
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=golden_marketplace
DB_USER=golden_user
DB_PASSWORD=golden_secure_password_123

REDIS_URL=redis://localhost:6379

JWT_SECRET=your-super-secret-key-change-this
JWT_EXPIRY=7d

STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx

GOLD_API_URL=https://api.goldapi.io/api/XAU/USD
GOLD_API_KEY=your_gold_api_key

LOG_LEVEL=info
EOF

# TypeScript build
npm run build
```

### 3. PM2 ile Backend Yönet
```bash
sudo npm install -g pm2

# Backend'i start et
pm2 start dist/server.js --name "golden-api" --env production

# Startup'a ekle
pm2 startup
pm2 save
```

### 4. Frontend Build

```bash
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

---

## 🌐 Nginx Konfigürasyonu

### Backend API Proxy
```bash
sudo nano /etc/nginx/sites-available/golden-api
```

Ekle:
```nginx
upstream golden_backend {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name api.golden-marketplace.com;

    location / {
        proxy_pass http://golden_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # CORS headers
    add_header 'Access-Control-Allow-Origin' '*' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
}
```

Enable et:
```bash
sudo ln -s /etc/nginx/sites-available/golden-api /etc/nginx/sites-enabled/
```

### Frontend Apps
```bash
sudo nano /etc/nginx/sites-available/golden-frontend
```

Ekle:
```nginx
# Seller Panel
server {
    listen 80;
    server_name seller.golden-marketplace.com;
    root /var/www/golden-marketplace/frontend/seller-panel/dist;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}

# Admin Panel
server {
    listen 80;
    server_name admin.golden-marketplace.com;
    root /var/www/golden-marketplace/frontend/admin-panel/dist;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}

# Marketplace
server {
    listen 80;
    server_name golden-marketplace.com;
    root /var/www/golden-marketplace/frontend/marketplace/dist;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://127.0.0.1:3000;
    }
}
```

Enable et:
```bash
sudo ln -s /etc/nginx/sites-available/golden-frontend /etc/nginx/sites-enabled/
```

### Nginx Testa & Restart
```bash
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🔒 SSL/TLS Certificate (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx

# Certificate al
sudo certbot --nginx -d api.golden-marketplace.com
sudo certbot --nginx -d seller.golden-marketplace.com
sudo certbot --nginx -d admin.golden-marketplace.com
sudo certbot --nginx -d golden-marketplace.com

# Auto renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

---

## 📊 Server Monitoring

### PM2 Monitor
```bash
# PM2 Plus hesabı (optional)
pm2 install pm2-auto-pull

# Status kontrol
pm2 status
pm2 logs golden-api
```

### Disk & Memory
```bash
# Real-time monitoring
watch -n 1 'free -h && df -h'

# Disk usage
du -sh /var/www/golden-marketplace

# Network
netstat -tulpn | grep LISTEN
```

### Backup Script
```bash
#!/bin/bash
# /home/backups/backup-golden.sh

BACKUP_DIR="/home/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Database backup
pg_dump -U golden_user golden_marketplace > $BACKUP_DIR/db_backup_$DATE.sql

# Files backup
tar -czf $BACKUP_DIR/files_backup_$DATE.tar.gz /var/www/golden-marketplace

# Keep only last 7 days
find $BACKUP_DIR -name "db_backup_*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "files_backup_*.tar.gz" -mtime +7 -delete
```

Cron job:
```bash
0 2 * * * /home/backups/backup-golden.sh
```

---

## 🔄 Updates & Maintenance

### Backend Update
```bash
cd /var/www/golden-marketplace
git pull origin main
cd backend
npm install
npm run build
pm2 restart golden-api
```

### Frontend Update
```bash
cd /var/www/golden-marketplace/frontend/seller-panel
git pull origin main
npm install
npm run build
# Nginx otomatik yeni dosyaları serve eder
```

---

## 🧪 Health Check

Backend sağlık kontrolü:
```bash
curl http://api.golden-marketplace.com/health
# Response: {"status":"OK","timestamp":"2026-02-05T..."}
```

---

## 📈 Performance Tips

1. **Database Indexing**
   ```sql
   CREATE INDEX idx_products_store ON products(storeId);
   CREATE INDEX idx_products_category ON products(category);
   CREATE INDEX idx_subscriptions_user ON subscriptions(userId);
   ```

2. **Redis Caching**
   - Product listings'i cache'le
   - Gold prices'ı cache'le

3. **Nginx Caching**
   ```nginx
   proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=golden_cache:10m;
   proxy_cache golden_cache;
   proxy_cache_valid 200 10m;
   ```

4. **CDN (Optional)**
   - Static files için CloudFlare CDN
   - Image optimization

---

## 🚨 Troubleshooting

### Backend down
```bash
pm2 status
pm2 logs golden-api
pm2 restart golden-api
```

### Database connection error
```bash
psql -U golden_user -d golden_marketplace
SELECT version();
```

### Nginx error
```bash
sudo journalctl -u nginx -n 50
sudo nginx -t
```

---

## Final Checklist

- [ ] Node.js v18 kurulu
- [ ] PostgreSQL kurulu & çalışıyor
- [ ] Redis kurulu & çalışıyor
- [ ] .env dosyası düzenlenmiş
- [ ] Backend build & PM2 start
- [ ] Frontends build
- [ ] Nginx configured & SSL
- [ ] Domain DNS records
- [ ] Firewall rules (ufw)
- [ ] Backup script kurulu

---

## Cost Estimation

**Aylık:** $5-20 (Sunucu türüne göre)
- Linode/DigitalOcean: $5-20/month
- Unlimited traffic & storage

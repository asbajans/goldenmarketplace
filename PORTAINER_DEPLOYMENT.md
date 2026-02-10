# 🖥️ PORTAINER + CLOUDFLARE TUNNEL DEPLOYMENT GUIDE
# Local Ubuntu 22 Server - En Kolay Yöntem

**Sunucunuz:** 192.168.0.243  
**Setup:** Portainer + CasaOS + Cloudflare Tunnel  
**Veritabanı:** Docker (PostgreSQL + Redis)  
**Yöntem:** Portainer GUI (Terminal yok!)  

---

## ⚡ 30 Dakikada Kurulum (Quick Setup)

### Step 1: Portainer'e Giriş

1. **Tarayıcıda aç:**
   ```
   https://192.168.0.243:9443
   ```

2. **Login et**
   - Kullanıcı: admin (ya da senin kullanıcı adın)
   - Şifre: (CasaOS'de ayarladığın şifre)

3. **"Stacks" kısmına git**
   - Sol menüde "Stacks" → "Add Stack"

---

### Step 2: Docker Compose Stack Oluştur

1. **Stack ismi:** `golden-marketplace`

2. **Web Editor'e paste et:**

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: golden-postgres
    restart: always
    environment:
      POSTGRES_USER: golden_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: golden_marketplace
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U golden_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: golden-redis
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Node.js Backend API
  api:
    image: node:18-alpine
    container_name: golden-api
    restart: always
    working_dir: /app
    
    # GitHub'dan kod indir
    command: sh -c "
      git clone https://github.com/YOUR_USERNAME/golden-marketplace.git . &&
      cd backend &&
      npm install &&
      npm run build &&
      npm start
    "
    
    volumes:
      - ./app:/app
    
    ports:
      - "3000:3000"
    
    environment:
      # Database
      DATABASE_URL: postgresql://golden_user:${DB_PASSWORD}@postgres:5432/golden_marketplace
      
      # Redis
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      
      # JWT
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRE: 7d
      
      # Stripe
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}
      STRIPE_PUBLISHABLE_KEY: ${STRIPE_PUBLISHABLE_KEY}
      
      # Gold Price API
      GOLD_PRICE_API_KEY: ${GOLD_PRICE_API_KEY}
      
      # App
      NODE_ENV: production
      PORT: 3000
      FRONTEND_URL: ${FRONTEND_URL}
    
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local

networks:
  default:
    name: golden-network
    driver: bridge
```

---

### Step 3: Environment Variables Ayarla

Portainer'de **Environment variables** kısmına bunları gir:

```
DB_PASSWORD=your_secure_db_password_here_123!
REDIS_PASSWORD=your_secure_redis_password_here_456!
JWT_SECRET=your_super_secret_jwt_key_very_long_and_random_7890!
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
GOLD_PRICE_API_KEY=your_api_key_if_have_one
FRONTEND_URL=https://yourdomain.com
```

**Önemli:** Güçlü şifreler kullan! (En az 16 karakter, özel karakterler)

---

### Step 4: Deploy Et

1. **Portainer'de "Deploy the stack" butonuna tıkla**

2. **Kurulum süresi:** 3-5 dakika
   - PostgreSQL yükleniyor
   - Redis yükleniyor
   - Node.js yükleniyor
   - Backend build/start

3. **Logs'u kontrol et:**
   - Portainer → Containers → golden-api
   - "Logs" tab'ında hata var mı kontrol et

---

### Step 5: Frontend Deploy Seçeneği

#### Option A: Portainer'de Frontend Deploy (Kolay)

```yaml
frontend:
  image: node:18-alpine
  container_name: golden-marketplace-ui
  restart: always
  working_dir: /app
  
  command: sh -c "
    git clone https://github.com/YOUR_USERNAME/golden-marketplace.git . &&
    npm install &&
    cd frontend/marketplace &&
    npm install &&
    npm run build &&
    npm install -g serve &&
    serve -s dist -l 5173
  "
  
  ports:
    - "5173:5173"
  
  environment:
    REACT_APP_API_URL: https://api.yourdomain.com
    NODE_ENV: production
```

#### Option B: Dışarıda Hosting (Vercel/Netlify)

Daha kolay olabilir. Frontend'leri Vercel'de barındırabilirsin.

---

## 🌐 Cloudflare Tunnel Ayarları

Cloudflareed zaten kurulu olduğuna göre:

### Backend (API)

1. **Cloudflare Dashboard açık:**
   - Zero Trust → Networks → Tunnels

2. **Tunnel config dosyanı düzenle:**
   ```yaml
   ingress:
     # API
     - hostname: api.yourdomain.com
       service: http://localhost:3000
     
     # Frontend (eğer PortainerHandler'de ise)
     - hostname: yourdomain.com
       service: http://localhost:5173
     
     # Portainer GUI (isteğe bağlı)
     - hostname: portainer.yourdomain.com
       service: https://localhost:9443
     
     # Catch-all
     - service: http_status:404
   ```

3. **Restart cloudflared:**
   ```bash
   sudo systemctl restart cloudflared
   ```

---

## ✅ Health Check

### Kontrol Et:

1. **Backend sağlıklı mı?**
   ```bash
   curl https://api.yourdomain.com/health
   # Dönen: {"status":"ok"}
   ```

2. **Frontend yükleniyor mu?**
   ```bash
   curl https://yourdomain.com
   # Dönen: HTML (React app)
   ```

3. **Database bağlantısı?**
   - Portainer → Logs → golden-api
   - "Database connection successful" mesajı ara

4. **Redis bağlantısı?**
   - Portainer → Logs → golden-api
   - "Redis connection successful" mesajı ara

---

## 📊 Portainer Container Management

### Logs Kontrol (Hata Debugging)

```
Portainer → Containers → golden-api → Logs
```

Eğer hata varsa:
- PostgreSQL bağlantı hatası?
- Node dependency hatası?
- Environment variable eksik mi?

### Restart Container

```
Portainer → Containers → golden-api → Restart
```

### Volume Data Kontrol

```
Portainer → Volumes
├─ postgres_data (veritabanı)
└─ redis_data (cache)
```

---

## 🔧 Eğer Hata Yaşarsan

### Hata 1: "PostgreSQL connection failed"
```yaml
Çözüm:
1. Portainer → Containers → golden-postgres
2. Logs'u kontrol et
3. Restart et
4. 10 saniye bekle
5. API restart et
```

### Hata 2: "Node modules not found"
```yaml
Çözüm:
1. Backend kodu GitHub'da mı?
2. Repository public mi?
3. API container restart et
4. Logs'u kontrol et
```

### Hata 3: "npm start failed"
```yaml
Çözüm:
1. package.json'da "start" script var mı?
2. Backend/package.json kontrol et:
   "scripts": {
     "start": "node dist/server.js",
     "build": "tsc"
   }
```

### Hata 4: "Frontend 404 error"
```yaml
Çözüm:
1. REACT_APP_API_URL doğru mu?
2. API URL'sini kontrol et:
   https://api.yourdomain.com
3. Frontend .env dosyasını kontrol et
```

---

## 🚀 Sonraki Adımlar (After Deployment)

### 1. Database Migrate Et (İlk Çalıştırıldığında)
```bash
# Portainer'de terminal aç:
docker exec -it golden-api npm run migrate
```

### 2. Test Yap
- Portainer UI açık
- API logs kontrol et
- Frontend yüklendiğini test et
- Login test et

### 3. SSL Sertifikası (Cloudflare Tunnel bunu yapıyor!)
- ✅ HTTPS zaten aktif (cloudflared sayesinde)
- ✅ SSL sertifikası otomatik

### 4. Backups Ayarla
```bash
# Portainer'de cron job oluştur:
1. postgres_data volume'ünü yedekle
2. Günde 1 kez backup
3. NAS'a ya da buluta gönder
```

---

## 💡 İpuçları

✅ **Portainer avantajları:**
- GUI ile yönetim (terminal yok)
- Logs gerçek zamanlı
- Container restart 1 tıkla
- Environment variables düzenlemesi kolay
- Volumes yönetimi kolay

✅ **Cloudflare Tunnel avantajları:**
- HTTPS otomatik
- Firewall açmaya gerek yok
- DDoS koruması
- IP gizli kalıyor

✅ **Docker Compose avantajları:**
- Tüm servisler bir yerde
- Health checks otomatik
- Auto-restart kurulu
- Kolay scale

---

## 📋 Kontrol Listesi

Deploy öncesi:
- [ ] Portainer açıyorum (https://192.168.0.243:9443)
- [ ] Login ediyorum
- [ ] Stack → Add Stack
- [ ] Docker Compose paste ediyorum
- [ ] Environment variables giriyorum
- [ ] GitHub URL'sini güncelliyorum
- [ ] Deploy tıklıyorum

Deploy sonrası:
- [ ] Container'lar çalışıyor mu? (Portainer → Containers)
- [ ] Logs hatası yok mu?
- [ ] Health check geçiyor mu?
- [ ] Frontend yükleniyor mu?
- [ ] API /health endpoint çalışıyor mu?
- [ ] Cloudflare tunnel bağlantısı?

---

## 🎯 Tahmini Zaman

```
Step 1: Portainer login          : 1 min
Step 2: Docker Compose paste     : 2 min
Step 3: Environment variables    : 2 min
Step 4: Deploy başlat            : 1 min
Step 5: Kurulum süresi           : 5 min
Step 6: Health check             : 2 min
────────────────────────────────────────
Total                            : ~15 min
```

---

## 🆘 Yardıma İhtiyacın mı?

Sorun yaşarsan:
1. Portainer Logs tab'ını aç
2. Error message'ı oku
3. Bana error message'ı gönder
4. Hızlıca çözeriz!

---

## 📞 Hazır mısın?

Başlamak için:

1. **GitHub'a push et:**
   ```bash
   cd "c:\Users\EXCALIBUR\Documents\golden crafters\golden-marketplace"
   git add .
   git commit -m "Ready for Portainer deployment"
   git push
   ```

2. **Portainer aç:**
   ```
   https://192.168.0.243:9443
   ```

3. **Bu rehberi takip et**

4. **15 dakika sonra live olursun!**

---

**Hazır? Başlayalım!** 🚀

Sorular varsa sor, hemen cevaplarım!

---

*Not: Eğer frontend de Docker'da çalıştırırsan Portainer'in arayüzünde Nginx reverse proxy kurman gerekebilir ama şu an basit tutuyoruz.*

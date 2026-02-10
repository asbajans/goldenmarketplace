# ⚡ PORTAINER QUICK START - 15 Dakika

**Sunucu:** 192.168.0.243  
**Cloudflare:** Cloudflared tunnel aktif  
**Hedef:** Docker Compose ile deploy  

---

## 🎯 5 ADIM (5 STEPS)

### ✅ ADIM 1: Portainer Aç (1 dakika)

Tarayıcıda aç:
```
https://192.168.0.243:9443
```

Login:
- Kullanıcı: admin
- Şifre: (CasaOS'de ayarladığın şifre)

**Bitti!** ✓

---

### ✅ ADIM 2: Stack Oluştur (1 dakika)

1. Sol menüde **"Stacks"** → **"Add Stack"**
2. Stack Name: `golden-marketplace`
3. **"Web editor"** seçini klikla

**Bitti!** ✓

---

### ✅ ADIM 3: Docker Compose Yapıştır (2 dakika)

Aşağıdaki dosyayı **Portainer'in Web Editor'ine** kopyala-yapıştır:

```yaml
version: '3.8'

services:
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

  api:
    image: node:18-alpine
    container_name: golden-api
    restart: always
    working_dir: /app
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
      DATABASE_URL: postgresql://golden_user:${DB_PASSWORD}@postgres:5432/golden_marketplace
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRE: 7d
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}
      STRIPE_PUBLISHABLE_KEY: ${STRIPE_PUBLISHABLE_KEY}
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

**ÖNEMLI:** `YOUR_USERNAME` yerine GitHub kullanıcı adını yazmalısın!

**Bitti!** ✓

---

### ✅ ADIM 4: Environment Variables Gir (3 dakika)

Portainer'in "Environment variables" kısmında şunları gir:

```
DB_PASSWORD=Guclu123!Sifre456789
REDIS_PASSWORD=RedisPass789!Guclu
JWT_SECRET=cok_uzun_ve_karmasik_jwt_secret_key_min_32_karakter_olsun_ust_uste
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx (opsiyonel)
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx (opsiyonel)
FRONTEND_URL=https://yourdomain.com
```

**Şifreler için:**
- En az 8 karakter
- Büyük harf, küçük harf, sayı, özel karakter
- Kimse kullanmasın
- Not et (backup olarak saklasın)

**Bitti!** ✓

---

### ✅ ADIM 5: Deploy (8 dakika)

1. Portainer'de **"Deploy the stack"** butonuna tıkla
2. Kurulum başlayacak (3-5 dakika)
3. Logs sekmesinde kontrol et:
   - PostgreSQL başladı mı?
   - Redis başladı mı?
   - Node kuruldu mu?
   - Build başladı mı?

4. **Logs'ta "listening on port 3000" görürsen = SUCCESS!** ✅

**Bitti!** ✓

---

## 🔍 Test Et (2 dakika)

### 1. API Health Check
```bash
curl https://yourdomain.com/api/health
# Dönen: {"status":"ok"}
```

### 2. Portainer'de Kontrol
- Portainer → Containers
- Gördüğün containers:
  - ✅ golden-postgres (çalışıyor)
  - ✅ golden-redis (çalışıyor)
  - ✅ golden-api (çalışıyor)

### 3. Logs Kontrol
- golden-api → Logs
- "Listening on port 3000" mesajı varsa = ÇALIŞIYOR! ✅

---

## ❌ Hata Yaşarsan

### Hata 1: "PostgreSQL failed to start"
```
Çözüm:
1. Portainer → golden-postgres → Logs
2. Error mesajı oku
3. Restart container (Restart butonuna tıkla)
4. 10 saniye bekle
5. API restart et
```

### Hata 2: "npm start failed"
```
Çözüm:
1. Backend/package.json'a bakıp "start" script var mı kontrol et
2. GitHub repo public mu?
3. API logs'ta hata detayını oku
4. Backend folder'de "npm start" var mı?
```

### Hata 3: "Connection refused"
```
Çözüm:
1. Port 3000 kullanımda mı? (sudo lsof -i :3000)
2. Firewall engellemiş mi?
3. API container çalışıyor mu? (docker ps)
```

### Hata 4: "Module not found"
```
Çözüm:
1. package.json dosyası var mı?
2. Dependencies kurulmuş mu?
3. GitHub repo structure doğru mu?
```

---

## 📊 Cloudflare Tunnel Ayarı

Cloudflared zaten kurulu olduğundan:

1. **Cloudflare Dashboard açık:**
   ```
   Zero Trust → Networks → Tunnels
   ```

2. **Config dosyasını düzenle:**
   ```yaml
   ingress:
     - hostname: api.yourdomain.com
       service: http://localhost:3000
     
     - hostname: yourdomain.com
       service: http://localhost:5173  # Frontend (opsiyonel)
     
     - service: http_status:404
   ```

3. **Restart et:**
   ```bash
   sudo systemctl restart cloudflared
   ```

**HTTPS zaten aktif!** ✅

---

## 📈 Backend Database Migrate (İlk Kurulumda)

Eğer database migrations gerekiyorsa:

```bash
# Portainer'de Containers → golden-api → Console

# Ya da terminal'den:
docker exec -it golden-api npm run migrate
```

---

## 📋 Özet

```
⏱️  Total Time: ~15 minutes

Step 1: Portainer login        1 min   ✓
Step 2: Stack oluştur          1 min   ✓
Step 3: Docker Compose paste   2 min   ✓
Step 4: Env variables          3 min   ✓
Step 5: Deploy                 1 min   ✓
Step 6: Kurulum süresi         5 min   ✓
Step 7: Test                   2 min   ✓
────────────────────────────────────────
Total                         15 min   ✓

✅ LIVE!
```

---

## 🎉 Başarı Göstergeleri

✅ Tüm containers çalışıyor (Portainer Containers tab'ında)
✅ API health check geçiyor (`/health` endpoint)
✅ Logs'ta error yok
✅ PostgreSQL database bağlandı
✅ Redis cache bağlandı
✅ Cloudflare Tunnel üzerinden erişim var

---

## 📞 Sonraki Adımlar

Eğer tüm testler geçtiyse:

1. **Frontend Deploy (opsiyonel)**
   - Vercel'de host et (daha kolay)
   - Veya Docker'da Portainer'de çalıştır

2. **API Calls Test**
   - Login endpoint test et
   - Product endpoint test et
   - Database'den data dön mü?

3. **Backups Ayarla**
   - postgres_data volume'ünü yedekle
   - Günde 1 kez backup

4. **Monitoring Kurulumı**
   - Uptime robot
   - Sentry (error tracking)

---

## 🆘 Yardım

Hala sorun yaşıyorsan:
1. Logs sekmesini aç
2. Error mesajını oku
3. Google'la
4. Bana error message'ı gönder

---

**HAZIR? BAŞLA!** 🚀

1. Portainer aç: https://192.168.0.243:9443
2. Bu guide'ı takip et
3. 15 dakika sonra LIVE!

---

*Not: Eğer "npm install" timeout alırsan, image'ı değiştir: node:18-alpine → node:18-slim (daha büyük ama daha hızlı)*

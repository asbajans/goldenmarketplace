# Deployment Rehberi

Golden Marketplace'ı Portainer + Cloudflare Tunnel ile sunucuya kurma kılavuzu.

---

## Gereksinimler

| Yazılım         | Min. Versiyon |
|-----------------|---------------|
| Docker          | 20+           |
| Docker Compose  | 2.0+          |
| Portainer       | 2.x           |
| cloudflared     | Kurulu        |

---

## 1. Port Yapısı

| Servis          | Port  | Cloudflare Tunnel Hedefi           |
|-----------------|-------|------------------------------------|
| Backend API     | 777   | `api.goldencrafters.com` → `:777`  |
| Seller Panel    | 5173  | `seller.goldencrafters.com` → `:5173` |
| Admin Panel     | 5174  | `admin.goldencrafters.com` → `:5174` |
| Marketplace     | 5175  | `goldencrafters.com` → `:5175`     |
| PostgreSQL      | 5432  | (sadece internal)                  |
| Redis           | 6379  | (sadece internal)                  |

---

## 2. Ortam Değişkenleri

`stack.env` dosyasını düzenleyin (hassas bilgilerinizi girin):

```env
# Database
DB_USER=golden_user
DB_PASSWORD=GÜVENLİ_VERİTABANI_ŞİFRESİ

# Redis
REDIS_PASSWORD=GÜVENLİ_REDIS_ŞİFRESİ

# JWT
JWT_SECRET=RASTGELE_UZUN_STRING

# Public URLs
FRONTEND_URL=https://goldencrafters.com
API_URL=https://api.goldencrafters.com

# Stripe
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx

# Gold API
GOLD_PRICE_API_KEY=goldapi_xxxxx

# Runtime
NODE_ENV=production
PORT=777
```

> ⚠️ **stack.env dosyasını asla Git'e push etmeyin!** `.gitignore` dosyasında olduğundan emin olun.

---

## 3. Portainer ile Deploy

### 3.1 GitHub Repo'dan Stack Oluşturma

1. Portainer'a giriş yapın
2. **Stacks** → **Add Stack**
3. **Build Method**: Repository
4. **Repository URL**: `https://github.com/asbajans/goldenmarketplace`
5. **Compose Path**: `docker-compose.prod.yml`
6. **Environment Variables**: `stack.env` içeriğini ekleyin
7. **Deploy the Stack** butonuna tıklayın

### 3.2 Manuel Stack Oluşturma

1. Sunucuya SSH ile bağlanın:
```bash
git clone https://github.com/asbajans/goldenmarketplace.git
cd goldenmarketplace
```

2. `stack.env` dosyasını düzenleyin

3. Çalıştırın:
```bash
docker compose --env-file stack.env -f docker-compose.prod.yml up -d
```

### 3.3 Veritabanı Başlatma (İlk Kurulum)

```bash
# Container'a gir
docker exec -it golden-api sh

# Tabloları oluştur
npx ts-node src/scripts/sync-db.ts

# Test verilerini ekle (opsiyonel)
npx ts-node src/scripts/seed.ts
```

---

## 4. Cloudflare Tunnel Yapılandırması

Cloudflare Zero Trust Dashboard'dan tunnel'ınızı yapılandırın:

### 4.1 Tunnel Kuralları

| Public Hostname              | Service               |
|------------------------------|-----------------------|
| `goldencrafters.com`         | `http://localhost:5175` |
| `api.goldencrafters.com`     | `http://localhost:777`  |
| `seller.goldencrafters.com`  | `http://localhost:5173` |
| `admin.goldencrafters.com`   | `http://localhost:5174` |

### 4.2 Cloudflare Dashboard Adımları

1. [Cloudflare Zero Trust](https://one.dash.cloudflare.com/) → **Networks** → **Tunnels**
2. Tunnel'ınızı seçin → **Configure**
3. **Public Hostname** sekmesine gidin
4. Her bir subdomain için yukarıdaki tabloyu referans alarak kuralları ekleyin:
   - **Subdomain**: (boş, seller, admin, api)
   - **Domain**: goldencrafters.com
   - **Type**: HTTP
   - **URL**: localhost:PORT

### 4.3 SSL/TLS

Cloudflare Tunnel otomatik olarak SSL sağlar. Ek yapılandırma gerekmez.

---

## 5. Güncelleme (Yeni Versiyon Deploy)

### Portainer'dan
1. **Stacks** → Stack'inizi seçin
2. **Pull and Rebuild** veya **Redeploy**

### CLI'dan
```bash
cd goldenmarketplace
git pull
docker compose --env-file stack.env -f docker-compose.prod.yml up -d --build
```

---

## 6. Google Merchant Center

1. [Google Merchant Center](https://merchants.google.com/) → **Feeds** → **Add Feed**
2. URL: `https://api.goldencrafters.com/api/feed/google.xml`
3. Periyot: Günlük

## 7. Facebook Katalog

1. [Facebook Business Suite](https://business.facebook.com/) → Catalog Manager
2. URL: `https://api.goldencrafters.com/api/feed/facebook.json`

---

## Sorun Giderme

| Sorun | Çözüm |
|-------|-------|
| Container ayağa kalkmıyor | `docker logs golden-api` ile logları kontrol edin |
| DB bağlantı hatası | `stack.env` DB şifresini ve postgres health'ini kontrol edin |
| Redis bağlantı hatası | `docker logs golden-redis` kontrol edin |
| API'ye erişilemiyor | Cloudflare Tunnel kurallarını ve port 777'yi kontrol edin |
| CORS hatası | `server.ts` CORS origin listesini kontrol edin |

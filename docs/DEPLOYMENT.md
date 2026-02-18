# Portainer ile Kurulum Rehberi

Golden Marketplace'ı Portainer üzerinden sunucunuza deploy etme adımları.

> Cloudflare Tunnel yönlendirmeleri zaten yapıldı. Bu rehber sadece Portainer tarafını kapsar.

---

## Ön Koşullar

- ✅ Docker ve Docker Compose sunucuda kurulu
- ✅ Portainer çalışır durumda
- ✅ Cloudflare Tunnel yapılandırıldı:
  - `goldencrafters.com` → `:5175`
  - `api.goldencrafters.com` → `:777`
  - `seller.goldencrafters.com` → `:5173`
  - `admin.goldencrafters.com` → `:5174`

---

## Adım 1: Portainer'da Stack Oluşturma

1. Portainer paneline giriş yapın
2. Sol menüden **Stacks** → **+ Add stack**
3. İsim: `golden-marketplace`

### Build Method: Git Repository

| Alan | Değer |
|------|-------|
| **Repository URL** | `https://github.com/asbajans/goldenmarketplace` |
| **Repository reference** | `refs/heads/main` |
| **Compose path** | `docker-compose.prod.yml` |

> **Authentication** gerekiyorsa GitHub username + Personal Access Token girin.

---

## Adım 2: Environment Variables

Portainer stack sayfasında **Environment variables** bölümüne şu değişkenleri ekleyin:

### Zorunlu

| Değişken | Değer | Açıklama |
|----------|-------|----------|
| `DB_USER` | `golden_user` | PostgreSQL kullanıcı adı |
| `DB_PASSWORD` | `güçlü_şifre_buraya` | PostgreSQL şifresi |
| `REDIS_PASSWORD` | `güçlü_redis_şifresi` | Redis şifresi |
| `JWT_SECRET` | `64_karakterlik_rastgele_string` | JWT imzalama anahtarı |
| `FRONTEND_URL` | `https://goldencrafters.com` | Ana site URL |
| `API_URL` | `https://api.goldencrafters.com` | API URL |
| `NODE_ENV` | `production` | Ortam |
| `PORT` | `777` | Backend portu |

### Opsiyonel (Üçüncü Parti Servisler)

| Değişken | Açıklama |
|----------|----------|
| `STRIPE_SECRET_KEY` | Stripe gizli anahtar (ödeme için) |
| `STRIPE_PUBLISHABLE_KEY` | Stripe açık anahtar |
| `GOLD_PRICE_API_KEY` | GoldAPI.io anahtarı (altın fiyatı) |

> 💡 **İpucu:** `stack.env` dosyasındaki örnek değerleri referans alabilirsiniz.

---

## Adım 3: Deploy

**"Deploy the stack"** butonuna tıklayın.

Portainer aşağıdaki container'ları oluşturacak:

| Container | Image | Port |
|-----------|-------|------|
| `golden-postgres` | `postgres:15-alpine` | 5432 (internal) |
| `golden-redis` | `redis:7-alpine` | 6379 (internal) |
| `golden-api` | `ghcr.io/.../backend:latest` | **777** |
| `golden-marketplace-ui` | `ghcr.io/.../marketplace:latest` | 5173 |

---

## Adım 4: Veritabanı İlk Kurulumu

Stack deploy olduktan sonra, **bir kereye mahsus** veritabanı tablolarını ve test verilerini oluşturun:

1. Portainer → **Containers** → `golden-api` seçin
2. **Console** → `sh` shell açın
3. Şu komutları çalıştırın:

```bash
# Tabloları oluştur
npx ts-node src/scripts/sync-db.ts

# Test verilerini ekle (opsiyonel)
npx ts-node src/scripts/seed.ts
```

Alternatif olarak sunucu terminali üzerinden:
```bash
docker exec -it golden-api sh
npx ts-node src/scripts/sync-db.ts
npx ts-node src/scripts/seed.ts
```

---

## Adım 5: Doğrulama

Tarayıcıdan kontrol edin:

| Test | URL | Beklenen |
|------|-----|----------|
| API Health | `https://api.goldencrafters.com/health` | `{"status":"OK"}` |
| Marketplace | `https://goldencrafters.com` | Ana sayfa |
| Seller Panel | `https://seller.goldencrafters.com` | Giriş sayfası |
| Admin Panel | `https://admin.goldencrafters.com` | Giriş sayfası |
| Google Feed | `https://api.goldencrafters.com/api/feed/google.xml` | XML çıktısı |

### Test Giriş Bilgileri

| Rol | E-posta | Şifre |
|-----|---------|-------|
| Admin | `admin@golden.com` | `admin123` |
| Satıcı | `seller@golden.com` | `seller123` |

---

## Güncelleme

Yeni versiyon deploy etmek için:

1. Portainer → **Stacks** → `golden-marketplace`
2. **Pull and redeploy** butonuna tıklayın
3. Portainer otomatik olarak en son kodu çeker ve container'ları yeniden oluşturur

---

## Sorun Giderme

| Sorun | Kontrol |
|-------|---------|
| Container başlamıyor | Portainer → Container → **Logs** kontrol edin |
| DB bağlantı hatası | `DB_PASSWORD` environment variable doğru mu? |
| Redis hatası | `REDIS_PASSWORD` doğru mu? |
| API 502/504 | Container healthy mi? Port 777 açık mı? |
| CORS hatası | `FRONTEND_URL` doğru ayarlandı mı? |
| Altın fiyatı gelmiyor | `GOLD_PRICE_API_KEY` geçerli mi? |

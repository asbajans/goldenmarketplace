# Golden Marketplace

Altın endeksli çoklu pazaryeri e-ticaret platformu.

## 🏗️ Mimari

```
golden-marketplace/
├── backend/          # Node.js + Express + TypeScript API
├── frontend/
│   ├── marketplace/  # Herkese açık mağaza (Port 5174)
│   ├── seller-panel/ # Satıcı paneli (Port 5173)
│   └── admin/        # Yönetici paneli (Port 5175)
├── docs/             # Dökümanlar
└── docker-compose.yml
```

## ⚡ Hızlı Başlangıç

```bash
# 1. Repo'yu klonla
git clone https://github.com/asbajans/goldenmarketplace.git
cd goldenmarketplace

# 2. Bağımlılıkları kur
cd backend && npm install
cd ../frontend/seller-panel && npm install
cd ../marketplace && npm install

# 3. Veritabanını hazırla
cd ../../backend
cp .env.example .env   # .env dosyasını düzenle
npx ts-node src/scripts/sync-db.ts
npx ts-node src/scripts/seed.ts

# 4. Çalıştır
npm run dev                          # Backend  → http://localhost:777
cd ../frontend/seller-panel && npm run dev   # Seller   → http://localhost:5173
cd ../marketplace && npm run dev             # Market   → http://localhost:5175
```

## 🔑 Varsayılan Hesaplar

| Rol      | E-posta              | Şifre        |
|----------|----------------------|--------------|
| Admin    | admin@golden.com     | admin123     |
| Satıcı   | seller@golden.com    | seller123    |
| Müşteri  | customer@golden.com  | customer123  |

## 🌐 Production Domain

| Subdomain | Servis |
|-----------|--------|
| `goldencrafters.com` | Marketplace |
| `seller.goldencrafters.com` | Satıcı Paneli |
| `admin.goldencrafters.com` | Admin Paneli |
| `api.goldencrafters.com` | Backend API (Port 777) |

## 🛠️ Teknolojiler

| Katman     | Teknoloji                        |
|------------|----------------------------------|
| Backend    | Node.js, Express, TypeScript     |
| Veritabanı | PostgreSQL, Sequelize ORM        |
| Cache/Queue| Redis, Bull                      |
| Frontend   | React, Ant Design, Vite          |
| Ödeme      | Stripe                           |
| Altın API  | GoldAPI.io                       |

## 📡 API Endpoint'leri

| Endpoint                    | Açıklama                    |
|-----------------------------|-----------------------------|
| `POST /api/auth/login`     | Giriş yap                   |
| `POST /api/auth/register`  | Kayıt ol                     |
| `GET /api/products`        | Ürün listele                 |
| `POST /api/products`       | Ürün oluştur (auth)          |
| `GET /api/gold-price/current` | Güncel altın fiyatı       |
| `GET /api/integrations`    | Pazaryeri bağlantıları       |
| `GET /api/feed/google.xml` | Google Shopping beslemesi     |
| `GET /api/feed/facebook.json` | Facebook katalog          |
| `GET /api/feed/share/:slug`| Sosyal medya paylaşım verisi |

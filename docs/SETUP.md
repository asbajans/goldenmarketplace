# Golden Marketplace - Kurulum Talimatları

## ✅ Ön Gereksinimler

- Node.js (v18+)
- npm (v9+) veya yarn
- PostgreSQL (v13+)
- Redis (v7+)
- Git

## 🚀 Adım Adım Kurulum

### 1. Repository Klonla

```bash
git clone https://github.com/yourusername/golden-marketplace.git
cd golden-marketplace
```

### 2. Backend Kurulumu

```bash
cd backend

# Bağımlılıkları yükle
npm install

# Environment dosyasını oluştur
cp .env.example .env

# .env dosyasını düzenle
# Veritabanı, Stripe, API anahtarlarını ekle
nano .env
```

#### .env Dosya Örneği

```
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=golden_marketplace
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRY=7d

# Stripe
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Gold Price API (örnek: goldapi.io)
GOLD_API_URL=https://api.goldapi.io/api/XAU/USD
GOLD_API_KEY=your_gold_api_key

# Marketplace APIs
ETSY_CLIENT_ID=your_etsy_client_id
ETSY_CLIENT_SECRET=your_etsy_client_secret

# Redis
REDIS_URL=redis://localhost:6379
```

#### Database Kurulumu

```bash
# PostgreSQL'e bağlan
psql -U postgres

# Database oluştur
CREATE DATABASE golden_marketplace;

# UTF-8 encoding ile
CREATE DATABASE golden_marketplace WITH ENCODING 'UTF8';

# Çık
\q
```

#### Uygulamayı Başlat

```bash
npm run dev
```

Server `http://localhost:3000` adresinde çalışmaya başlayacaktır.

### 3. Frontend Kurulumu

#### 3.1 Seller Panel

```bash
cd frontend/seller-panel

npm install

npm run dev
```

http://localhost:5173 adresinde açılacaktır.

#### 3.2 Admin Panel

```bash
cd frontend/admin-panel

npm install

npm run dev
```

http://localhost:5174 adresinde açılacaktır.

#### 3.3 Public Marketplace

```bash
cd frontend/marketplace

npm install

npm run dev
```

http://localhost:5175 adresinde açılacaktır.

## 🔑 API Anahtarlarını Alma

### Stripe

1. https://dashboard.stripe.com adresine git
2. API Keys bölümüne git
3. Test keys'i kopyala (.env'e yapıştır)

### Etsy

1. https://www.etsy.com/developers adresine git
2. Your Apps bölümünde yeni app oluştur
3. API keys'i kopyala

### Hepsiburada

1. https://seller.hepsiburada.com adresine gir
2. Ayarlar → API integasyonu
3. API anahtarları al

### Trendyol

1. https://seller.trendyol.com adresine gir
2. Satıcı Merkezi → Entegrasyonlar
3. API bilgilerini al

### N11

1. https://www.n11.com adresine gir
2. Satıcı merkezi → Entegrasyonlar
3. API anahtarlarını al

### Gold Price API

1. https://www.goldapi.io adresine git
2. Ücretsiz API anahtarı al
3. .env'e ekle

## 🗄️ Database Migrations

### Sequelize Migration (İsteğe bağlı)

```bash
# Migration dosyası oluştur
npx sequelize-cli migration:generate --name create-users-table

# Migration'ları çalıştır
npx sequelize-cli db:migrate

# Migration'ları geri al
npx sequelize-cli db:migrate:undo
```

## ✨ Seed Veriler (Test)

```bash
cd backend

# Seed dosyası oluştur
npx sequelize-cli seed:generate --name initial-data

# Seed'leri çalıştır
npx sequelize-cli db:seed:all
```

## 🧪 Testler

### Backend Tests

```bash
cd backend

# Tüm testleri çalıştır
npm test

# Spesifik test dosyası
npm test -- auth.test.ts

# Coverage raporunu gör
npm test -- --coverage
```

## 📝 Linting

```bash
# Backend linting
cd backend
npm run lint

# Frontend linting
cd frontend/seller-panel
npm run lint
```

## 🐛 Troubleshooting

### PostgreSQL Connection Error

```bash
# PostgreSQL servisini başlat
# Windows (PowerShell)
Start-Service -Name postgresql-x64-13

# Linux
sudo service postgresql start

# Mac
brew services start postgresql
```

### Redis Connection Error

```bash
# Redis'i başlat
# Windows (WSL)
redis-server

# Linux
redis-server

# Mac
brew services start redis
```

### Port Already in Use

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :3000
kill -9 <PID>
```

## 📚 Diğer Kaynaklar

- [Architecture Documentation](./ARCHITECTURE.md)
- [API Documentation](./API.md)
- [Contributing Guide](./CONTRIBUTING.md)

## 💬 Destek

Herhangi bir sorun için:
1. GitHub Issues'da rapor et
2. Email gönder: support@goldenmarketplace.com
3. Discord sunucusuna katıl

---

**Başarılı kurulum tebrikler! 🎉**

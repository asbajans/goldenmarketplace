# Golden Marketplace - Mimarı Belgelendirme

## 🏗️ Sistem Mimarısı

### Genel Bakış

Golden Marketplace, aşağıdaki bileşenlerden oluşan bir mikro-hizmet tabanlı mimariye sahiptir:

```
┌─────────────────────────────────────────────────────────┐
│                   İstemci Uygulamaları                   │
├────────────────┬──────────────────┬─────────────────────┤
│  Pazaryeri     │  Satıcı Paneli   │  Süper Admin Paneli │
│  (React)       │  (React)         │  (React)            │
└────────────────┴──────────────────┴─────────────────────┘
                         │
                 ┌───────▼────────┐
                 │   API Gateway  │
                 │   (Express)    │
                 └───────┬────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
   ┌────▼──────┐  ┌─────▼─────┐  ┌──────▼──────┐
   │ Auth Svc  │  │Product Svc│  │Integ. Svc  │
   └────┬──────┘  └─────┬─────┘  └──────┬──────┘
        │                │                │
   ┌────▼──────────┬─────▼──────────┬───▼─────────┐
   │    Redis     │  PostgreSQL     │  Stripe API │
   │   (Cache)    │   (Database)    │ (Payments)  │
   └──────────────┴────────────────┴─────────────┘
        │
   ┌────▼────────────────────────────────────┐
   │  Marketplace Integrations (Queue Jobs)   │
   │  - Etsy, Amazon, Hepsiburada             │
   │  - Trendyol, N11, Instagram, TikTok      │
   └──────────────────────────────────────────┘
```

## 📦 Servislerin Detayları

### 1. Authentication Service (Auth)
- JWT token oluşturma ve doğrulama
- OAuth2 implementasyonu
- Rol tabanlı erişim kontrolü (RBAC)

**Endpoints:**
- `POST /api/auth/register` - Yeni kullanıcı kaydı
- `POST /api/auth/login` - Oturum açma
- `POST /api/auth/refresh` - Token yenileme
- `POST /api/auth/logout` - Oturum kapatma

### 2. Product Service
- Ürün oluşturma, güncelleme, silme
- Altın endeksli fiyatlandırma
- Ürün resimlerinin yönetimi

**Endpoints:**
- `GET /api/products` - Tüm ürünleri listele
- `POST /api/products` - Yeni ürün oluştur
- `PUT /api/products/:id` - Ürünü güncelle
- `DELETE /api/products/:id` - Ürünü sil
- `GET /api/products/:id/gold-price` - Altın fiyatını hesapla

### 3. Marketplace Integration Service
- Pazaryerlerine bağlantı
- Ürün senkronizasyonu
- Fiyat güncellemeleri
- Sipariş yönetimi

**Desteklenen Pazaryerler:**
- Etsy
- Amazon Seller Central
- Hepsiburada
- Trendyol
- N11

### 4. Subscription Service
- Abonelik yönetimi
- Stripe integrasyonu
- Paket satın alma

**Endpoints:**
- `POST /api/subscriptions` - Abonelik oluştur
- `GET /api/subscriptions/:id` - Abonelik detaylarını getir
- `DELETE /api/subscriptions/:id` - Aboneliği iptal et
- `POST /api/subscriptions/webhook` - Stripe webhook

### 5. Admin Service
- Kullanıcı yönetimi
- Abonelik yönetimi
- Sistem istatistikleri
- Raporlar

## 💾 Database Şeması

### Tablolar

#### Users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  password VARCHAR NOT NULL,
  firstName VARCHAR NOT NULL,
  lastName VARCHAR NOT NULL,
  phone VARCHAR,
  userType ENUM('seller', 'customer', 'admin'),
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

#### Stores
```sql
CREATE TABLE stores (
  id UUID PRIMARY KEY,
  userId UUID REFERENCES users(id),
  storeName VARCHAR NOT NULL,
  storeSlug VARCHAR UNIQUE NOT NULL,
  description TEXT,
  logo VARCHAR,
  banner VARCHAR,
  rating FLOAT DEFAULT 0,
  totalProducts INTEGER DEFAULT 0,
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

#### Products
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY,
  storeId UUID REFERENCES stores(id),
  title VARCHAR NOT NULL,
  slug VARCHAR NOT NULL,
  description TEXT,
  category VARCHAR NOT NULL,
  sku VARCHAR UNIQUE NOT NULL,
  basePrice DECIMAL(15,4),
  goldIndexPrice DECIMAL(15,4),
  currency VARCHAR DEFAULT 'XAU',
  quantity INTEGER,
  images JSON,
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

#### Integrations
```sql
CREATE TABLE integrations (
  id UUID PRIMARY KEY,
  storeId UUID REFERENCES stores(id),
  marketplace VARCHAR NOT NULL,
  isConnected BOOLEAN DEFAULT false,
  apiKey VARCHAR,
  apiSecret VARCHAR,
  shopId VARCHAR,
  lastSyncDate TIMESTAMP,
  syncStatus ENUM('pending', 'in-progress', 'completed', 'failed'),
  errorMessage TEXT,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

#### Subscriptions
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  userId UUID REFERENCES users(id),
  marketplace VARCHAR NOT NULL,
  plan ENUM('basic', 'professional', 'enterprise'),
  stripeSubscriptionId VARCHAR UNIQUE,
  status ENUM('active', 'cancelled', 'expired'),
  startDate TIMESTAMP,
  endDate TIMESTAMP,
  price DECIMAL(10,2),
  currency VARCHAR DEFAULT 'USD',
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

## 🔄 Data Flow

### Ürün Yükleme Akışı

```
1. Satıcı panelinde ürün oluşturur
   ↓
2. Product Service ürünü DB'ye kaydeder
   ↓
3. Gold Price Service altın fiyatını hesaplar
   ↓
4. İlişkili integrasyon servisleri aktifse
   → Ürün pazaryerlerine gönderilir
   ↓
5. Pazaryerinden onay alınır
   ↓
6. Integration status güncellenir
```

### Fiyat Güncelleme Akışı

```
1. Altın fiyatı API'den çekilir (her saatte)
   ↓
2. Tüm ürünler için yeni fiyat hesaplanır
   ↓
3. Ürün DB'si güncellenir
   ↓
4. Pazaryerlerinde fiyatlar güncellenir
   ↓
5. Satıcılara bildirim gönderilir
```

## 🔐 Güvenlik

### Authentication Flow

```
Kullanıcı Giriş
    ↓
JWT Token Oluştur
    ↓
Token İle API Çağrısı
    ↓
Token Doğrulanır
    ↓
Rol Kontrol Edilir (RBAC)
    ↓
İşlem Gerçekleştirilir
```

### Veri Şifreleme

- Passwords: bcryptjs ile hashleme
- API Keys: Şifreli olarak depolanır
- Stripe Keys: Environment variables
- Hassas veriler: AES-256 encryption

## 🚀 Deployment

### Development
```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Seller Panel
cd frontend/seller-panel && npm run dev

# Terminal 3: Admin Panel
cd frontend/admin-panel && npm run dev

# Terminal 4: Marketplace
cd frontend/marketplace && npm run dev
```

### Production
- Docker containerization
- Kubernetes orchestration
- CI/CD pipeline (GitHub Actions)
- Load balancing (Nginx)
- CDN (CloudFlare)

## 📊 Monitoring & Logging

- Winston logger için yapılandırılmış
- Error tracking (Sentry)
- Performance monitoring (New Relic)
- APM (Application Performance Monitoring)

## 🔄 API Rate Limiting

- 100 requests per 15 minutes per IP
- Authenticated users: 500 requests per 15 minutes
- Admin users: No limit

## 📈 Scalability

- Horizontal scaling (multiple API instances)
- Database replication
- Redis caching layer
- Message queue (Bull) for async jobs
- CDN for static assets

---

**Son Güncelleme:** Şubat 5, 2026

# Golden Marketplace — Geliştirici Rehberi

## Proje Künyesi
- **Amaç:** Altın takı ticareti için SAAS modeliyle çalışan multi-marketplace e-ticaret platformu. Ürün fiyatı = gram × milyem × piyasa altın fiyatı × satıcı kâr marjı formülüyle hesaplanır.
- **Stack:** Node.js / Express + TypeScript + Sequelize ORM + PostgreSQL 15 + Redis 7
- **Frontend'ler:** React 18 + TypeScript + Vite + Ant Design + Zustand + TanStack Query (3 ayrı panel)
- **Hosting:** Backend → Railway, Frontend'ler → Vercel, Container → ghcr.io + Portainer

## Domain'ler
| Domain | Kullanım |
|--------|----------|
| `api.asb.web.tr` | Backend API (port 777) |
| `seller.asb.web.tr` | Satıcı paneli |
| `admin.asb.web.tr` | Admin paneli |
| `goldencrafters.com` | Marketplace (B2C) — ayrı repo (`market/`) |
| `s3.asb.web.tr` | MinIO object storage |

## Repo Yapısı
```
golden-marketplace/
├── backend/                    # Express API server
│   ├── src/
│   │   ├── server.ts           # Entry point, middleware, routes
│   │   ├── config/             # DB config, variation defaults
│   │   ├── models/             # 18 Sequelize model
│   │   ├── controllers/        # 12 controller
│   │   ├── routes/             # 19 route dosyası
│   │   ├── services/           # 10 service (gold price, marketplace sync, AI, payment...)
│   │   ├── integrations/       # 6 marketplace client (Etsy, Trendyol, HB, N11, Pazarama, Amazon[stub])
│   │   ├── jobs/               # Bull queues + cron jobs
│   │   ├── middleware/         # Auth middleware'leri (auth, admin, seller)
│   │   ├── utils/              # ApiLogger, validasyon helper'ları
│   │   └── scripts/            # Seed, migration script'leri
│   ├── migrations/             # SQL migration script'leri
│   ├── Dockerfile / .dev/.prod
│   └── tsconfig.json
├── frontend/
│   ├── seller-panel/           # Satıcı dashboard (Vite + React)
│   ├── admin-panel/            # Admin yönetim paneli (Vite + React)
│   └── marketplace/            # B2C marketplace (bu repo'da ama ayrı da deploy edilir)
├── .github/workflows/          # CI/CD pipeline'ları (ci-cd, deploy, docker-build)
├── docker-compose.yml          # Dev compose (postgres + redis + api + frontends + minio)
├── docker-compose.prod.yml     # Prod compose (ghcr.io image'ları + Caddy)
├── .env                        # Root env (Portainer secrets)
└── stack.env                   # Portainer stack env
```

## Geliştirme Ortamı

### İlk Kurulum
```bash
git clone <repo> golden-marketplace
cd golden-marketplace
cp backend/.env.example backend/.env   # ardından .env'yi düzenleyin
docker compose up -d                    # PostgreSQL + Redis + MinIO ayağa kalkar
npm install
npx ts-node backend/src/scripts/seed.ts # sadece LOCAL development
npm run dev
```

### Servisler
```bash
npm run backend       # API → http://localhost:777
npm run seller        # Seller panel → http://localhost:5173
npm run admin         # Admin panel → http://localhost:5175
npm run marketplace   # Marketplace → http://localhost:5174
```

## Kod Standartları

### Genel
- TypeScript `strict: true` — `any` kullanımından kaçının, mümkünse `unknown` tercih edin
- Import sırası: Node built-in → npm paketleri → internal modüller (alfabetik)
- Console.log **yasaktır** — winston logger kullanın (`logger.info`, `logger.error`, `logger.warn`)
- Dosya adları: `camelCase.ts` (utils, services, integrations), `PascalCase.ts` (models, controllers, components)
- Yeni bir özellik eklerken: route → controller → service → model sırasını izleyin

### Backend (Express)
- Controller'lar hataları `next(err)` ile central error handler'a fırlatmalı, try/catch içinde `res.status().json()` ile direkt yanıt vermemeli
- Yeni route'lar `src/routes/` altında tanımlanmalı ve `server.ts`'te `require()` ile yüklenmeli
- Tüm CRUD route'larında auth middleware kontrolü: `authMiddleware`, gerekiyorsa `sellerMiddleware` / `adminMiddleware`
- Validasyonları `utils/validation.ts` üzerinden yapın, controller içinde inline yapmayın

### Frontend (React + Vite)
- React functional components + hooks, class component kullanmayın
- State yönetimi: lokal state → `useState` / `useReducer`, global state → Zustand store, server state → TanStack Query
- Ant Design bileşenlerini proje genelinde tutarlı kullanın, özel CSS yazmaktan kaçının
- API çağrıları için TanStack Query kullanın, `useEffect` + `fetch` pattern'i tercih etmeyin

## Veritabanı

### Modeller (18 adet)
User, Store, Product, ProductVariant, Category, Order, OrderItem, SubscriptionPlan, Subscription, Integration, MarketplaceIntegration, B2BRequest, Wishlist, UserAddress, GlobalSetting, Variation, VariationOption, IntegrationLog, ProductMarketplaceListing

### Migration Politikası
**Mevcut durum:** `sequelize.sync({ alter: true })` — production'da alter tehlikelidir, kolon/veri kaybına yol açabilir.

**Hedef:** Umzug veya benzeri bir framework ile versioned migration'lara geçiş.

> **KRİTİK UYARI:** Seed script (`npx ts-node backend/src/scripts/seed.ts`) `sequelize.sync({ force: true })` çalıştırır → **TÜM VERİYİ SİLER**. ASLA production'da çalıştırmayın. Sadece local development içindir.

### Önemli Tablolar
- `GlobalSetting` (key-value store): Site ayarları, API key'ler, banka bilgileri burada tutulur
- `Product.translations` (JSONB): Çoklu dil desteği `{ en: { title, description }, tr: {...}, it, ar, es }`
- `Category.translations` (JSONB): Kategorilerin çoklu dil adları

## CI/CD Pipeline

Aktif workflow: `.github/workflows/deploy.yml`

1. **test-and-build**: Lint + build tüm workspace'ler
2. **deploy-vercel**: Seller, Admin, Marketplace panel'leri Vercel'e deploy (Vercel API token ile)
3. **deploy-railway**: Backend Railway'e deploy
4. **health-check**: Deploy sonrası sağlık kontrolü (`/health` endpoint'i)
5. **notify**: Slack + email bildirimi

Docker image'leri `ghcr.io/asbajans/goldenmarketplace/` registry'sine push edilir (docker-build workflow'u).

### Vercel Projeleri
| Proje | Vercel Domains |
|-------|---------------|
| Seller Panel | `seller-panel.vercel.app` → `seller.asb.web.tr` |
| Admin Panel | `admin-panel.vercel.app` → `admin.asb.web.tr` |
| Marketplace | `marketplace.vercel.app` → custom domain |

## Entegrasyonlar

| Platform | Durum | Auth Yöntemi |
|----------|-------|-------------|
| Etsy | **Tam** | OAuth 2.0 + PKCE + auto-refresh (1hr token) |
| Trendyol | **Tam** | REST SAPIGW, batch product create |
| Hepsiburada | **Tam** | REST, attribute mapping |
| N11 | **Tam** | SOAP/XML envelopes |
| Pazarama | **Tam** | OAuth 2.0 client_credentials |
| Amazon | **STUB** | SP-API — sadece log atar, gerçek API çağrısı yok |

> **Not:** `adminAuth.ts` duplicate middleware'i temizlendi (authMiddleware.ts'deki adminMiddleware kullanılıyor). `server.ts`'deki çift `dotenv.config()` tekilleştirildi. Env validation (Joi) eklendi. CORS wildcard hatası düzeltildi.

### Yeni Marketplace Entegrasyonu Eklemek İçin
1. `backend/src/integrations/` altında yeni klasör oluşturun (örn. `trendyol/trendyolClient.ts`)
2. `marketplaceIntegrationService.ts`'deki factory method'a yeni platform ekleyin
3. `productSyncJob.ts`'deki switch-case bloğuna ekleyin
4. MarketplaceIntegration modeli üzerinden credentials yönetin

## Önemli Uyarılar

1. **Altın fiyatı manuel güncellenir** — Admin panel → Gold Price sayfasından. Otomatik cron devre dışı bırakıldı. Fiyat güncellenince tüm ürün fiyatları yeniden hesaplanır ve tüm marketplace'lere sync tetiklenir.
2. **CORS**: `https://*.vercel.app` wildcard'ı `cors` paketinde çalışmaz. Yeni domain eklerken array'e literal olarak ekleyin veya fonksiyon-based origin validator kullanın.
3. **API versiyonlama yok**: Tüm route'lar `/api/...` altında. İleride `/api/v1/` pattern'ine geçilebilir.
4. **Amazon integration stub**: Sadece log atar, `{ success: false }` döndürür. Implementasyon ileri sprint'te.
5. **Market frontend (goldencrafters.com) ayrı repo**: `market/` klasörü, Next.js 16.2 + Vercel. Bu monorepo'nun parçası değildir. O repo için `market/AGENTS.md` dosyasına bakın.
6. **`.env.example` güncel tutun**: PORT 3000 yazıyor ama backend 777'de çalışıyor. Değişiklik yapınca örneği de güncelleyin.
7. **console.log yasaktır**: Winston logger kullanmayı unutan kodlar kabul edilmez. Code review'de kontrol edin. (`server.ts`'deki tüm console.log çağrıları logger'a dönüştürüldü.)

## AI Agent'lar İçin İpuçları

- Kod yazmadan önce mevcut pattern'leri okuyun (benzer bir route/controller/service nasıl yazılmış)
- `any` tipi kullanmayın, mevcut interface'leri genişletin veya yenilerini tanımlayın
- Yeni bir bağımlılık eklemeden önce mevcut `package.json`'da benzer bir çözüm var mı kontrol edin
- API route'ları eklerken `server.ts`'deki route yükleme pattern'ini takip edin (require + .default fallback)
- Test yazarken Jest + ts-jest kullanın (konfigürasyon hazır)

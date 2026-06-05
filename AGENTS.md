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

## Product & Category Sistemi (KRİTİK)

### Çift Kategori Alanı
Product modelinde **iki ayrı kategori alanı** vardır:
- `category` (STRING, NOT NULL): Eski sistemden kalan **ham kategori string'i** (örn: "Yüzük", "Kolye", "Genel", "Bracelet")
- `categoryId` (UUID, nullable, FK → `categories.id`): Admin panelden yönetilen kategorilere referans

**Geçiş süreci:** 2026 Haziran'da tüm legacy ürünler `migrate-product-category.ts` script'i ile `categoryId` kazandı. Artık tüm ürünlerin `categoryId`'si dolu. `category` alanı halen geriye dönük uyumluluk için korunuyor.

### Marketplace Controller — Kategori Filtreleme (`getProducts`)
`marketplaceController.ts`'de kategori filtresi iki yönlü çalışır:
1. **Admin kategorisi bulunursa** (`catBySlug`): `categoryId` + raw `category` alanında **her ikisinde birden** arama yapar (`Op.or` ile). Böylece hem yeni (categoryId'li) hem de legacy (sadece raw category'li) ürünler bulunur.
2. **Admin kategorisi bulunamazsa**: `categoryVariants` map'i üzerinden text-based ILIKE araması yapar.

### goldenFilter
Tüm public marketplace sorgularında `goldenFilter` uygulanır:
```sql
("marketplaces" IS NULL OR CAST("marketplaces" AS text) = '[]' OR CAST("marketplaces" AS text) ILIKE '%golden%')
```
`CAST(... AS text)` zorunludur — JSON/text karşılaştırması PostgreSQL'de hata verir.

### FALLBACK_CATEGORY_TRANSLATIONS
`resolveCategoryName` fonksiyonu, `categoryRef` (categoryId'den gelen Category objesi) yoksa bu map'ten kategori ismini çözer. Tüm varyantlar (küçük/büyük harf, ASCII, İngilizce/Türkçe, tekil/çoğul) eklenmiştir. Yeni bir varyant eklendiğinde bu map de güncellenmelidir.

### Admin Panel Kategori Düzenleme
Admin panel (`ProductsPage.tsx`) artık kategori için plain `<Input>` yerine **`<Select>` dropdown** kullanır. Seçenekler `/api/categories`'den çekilir. Seçilen kategorinin ID'si `categoryId` olarak gönderilir, `category` alanı otomatik olarak slug değerine set edilir.

### Migrate Scripti
`migrate-product-category.ts` — legacy ürünlerin `categoryId`'sini admin kategorileriyle eşleştirir:
- `CATEGORY_MAP` sabiti: Ham string'i admin slug'ına map eder (Türkçe, İngilizce, ASCII varyantları)
- Fuzzy match: ILIKE ile benzerlik
- Fallback: Eşleşmeyenler "Genel" kategorisine atanır

## Production Veritabanı
- **Host:** 192.168.0.243:5432
- **Database:** golden_marketplace
- **User:** golden_user
- **Password:** gN7u4r9Kq2Wv8Yz1Pp6L3s0Dq5BfXcTz
- **Not:** `.env.example`'daki `DB_PASSWORD` production ile aynı DEĞİLDİR. Yukarıdaki kullanılır.

---

## Feed Sistemi

### Mimari (2 yönlü)
**1. İçe Aktarma (External → Bizim Sistem)**
- **Route:** `/api/feeds/*` — satıcı paneli üzerinden yönetilir (auth + sellerMiddleware gerekli)
- **Bull Queue:** `feed-sync` — `jobs/feedSyncJob.ts`
- **Service:** `services/feedService.ts` (498 satır) — fetch → parse (XML/CSV/XLSX/JSON) → field mapping → pricing → upsert by SKU
- **Scheduler:** `startFeedSyncScheduler()` 30 dk'da bir çalışır, `autoSync: true` olan feed'leri kontrol eder
- **Post-sync:** AI çevirisi otomatik tetiklenir (eğer plan izin veriyorsa)

**2. Dışa Aktarma (Bizim Sistem → Google/Facebook)**
- **Route:** `/api/feed/google.xml`, `/api/feed/facebook.json`, `/api/feed/instagram.json` — **public**, auth yok
- **Controller:** `controllers/feedController.ts` — Google Shopping RSS XML + Facebook/Instagram JSON
- Google feed: 5000 ürüne kadar, tüm 5 dilde (en/tr/it/ar/es) title/description
- Facebook/Instagram feed: JSON array olarak
- Frontend'de proxy: `market/src/app/api/feed/[...slug]/route.ts` — backend'e yönlendirir

### Önemli Modeller
- `ExternalFeed` (`models/ExternalFeed.ts`): Feed kaynağı konfigürasyonu (URL, auth, pricing, field mapping, autoSync)
- `FeedSyncLog` (`models/FeedSyncLog.ts`): Her sync işleminin log'u (status, summary, hatalar)

### GlobalSetting Anahtarları
- `merchant_center_id`, `merchant_target_country`, `merchant_target_language` — Google Merchant Center

---

## AI İçerik Yönetimi

### Sağlayıcılar
**3 desteklenen provider** (`services/aiService.ts`):
- OpenAI (default): `https://api.openai.com/v1/chat/completions`
- OpenRouter: `https://openrouter.ai/api/v1/chat/completions`
- Gemini: `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`

**Default model:** `gpt-4o-mini`. Ayarlar `GlobalSetting`'te: `ai_provider`, `ai_api_key`, `ai_model`.

### AI Özellikleri
| Özellik | Controller Metodu | Açıklama |
|---------|-------------------|----------|
| Metin Çevirisi | `aiService.translateText()` | Tek metni hedef dile çevir |
| Ürün Açıklaması Üret | `aiService.generateProductDescription()` | 2-4 cümlelik açıklama |
| Çoklu Dil Çevirisi | `aiService.translateProduct()` | Başlık + açıklamayı 5 dile çevir |
| SEO Meta Üret | `aiService.generateSEOMeta()` | SEO title + meta description JSON |
| Bulk AI İşlem | `bulkAITranslate()` | Toplu çeviri/içerik üretimi kuyruğa ekle |

### Çalışma Akışı
1. Satıcı talebi → `aiController` → `queueAITranslation()` (Bull queue)
2. `aiTranslationJob.ts` işler:
   - `generate_content`: Açıklama yoksa/<50 karakterse Türkçe açıklama üret
   - `translate`: Başlık + açıklamayı 5 dile (en, tr, it, es, ar) çevir
   - Sonuç `Product.translations` JSONB alanına kaydedilir
3. Kredi düşülür (generate=1, translate=1 kredi)

### Kredi Sistemi (`services/planAccessService.ts`)
- **Aylık kotalar:** SubscriptionPlan.aiMonthlyCredit'e göre (ücretsiz: 5 kredi)
- **Satın alınan krediler:** `User.aiCreditBalance` alanında
- **Sıfırlama:** Her ayın 1'inde
- **Kontrol:** `checkAIAccess(userId, requiredCredits)` → önce aylık, sonra bakiye

### Route'lar (`routes/ai.ts`, mount: `/api/ai`)
| Route | Auth | Açıklama |
|-------|------|----------|
| `/api/ai/admin/settings` | admin | AI provider yapılandırması |
| `/api/ai/products/:id/translate` | seller | Tek ürün çeviri |
| `/api/ai/products/:id/generate` | seller | Tek ürün içerik üretimi |
| `/api/ai/products/:id/ai-status` | seller | AI task geçmişi (son 10) |
| `/api/ai/products/bulk-ai` | seller | Toplu AI işlem |
| `/api/ai/tasks` | seller | Tüm task'ları listele |
| `/api/ai/credits/*` | seller | Kredi sorgulama/satın alma |

### ProductAITask Modeli
- `product_ai_tasks` tablosu: taskType (translate/generate_content/both), status (pending/processing/completed/failed), progress (0-100), creditsConsumed, result (JSONB)

---

## AI Agent'lar İçin İpuçları

- Kod yazmadan önce mevcut pattern'leri okuyun (benzer bir route/controller/service nasıl yazılmış)
- `any` tipi kullanmayın, mevcut interface'leri genişletin veya yenilerini tanımlayın
- Yeni bir bağımlılık eklemeden önce mevcut `package.json`'da benzer bir çözüm var mı kontrol edin
- API route'ları eklerken `server.ts`'deki route yükleme pattern'ini takip edin (require + .default fallback)
- Test yazarken Jest + ts-jest kullanın (konfigürasyon hazır)
- **Product/category değişikliği yaparken** hem `category` (string) hem de `categoryId` (UUID) alanlarını güncellemeyi unutmayın. İkisi de tutarlı olmalı.
- `FALLBACK_CATEGORY_TRANSLATIONS`'a yeni bir varyant eklerken, `migrate-product-category.ts`'deki `CATEGORY_MAP`'e de aynı varyantı ekleyin.
- Console'dan veritabanı sorgusu için: `$env:NODE_PATH = "...\golden-marketplace\node_modules"; cd backend; npx --package pg node -e "..."` (pg modülü root node_modules'ta)
- Production DB'ye bağlanırken `golden_user` kullanıcısı ve yukarıdaki şifre kullanılır.

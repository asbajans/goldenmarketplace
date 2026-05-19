# Golden Marketplace — Yol Haritası & Eksiklikler

## Öncelik: KRİTİK (Hemen)
- [ ] **Migration framework kurulumu** — `sync({ alter: true })` production'da güvenli değil. Umzug veya benzeri bir framework ile versioned migration'lara geçilmesi gerekiyor.
- [x] **Seed script'e NODE_ENV guard'ı** — Script'in başına production kontrolü eklendi.
- [ ] **Amazon entegrasyonu** — Ya SP-API implementasyonu tamamlanmalı ya da resmen kaldırılmalı. Şu an stub halde ve `{ success: false }` döndürüyor.
- [x] **console.log → Winston logger** — `server.ts`'deki tüm console.log/error çağrıları logger ile değiştirildi.

## Öncelik: YÜKSEK (Bu Sprint)
- [x] **CORS wildcard düzeltmesi** — Fonksiyon-based origin validator ile değiştirildi, duplicate domain'ler temizlendi, goldencrafters.com eklendi.
- [ ] **Controller error handling** — Tüm controller'lar `next(err)` pattern'ine geçirilmeli. Şu an try/catch + direkt response yapılıyor, central error handler bypass ediliyor.
- [x] **Env validation** — Joi ile JWT_SECRET, DB_HOST, DB_NAME, DB_USER zorunlu alan kontrolü eklendi.
- [x] **Duplicate middleware temizliği** — `adminAuth.ts` kaldırıldı (authMiddleware.ts'deki adminMiddleware yeterli).
- [ ] **Test altyapısı** — Jest kurulu ama sıfır test var. İlk adım olarak service layer unit test'leri yazılmalı (goldPriceService, bankTransferService).

## Öncelik: ORTA (Gelecek Sprint)
- [ ] **API Dökümantasyonu** — Swagger/OpenAPI kurulumu. Tüm endpoint'ler dokümante edilmeli.
- [ ] **Paylaşılan TypeScript paketi** — Backend ile frontend'ler arasında ortak type'lar için ayrı bir workspace paketi oluşturulmalı.
- [ ] **Market frontend iyileştirmeleri** — SSR/SSG stratejisi belirlenmeli, CSP header'ı konulmalı.
- [ ] **DB index tekilleştirme** — Index'ler 3 ayrı yerde tanımlanmış (model, raw SQL, ayrı script). Tek bir noktadan yönetilmeli.

## Öncelik: DÜŞÜK (Gerekirse)
- [ ] `.env` vs `stack.env` ikilemini çöz — hangisi primary belirlenmeli
- [ ] Kök dizindeki başıboş test dosyalarını temizle (`etsy_test.js`, `test_etsy_fetch.ts`)
- [ ] PowerShell script'lerini npm scripts'e taşı (`build-docker.ps1`, `push-docker-ghcr.ps1`)
- [x] `server.ts`'de 2 kez çağrılan `dotenv.config()`'i tekilleştir
- [ ] `docker-compose.yml` + `docker-compose.prod.yml` + Portainer stack'i arasında standardizasyon

## Fazlalıklar (Temizlenecek)
- [ ] Root'taki eski test dosyaları (`etsy_test.js`, `test_etsy_fetch.ts`)
- [ ] `build-docker.ps1`, `push-docker-ghcr.ps1` (npm scripts'e taşınabilir)
- [ ] Duplicate GitHub workflow'lar — 3 workflow tek bir akışa indirgenebilir
- [x] `adminAuth.ts` — `authMiddleware.ts` duplicate, silindi
- [x] `server.ts`'de 2x `dotenv.config()` çağrısı — tekilleştirildi
- [ ] `Product` modelindeki duplicate index tanımları (model + raw SQL + ayrı script)
- [ ] `goldPriceJob.ts` — Bull queue wrapper'ı işlevsiz (job devre dışı)
- [x] Market frontend'deki default Next.js varlıkları — temizlendi
- [ ] Market frontend'deki eski `TASKS.md` (tamamlanmış task'leri tutuyor)

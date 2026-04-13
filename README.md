# Golden Marketplace 🥇

Golden Marketplace, kuyumcular ve mücevher satıcıları için özel olarak tasarlanmış, çoklu pazaryeri (omnichannel) entegrasyonlarına sahip, B2B ve B2C odaklı gelişmiş bir e-ticaret yönetim platformudur. 

Bu projenin temel amacı; altın kurlarına duyarlı dinamik fiyatlama altyapısı sağlamak, satıcıların kendi B2B ağlarını kurmasına olanak tanımak ve Etsy, Trendyol, Hepsiburada, Amazon gibi dev platformlara otomatik ürün ve stok senkronizasyonu yapmaktır.

## 🚀 Projenin Mevcut Özellikleri

### 1. Dinamik Altın Fiyatlaması
- **Otomatik Kur Takibi:** Güncel Has Altın (gram/USD/TRY) kurlarını API üzerinden çeker ve kuyumcunun belirlediği kar marjı, işçilik (gram/milyem) ve gramaj bilgilerine göre "Anlık Satış Fiyatı" hesaplar.
- Sistem her belirli dakikada (CRON Job) kurları günceller ve değişiklikleri ilgili pazaryerlerine (Etsy, vs.) anında yansıtır.

### 2. Çoklu Pazaryeri Entegrasyonları (Marketplace Integrations)
- **Etsy:** Taslak oluşturma, görsel yükleme, varyasyon destekli envanter eşleme ve sipariş senkronizasyonu. **Akıllı Yenileme (Auto-Refresh):** Etsy'nin 1 saatlik token sınırını aşmak için, arka planda süre dolumunda otomatik 'refresh_token' ile yetkiyi tazeleyerek kalıcı bağlantı kurar.
- **Trendyol:** Barkod, liste fiyatı, satış fiyatı, stok, KDV ve varyasyon eşleştirmeli batch ürün yükleme.
- **Hepsiburada, N11, Pazarama:** Dinamik stok ve fiyat güncelleme, hızlı eşleştirme araçları.
- **Gelişmiş Senkronizasyon (BullMQ/Redis):** Veritabanında bir fiyat veya stok değiştiğinde Redis kuyruğuna alınır. İlgili tüm satış kanallarındaki o ürün kuyruk üzerinden hatasız şekilde güncellenir.

### 3. Gelişmiş Ürün ve Varyasyon Yönetimi
- Altın ayarı (Milyem) ve ağırlığına göre fiyatlanan, renk (Sarı, Beyaz, Rose vb.), uzunluk gibi niteliklere göre türeyen gelişmiş **Varyasyon Matrisi**.
- Sınırsız varyasyon desteği, her varyasyona özel stok ve fiyat kontrolü.
- Sürükle bırak ile hızlı resim yönetimi.

### 4. Toplu Yükleme ve Akıllı Eşleştirme (Bulk Upload)
- **Excel (.xlsx, .csv) & XML Desteği:** Belirli bir şablona bağlı kalmaksızın, sisteme dışarıdan yüzlerce ürünü tek seferde içe aktarma imkanı.
- Akıllı Eşleştirme (Mapping) arabirimi sayesinde, yüklenen dosya içerisindeki "Başlık, Barkod, Altın Ayarı (Milyem), Gramaj vs." sütunlarını veritabanındaki karşılıklarıyla kolayca bağlama.

### 5. Medya Yönetimi (Self-Hosted S3 / Minio)
- Ürün resimleri, Base64 gibi veritabanını şişirecek pratikler yerine doğrudan projeye entegre **S3 Uyumlu MinIO Objektif Depolamaya** kaydedilir.
- E-Ticaret sistemlerine ve B2B platformuna giden görseller CDN hızında statik olarak sunulur.

### 6. B2B Toptan Pazaryeri ve Vitrin (Storefront)
- Satıcılar ekledikleri ürünleri tek tuşla **"B2B Pazaryerine Aç (Wholesale)"** diyerek genel toptan pazara dahil edebilirler.
- Kullanıcılar üreticilere "Toptan Alışveriş Talebi" (B2B Request) gönderebilir ve özel indirimli fiyatları onay doğrultusunda görüntüleyebilir.

---

## 🛠️ Kullanılan Teknolojiler

- **Backend (API):** Node.js, Express.js, TypeScript
- **Veritabanı:** PostgreSQL (Sequelize ORM)
- **Önbellek & Arkaplan İşlemleri:** Redis, BullMQ (Kuyruk Yönetimi)
- **Medya Depolama:** MinIO (AWS S3 Uyumlu)
- **Frontend (Satıcı Paneli):** React, TypeScript, Ant Design, Vite
- **Frontend (Toptan/Mimari Site):** Next.js (Server-Side Rendering)
- **Konteynerleştirme:** Docker & Docker Compose

---

## 🔌 API Uç Noktaları (Endpoints)

Geliştirici ortamı için taban adres: `http://localhost:5000/api`

### Kimlik Doğrulama (`/api/auth`)
- `POST /register` - Yeni kullanıcı kaydı.
- `POST /login` - Kullanıcı girişi (JWT üretir).
- `GET /me` - Mevcut kullanıcı bilgilerini getirir.

### Ürünler (`/api/products`)
- `GET /` - Filtrelenmiş veya Sayfalanmış ürün listesini getirir.
- `POST /` - Yeni bir ürün oluşturur (Tekil).
- `GET /:id` - Seçili ürünün tüm detaylarını ve varyasyonlarını getirir.
- `PUT /:id` - Ürünü günceller (Gram, Milyem, Başlık vs.).
- `DELETE /:id` - Ürünü sistemden siler.
- `POST /bulk-parse` - Yüklenen Excel/XML dosyasını okuyup sütun haritası (header/sample data) çıkartır.
- `POST /bulk-import` - Kullanıcının eşleştirdiği (mapping) Excel sütunlarını veritabanına toplu kaydeder.
- `POST /:id/sync` - Ürünü ilgili pazaryerlerine (Etsy, Trendyol vb.) manuel göndermek için kuyruğa Push eder.

### Varyasyonlar (`/api/variations`)
- `GET /` - Kaydedilmiş varyasyon ana kategorilerini getirir (Renk, Boyut, Ayar vb.).
- `POST /` - Yeni varyasyon çeşidi oluşturur.

### Pazar Yeri & Entegrasyonlar (`/api/integrations`)
- `GET /` - Kullanıcının bağlı olduğu entegrasyon listesini döner.
- `POST /connect` - Yeni bir pazar yeri bağlar (API anahtarları kaydı).
- `DELETE /:platform` - İlgili pazar yeri entegrasyonu siler.
- `POST /:platform/test` - Kaydedilmiş Token/API Key'leri pazar yerine sorarak bağlantıyı doğrular.
- *(Özel)* `GET /etsy/auth-url` - Oauth2 süreci için Etsy Login ekranına gönderilecek PKCE adresini üretir.
- *(Özel)* `GET /etsy/callback` - Etsy Authorization onayından sonra sunucuya düşen Token'ı alır ve kaydeder.

### B2B Toptan İşlemleri (`/api/b2b`)
- `GET /market` - Toptan pazaryerine sunulmuş tüm Satıcı/Üretici ürünlerini listeler.
- `POST /requests` - Bir üreticiye yetki/toptan alışveriş başvurusu (B2B Request) yapar.
- `GET /requests` - Kurumunuza gelmiş toptan alım yetkisi başvurularını listeler.
- `PUT /requests/:id` - İlgili toptan giriş başvurusunu onaylar (Approve) veya reddeder (Reject).

### Gold Price (Altın Kur Botu) (`/api/gold-price`)
- `GET /current` - Sistemdeki en güncel altın kuru fiyatlamasını döner.

### Abonelik (SaaS) (`/api/subscriptions`)
- `GET /plans` - Sistemde bulunan SaaS üyelik paketlerini listeler (Ücretsiz, Pro, Elite).
- `POST /checkout` - Seçilen plan için ödeme ekranı (Stripe) adresi üretir.

### Feed & XML Çıktısı (`/api/feed`)
- `GET /xml` - Google Merchant veya pazar yerleri için kullanıcının mağazasına özel anlık fiyatlı XML çıktısı üretir.
- `GET /csv` - Excel uyumlu ürün kataloğu üretir.

### Admin Paneli (`/api/admin`)
- `GET /users` - Sistemdeki tüm kayıtlı kuyumcuları/kullanıcıları listeler.
- `PUT /users/:id/ban` - Kötü niyetli kullanıcıların mağazasını erişime kapatır.
- `GET /settings` - Sistem ayarlarını (Örn: Etsy Master API KEY, vs.) listeler.

---

## 💻 Kurulum ve Çalıştırma

### Gereksinimler
- Node.js v18+
- Docker ve Docker Compose (PostgreSQL, Redis ve MinIO için önerilir)

### 1- Servisleri Ayaklandırma (Docker Klasörü)
Eğer yerel makinenizde DB yoksa, projenin `docker` dizinine gidiniz.
```bash
cd docker
docker-compose up -d
```
Bu komut PostgreSQL veritabanını, Redis sunucusunu ve MinIO (Medya barındırıcısı) ayağa kaldıracaktır.

### 2- Backend'i Başlatma
```bash
cd backend
npm install
# Çevresel değişkenleri ayarla
cp .env.example .env 
npm run dev
```

### 3- Satıcı Paneli (Frontend) Başlatma
```bash
cd frontend/seller-panel
npm install
npm run dev
```

Platform başarıyla ayağa kalktığında tarayıcınızdan `http://localhost:5173` adresinden Yönetim ve Satıcı paneline bağlanabilirsiniz. Toptan market altyapısı için entegre çalışacak Next.js mağazalarınız farklı portlardan hizmet verecektir.

Yazılım geliştirme süreci ve hata takibi için `.system_generated/logs/overview.txt` ve IDE üzerinde bulunan geçmiş günlükleri kullanabilirsiniz.

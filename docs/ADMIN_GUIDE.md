# Admin Kullanım Kılavuzu

Golden Marketplace yönetici paneli kullanım rehberi.

---

## Giriş

**URL:** `http://localhost:5175` (veya production domain'iniz)

**Varsayılan Hesap:**
- E-posta: `admin@golden.com`
- Şifre: `admin123`

> ⚠️ Production ortamında bu şifreyi mutlaka değiştirin!

---

## Yönetici Yetkileri

### 1. Kullanıcı Yönetimi
- Tüm kullanıcıları (satıcı, müşteri) listeleme
- Kullanıcı hesaplarını aktif/pasif yapma
- Satıcı başvurularını onaylama/reddetme

### 2. Mağaza Yönetimi
- Tüm mağazaları listeleme ve denetleme
- Mağaza onaylama/askıya alma
- Mağaza istatistiklerini izleme

### 3. Ürün Denetimi
- Tüm platformdaki ürünleri görüntüleme
- Uygunsuz ürünleri kaldırma
- Ürün kategorilerini yönetme

### 4. Altın Fiyat Sistemi
- Güncel altın fiyatını kontrol etme
- Fiyat güncelleme geçmişini inceleme
- Manuel fiyat güncelleme tetikleme

**API Endpoint:** `GET /api/gold-price/current`

Örnek yanıt:
```json
{
  "price": 2450.50,
  "currency": "TRY",
  "change24h": 1.2,
  "lastUpdated": "2026-02-18T19:00:00.000Z"
}
```

### 5. Abonelik Yönetimi
- Aktif abonelikleri izleme
- Abonelik planlarını düzenleme (Stripe Dashboard üzerinden)
- Ödeme geçmişini kontrol etme

### 6. Pazaryeri Entegrasyonları
- Bağlı pazaryerlerini izleme (Etsy, Amazon, vb.)
- Senkronizasyon durumunu kontrol etme
- Hatalı senkronizasyonları gözlemleme

### 7. Raporlama
- Toplam satış istatistikleri
- Aktif satıcı sayısı
- Ürün kategori dağılımı
- Günlük/haftalık/aylık trendler

---

## Veritabanı İşlemleri

### Yeni Seed (Test Verisi)
```bash
cd backend
npx ts-node src/scripts/seed.ts
```

### Tabloları Güncelle (Model Değişikliği Sonrası)
```bash
cd backend
npx ts-node src/scripts/sync-db.ts
```

---

## API Güvenliği

Tüm admin endpoint'leri JWT token + admin rolü gerektirir:

```
Authorization: Bearer <jwt_token>
```

Admin middleware kontrolü:
- `userType === 'admin'` olmalı
- Token süresi dolmuşsa 401 döner
- Admin değilse 403 döner

---

## Feed'ler (Dış Sistemler)

| Feed | URL | Açıklama |
|------|-----|----------|
| Google Shopping | `/api/feed/google.xml` | Merchant Center XML |
| Facebook Katalog | `/api/feed/facebook.json` | FB Commerce JSON |
| Paylaşım Verisi | `/api/feed/share/:slug` | OG Meta verisi |

Bu endpoint'ler herkese açıktır (auth gerekmez).

---

## Sorun Giderme

| Sorun | Çözüm |
|-------|-------|
| Admin panele giriş yapamıyorum | Seed script'i çalıştırıp `admin@golden.com` ile deneyin |
| Altın fiyatı güncellenmiyor | Redis bağlantısını ve `GOLD_API_KEY`'i kontrol edin |
| Ürünler görünmüyor | `sync-db.ts` ve `seed.ts` script'lerini çalıştırın |

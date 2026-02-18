# Satıcı Kullanım Kılavuzu

Golden Marketplace satıcı paneli kullanım rehberi.

---

## Giriş

**URL:** `http://localhost:5173` (veya production domain'iniz)

**Test Hesabı:**
- E-posta: `seller@golden.com`
- Şifre: `seller123`

---

## 1. Kayıt ve Giriş

### Yeni Satıcı Kaydı
1. Giriş sayfasında **"Kayıt Ol"** butonuna tıklayın
2. E-posta, şifre, ad ve soyad bilgilerini girin
3. Kayıt tamamlandıktan sonra otomatik giriş yapılır

### Giriş
1. E-posta ve şifrenizi girin
2. **"Giriş Yap"** butonuna tıklayın

---

## 2. Dashboard (Kontrol Paneli)

Giriş yaptıktan sonra ana kontrol panelini görürsünüz:
- **Toplam Ürün Sayısı** — Mağazanızdaki ürün adedi
- **Toplam Satış** — Gerçekleşen satışlar
- **Altın Fiyatı** — Anlık altın fiyatı göstergesi

---

## 3. Ürün Yönetimi

### Ürün Listeleme
Sol menüden **"Ürünler"** seçin. Tüm ürünlerinizi burada görebilirsiniz.

### Yeni Ürün Ekleme
1. Sol menüden **"Ürün Ekle"** seçin
2. Formu doldurun:
   - **Başlık**: Ürün adı (örn. "22 Ayar Altın Bilezik")
   - **Açıklama**: Detaylı ürün açıklaması
   - **Kategori**: Bilezik, Kolye, Yüzük, vb.
   - **SKU**: Stok kodu (örn. BLZ-001)
   - **Fiyat (TRY)**: Türk Lirası cinsinden satış fiyatı
   - **Adet**: Stok miktarı
3. **"Kaydet"** butonuna tıklayın

> 💡 Fiyat otomatik olarak altın endeksine göre hesaplanır. Altın fiyatı değiştiğinde ürün fiyatlarınız otomatik güncellenir.

### Ürün Düzenleme
Ürün listesinde ilgili ürünün yanındaki **"Düzenle"** butonuna tıklayın.

### Ürün Silme
Ürün listesinde **"Sil"** butonuna tıklayın ve onaylayın.

---

## 4. Pazaryeri Entegrasyonları

Sol menüden **"Entegrasyonlar"** seçin.

### Desteklenen Pazaryerleri
| Platform | Durum |
|----------|-------|
| Etsy | ✅ Aktif |
| Amazon | 🔜 Yakında |
| Trendyol | 🔜 Yakında |
| Hepsiburada | 🔜 Yakında |
| N11 | 🔜 Yakında |

### Etsy Bağlantısı
1. **"Bağla"** butonuna tıklayın
2. Etsy'ye yönlendirileceksiniz
3. Etsy hesabınızla giriş yapıp izin verin
4. Otomatik olarak panele geri yönlendirilirsiniz
5. Başarılı bağlantı sonrası **"Aktif"** etiketi görünür

### Bağlantıyı Kesme
İlgili platformun altındaki **"Bağlantıyı Kes"** butonuna tıklayın.

### Otomatik Senkronizasyon
Bağlantı kurulduktan sonra:
- Yeni ürün eklediğinizde → Otomatik olarak bağlı pazaryerlerine gönderilir
- Ürün güncellediğinizde → Otomatik olarak güncelleme tetiklenir
- Son senkronizasyon zamanı kartlarda görünür

---

## 5. Abonelik Yönetimi

Sol menüden **"Abonelik"** seçin.

### Planlar

| Plan | Özellikler |
|------|------------|
| **Bronz** | 50 ürün, 1 pazaryeri |
| **Altın** | 500 ürün, 3 pazaryeri |
| **Platin** | Sınırsız ürün, tüm pazaryerleri |

### Abonelik Başlatma
1. İstediğiniz planı seçin
2. **"Satın Al"** butonuna tıklayın
3. Stripe ödeme sayfasına yönlendirilirsiniz
4. Ödeme bilgilerinizi girin
5. Başarılı ödeme sonrası aboneliğiniz aktif olur

---

## 6. Altın Endeksleme Sistemi

Golden Marketplace'in özel özelliği: Tüm fiyatlar altın fiyatına endekslidir.

### Nasıl Çalışır?
1. Siz ürüne TRY cinsinden fiyat verirsiniz
2. Sistem bu fiyatı gram altın karşılığına çevirir
3. Altın fiyatı değiştiğinde (her dakika kontrol edilir) ürün fiyatları otomatik güncellenir
4. Müşteriler hem TRY hem de altın gram karşılığını görür

### Örnek
- Ürün fiyatı: 25.000 TL
- Güncel altın gram fiyatı: 2.500 TL
- Altın karşılığı: 10 gram
- Altın fiyatı 2.600 TL'ye çıkarsa → Yeni fiyat: 26.000 TL

---

## 7. Sosyal Medya Paylaşımı

Ürünleriniz otomatik olarak sosyal medyada paylaşılabilir:

- **Google Shopping**: Ürünleriniz Google alışveriş sonuçlarında görünür
- **Facebook/Instagram**: Katalog entegrasyonu ile ürünleriniz FB/IG Shop'ta listelenir
- **Paylaşım Linkleri**: Her ürünün OG meta tagları sayesinde güzel önizlemeler oluşur

---

## Sıkça Sorulan Sorular

**S: Mağazam nerede görünüyor?**
C: Marketplace frontend'inde (`http://localhost:5174`) tüm aktif ürünleriniz listelenir.

**S: Ürünüm neden görünmüyor?**
C: Ürünün `isActive: true` olduğundan ve stokta (`quantity > 0`) olduğundan emin olun.

**S: Altın fiyatı ne sıklıkla güncelleniyor?**
C: Sistem her dakika kontrol eder. Önemli bir değişiklik olduğunda ürün fiyatları otomatik güncellenir.

**S: Etsy bağlantısı kesilirse ne olur?**
C: Mevcut ürünleriniz Etsy'de kalır, ancak yeni güncellemeler gönderilmez. Tekrar bağlanabilirsiniz.

# 📚 Golden Marketplace - Hızlı Referans

## 🌟 En Önemli Dosyalar

### Başlangıç için
1. **[INSTALLATION_COMPLETE.md](./INSTALLATION_COMPLETE.md)** ⭐ BAŞLA BURADAN
2. **[GETTING_STARTED.md](./GETTING_STARTED.md)** - Adım adım talimatlar
3. **[README.md](./README.md)** - Proje hakkında bilgi

### Geliştirme için
1. **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - Sistem tasarımı
2. **[docs/API.md](./docs/API.md)** - API endpoints
3. **[docs/SETUP.md](./docs/SETUP.md)** - Detaylı kurulum

### Referans için
1. **[docs/TECHNOLOGY_STACK.md](./docs/TECHNOLOGY_STACK.md)** - Teknolojiler
2. **[docs/ROADMAP.md](./docs/ROADMAP.md)** - Yol haritası
3. **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Katkı rehberi

---

## 🚀 Hızlı Komutlar

### Windows
```bash
# Setup
setup.bat

# Backend başlat
cd backend && npm run dev

# Frontend başlat
cd frontend/seller-panel && npm run dev
```

### Linux/Mac
```bash
# Setup
bash setup.sh

# Backend başlat
cd backend && npm run dev

# Frontend başlat
cd frontend/seller-panel && npm run dev
```

### Docker
```bash
# Tüm servisleri başlat
docker-compose up -d
```

---

## 📍 Port Numaraları

| Servis | Port | URL |
|--------|------|-----|
| Backend API | 3000 | http://localhost:3000 |
| Seller Panel | 5173 | http://localhost:5173 |
| Admin Panel | 5174 | http://localhost:5174 |
| Marketplace | 5175 | http://localhost:5175 |
| PostgreSQL | 5432 | localhost:5432 |
| Redis | 6379 | localhost:6379 |

---

## 📂 Klasör Yapısı

```
golden-marketplace/
├── backend/              ← Node.js API
├── frontend/
│   ├── seller-panel/    ← Satıcı paneli
│   ├── admin-panel/     ← Admin paneli
│   └── marketplace/     ← Pazaryeri
├── docs/                ← Dokümantasyon
├── .github/workflows/   ← CI/CD
└── [Config Files]
```

---

## 🔑 API Keys Gerekli

Bunları `.env` dosyasına ekle:
- `STRIPE_SECRET_KEY` - Stripe'dan
- `GOLD_API_KEY` - GoldAPI.io'dan
- `ETSY_CLIENT_ID` - Etsy'den
- `JWT_SECRET` - Rastgele bir string
- Database credentials

---

## ✅ Yapılması Gerekenler

### Hemen (1-2 gün)
- [ ] PostgreSQL kur
- [ ] API keys al
- [ ] `.env` dosyasını doldur
- [ ] `npm install` çalıştır
- [ ] Servisleri başlat ve test et

### Kısa vadede (1-2 hafta)
- [ ] Tüm backend endpoints'i implement et
- [ ] Frontend-Backend bağlantısı
- [ ] Authentication flow test et
- [ ] Database migrations yaz

### Orta vadede (3-6 hafta)
- [ ] Marketplace integrations
- [ ] Stripe webhook
- [ ] Otomasyonlar

---

## 🆘 Sorun Çözme

### Backend başlamıyor
```bash
# Port 3000 kullanımda mı?
lsof -i :3000
# Değişik port: npm run dev -- --port 3001
```

### Database hatası
```bash
# PostgreSQL çalışıyor mu?
psql -U postgres -c "SELECT version();"
# Veritabanı yoksa:
createdb golden_marketplace
```

### Module not found
```bash
# Yeniden yükle
rm -rf node_modules package-lock.json
npm install
```

---

## 📖 Dosya Rehberi

| Dosya | İçerik |
|-------|--------|
| `.env.example` | Environment template |
| `docker-compose.yml` | Docker servisleri |
| `setup.bat` | Windows kurulum |
| `setup.sh` | Linux/Mac kurulum |
| `package.json` | Dependencies |

---

## 💻 IDE Ayarları

### VS Code Önerilen Extensions
- ESLint
- Prettier
- Thunder Client (API test)
- PostgreSQL
- Docker

### Recommended Settings
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

---

## 🎯 Hedefler

- [ ] MVP (Minimal Viable Product) tamamla
- [ ] 100+ seller sign up
- [ ] 5 marketplace entegrasyonu
- [ ] 50K$ GMV
- [ ] 99.9% uptime

---

## 📞 İletişim

- **Kod Soruları**: GitHub Issues
- **Geliştirme**: `development` branch
- **Kusurlar**: Pull Request
- **Email**: dev@goldenmarketplace.com

---

## 📜 Lisans

MIT License - Tüm dosyalarda kullanılabilir

---

**Geçen zaman: Şubat 5, 2026**  
**Proje Durumu: 🟢 Aktif Geliştirme**  
**Başlamaya Hazır: ✅ EVET**

Şimdi başlayabilirsin! 🚀

# Golden Marketplace - E-Commerce Platform

Altın endeksli fiyatlandırma ile multi-pazaryeri entegrasyonu destekleyen kapsamlı e-ticaret platformu.

## 🚀 Özellikler

- **Multi-Marketplace Integration**: Etsy, Hepsiburada, Amazon, N11, Trendyol ve daha fazlası
- **Kendi Pazaryeri**: Satıcılar kendi mağazalarını açabilir
- **Altın Endeksli Fiyatlandırma**: ISO 4217 benzeri altın tabanlı para birimi
- **Otomatik Fiyat Güncellemeleri**: Altın fiyatlarına bağlı dinamik fiyatlandırma
- **Subscription Model**: Stripe entegrasyonu ile ödeme yönetimi
- **Sosyal Medya Entegrasyonu**: Instagram, TikTok, Google Shop
- **Üç Ayrı Platform**:
  - 👑 Pazaryeri (Herkese açık)
  - 🏪 Satıcı Paneli
  - ⚙️ Süper Admin Paneli

## 📁 Proje Yapısı

```
golden-marketplace/
├── backend/              # Node.js/Express API
│   ├── src/
│   │   ├── models/       # Database models
│   │   ├── controllers/  # Route controllers
│   │   ├── services/     # Business logic
│   │   ├── integrations/ # Marketplace integrations
│   │   ├── routes/       # API routes
│   │   ├── middleware/   # Custom middleware
│   │   ├── config/       # Configuration
│   │   └── utils/        # Utility functions
│   └── package.json
├── frontend/
│   ├── seller-panel/     # Satıcı yönetim paneli
│   ├── admin-panel/      # Süper admin paneli
│   └── marketplace/      # Herkese açık pazaryeri
├── docs/                 # Dokumentasyon
└── README.md
```

## 🛠️ Teknoloji Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Sequelize/TypeORM
- **Authentication**: JWT + OAuth2
- **Payment**: Stripe API
- **Task Queue**: Bull/RabbitMQ

### Frontend
- **Framework**: React + TypeScript
- **UI Library**: Ant Design / Material-UI
- **State Management**: Redux / Zustand
- **API Client**: Axios / TanStack Query

### Marketplace Integrations
- Etsy API
- Amazon Selling Partner API
- Hepsiburada API
- Trendyol API
- N11 API

### Social Media
- Instagram Graph API
- TikTok Shop API
- Google Merchant Center API

## 🔐 Güvenlik

- JWT Authentication
- Role-Based Access Control (RBAC)
- API Rate Limiting
- CORS Configuration
- Environment Variables

## 📦 Kurulum

Detaylı kurulum talimatları için [SETUP.md](./docs/SETUP.md) dosyasını inceleyiniz.

## 🚀 Başlangıç

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (Her biri için ayrı terminal)
cd frontend/seller-panel
npm install
npm start

cd frontend/admin-panel
npm install
npm start

cd frontend/marketplace
npm install
npm start
```

## 📄 Lisans

MIT License

#!/bin/bash

# Golden Marketplace - Setup Script
# Bu script kurulum sonrası gerekli dosyaları oluşturur

echo "🚀 Golden Marketplace Setup Başlıyor..."

# Backend setup
echo "📦 Backend kurulumu..."
cd backend || exit 1
npm install

# .env dosyası oluştur
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ .env dosyası oluşturuldu. Lütfen API anahtarlarını ekleyin."
else
    echo "⚠️ .env dosyası zaten mevcut."
fi

cd ..

# Seller Panel setup
echo "🎨 Seller Panel kurulumu..."
cd frontend/seller-panel || exit 1
npm install
cd ../../

# Admin Panel setup
echo "👑 Admin Panel kurulumu..."
cd frontend/admin-panel || exit 1
npm install
cd ../../

# Marketplace setup
echo "🛒 Marketplace kurulumu..."
cd frontend/marketplace || exit 1
npm install
cd ../../

echo ""
echo "✨ Setup tamamlandı!"
echo ""
echo "📝 Sonraki adımlar:"
echo "1. Backend config dosyasını düzenle: backend/.env"
echo "2. API anahtarlarını ekle (Stripe, Etsy, vb)"
echo "3. PostgreSQL veritabanını kur"
echo "4. Development servislerini başlat:"
echo ""
echo "   Terminal 1: cd backend && npm run dev"
echo "   Terminal 2: cd frontend/seller-panel && npm run dev"
echo "   Terminal 3: cd frontend/admin-panel && npm run dev"
echo "   Terminal 4: cd frontend/marketplace && npm run dev"
echo ""

@echo off
REM Golden Marketplace - Setup Script (Windows)
REM Bu script kurulum sonrası gerekli dosyaları oluşturur

echo.
echo 🚀 Golden Marketplace Setup Basliyor...
echo.

REM Backend setup
echo 📦 Backend kurulumu...
cd backend
call npm install

REM .env dosyası oluştur
if not exist .env (
    copy .env.example .env
    echo ✅ .env dosyası olusturuldu. Lutfen API anahtarlarini ekleyin.
) else (
    echo ⚠️ .env dosyası zaten mevcut.
)

cd ..

REM Seller Panel setup
echo.
echo 🎨 Seller Panel kurulumu...
cd frontend\seller-panel
call npm install
cd ..\..\

REM Admin Panel setup
echo.
echo 👑 Admin Panel kurulumu...
cd frontend\admin-panel
call npm install
cd ..\..\

REM Marketplace setup
echo.
echo 🛒 Marketplace kurulumu...
cd frontend\marketplace
call npm install
cd ..\..\

echo.
echo ✨ Setup tamamlandi!
echo.
echo 📝 Sonraki adimlar:
echo 1. Backend config dosyasini duzenle: backend\.env
echo 2. API anahtarlarini ekle (Stripe, Etsy, vb)
echo 3. PostgreSQL veritabanini kur
echo 4. Development servislerini basla:
echo.
echo    Terminal 1: cd backend ^&^& npm run dev
echo    Terminal 2: cd frontend\seller-panel ^&^& npm run dev
echo    Terminal 3: cd frontend\admin-panel ^&^& npm run dev
echo    Terminal 4: cd frontend\marketplace ^&^& npm run dev
echo.
pause

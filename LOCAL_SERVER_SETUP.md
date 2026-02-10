# 🖥️ LOCAL SERVER DEPLOYMENT GUIDE
# Ubuntu 22 + Portainer + CasaOS + Coolify

## ⚡ Hızlı Başlama (Quick Setup)

Bu rehber senin **local Ubuntu 22 sunucuna** Golden Crafters'ı deploy etmek için tasarlandı.

### 📋 İlk Sorular (Cevapla)

1. **Sunucunun IP adresi nedir?**
   ```bash
   # Sunucuda çalıştır:
   hostname -I
   # Örnek: 192.168.1.100
   ```

2. **Coolify kurulu mu?**
   - Evet → Daha kolay! Adım 2'ye git
   - Hayır → Coolify kuracak mıyız?

3. **Domain adresine sahip misin?**
   - Evet → IP yerine domain kullanacağız
   - Hayır → IP ile devam ederiz (ama HTTPS zor)

4. **Sunucuya SSH erişim var mı?**
   ```bash
   # Windows PowerShell'den:
   ssh ubuntu@192.168.1.100
   # Ya da PuTTY/WSL ile
   ```

---

## 🎯 Seçenekler

### Option 1: Coolify Kullanma ⭐ (Tavsiye Edilen)
**Avantajlar:**
- GUI ile deploy
- Database + Redis otomatik
- SSL otomatik
- Docker Compose yönetimi
- Süre: 30 dakika

**Adımlar:**
1. Coolify login
2. GitHub bağla
3. New Project oluştur
4. Backend deploy et
5. Frontend deploy et
6. Domain ayarla
7. Done!

---

### Option 2: Portainer + Docker Compose Kullanma
**Avantajlar:**
- Docker arayüzü (GUI)
- Full kontrol
- Şimdiki setup'ınız ile uyumlu
- Süre: 45 dakika

**Adımlar:**
1. Portainer'e login
2. Docker Compose stack oluştur
3. .env dosya paste et
4. Deploy et
5. Nginx config
6. SSL setup
7. Done!

---

### Option 3: SSH + Terminal Kullanma
**Avantajlar:**
- Tam manuel kontrol
- DevOps pratik yapma
- Öğrenme değeri
- Süre: 60 dakika

**Adımlar:**
1. SSH bağlan
2. Node.js kur
3. PostgreSQL kur
4. Redis kur
5. Git clone
6. npm install
7. PM2 başlat
8. Nginx config
9. SSL setup
10. Done!

---

## ✅ Seç & Cevapla

Aşağıdaki soruları cevapla:

### Soru 1: Coolify kullanmak ister misin?
- [ ] Evet, Coolify kullan (en kolay)
- [ ] Hayır, Portainer kullan
- [ ] Hayır, SSH + Terminal kullan (en kontrollü)

### Soru 2: Domain adresin var mı?
- [ ] Evet, domain: _______________
- [ ] Hayır, IP ile yap: 192.168.x.x

### Soru 3: Sunucunun IP adresi?
```
192.168.___.___ ya da 10.0.___.___ ?
```

### Soru 4: PostgreSQL + Redis nerede?
- [ ] Sunucuda kurulsun (Docker ile)
- [ ] Zaten başka sunucuda var (URL ver)

---

## 🚀 Hazır mısın?

1. Yukarıdaki soruları cevapla
2. Ben özel rehber hazırlayacağım
3. Adım adım deploy edeceğiz
4. 30-60 dakika içinde live olacaksın

**Cevapları ver ve başlayalım!** ⚡

---

*Not: Sonraki rehber senin cevaplarına göre custom olacak*

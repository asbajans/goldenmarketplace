# ✅ LOCAL SERVER DEPLOYMENT CHECKLIST

**Sunucu:** Ubuntu 22 @ 192.168.0.243  
**Setup:** Portainer + Cloudflared  
**Hedef:** Production Ready  

---

## 📋 PRE-DEPLOYMENT (Başlamadan Önce)

### Sunucu Hazırlığı
- [ ] SSH ile sunucuya bağlanabiliyorum
- [ ] Docker kurulu ve çalışıyor (`docker --version`)
- [ ] Docker Compose kurulu (`docker-compose --version`)
- [ ] Portainer çalışıyor (https://192.168.0.243:9443 açılıyor)
- [ ] CasaOS çalışıyor (opsiyonel)
- [ ] Cloudflared çalışıyor (`systemctl status cloudflared`)

### GitHub Hazırlığı
- [ ] Kod GitHub'a pushed
- [ ] Repository PUBLIC ya da SSH key ile erişim
- [ ] Backend klasörü var (src/, package.json, etc)
- [ ] Frontend klasörleri var (marketplace, seller-panel, admin-panel)
- [ ] .env.example dosyası kök dizinde

### Credentials Hazırlığı
- [ ] Database password (güçlü, 16+ karakter)
- [ ] Redis password (güçlü)
- [ ] JWT_SECRET (uzun ve random, 32+ karakter)
- [ ] Stripe keys (test mode okay)
- [ ] Domain name (yourdomain.com)
- [ ] GitHub username (repo clone için)

### Documentation Review
- [ ] PORTAINER_QUICKSTART.md okudum
- [ ] PORTAINER_DEPLOYMENT.md okudum
- [ ] docker-compose.prod.yml açtım ve inceledim
- [ ] Hataları anlıyorum (logs nasıl bakılır)

---

## 🚀 DEPLOYMENT (Kurulum)

### Adım 1: Portainer Stack Oluştur
- [ ] Portainer login (https://192.168.0.243:9443)
- [ ] Stacks → Add Stack
- [ ] Stack Name: golden-marketplace
- [ ] Web editor seçtim
- [ ] Docker Compose paste ettim

### Adım 2: Environment Variables Gir
- [ ] DB_PASSWORD=... (güçlü)
- [ ] REDIS_PASSWORD=... (güçlü)
- [ ] JWT_SECRET=... (uzun)
- [ ] STRIPE_SECRET_KEY=... (opsiyonel)
- [ ] STRIPE_PUBLISHABLE_KEY=... (opsiyonel)
- [ ] FRONTEND_URL=https://yourdomain.com
- [ ] GitHub username ✓ (docker-compose'da)

### Adım 3: Deploy
- [ ] "Deploy the stack" butonuna tıkladım
- [ ] Kurulum başladı (watch logs)
- [ ] PostgreSQL started ✓
- [ ] Redis started ✓
- [ ] Node.js started ✓
- [ ] npm install completed ✓
- [ ] npm build completed ✓
- [ ] "listening on port 3000" log mesajı ✓

**Kurulum süresi:** 3-5 dakika

### Adım 4: Portainer Container Kontrol
- [ ] Portainer → Containers
- [ ] Gördüğüm containers:
  - [ ] golden-postgres (Up / Running)
  - [ ] golden-redis (Up / Running)
  - [ ] golden-api (Up / Running)

---

## 🔍 POST-DEPLOYMENT (Test Et)

### Container Health Check
- [ ] golden-postgres → Logs (error yok)
- [ ] golden-redis → Logs (error yok)
- [ ] golden-api → Logs (error yok)
- [ ] golden-api → Stats (CPU/Memory normal)

### API Endpoint Test
- [ ] Health endpoint: https://yourdomain.com/api/health
  - Expected: `{"status":"ok"}`
- [ ] API response time < 500ms
- [ ] HTTPS bağlantı çalışıyor (Cloudflare Tunnel)

### Database Connection Test
- [ ] golden-api logs'ta "Database connection successful"
- [ ] PostgreSQL container'ında port 5432 açık
- [ ] Data table'ları oluştu
  - [ ] users
  - [ ] stores
  - [ ] products
  - [ ] subscriptions
  - [ ] integrations

### Redis Connection Test
- [ ] golden-api logs'ta "Redis connection successful"
- [ ] Redis port 6379 açık
- [ ] Cache test edilebilirse test et

### Cloudflare Tunnel Test
- [ ] cloudflared process çalışıyor
- [ ] Tunnel status: Connected ✓
- [ ] Domain DNS Cloudflare'e yöneliyor
- [ ] HTTP → HTTPS redirect çalışıyor
- [ ] API erişilebilir: https://yourdomain.com/api

---

## 🔐 Security Checklist

### Passwords & Secrets
- [ ] Hiçbir password commit edilmedi
- [ ] .env dosyası .gitignore'da
- [ ] Secrets Portainer environment variables'ında
- [ ] Database password güçlü (16+ karakter)
- [ ] Redis password güçlü
- [ ] JWT secret çok uzun

### Network Security
- [ ] Firewall sadece gerekli portlar açık (22, 80, 443)
- [ ] SSH key authentication aktif (password login disabled)
- [ ] Database port (5432) sadece localhost'a açık
- [ ] Redis port (6379) sadece localhost'a açık
- [ ] API port (3000) sadece localhost'a açık (Cloudflare tunnel'dan erişim)

### Application Security
- [ ] CORS properly configured
- [ ] Rate limiting aktif
- [ ] Security headers aktif (Helmet)
- [ ] Input validation aktif
- [ ] Password hashing aktif

---

## 📊 Monitoring Setup

### Logs Monitoring
- [ ] Portainer logs sekmesinde error kontrol süreci planlandı
- [ ] Hata durumunda ne yapacağını biliyorum

### Container Monitoring
- [ ] Portainer → Containers → Stats (CPU/Memory kontrol)
- [ ] Memory usage normal (<500MB per container)
- [ ] CPU usage normal (<10% idle)
- [ ] Network I/O healthy

### Application Monitoring (Sonra)
- [ ] Sentry setup (error tracking)
- [ ] UptimeRobot setup (uptime monitoring)
- [ ] CloudFlare Analytics (traffic monitoring)

---

## 📝 Data & Backups

### Database Backup
- [ ] postgres_data volume exists
- [ ] Backup strategy planned:
  - [ ] Daily automated backup (ya da manual backup script)
  - [ ] Backup location (NAS, cloud, external drive)
  - [ ] Recovery procedure documented

### Configuration Backup
- [ ] .env file backed up (encrypted)
- [ ] docker-compose.prod.yml backed up
- [ ] Portainer stack config exported

---

## 🔄 Restart & Recovery

### Container Restart Procedure
- [ ] Tek container restart: Portainer → Restart
- [ ] Tüm stack restart: Portainer → Stop → Start
- [ ] Data persist mi? (volume'ler korunuyor mu?)

### Rollback Procedure
- [ ] Önceki image'ı biliyorum (docker-compose.prod.yml'de)
- [ ] Rollback komutunu biliyorum
- [ ] GitHub'da önceki tag var mı?

---

## ✨ Final Verification

### Everything Working?
- [ ] API /health endpoint ✓
- [ ] Database connected ✓
- [ ] Redis connected ✓
- [ ] All containers running ✓
- [ ] No error logs ✓
- [ ] HTTPS working ✓
- [ ] Cloudflare Tunnel connected ✓

### Performance OK?
- [ ] API response time < 500ms ✓
- [ ] Container CPU usage normal ✓
- [ ] Container memory usage normal ✓
- [ ] Disk space yeterli mi? ✓

### Security OK?
- [ ] No credentials in code ✓
- [ ] Passwords strong ✓
- [ ] SSH key only ✓
- [ ] Firewall configured ✓

---

## 📋 Next Steps (Sonrasında)

### Immediate (Bugün)
- [ ] Frontend deploy (Vercel veya Docker)
- [ ] Frontend API URL'sini ayarla
- [ ] Full end-to-end test
- [ ] User test (login, product view, etc)

### This Week
- [ ] Monitoring tools setup (Sentry, UptimeRobot)
- [ ] Backup automation
- [ ] Documentation update
- [ ] Team notification

### This Month
- [ ] Marketplace integration implement
- [ ] Payment webhook handlers
- [ ] Advanced monitoring & alerting
- [ ] Load testing & optimization

---

## 📞 Troubleshooting Quick Reference

| Problem | Solution |
|---------|----------|
| **Port 3000 already in use** | `sudo lsof -i :3000` → Kill process |
| **PostgreSQL won't start** | Check volume permissions, restart container |
| **npm install timeout** | Use node:18-slim instead of alpine |
| **Cloudflare tunnel down** | `systemctl restart cloudflared` |
| **API 500 error** | Check golden-api logs in Portainer |
| **Database connection error** | Check DB_PASSWORD env variable |
| **CORS error** | Check FRONTEND_URL env variable |
| **Container restart loop** | Check logs, fix error, restart |

---

## ✅ Sign-off

- **Deployed By:** _________________
- **Date:** _________________
- **Status:** ✅ PRODUCTION READY
- **Verified:** YES / NO
- **Notes:** _________________

---

## 🎉 Success Indicators

✅ All containers running  
✅ API health check passing  
✅ Database connected  
✅ Redis connected  
✅ HTTPS working  
✅ Cloudflare tunnel active  
✅ No error logs  
✅ Performance acceptable  

---

**Deployment Status: 🟢 LIVE**

*Kontrol listesi tamamlandı. Sistem production'da hazır!*

---

*Last Updated: 2024*  
*System: Ubuntu 22 + Portainer + Cloudflared*  
*Status: ✅ PRODUCTION READY*

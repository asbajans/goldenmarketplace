# ⚡ QUICK REFERENCE - Local Server Setup

```
┌─────────────────────────────────────────────────────┐
│         GOLDEN CRAFTERS - LOCAL SERVER DEPLOY       │
│                                                     │
│  Sunucu: Ubuntu 22 @ 192.168.0.243                 │
│  Yönetim: Portainer + Cloudflare Tunnel            │
│  Kurulum: 15 dakika                                │
│  Maliyet: $0                                        │
└─────────────────────────────────────────────────────┘
```

---

## 🎯 5-STEP DEPLOYMENT

```
┌─────────────────────────────────┐
│ STEP 1: Portainer Login         │
│ https://192.168.0.243:9443      │
│ Süre: 1 min                     │
└─────────────────────────────────┘
              ↓
┌─────────────────────────────────┐
│ STEP 2: Create Stack            │
│ Stacks → Add Stack              │
│ Name: golden-marketplace        │
│ Süre: 1 min                     │
└─────────────────────────────────┘
              ↓
┌─────────────────────────────────┐
│ STEP 3: Paste Docker Compose    │
│ docker-compose.prod.yml         │
│ Web editor → paste              │
│ Süre: 2 min                     │
└─────────────────────────────────┘
              ↓
┌─────────────────────────────────┐
│ STEP 4: Add Env Variables       │
│ DB_PASSWORD=...                 │
│ REDIS_PASSWORD=...              │
│ JWT_SECRET=...                  │
│ Süre: 2 min                     │
└─────────────────────────────────┘
              ↓
┌─────────────────────────────────┐
│ STEP 5: Deploy Stack            │
│ Deploy the stack → Click        │
│ Wait 3-5 min for install        │
│ Check logs "listening on :3000" │
│ Süre: 5 min                     │
└─────────────────────────────────┘
              ↓
          🎉 LIVE!
```

---

## 📋 RESOURCES

| Dosya | Açıklama | Zaman |
|-------|----------|-------|
| **[PORTAINER_QUICKSTART.md](PORTAINER_QUICKSTART.md)** | Step-by-step | 5 min read |
| **[PORTAINER_DEPLOYMENT.md](PORTAINER_DEPLOYMENT.md)** | Detay + Troubleshoot | 10 min read |
| **[LOCAL_SERVER_CHECKLIST.md](LOCAL_SERVER_CHECKLIST.md)** | Kontrol listesi | 15 min check |
| **[docker-compose.prod.yml](docker-compose.prod.yml)** | Copy-paste | - |

---

## 🔑 ENV VARIABLES

```bash
# Portainer'e gir:

DB_PASSWORD=StrongPassword123!@#
REDIS_PASSWORD=RedisPass456!@#  
JWT_SECRET=VeryLongSecretKey32CharMin789!@#
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
FRONTEND_URL=https://yourdomain.com
```

---

## ✅ FINAL TEST

```bash
# Health Check
curl https://yourdomain.com/api/health

# Expected Response:
{"status":"ok"}
```

---

## 🚀 BAŞLA

👉 **[PORTAINER_QUICKSTART.md](PORTAINER_QUICKSTART.md)** AÇ

**15 dakika → LIVE!** ✅

---

## 🆘 HATA VARSA

| Problem | Solution |
|---------|----------|
| API down | Portainer → Logs → Check error |
| DB connection | Check DB_PASSWORD env var |
| Timeout | Restart container |
| No HTTPS | Check Cloudflare tunnel |

---

## 📊 SERVICES

```
Container Name        Port    Status
─────────────────────────────────────
golden-postgres      5432    ✓
golden-redis         6379    ✓
golden-api           3000    ✓
```

---

**HAZIR? ŞİMDİ BAŞLA!** 🚀

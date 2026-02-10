# 📋 Deployment Checklist

## 🎯 Pre-Deployment

### Code Quality
- [ ] Tüm tests pass
- [ ] No console errors/warnings
- [ ] Linting passes (`npm run lint`)
- [ ] TypeScript errors yok
- [ ] Dependencies updated

### Environment Setup
- [ ] `.env.example` güncel
- [ ] `.env` `.gitignore`'da
- [ ] Production env vars ready
- [ ] Database credentials secure
- [ ] API keys rotated (if needed)

### Documentation
- [ ] README.md updated
- [ ] API docs updated
- [ ] Deployment guide updated
- [ ] Changelog created
- [ ] Migration guide (if DB changes)

---

## 🚀 Vercel Deployment

### Pre-Deploy
- [ ] GitHub repo public/private?
- [ ] Vercel account created
- [ ] GitHub connected to Vercel
- [ ] Domain ready (optional)
- [ ] SSL certificate ready

### Deployment
- [ ] Seller Panel deployed
  - [ ] Build successful
  - [ ] Environment vars set
  - [ ] API URL configured
  - [ ] Health check passed
- [ ] Admin Panel deployed
  - [ ] Build successful
  - [ ] Environment vars set
  - [ ] API URL configured
  - [ ] Health check passed
- [ ] Marketplace deployed
  - [ ] Build successful
  - [ ] Environment vars set
  - [ ] API URL configured
  - [ ] Health check passed

### Post-Deploy
- [ ] All apps accessible
- [ ] No 404 errors
- [ ] API calls working
- [ ] Images loading
- [ ] Responsive design
- [ ] SSL working (if domain)
- [ ] Performance acceptable (<3s)

---

## 🚂 Railway Deployment

### Pre-Deploy
- [ ] Railway account created
- [ ] GitHub connected
- [ ] Environment vars prepared
- [ ] Database plan selected
- [ ] Redis plan selected

### Deployment
- [ ] Backend pushed to Railway
  - [ ] Build successful
  - [ ] PostgreSQL created
  - [ ] Redis created
  - [ ] Environment vars set
  - [ ] Health check: `/health` endpoint

- [ ] Database
  - [ ] Connected successfully
  - [ ] Migrations run
  - [ ] Tables created
  - [ ] Indices created

- [ ] API
  - [ ] Server starting
  - [ ] Logs clean
  - [ ] Health endpoint working
  - [ ] CORS configured

### Post-Deploy
- [ ] API accessible externally
- [ ] Database connections stable
- [ ] Redis connections stable
- [ ] Memory usage normal
- [ ] CPU usage normal
- [ ] No error logs

---

## 🖥️ Linux Server Deployment

### Pre-Deploy
- [ ] Server IP obtained
- [ ] SSH key configured
- [ ] Domain ready
- [ ] SSL certificate prepared
- [ ] Backup plan ready

### System Setup
- [ ] Node.js v18 installed
- [ ] PostgreSQL installed
- [ ] Redis installed
- [ ] Nginx installed
- [ ] Git installed
- [ ] PM2 installed

### Application Setup
- [ ] Repository cloned
- [ ] Dependencies installed
- [ ] Build completed
- [ ] .env file created
- [ ] Database initialized
- [ ] PM2 configured

### Nginx Setup
- [ ] Reverse proxy configured
- [ ] SSL certificates installed
- [ ] Domain pointing to server
- [ ] Firewall rules configured
- [ ] HTTP → HTTPS redirect

### Testing
- [ ] API accessible
- [ ] Frontend accessible
- [ ] Database responsive
- [ ] Redis responsive
- [ ] SSL working
- [ ] CORS working
- [ ] Backups automated

---

## 🔒 Security Checklist

### Secrets Management
- [ ] No hardcoded secrets
- [ ] Environment variables used
- [ ] Secrets stored safely
- [ ] API keys rotated
- [ ] Database password strong
- [ ] JWT secret complex

### Access Control
- [ ] SSH key-only (no password)
- [ ] Firewall configured
- [ ] Only necessary ports open
- [ ] Database not exposed
- [ ] Admin panel protected
- [ ] Rate limiting enabled

### Monitoring
- [ ] Error tracking enabled
- [ ] Logging enabled
- [ ] Uptime monitoring
- [ ] Performance monitoring
- [ ] Security alerts
- [ ] Backup verification

---

## ✅ Testing Checklist

### API Testing
```bash
# Health check
curl http://api.yourdomain.com/health

# Authentication
curl -X POST http://api.yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'

# Product listing
curl http://api.yourdomain.com/api/products
```

### Frontend Testing
- [ ] Login works
- [ ] Products load
- [ ] Images display
- [ ] Forms submit
- [ ] Navigation works
- [ ] Responsive on mobile
- [ ] Dark mode (if applicable)
- [ ] Error messages clear

### Performance Testing
- [ ] API response time < 500ms
- [ ] Page load time < 3s
- [ ] Lighthouse score > 80
- [ ] No 404 errors
- [ ] No memory leaks
- [ ] Database queries optimized

### Browser Testing
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browsers
- [ ] Older browsers (IE11?)

---

## 📊 Monitoring Setup

### Metrics to Track
- [ ] API response time
- [ ] Error rate
- [ ] Uptime percentage
- [ ] Database connections
- [ ] Memory usage
- [ ] CPU usage
- [ ] Disk usage
- [ ] API call volume

### Tools
- [ ] Uptime monitoring (UptimeRobot)
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring (New Relic)
- [ ] Log aggregation (LogRocket)
- [ ] Metrics (DataDog/Prometheus)

---

## 🔄 Post-Deployment

### Verification
- [ ] All services running
- [ ] Database accessible
- [ ] Backups working
- [ ] Email notifications working
- [ ] Monitoring alerts working
- [ ] Logs collecting

### Communication
- [ ] Team notified
- [ ] Stakeholders updated
- [ ] Documentation shared
- [ ] User announcement (if public)
- [ ] Support team briefed

### Maintenance Plan
- [ ] Backup schedule set
- [ ] Update schedule planned
- [ ] Monitoring dashboard
- [ ] Runbook created
- [ ] Incident response plan

---

## 🚨 Rollback Plan

If something goes wrong:

### Vercel
```bash
# Revert to previous deployment
# Go to Vercel dashboard → Production → Deployments → Previous
```

### Railway
```bash
# Revert to previous build
# Go to Railway dashboard → Backend → Deploys → Previous
```

### Linux
```bash
# Revert code
git revert HEAD
git push

# Restart services
pm2 restart golden-api
```

---

## 📝 Documentation

### Create These Docs
- [ ] Deployment guide
- [ ] Rollback procedure
- [ ] Monitoring guide
- [ ] Scaling plan
- [ ] Disaster recovery
- [ ] SOP (Standard Operating Procedures)

---

## ✨ Final Check

- [ ] All checklist items complete
- [ ] Team sign-off received
- [ ] Monitoring active
- [ ] Backups verified
- [ ] Documentation updated
- [ ] Support team ready

---

**Deployment Date:** _______________  
**Deployed By:** _______________  
**Verified By:** _______________  

**Status:** ✅ Ready / ❌ Not Ready

---

**Her şey tamam mı? Şimdi canlıya gidebilirsin!** 🚀

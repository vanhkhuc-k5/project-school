# Staging Deployment Guide

**Version:** 1.0.0  
**Last Updated:** 2026-09-24  

---

## 1. Overview

This document describes the recommended architecture and deployment process for staging environments.

### 1.1 Architecture

```
                    ┌─────────────────────────────────────────────┐
                    │              User's Browser                 │
                    └──────────────────────┬──────────────────────┘
                                           │ HTTPS
                                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Reverse Proxy (Nginx/Cloudflare)                   │
│                         HTTPS Termination + Load Balancing                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                           │
                    ┌──────────────────────┴──────────────────────┐
                    │                                             │
                    ▼                                             ▼
┌────────────────────────────────┐       ┌────────────────────────────────┐
│    Frontend (Static Hosting)    │       │         Backend (Node.js)       │
│    Vercel / Netlify / S3        │       │         Express API Server      │
│    - Built React app            │       │    - Port: 5000                 │
│    - Domain: staging-portal.xxx │       │    - Domain: api-staging.xxx    │
└────────────────────────────────┘       └──────────────┬─────────────────┘
                                                       │
                                          ┌────────────┴────────────┐
                                          │                          │
                                          ▼                          ▼
                              ┌────────────────────┐    ┌────────────────────┐
                              │   PostgreSQL        │    │   Monitoring        │
                              │   (Neon Cloud)      │    │   (Sentry/Logs)     │
                              │   Staging Database   │    │                     │
                              └────────────────────┘    └────────────────────┘
```

### 1.2 Components

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend | React + Vite | Static hosting (Vercel/Netlify) |
| Backend | Express 5 | REST API |
| Database | Neon PostgreSQL | Primary data store |
| CDN | Cloudflare | SSL, caching, DDoS protection |
| Monitoring | Sentry | Error tracking |

---

## 2. Environment Variables

### 2.1 Required Variables

```bash
# Environment
NODE_ENV=staging

# Server
PORT=5000

# Security — REQUIRED (different from production)
JWT_SECRET=<staging-secure-32-char-string>

# Database — Staging PostgreSQL
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# CORS — Staging domains only
CORS_ORIGINS=https://staging-portal.yourdomain.edu.vn

# Bcrypt
BCRYPT_ROUNDS=12

# AI Tutor
AI_TUTOR_ENABLED=true
AI_PROVIDER=mock
```

### 2.2 Optional Variables

```bash
# Logging
LOG_LEVEL=info

# Feature Flags
ALLOW_SEED_IN_STAGING=true  # For demo data

# Supabase (if used)
SUPABASE_URL=
SUPABASE_KEY=
```

### 2.3 Variable Checklist

| Variable | Required | Notes |
|----------|----------|-------|
| `NODE_ENV=staging` | ✅ | Must be set |
| `JWT_SECRET` | ✅ | Min 32 chars, unique per env |
| `DATABASE_URL` | ✅ | Staging PostgreSQL |
| `CORS_ORIGINS` | ✅ | Staging domain only |
| `BCRYPT_ROUNDS=12` | ✅ | Production setting |
| `AI_TUTOR_ENABLED` | Optional | Default: true |
| `AI_PROVIDER` | Optional | Default: mock |
| `LOG_LEVEL` | Optional | Default: info |

---

## 3. Database Setup

### 3.1 Create Staging Database

```bash
# Using Neon Cloud Console
# 1. Create new project for staging
# 2. Create new database: eduportal_staging
# 3. Get connection string
```

### 3.2 Database Migration

```bash
# Run migrations
npm run db:migrate

# Or using CLI
node server/database/migrate-cli.js init
node server/database/migrate-cli.js
```

### 3.3 Seed Policy

```bash
# Option 1: Seed with demo data (for QA testing)
ALLOW_SEED_IN_STAGING=true
npm run seed

# Option 2: No seed (production-like staging)
ALLOW_SEED_IN_STAGING=false
```

> ⚠️ **Important:** If seeding, remove demo accounts before production to avoid security risks.

---

## 4. CORS Configuration

### 4.1 Backend CORS

```javascript
// server/app/app.js
const corsOrigins = process.env.CORS_ORIGINS?.split(',') || [
  'https://staging-portal.yourdomain.edu.vn'
];
```

### 4.2 Frontend Configuration

```javascript
// vite.config.js or .env
VITE_API_URL=https://api-staging.yourdomain.edu.vn
```

### 4.3 Allowed Origins

| Environment | Origin |
|-------------|--------|
| Staging | `https://staging-portal.yourdomain.edu.vn` |
| Production | `https://portal.yourdomain.edu.vn` |

---

## 5. HTTPS Configuration

### 5.1 Using Cloudflare

1. Add your domain to Cloudflare
2. Create staging subdomain
3. Enable "Full" SSL mode
4. Configure page rules for HTTPS redirect

### 5.2 Using Nginx

```nginx
server {
    listen 443 ssl;
    server_name api-staging.yourdomain.edu.vn;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 6. Health Check

### 6.1 Endpoint

```
GET https://api-staging.yourdomain.edu.vn/api/health
```

### 6.2 Expected Response

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-09-24T00:00:00.000Z",
    "database": "connected",
    "version": "1.0.0"
  }
}
```

### 6.3 Monitoring Configuration

```bash
# Add health check to monitoring
curl https://api-staging.yourdomain.edu.vn/api/health
```

---

## 7. Logging

### 7.1 Log Levels

| Environment | LOG_LEVEL | Output |
|-------------|-----------|--------|
| Development | `debug` | Console + file |
| Staging | `info` | Console + file |
| Production | `info` or `error` | Structured JSON |

### 7.2 Log Aggregation

For staging, consider using:

- **Sentry:** Error tracking
- **Datadog:** Log aggregation
- **CloudWatch:** AWS-native logging

### 7.3 Log Format

```json
{
  "timestamp": "2026-09-24T00:00:00.000Z",
  "level": "info",
  "message": "Server started",
  "environment": "staging",
  "service": "eduportal-api",
  "requestId": "uuid"
}
```

---

## 8. Backup Strategy

### 8.1 Database Backups

```bash
# Neon Cloud automatic backups
# - Daily automated backups
# - Point-in-time recovery
# - 7-day retention (free tier)
```

### 8.2 Manual Backup

```bash
# Export staging data
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Or using Neon CLI
neonctl branches list
neonctl branches create --name backup-staging
```

### 8.3 Backup Schedule

| Type | Frequency | Retention |
|------|-----------|-----------|
| Automated | Daily | 7 days |
| Manual | Weekly | 30 days |

---

## 9. Rollback Procedure

### 9.1 Database Rollback

```bash
# Option 1: Restore from Neon backup
# 1. Go to Neon Console
# 2. Select branching
# 3. Create branch from backup point
# 4. Update DATABASE_URL

# Option 2: Apply rollback migrations
node server/database/migrate-cli.js rollback
```

### 9.2 Application Rollback

```bash
# 1. Revert to previous version
git checkout v0.9.0

# 2. Rebuild
npm run build

# 3. Restart service
pm2 restart eduportal-staging
```

### 9.3 Rollback Checklist

- [ ] Database restored from backup
- [ ] Application reverted to previous version
- [ ] Verified health check passes
- [ ] Smoke tested critical features
- [ ] Notified stakeholders

---

## 10. Deployment Checklist

### Pre-Deployment

- [ ] All tests pass locally
- [ ] Code reviewed and approved
- [ ] Database migrations tested
- [ ] Environment variables configured
- [ ] Staging database created
- [ ] CORS domains configured
- [ ] SSL certificates valid
- [ ] Monitoring configured

### Deployment

- [ ] Deploy backend to staging server
- [ ] Run database migrations
- [ ] Seed data (if applicable)
- [ ] Deploy frontend to CDN
- [ ] Verify health check
- [ ] Test login with demo accounts

### Post-Deployment

- [ ] Smoke test all major features
- [ ] Verify audit logging works
- [ ] Check error rates
- [ ] Monitor performance metrics
- [ ] Update deployment documentation

---

## 11. Security Configuration

### 11.1 Security Checklist

- [ ] `JWT_SECRET` is unique to staging
- [ ] `DATABASE_URL` uses SSL
- [ ] CORS only allows staging domain
- [ ] Rate limiting enabled
- [ ] Audit logging enabled
- [ ] No demo credentials exposed
- [ ] HTTPS enforced

### 11.2 Access Control

```bash
# Limit access to staging (optional)
# IP whitelist in Nginx/Cloudflare
allow 10.0.0.0/8;  # Internal network
allow 192.168.0.0/16;  # Office network
deny all;
```

---

## 12. Performance Considerations

### 12.1 Expected Load

| Metric | Staging Target |
|--------|---------------|
| Concurrent Users | 10-50 |
| Requests/Second | 50-100 |
| Response Time | < 500ms |
| Database Connections | 5-10 |

### 12.2 Optimization

```bash
# Enable connection pooling
# PostgreSQL: Use pool of 5-10 connections

# Enable query caching
# PostgreSQL: Use prepared statements

# CDN for static assets
# Frontend assets cached at CDN edge
```

---

## 13. Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| CORS errors | Check CORS_ORIGINS includes your domain |
| Database connection failed | Verify DATABASE_URL format and SSL |
| JWT errors | Check JWT_SECRET is correctly set |
| 502 Bad Gateway | Check backend is running on port 5000 |
| Slow response | Check database connection pooling |

### Debug Commands

```bash
# Check logs
tail -f logs/staging.log

# Check process
pm2 status

# Check database
psql $DATABASE_URL -c "SELECT 1;"

# Health check
curl http://localhost:5000/api/health
```

---

## 14. Support

For staging deployment issues:

- **Documentation:** [docs/](docs/)
- **Issues:** [GitHub Issues](https://github.com/vanhkhuc-k5/project-school/issues)
- **Discussions:** [GitHub Discussions](https://github.com/vanhkhuc-k5/project-school/discussions)

---

## 15. Next Steps

After staging is verified:

1. **Performance Testing:** Load test with realistic traffic
2. **Security Scan:** Run security audit
3. **Production Migration:** Follow [DEPLOYMENT.md](docs/operations/DEPLOYMENT.md)
4. **Monitor:** Set up alerts for production metrics

---

<div align="center">

**Staging Deployment Guide v1.0.0**

</div>

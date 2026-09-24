# Hướng Dẫn Triển Khai EduPortal (Deployment Guide)

Tài liệu hướng dẫn quy trình triển khai EduPortal lên môi trường staging và production một cách an toàn.

---

## 1. Môi Trường Triển Khai (Deployment Environments)

| Môi trường | Mục đích | Database | NODE_ENV |
|-------------|----------|----------|----------|
| **Development** | Phát triển local | SQLite hoặc local PostgreSQL | `development` |
| **Staging** | Kiểm thử trước production | PostgreSQL riêng biệt | `staging` |
| **Production** | Hệ thống thật | PostgreSQL (Neon Cloud) | `production` |

---

## 2. Checklist Trước Triển Khai (Pre-Deployment Checklist)

### 2.1. Chuẩn Bị Infrastructure

- [ ] **Domain/SSL Certificate**
  - Domain đã được trỏ DNS tới server (ví dụ: `portal.truonghoc.edu.vn`)
  - SSL certificate hợp lệ (Let's Encrypt hoặc commercial CA)
  - Certificate đã được renew nếu sắp hết hạn

- [ ] **Server/Container**
  - OS: Ubuntu 22.04 LTS hoặc tương đương
  - Node.js 20.x LTS đã được cài đặt
  - Docker & Docker Compose (nếu dùng container)
  -至少 2GB RAM, 20GB disk

- [ ] **Database (Neon Cloud PostgreSQL)**
  - Project đã được tạo trên [Neon Console](https://console.neon.tech)
  - Connection string đã được sao chép
  - Password đã được thay đổi từ mặc định
  - Branch `main` được bảo vệ (không cho phép direct push)

### 2.2. Chuẩn Bị Secrets

- [ ] **JWT_SECRET**
  ```bash
  # Tạo secret an toàn (minimum 32 characters)
  openssl rand -base64 32
  ```
  ⚠️ **QUAN TRỌNG:** Không bao giờ sử dụng các fallback keys:
  - `dev_jwt_secret_for_local_testing_only_32char`
  - `staging_fallback_jwt_secret_change_in_production`

- [ ] **AI Tutor API Keys** (nếu bật tính năng)
  - OpenAI API Key (nếu dùng `openai` provider)
  - Anthropic API Key (nếu dùng `anthropic` provider)
  - Gemini API Key (nếu dùng `gemini` provider)

- [ ] **Neon Database Password**
  - Đã thay đổi từ password mặc định của Neon
  - Được lưu trữ an toàn trong secrets manager

### 2.3. Quality Gates Đã Pass

- [ ] `npm run lint` — ESLint không có errors
- [ ] `npm run typecheck` — TypeScript check pass
- [ ] `npm test` — Tất cả 57 tests pass
- [ ] `npm run build` — Build thành công

### 2.4. Database Migration Status

- [ ] Chạy `npm run db:status` để kiểm tra migration đã áp dụng
- [ ] Tất cả migrations (0001 → 0034) đã được áp dụng

---

## 3. Cấu Hình Môi Trường (Environment Configuration)

### 3.1. File `.env.production`

```bash
# =============================================================================
# ENVIRONMENT
# =============================================================================
NODE_ENV=production

# =============================================================================
# SERVER
# =============================================================================
PORT=5000

# =============================================================================
# SECURITY — REQUIRED
# =============================================================================
# Generate: openssl rand -base64 32
JWT_SECRET=<YOUR_SECURE_SECRET_HERE>

# Bcrypt rounds for production (10-12 recommended)
BCRYPT_ROUNDS=12

# =============================================================================
# DATABASE — REQUIRED
# =============================================================================
# Neon Cloud PostgreSQL connection string
DATABASE_URL=postgresql://username:password@host/database?sslmode=require

# Leave empty in production (use PostgreSQL, NOT SQLite)
DB_PATH=

# =============================================================================
# CORS — REQUIRED
# =============================================================================
# Your production domain(s)
CORS_ORIGINS=https://portal.yourdomain.edu.vn,https://www.yourdomain.edu.vn

# =============================================================================
# AI TUTOR
# =============================================================================
AI_TUTOR_ENABLED=true
AI_PROVIDER=openai

# =============================================================================
# LOGGING
# =============================================================================
LOG_LEVEL=info
```

### 3.2. File `.env.staging`

```bash
# =============================================================================
# ENVIRONMENT
# =============================================================================
NODE_ENV=staging

# =============================================================================
# SERVER
# =============================================================================
PORT=5000

# =============================================================================
# SECURITY
# =============================================================================
# Khác với production — minimum 32 characters
JWT_SECRET=<STAGING_SECRET_DIFFERENT_FROM_PROD>

BCRYPT_ROUNDS=12

# =============================================================================
# DATABASE
# =============================================================================
# Staging PostgreSQL database (RIÊNG BIỆT với production)
DATABASE_URL=postgresql://user:password@staging-host/database?sslmode=require

# =============================================================================
# CORS
# =============================================================================
CORS_ORIGINS=https://staging-portal.yourdomain.edu.vn

# =============================================================================
# AI TUTOR
# =============================================================================
AI_TUTOR_ENABLED=true
AI_PROVIDER=mock

# =============================================================================
# LOGGING
# =============================================================================
LOG_LEVEL=info

# =============================================================================
# FEATURE FLAGS
# =============================================================================
ALLOW_SEED_IN_STAGING=true
```

---

## 4. Chiến Lược Build Production (Production Build Strategy)

### 4.1. Build Commands

```bash
# Install dependencies (production only)
npm ci --omit=dev

# TypeScript check
npm run typecheck

# Vite production build
npm run build
# Output: dist/
```

### 4.2. Backend Build (Server Bundle)

Backend EduPortal sử dụng **unbundled Node.js ESM**. Không cần build riêng:

```bash
# Verify syntax
node --check server/index.js

# Production start
NODE_ENV=production node server/index.js
```

### 4.3. Build Artifacts

| Artifact | Mô tả | Đường dẫn |
|----------|-------|-----------|
| Frontend Bundle | React SPA | `dist/` |
| Backend Code | Express server | `server/` |
| Migrations | SQL migration files | `server/shared/database/migrations/*.sql` |

---

## 5. Health Endpoint (Health Check Endpoints)

### 5.1. Basic Health Check

```
GET /api/health
```

**Response:**
```json
{
  "status": "ok",
  "service": "EduPortal Modular Monolith Backend",
  "environment": "production",
  "version": "1.0.0",
  "time": "2026-09-23T14:30:00.000Z",
  "requestId": "abc123"
}
```

**Use case:** Load balancer health check, uptime monitoring

### 5.2. Detailed Health Check

```
GET /api/health/detailed
```

**Response:**
```json
{
  "status": "ok",
  "environment": "production",
  "isProduction": true,
  "isStaging": false,
  "isTest": false,
  "isDevelopment": false,
  "database": {
    "usingPostgres": true,
    "usingSqlite": false
  },
  "features": {
    "aiTutor": true,
    "aiProvider": "openai"
  },
  "requestId": "def456"
}
```

**Use case:** Debugging, deployment verification

### 5.3. Readiness Probe (Kubernetes/OpenShift)

```bash
# Kubernetes readiness probe
curl -f http://localhost:5000/api/health
```

Returns `200 OK` when:
- Server is running
- Database connection is healthy

Returns `500 Internal Server Error` when:
- Database is unreachable
- Server failed to start

### 5.4. Liveness Probe

```bash
# Kubernetes liveness probe
curl http://localhost:5000/api/health
```

Returns `200 OK` if server process is alive (regardless of database state).

---

## 6. Quy Trình Triển Khai Migration (Migration Deployment Procedure)

### 6.1. Pre-Migration Checklist

- [ ] Backup database (xem [BACKUP_RESTORE.md](./BACKUP_RESTORE.md))
- [ ] Notify stakeholders về downtime (nếu có)
- [ ] Verify migration files integrity

### 6.2. Migration Commands

```bash
# Check migration status
npm run db:status

# Run pending migrations
npm run db:migrate

# Example output:
# ⚡ [MIGRATOR] Found 34 migration files
# ✅ [MIGRATOR] Successfully applied: 0034_department_head_seed.sql
```

### 6.3. Migration Deployment Order

```
1. Database Migration → 2. Backend Restart → 3. Frontend Deploy → 4. Verification
```

#### Bước 1: Apply Database Migrations

```bash
# SSH vào server
ssh deploy@staging-server

# Navigate to app directory
cd /opt/eduportal

# Run migrations (sử dụng production DATABASE_URL)
DATABASE_URL="postgresql://..." npm run db:migrate
```

#### Bước 2: Restart Backend

```bash
# Nếu dùng systemd
sudo systemctl restart eduportal-backend

# Nếu dùng PM2
pm2 restart eduportal-backend

# Nếu dùng Docker
docker-compose restart backend
```

#### Bước 3: Deploy Frontend

```bash
# Build production bundle
npm ci
npm run build

# Deploy to CDN/server
# (tùy thuộc vào infrastructure của bạn)
```

#### Bước 4: Verify Deployment

```bash
# Health check
curl https://portal.yourdomain.edu.vn/api/health

# Database connectivity
curl https://portal.yourdomain.edu.vn/api/health/detailed | jq '.database'
```

---

## 7. Reverse Proxy Configuration (Nginx)

### 7.1. Nginx Configuration for Backend

```nginx
# /etc/nginx/sites-available/eduportal-api

server {
    listen 80;
    server_name api.portal.yourdomain.edu.vn;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.portal.yourdomain.edu.vn;

    # SSL Configuration
    ssl_certificate /etc/ssl/certs/yourdomain.pem;
    ssl_certificate_key /etc/ssl/private/yourdomain.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to Backend
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check bypass
    location /api/health {
        proxy_pass http://127.0.0.1:5000/api/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

### 7.2. Nginx Configuration for Frontend (SPA)

```nginx
# /etc/nginx/sites-available/eduportal-frontend

server {
    listen 80;
    server_name portal.yourdomain.edu.vn;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name portal.yourdomain.edu.vn;

    root /var/www/eduportal/dist;
    index index.html;

    # SSL Configuration
    ssl_certificate /etc/ssl/certs/yourdomain.pem;
    ssl_certificate_key /etc/ssl/private/yourdomain.key;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" always;

    # Gzip Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # SPA Routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API Proxy (optional - can also use separate API server)
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static Assets Cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 7.3. Enable Sites

```bash
# Enable sites
sudo ln -s /etc/nginx/sites-available/eduportal-api /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/eduportal-frontend /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

---

## 8. HTTPS Configuration

### 8.1. Using Let's Encrypt (Certbot)

```bash
# Install certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d portal.yourdomain.edu.vn -d api.portal.yourdomain.edu.vn

# Auto-renewal (certbot tự động renew)
sudo systemctl status certbot.timer
```

### 8.2. Certificate Renewal Check

```bash
# Manual test renewal
sudo certbot renew --dry-run

# Check renewal timer
sudo systemctl list-timers | grep certbot
```

---

## 9. Process Lifecycle (PM2 Configuration)

### 9.1. PM2 Ecosystem File

```javascript
// ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'eduportal-backend',
      script: 'server/index.js',
      instances: 1,
      exec_mode: 'fork',
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 5000,
      },
      // Logging
      log_file: '/var/log/eduportal/backend.log',
      out_file: '/var/log/eduportal/out.log',
      error_file: '/var/log/eduportal/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Restart policy
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 3000,
      // Memory limit
      max_memory_restart: '1G',
    },
  ],
};
```

### 9.2. PM2 Commands

```bash
# Start application
pm2 start ecosystem.config.cjs --env production

# View logs
pm2 logs eduportal-backend

# Restart
pm2 restart eduportal-backend

# Stop
pm2 stop eduportal-backend

# Monitor
pm2 monit

# Cluster mode (if needed for multi-core)
pm2 start ecosystem.config.cjs -i max --env production
```

---

## 10. Docker Deployment (Optional)

### 10.1. Dockerfile

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .
RUN npm run typecheck && npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copy built artifacts
COPY --from=builder /app/dist ./dist
COPY server ./server

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nodeuser -u 1001
USER nodeuser

EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "server/index.js"]
```

### 10.2. Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      - CORS_ORIGINS=${CORS_ORIGINS}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:5000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

  frontend:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./dist:/usr/share/nginx/html:ro
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - backend
    restart: unless-stopped
```

---

## 11. Deployment Verification Checklist

Sau khi triển khai, thực hiện các bước kiểm tra sau:

### 11.1. Backend Verification

```bash
# 1. Health check
curl https://api.portal.yourdomain.edu.vn/api/health | jq

# 2. Detailed health (database connectivity)
curl https://api.portal.yourdomain.edu.vn/api/health/detailed | jq '.database'

# 3. Check logs
pm2 logs eduportal-backend --lines 50 --nostream
```

### 11.2. Frontend Verification

```bash
# 1. Homepage loads
curl -I https://portal.yourdomain.edu.vn

# 2. Login page
curl -I https://portal.yourdomain.edu.vn/login

# 3. Static assets
curl -I https://portal.yourdomain.edu.vn/assets/index-[hash].js
```

### 11.3. Smoke Test

```bash
# 1. Login flow
curl -X POST https://api.portal.yourdomain.edu.vn/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@school.edu","password":"test123"}'

# 2. Protected endpoint (with token)
curl https://api.portal.yourdomain.edu.vn/api/auth/me \
  -H "Authorization: Bearer <TOKEN>"
```

### 11.4. Browser Testing

- [ ] Mở trang login (`https://portal.yourdomain.edu.vn`)
- [ ] Đăng nhập với tài khoản admin
- [ ] Kiểm tra dashboard hiển thị đúng
- [ ] Kiểm tra navigation menu
- [ ] Kiểm tra responsive trên mobile

---

## 12. Deployment Timeline

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    EDUPORTAL DEPLOYMENT TIMELINE                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  T-7 days    ┌─────────────────────────────────────────────────────┐   │
│              │ □ Final code freeze                                   │   │
│              │ □ Feature complete, tested                            │   │
│              └─────────────────────────────────────────────────────┘   │
│                                                                         │
│  T-3 days    ┌─────────────────────────────────────────────────────┐   │
│              │ □ Backup production database                          │   │
│              │ □ Notify stakeholders                                 │   │
│              │ □ Schedule maintenance window                        │   │
│              └─────────────────────────────────────────────────────┘   │
│                                                                         │
│  T-1 day     ┌─────────────────────────────────────────────────────┐   │
│              │ □ Run full test suite (npm test)                    │   │
│              │ □ Run build (npm run build)                          │   │
│              │ □ Upload to staging                                  │   │
│              │ □ Staging smoke test                                 │   │
│              └─────────────────────────────────────────────────────┘   │
│                                                                         │
│  T-0         ┌─────────────────────────────────────────────────────┐   │
│  (Deploy)    │ □ Apply database migrations                        │   │
│              │ □ Deploy backend                                     │   │
│              │ □ Deploy frontend                                    │   │
│              │ □ Verify health endpoints                            │   │
│              │ □ Smoke test                                         │   │
│              └─────────────────────────────────────────────────────┘   │
│                                                                         │
│  T+1 hour    ┌─────────────────────────────────────────────────────┐   │
│              │ □ Verify no errors in logs                           │   │
│              │ □ Monitor error tracking (Sentry)                    │   │
│              │ □ Confirm all systems operational                    │   │
│              └─────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 13. Rollback Plan

Xem chi tiết tại [ROLLBACK.md](./ROLLBACK.md)

---

## 14. Support Contacts

| Role | Contact | Responsibility |
|------|---------|----------------|
| DevOps Lead | [CONTACT] | Infrastructure, deployment |
| Backend Lead | [CONTACT] | API, migrations, database |
| Frontend Lead | [CONTACT] | UI/UX, build issues |
| On-call | [CONTACT] | 24/7 incident response |

---

## Quick Reference

```bash
# 1. Check migration status
npm run db:status

# 2. Run migrations
npm run db:migrate

# 3. Health check
curl localhost:5000/api/health

# 4. Detailed health
curl localhost:5000/api/health/detailed | jq '.database'

# 5. Restart backend
pm2 restart eduportal-backend

# 6. View logs
pm2 logs eduportal-backend --lines 100
```

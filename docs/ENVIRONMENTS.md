# EduPortal Environment Configuration Guide

## G49 — Development / Test / Staging / Production Environments

This document describes how EduPortal separates environments to prevent accidental misconfiguration.

---

## Environment Overview

| Environment | Purpose | Database | Security |
|-------------|---------|----------|----------|
| `development` | Local development | SQLite (default) | Permissive |
| `test` | Automated testing | SQLite in-memory | Strict isolation |
| `staging` | Pre-production | PostgreSQL | Strict |
| `production` | Live system | PostgreSQL | Maximum security |

---

## Environment Variables

### Required Variables by Environment

| Variable | Development | Test | Staging | Production |
|----------|-------------|------|---------|------------|
| `NODE_ENV` | `development` | `test` | `staging` | `production` |
| `JWT_SECRET` | Optional | Auto-set | Required (32+ chars) | **Required** |
| `DATABASE_URL` | Optional | Empty | Required | **Required** |
| `BCRYPT_ROUNDS` | 4 | 4 | 12 | 12 |
| `CORS_ORIGINS` | `localhost:*` | `localhost:*` | Staging domains | Production domains |

### Security Rules by Environment

**Production:**
- ❌ `JWT_SECRET` must be explicitly set (32+ characters)
- ❌ Cannot use known fallback keys
- ❌ Cannot use SQLite
- ✅ Security headers enabled (X-Frame-Options, HSTS, etc.)
- ✅ Credentials required for CORS
- ✅ `BCRYPT_ROUNDS` must be 10+

**Staging:**
- ⚠️ `JWT_SECRET` must be 32+ characters
- ⚠️ `BCRYPT_ROUNDS` should be 10-12
- ✅ Can enable seeding for realistic testing

**Test:**
- ✅ Uses fixed test JWT secret
- ✅ In-memory SQLite (`:memory:`)
- ✅ PostgreSQL disabled
- ✅ Low `BCRYPT_ROUNDS` for speed

**Development:**
- ⚠️ Falls back to dev JWT secret
- ✅ SQLite enabled
- ✅ Verbose logging (`debug`)
- ✅ Permissive CORS for local testing

---

## Configuration Files

```
.env                    # Local overrides (gitignored)
.env.example           # Template for all environments
.env.development.example  # Development template
.env.test              # Test configuration
.env.staging.example   # Staging template
.env.production.example # Production template
```

### Using Environment-Specific Files

```bash
# Development
cp .env.development.example .env
npm run dev

# Test
npm test

# Staging
cp .env.staging.example .env.staging
NODE_ENV=staging npm run start:staging

# Production
cp .env.production.example .env.production
# Fill in real secrets!
NODE_ENV=production npm run start:prod
```

---

## Preventing Production Accidents

### 1. Database Guard

The application validates database configuration at startup:

```javascript
// Development: SQLite allowed
// Test: SQLite forced (:memory:)
// Staging: PostgreSQL preferred
// Production: PostgreSQL required, SQLite disabled
```

### 2. Startup Validation

```bash
# This will FAIL in production without proper configuration
npm run server

# Error: [CRITICAL SECURITY ERROR] JWT_SECRET must be explicitly set
```

### 3. Gitignore Protection

The `.gitignore` prevents committing real secrets:

```
.env
.env.*
!.env.example
!.env.test
!.env.development.example
!.env.staging.example
!.env.production.example
```

---

## Running Commands by Environment

```bash
# Development
npm run dev              # Frontend
npm run server           # Backend only
npm run dev:all          # Both concurrently

# Test
npm test                 # Unit + Integration
npm run test:browser     # E2E with Playwright

# Staging
npm run start:staging

# Production
npm run start:prod
```

---

## Environment-Specific Behavior

### Security Headers (Production Only)

```javascript
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
Referrer-Policy: strict-origin-when-cross-origin
```

### CORS Configuration

| Environment | `credentials` | `origin` |
|-------------|---------------|----------|
| Development | `false` | Permissive (warns only) |
| Test | `false` | Configured |
| Staging | `true` | Configured domains |
| Production | `true` | Production domains |

### Logging Levels

| Environment | Default Level | Output |
|-------------|---------------|--------|
| Development | `debug` | Pretty JSON |
| Test | `error` | JSON |
| Staging | `info` | JSON |
| Production | `info` | JSON |

---

## Health Check Endpoint

```bash
# Basic health
GET /api/health

# Detailed environment info
GET /api/health/detailed
```

Response:
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
  }
}
```

---

## Deployment Checklist

### Before Deploying to Staging/Production

- [ ] Copy `.env.*.example` to `.env`
- [ ] Set `NODE_ENV=staging` or `NODE_ENV=production`
- [ ] Generate secure `JWT_SECRET` (minimum 32 characters)
- [ ] Configure `DATABASE_URL` (PostgreSQL)
- [ ] Set `CORS_ORIGINS` to your domain(s)
- [ ] Set `BCRYPT_ROUNDS=12`
- [ ] Verify `npm test` passes locally
- [ ] Verify startup validation passes

---

## Acceptance Criteria

✅ **Developers cannot accidentally use production DB through a default local command**

Evidence:
1. `NODE_ENV=production` requires explicit `JWT_SECRET`
2. `NODE_ENV=production` requires `DATABASE_URL`
3. SQLite is disabled in production mode
4. Test environment uses isolated in-memory database
5. `.env` file is gitignored (secrets stay local)

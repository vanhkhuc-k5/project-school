# Security Policy

## Supported Versions

| Version | Supported          | Notes |
| ------- | ------------------ | ----- |
| 1.0.x   | ✅ Currently Supported | First production release |

---

## Reporting a Security Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please report it responsibly.

### How to Report

**Please DO NOT report security vulnerabilities through public GitHub issues.**

Instead, please:

1. **Email:** Send details to the repository maintainers via GitHub's private vulnerability reporting
2. **Private Repository:** Use GitHub's "Security" tab → "Advisories" → "New draft security advisory"

### What to Include

When reporting, please include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fixes (optional)

### Response Timeline

- **Initial Response:** Within 48 hours
- **Assessment:** Within 7 days
- **Fix Timeline:** Based on severity

---

## Security Features

EduPortal implements the following security measures:

### Authentication

| Feature | Implementation |
|---------|---------------|
| Password Storage | bcrypt (configurable rounds) |
| JWT Access Token | 15-minute expiry, signed |
| Refresh Token Rotation | Family-based reuse detection |
| Account Lockout | 5 failed attempts → 15 min lock |
| Token Versioning | Invalidates all sessions on password change |

### Authorization

| Feature | Implementation |
|---------|---------------|
| RBAC | 40+ granular permissions, 7 roles |
| Tenant Isolation | school_id enforced on all queries |
| Ownership Checks | requireOwnership() middleware |

### Data Protection

| Feature | Implementation |
|---------|---------------|
| Input Validation | Zod schema validation |
| SQL Injection Prevention | Parameterized queries only |
| CORS | Configurable allowed origins |
| Rate Limiting | Request throttling |
| Audit Logging | Full action tracking |

---

## Environment Security

### Required for Production

```bash
# MUST be set
NODE_ENV=production
JWT_SECRET=<32+ character random string>
DATABASE_URL=<PostgreSQL connection with SSL>
BCRYPT_ROUNDS=12

# MUST be configured
CORS_ORIGINS=https://your-domain.edu.vn

# SQLite MUST be disabled
ALLOW_SQLITE_DEV=false
```

### Secrets Management

- Never commit `.env` files or any files containing real credentials
- Use environment variables for all secrets
- Rotate JWT_SECRET periodically (recommended: every 90 days)
- Use a secrets manager for production deployments

---

## Security Checklist for Deployment

Before deploying to production, verify:

- [ ] `JWT_SECRET` is a cryptographically secure random string (32+ chars)
- [ ] `DATABASE_URL` points to PostgreSQL with SSL enabled
- [ ] `CORS_ORIGINS` only includes your actual domains
- [ ] `BCRYPT_ROUNDS` is set to 12
- [ ] Account lockout is enabled
- [ ] Audit logging is functioning
- [ ] No demo/test credentials in production
- [ ] HTTPS is enforced
- [ ] Rate limiting is configured

---

## Security-Related Documentation

- [Security Review](docs/security/SECURITY_REVIEW.md)
- [Authorization Matrix](docs/security/AUTHORIZATION_MATRIX.md)
- [Tenant Isolation Architecture](docs/security/TENANT_ISOLATION_ARCHITECTURE.md)
- [AI Tutor Privacy](docs/security/AI_TUTOR_PRIVACY.md)

---

## Security Testing

The project includes comprehensive security tests:

```bash
# Run all tests including security tests
npm test

# Security tests cover:
# - Authentication failure handling
# - RBAC enforcement
# - ID manipulation prevention
# - Input validation
# - Rate limiting
# - CORS/CSRF protection
# - Information disclosure prevention
# - Timing attack prevention
```

---

## Known Limitations

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| No MFA | Additional security layer missing | Future enhancement |
| No OAuth/SSO | Limited integration options | Future enhancement |
| Memory-based rate limiting | Limits reset on restart | Use Redis in future |

---

## Changelog

### v1.0.0 (2026-09-24)

- Initial production release
- JWT authentication with refresh token rotation
- RBAC with 40+ permissions
- Multi-school tenant isolation
- 59 security tests (100% pass rate)

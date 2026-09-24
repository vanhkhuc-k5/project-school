# ADR-005: Authentication & Session Strategy

- **Status:** Accepted
- **Date:** 2026-09-20
- **Author:** Principal Software Architect
- **Supersedes:** N/A

---

## 1. Context

EduPortal requires secure authentication for 7 user roles across multiple schools:
- Protection of student/parent PII (personally identifiable information)
- Session management with token refresh
- Account security (brute force protection, lockout)
- Password reset functionality

The system must prevent account enumeration and handle token revocation.

---

## 2. Decision

### 2.1 Token Architecture

**Short-lived JWT Access Tokens + Long-lived Refresh Tokens**

| Token Type | Lifetime | Storage | Purpose |
|------------|----------|---------|---------|
| Access Token (JWT) | 15 minutes | Client memory | API authentication |
| Refresh Token | 7 days | HTTP-only cookie or client storage | Session renewal |
| Password Reset Token | 1 hour | Database (hashed) | Password recovery |

### 2.2 Access Token Structure

```javascript
{
  sub: "usr_abc123",      // User ID
  role: "teacher",         // User role
  schoolId: "sch_bacau",   // Tenant ID
  tokenVersion: 5,         // Increments on password change
  iat: 1700000000,        // Issued at
  exp: 1700000900          // Expires in 15 minutes
}
```

### 2.3 Token Security Features

1. **Cryptographic Security:** 40-byte random tokens via `crypto.randomBytes`
2. **Token Hashing:** Refresh tokens stored as SHA-256 hashes in database
3. **Token Versioning:** `token_version` increments on password change, invalidating all sessions
4. **Family Rotation:** Refresh tokens belong to families, reuse detection revokes entire family
5. **Account Lockout:** 5 failed attempts → 15-minute lockout

### 2.4 Password Security

- **Bcrypt hashing** with configurable rounds (10 dev, 12 prod)
- **Generic error messages** to prevent account enumeration
- **Password reset tokens** are single-use and time-limited

---

## 3. Alternatives Considered

### Option A: Session-Based Auth (Express Session)

| Pros | Cons |
|------|------|
| Server-side session invalidation | Requires session storage (Redis) |
| Simple revocation | Cookie size limits |
| CSRF protection built-in | Stateless is more scalable |

**Verdict:** Rejected. Stateless JWT is more scalable and doesn't require session storage infrastructure.

### Option B: OAuth 2.0 / SSO

| Pros | Cons |
|------|------|
| Industry standard | Overhead for simple school auth |
| Social login support | Complex implementation |
| Token management handled | Requires identity provider |

**Verdict:** Rejected for now. School-specific authentication is simpler. May reconsider for multi-school SSO.

### Option C: API Keys for Service Auth

| Pros | Cons |
|------|------|
| Simple for machine-to-machine | No user context |
| Revocable | No fine-grained permissions |

**Verdict:** Rejected. JWT tokens carry user context and permissions.

---

## 4. Consequences

### Positive

1. **Stateless Scaling:** No session storage needed
2. **Fast Authentication:** Token verification is local (no DB lookup)
3. **Family Reuse Detection:** Prevents token theft replay attacks
4. **Version-based Revocation:** Password change immediately invalidates all sessions
5. **Rate Limiting:** Brute force protection on login endpoint

### Negative

1. **No Server-side Revocation:** Tokens valid until expiry unless version check
2. **Token Storage Responsibility:** Client must secure tokens
3. **Refresh Token Complexity:** Family rotation adds complexity

### Mitigation

- `token_version` check on `/auth/me` provides revocation capability
- Refresh tokens stored as hashes allow database revocation
- Rate limiting on login prevents brute force

---

## 5. Implementation Details

### Login Flow

```
1. POST /api/auth/login { identifier, password }
   ↓
2. Validate credentials against bcrypt hash
   ↓
3. Generate access token (15m) + refresh token (7d)
   ↓
4. Store refresh token hash in database with family ID
   ↓
5. Return tokens to client
```

### Refresh Flow

```
1. POST /api/auth/refresh { refreshToken }
   ↓
2. Hash token, lookup in database
   ↓
3. Check not revoked (is_revoked = false)
   ↓
4. Check not expired
   ↓
5. Rotate: revoke old token, issue new one in same family
   ↓
6. Return new access + refresh tokens
```

### Reuse Detection

If a revoked token is used:
```
1. Detect: is_revoked = true
2. Log security event: AUTH_TOKEN_REUSE_DETECTED
3. Revoke entire family (all tokens for user)
4. Return 401, require re-login
```

---

## 6. Security Considerations

| Threat | Mitigation |
|--------|-----------|
| Brute force | 10 req/min rate limit + 5-attempt lockout |
| Token theft | Refresh token rotation, family tracking |
| Token replay | Reuse detection revokes family |
| Password brute force | Generic error, account lockout |
| Account enumeration | Same message for invalid email/password |
| Session hijacking | HTTP-only cookies, secure flag in production |

---

## 7. References

- [ADR-006: RBAC/Permissions](./ADR-006-RBAC-PERMISSIONS.md)
- [ADR-007: Multi-tenant Isolation](./ADR-007-MULTI-SCHOOL-TENANCY.md)

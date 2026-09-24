# ADR-010: Audit Logging Strategy

- **Status:** Accepted
- **Date:** 2026-09-20
- **Author:** Principal Software Architect
- **Supersedes:** N/A

---

## 1. Context

EduPortal requires audit logging for:
- **Security:** Track authentication events, authorization failures
- **Compliance:** Record data access and modifications
- **Debugging:** Investigate issues and errors
- **Business:** Track key business events

The system handles sensitive student data requiring access audit trails.

---

## 2. Decision

### 2.1 Audit Event Categories

| Category | Events | Storage |
|----------|--------|---------|
| Security | login, logout, auth_failure, token_refresh | Database + Console |
| Authorization | permission_denied, ownership_denied, tenant_access_denied | Database |
| Data Access | read, create, update, delete | Database (selective) |
| Business | assignment_created, grade_published, payment_received | Database |
| Admin | user_created, role_changed, config_changed | Database |

### 2.2 Audit Log Structure

```javascript
{
  id: 'audit_abc123',
  timestamp: '2025-01-15T10:00:00Z',
  event: 'AUTH_LOGIN_SUCCESS',
  
  // Actor
  user_id: 'usr_xyz',
  user_role: 'teacher',
  school_id: 'sch_bacau',
  
  // Action
  action: 'login',
  resource_type: 'session',
  resource_id: 'sess_123',
  
  // Context
  ip: '192.168.1.1',
  user_agent: 'Mozilla/5.0...',
  request_id: 'req_abc123',
  
  // Details
  details: {
    method: 'POST',
    path: '/api/auth/login',
  },
  
  // Result
  success: true,
  error_code: null
}
```

### 2.3 Logging Infrastructure

```
Application → Security Logger → Console (structured JSON)
                            ↓
                      Database (audit_logs table)
```

### 2.4 Security Event Logging

```javascript
// Security event logger
import { logSecurityEvent } from './securityLogger.js';

logSecurityEvent('AUTH_LOGIN_SUCCESS', {
  userId: user.id,
  email: user.email,
  ip: req.ip,
  sessionId: session.id,
});

logSecurityEvent('AUTH_PERMISSION_DENIED', {
  userId: req.user.id,
  role: req.user.role,
  required: ['user.create'],
  path: req.originalUrl,
});
```

---

## 3. Alternatives Considered

### Option A: Third-Party SIEM (Splunk, Datadog)

| Pros | Cons |
|------|------|
| Powerful search | Cost |
| Alerting | Vendor lock-in |
| Dashboards | Network overhead |

**Verdict:** Rejected for v1. Database + console logs sufficient. Can integrate later.

### Option B: Event Sourcing

| Pros | Cons |
|------|------|
| Complete audit trail | Overhead for simple needs |
| Event replay | Implementation complexity |
| Time-travel debugging | Learning curve |

**Verdict:** Rejected. Append-only audit tables are simpler.

### Option C: Database Triggers

| Pros | Cons |
|------|------|
| Automatic | Hidden logic |
| No app changes | Database-specific |
| Complete | Performance impact |

**Verdict:** Rejected. Explicit logging in application code is more controllable.

---

## 4. Consequences

### Positive

1. **Complete Audit Trail:** All security events logged
2. **Searchable:** Database queries for investigation
3. **Structured:** JSON format for analysis
4. **Compliance Ready:** Supports data access audit requirements

### Negative

1. **Storage Growth:** Audit logs accumulate over time
2. **Write Performance:** Additional database writes
3. **Sensitive Data:** Logs must be protected

### Mitigation

- Retention policy: 90 days in database, archive to cold storage
- Async logging for non-critical events
- Log masking for sensitive data

---

## 5. Implementation

### Audit Table Schema

```sql
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Event classification
  event TEXT NOT NULL,
  category TEXT,  -- security, authorization, data, business, admin
  
  -- Actor
  user_id TEXT,
  user_role TEXT,
  school_id TEXT,
  
  -- Resource
  resource_type TEXT,
  resource_id TEXT,
  action TEXT,
  
  -- Context
  ip TEXT,
  user_agent TEXT,
  request_id TEXT,
  
  -- Details (JSON)
  details TEXT,
  
  -- Result
  success BOOLEAN DEFAULT true,
  error_code TEXT
);

CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_user ON audit_logs(user_id, timestamp);
CREATE INDEX idx_audit_event ON audit_logs(event, timestamp);
```

### Security Logger

```javascript
// server/shared/auth/securityLogger.js

const SENSITIVE_FIELDS = new Set([
  'password', 'token', 'secret', 'authorization'
]);

export function logSecurityEvent(event, details = {}) {
  // Mask sensitive data
  const masked = maskSensitiveData(details);
  
  const entry = {
    timestamp: new Date().toISOString(),
    event,
    ...masked,
  };
  
  // Console output (structured JSON for log aggregation)
  console.warn(JSON.stringify(entry));
  
  // Database storage (async, non-blocking)
  if (shouldPersist(event)) {
    persistAuditLog(entry);
  }
}
```

### Usage in Services

```javascript
// In authentication service
async login(credentials) {
  const user = await this.authenticate(credentials);
  
  logSecurityEvent('AUTH_LOGIN_SUCCESS', {
    userId: user.id,
    email: user.email,
    role: user.role,
    ip: credentials.ip,
  });
  
  return user;
}

// In authorization middleware
function requirePermission(permission) {
  return (req, res, next) => {
    if (!hasPermission(req.user, permission)) {
      logSecurityEvent('AUTH_PERMISSION_DENIED', {
        userId: req.user.id,
        requiredPermission: permission,
        path: req.path,
      });
      return res.status(403).json({ success: false });
    }
    next();
  };
}
```

---

## 6. Retention Policy

| Storage | Retention | Action After |
|---------|-----------|--------------|
| Database | 90 days | Archive to JSON files |
| Archive | 1 year | Delete |
| Security events | 2 years | Archive required |

---

## 7. References

- [ADR-005: Authentication](./ADR-005-AUTHENTICATION.md)
- [ADR-006: RBAC/Permissions](./ADR-006-RBAC-PERMISSIONS.md)

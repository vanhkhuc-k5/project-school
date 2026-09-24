# ADR-007: Multi-School Tenancy

- **Status:** Accepted
- **Date:** 2026-09-20
- **Author:** Principal Software Architect
- **Supersedes:** N/A

---

## 1. Context

EduPortal serves multiple schools (tenants) on the same infrastructure:
- Each school has isolated data (students, teachers, classes, grades)
- Schools should never access each other's data
- Super admins can access all schools
- School admins can only manage their own school

Key requirements:
- Tenant isolation at database level
- Tenant isolation at API level
- Prevention of privilege escalation
- Audit trail of cross-tenant access attempts

---

## 2. Decision

### 2.1 Tenant Isolation Strategy

**Shared Database, Shared Application, Row-Level Isolation**

| Layer | Isolation Mechanism |
|-------|-------------------|
| Database | `school_id` column on all tenant tables |
| API | `schoolId` injected from verified JWT |
| Middleware | `enforceTenantScoping()` validates requests |

### 2.2 Tenant ID Flow

```
1. User authenticates → receives JWT with schoolId claim
2. Every request → JWT verified, schoolId extracted
3. Client-supplied schoolId → rejected (privilege escalation prevention)
4. All queries → scoped by schoolId from JWT
```

### 2.3 Privilege Escalation Prevention

```javascript
// Validate tenant privilege escalation
export function validateTenantPrivilegeEscalation(req, res) {
  const userSchoolId = req.user.schoolId;
  
  // Client-supplied schoolId from query/body/params
  const clientSchoolId = req.query?.schoolId || req.body?.schoolId;
  
  if (clientSchoolId && clientSchoolId !== userSchoolId) {
    if (!isSuperAdmin) {
      return res.status(403).json({
        code: 'TENANT_FORBIDDEN',
        message: 'Truy cập trái phép vào dữ liệu trường khác'
      });
    }
  }
  
  // Force schoolId from JWT
  req.schoolId = userSchoolId;
  return true;
}
```

### 2.4 Database Schema Pattern

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,  -- Tenant ID
  name TEXT,
  role TEXT,
  -- ...
);

-- All queries include school_id
SELECT * FROM users WHERE school_id = ?;

-- Index for performance
CREATE INDEX idx_users_school ON users(school_id);
```

---

## 3. Alternatives Considered

### Option A: Separate Databases per Tenant

| Pros | Cons |
|------|------|
| Strongest isolation | Database management overhead |
| Easy backup/restore | Schema changes affect all tenants |
| Performance isolation | Cost proportional to tenants |

**Verdict:** Rejected. 10+ databases difficult to manage. PostgreSQL isolation is sufficient.

### Option B: Separate Schemas per Tenant

| Pros | Cons |
|------|------|
| Schema isolation | Same database management issues |
| Easy queries | Schema migration complexity |

**Verdict:** Rejected. Row-level isolation with `school_id` is simpler.

### Option C: PostgreSQL Row-Level Security (RLS)

| Pros | Cons |
|------|------|
| Database-enforced | Performance overhead |
| No app changes needed | Complex policies |
| Defense in depth | Limited support in Neon |

**Verdict:** Consider as future enhancement. Application-level isolation is sufficient for now.

---

## 4. Consequences

### Positive

1. **Cost Efficiency:** Single database, shared resources
2. **Simple Operations:** One database to backup, monitor, migrate
3. **Cross-School Analytics:** Reporting can aggregate across schools (with permission)
4. **Easy Schema Changes:** Single migration affects all tenants

### Negative

1. **Isolation Depends on Application:** Bugs could cause cross-tenant data leakage
2. **Performance Contention:** Heavy queries from one school affect others
3. **Backup Granularity:** Can't backup single tenant

### Mitigation

- Comprehensive tests for cross-tenant access denial
- Row-level security as future enhancement
- Tenant-specific backup strategies documented

---

## 5. Implementation

### Middleware Stack

```javascript
// 1. Authenticate user
app.use(authenticateToken);

// 2. Validate and inject tenant context
app.use(enforceTenantScoping);

// 3. All routes now have req.schoolId
```

### Repository Pattern

```javascript
// All queries include schoolId
export class UserRepository {
  async findById(id, schoolId) {
    return db.prepare(
      'SELECT * FROM users WHERE id = ? AND school_id = ?'
    ).get(id, schoolId);
  }
  
  async list(schoolId, options = {}) {
    const { search, role, page } = options;
    return db.prepare(
      'SELECT * FROM users WHERE school_id = ? LIMIT ? OFFSET ?'
    ).all(schoolId, limit, offset);
  }
}
```

### Super Admin Bypass

```javascript
// Super admins can specify schoolId in query
if (req.user.role === 'super_admin') {
  req.schoolId = req.query.schoolId || req.user.schoolId;
}
```

---

## 6. Security Considerations

| Threat | Mitigation |
|--------|-----------|
| IDOR attacks | All queries scoped by schoolId |
| Privilege escalation | Client-supplied schoolId rejected |
| Tenant enumeration | Generic 403 for cross-school access |
| SQL injection | Parameterized queries |
| Super admin abuse | Audit logging for super admin actions |

### Audit Events

```javascript
logSecurityEvent('TENANT_ACCESS_DENIED', {
  userId: req.user.id,
  currentSchoolId: req.schoolId,
  attemptedSchoolId: clientSchoolId,
  path: req.originalUrl,
});
```

---

## 7. References

- [ADR-005: Authentication](./ADR-005-AUTHENTICATION.md)
- [ADR-006: RBAC/Permissions](./ADR-006-RBAC-PERMISSIONS.md)

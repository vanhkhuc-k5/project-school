# ADR-006: RBAC (Role-Based Access Control)

- **Status:** Accepted
- **Date:** 2026-09-20
- **Author:** Principal Software Architect
- **Supersedes:** N/A

---

## 1. Context

EduPortal has 7 user roles with varying permissions across 15+ business domains:
- **Admin:** Full system access
- **Principal/Vice Principal:** School-wide management
- **Department Head:** Subject-specific management
- **Teacher:** Teaching-related tasks
- **Student:** Learning activities
- **Parent:** Child monitoring

Permissions must be:
- Fine-grained (not just role checks)
- Auditable (who can do what)
- Tenant-scoped (schools can't access each other's data)
- Enforceable server-side (not UI-only)

---

## 2. Decision

### 2.1 Permission Registry Pattern

Centralized permission definitions in `rbac.registry.js`:

```javascript
export const PERMISSIONS = {
  // Users
  USER_READ: 'user.read',
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DISABLE: 'user.disable',
  
  // Academic
  ASSIGNMENT_READ: 'assignment.read',
  ASSIGNMENT_CREATE: 'assignment.create',
  ASSIGNMENT_GRADE: 'assignment.grade',
  
  // Grades
  GRADE_READ: 'grade.read',
  GRADE_CREATE: 'grade.create',
  GRADE_UPDATE: 'grade.update',
  GRADE_PUBLISH: 'grade.publish',
  
  // ... more permissions
};
```

### 2.2 Role Hierarchy

```
super_admin (system-wide)
    ↓
school_admin (school-wide)
    ↓
principal, vice_principal (management)
    ↓
department_head (subject-specific)
    ↓
teacher, student, parent (task-specific)
```

### 2.3 Middleware Chain

```
Request → Authenticate → Role Check → Permission Check → School Scope → Handler
```

**Middleware Stack:**

1. **authenticate()** - Validates JWT, attaches user
2. **requireRole(roles[])** - Checks user role
3. **requirePermission(perms[])** - Checks specific permissions
4. **requireSchoolScope(fn)** - Validates tenant access

### 2.4 Permission Types

| Type | Check | Use Case |
|------|-------|----------|
| Role | `requireRole('admin')` | Simple role gating |
| Permission | `requirePermission('user.read')` | Fine-grained access |
| Ownership | `requireOwnership(fn)` | User can only edit own data |
| School Scope | `requireSchoolScope(fn)` | Tenant isolation |

---

## 3. Alternatives Considered

### Option A: Simple Role Checks

```javascript
if (user.role !== 'admin') return 403;
```

| Pros | Cons |
|------|------|
| Simple | Too coarse-grained |
| Fast | Hard to audit |
| No setup | Difficult to modify |

**Verdict:** Rejected. Doesn't support fine-grained permissions.

### Option B: External Authorization Service (OPA, Casbin)

| Pros | Cons |
|------|------|
| Centralized policy | External dependency |
| Powerful policy language | Network latency |
| Audit trail | Overhead for simple cases |

**Verdict:** Rejected. Overkill for application-level permissions. May reconsider at scale.

### Option C: Database-Driven Permissions

| Pros | Cons |
|------|------|
| Dynamic assignment | Database queries on every request |
| User-specific | Complexity |
| Fine-grained | Performance concerns |

**Verdict:** Rejected. Code-based permissions are simpler and performant.

---

## 4. Consequences

### Positive

1. **Clear Contract:** Permission names are explicit
2. **Easy Auditing:** Git history shows permission changes
3. **Static Analysis:** Can enumerate all permission uses
4. **Performance:** No database lookup needed
5. **Type Safety:** Can generate types from registry

### Negative

1. **Code Changes Required:** Adding permissions requires code deploy
2. **No Runtime Assignment:** Can't dynamically grant permissions
3. **Migration Complexity:** Changes affect multiple modules

### Mitigation

- Permission registry is the single source of truth
- Documentation generated from registry
- Group related permissions into domains

---

## 5. Authorization Matrix

| Domain | Admin | Principal | Dept Head | Teacher | Student | Parent |
|--------|-------|-----------|-----------|---------|---------|--------|
| Users | CRUD | Read | - | - | - | - |
| Classes | CRUD | CRUD | Read | Read | Read | - |
| Assignments | CRUD | CRUD | Read | CRUD | Read | - |
| Grades | Read | Read | Read | CRUD | Read | Read |
| Attendance | Read | Read | Read | CRUD | Read | Read |
| Messages | Read | Read | - | Send | Send | Send |
| Reports | Full | Full | Dept | Self | Self | Child |
| Payments | Full | Full | - | - | - | Pay |

---

## 6. Implementation

### Permission Definition

```javascript
// server/shared/auth/rbac.registry.js
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  PRINCIPAL: 'principal',
  VICE_PRINCIPAL: 'vice_principal',
  DEPARTMENT_HEAD: 'department_head',
  TEACHER: 'teacher',
  STUDENT: 'student',
  PARENT: 'parent',
};

export const PERMISSIONS = {
  USER_READ: 'user.read',
  // ...
};
```

### Role-to-Permission Mapping

```javascript
const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: ['*'], // All permissions
  [ROLES.ADMIN]: [
    'user.read', 'user.create', 'user.update', 'user.disable',
    'assignment.*', 'grade.*', 'attendance.*',
    // ...
  ],
  [ROLES.TEACHER]: [
    'assignment.read', 'assignment.create', 'assignment.grade',
    'grade.read', 'grade.create', 'grade.update',
    'attendance.take', 'attendance.read',
    'student.read',
    // ...
  ],
  [ROLES.STUDENT]: [
    'assignment.read', 'submission.create',
    'grade.read', 'attendance.read',
    'ai_tutor.chat', 'ai_tutor.read',
    // ...
  ],
  [ROLES.PARENT]: [
    'student.read', 'grade.read', 'attendance.read',
    'message.send', 'leave_request.create',
    // ...
  ],
};
```

### Middleware Usage

```javascript
// Simple role check
router.get('/admin/users', requireRole('admin'), handler);

// Permission check
router.get('/users', requirePermission('user.read'), handler);

// Any of permissions
router.post('/assignments', requireAnyPermission(
  'assignment.create', 'teacher'
), handler);

// Ownership check
router.put('/profile', requireOwnership(
  (req) => req.user.id,
  { customCheck: async (req) => req.user.id === req.params.id }
), handler);
```

---

## 7. References

- [ADR-005: Authentication](./ADR-005-AUTHENTICATION.md)
- [ADR-007: Multi-tenant Isolation](./ADR-007-MULTI-SCHOOL-TENANCY.md)

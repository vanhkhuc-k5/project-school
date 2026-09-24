# ADR-002: Modular Monolith Architecture

- **Status:** Accepted
- **Date:** 2026-09-20
- **Author:** Principal Software Architect
- **Supersedes:** N/A

---

## 1. Context

EduPortal is a school management system that requires:
- 7 user roles with different permissions (Admin, Principal, Vice Principal, Department Head, Teacher, Student, Parent)
- 15+ business domains (Auth, Users, Assignments, Grades, Attendance, Timetable, etc.)
- Real-time features (notifications, messaging)
- Integration with external services (AI Tutor, Payment Gateway)
- Multi-tenant isolation (multiple schools on same infrastructure)

The system started as a prototype with a flat route structure, but scaling requirements and team growth demand better code organization.

---

## 2. Decision

We adopt a **Modular Monolith** architecture with the following principles:

### 2.1 Domain-Driven Module Structure

```
server/
├── modules/              # Business domains (self-contained)
│   ├── auth/            # Authentication domain
│   ├── users/           # User management
│   ├── assignments/      # Assignment workflow
│   ├── gradebook/       # Grading system
│   ├── attendance/      # Attendance tracking
│   └── .../
├── shared/              # Cross-cutting concerns
│   ├── auth/            # Auth middleware, RBAC
│   ├── errors/          # Error handling
│   ├── logging/         # Logging infrastructure
│   ├── validation/      # Zod schemas
│   └── database/        # DB utilities
├── routes/              # Legacy route adapters (transitional)
└── app/                # Express app setup
```

### 2.2 Module Internal Structure

Each module follows a **Controller → Service → Repository** pattern:

```
module/
├── module.controller.js   # HTTP handling, validation
├── module.service.js     # Business logic, orchestration
├── module.repository.js  # Data access, SQL queries
├── module.schema.js     # Zod validation schemas
├── module.routes.js     # Express route definitions
├── module.types.js      # TypeScript types (optional)
└── index.js             # Module exports
```

### 2.3 Shared Infrastructure

Cross-cutting concerns are extracted to `/shared`:

- **Authentication & Authorization:** JWT verification, RBAC registry, permission checks
- **Error Handling:** Centralized error classes, error handler middleware
- **Logging:** Structured JSON logging with request correlation
- **Validation:** Zod schemas, request validation middleware
- **Database:** Connection pools, migration utilities, transaction helpers

---

## 3. Alternatives Considered

### Option A: Microservices Architecture

| Pros | Cons |
|------|------|
| Independent scaling | High operational complexity |
| Technology flexibility | Network latency overhead |
| Team autonomy | Distributed transaction complexity |
| Failure isolation | Significant infrastructure cost |

**Verdict:** Rejected. EduPortal's domains are tightly coupled (assignments → grades → attendance). The scale doesn't justify microservice overhead.

### Option B: Pure Monolith (No Modules)

| Pros | Cons |
|------|------|
| Simple deployment | Codebase becomes unwieldy |
| Transaction simplicity | Difficult to test domain logic |
| Easy debugging | Team coordination challenges |

**Verdict:** Rejected. 7 roles × 15 domains = 105 permission combinations require organized module boundaries.

### Option C: Event-Driven Architecture (Event Sourcing)

| Pros | Cons |
|------|------|
| Complete audit trail | Implementation complexity |
| Event replay capability | Learning curve |
| Decoupled consumers | Overhead for simple operations |

**Verdict:** Rejected for now. Standard audit logging with database triggers is sufficient. May reconsider if real-time analytics become critical.

---

## 4. Consequences

### Positive

1. **Domain Isolation:** Each module can be understood and modified independently
2. **Clear Dependencies:** Module boundaries enforce architectural constraints
3. **Testability:** Each layer can be unit tested in isolation
4. **Gradual Migration:** Legacy routes can be migrated module-by-module
5. **Deployment Simplicity:** Single deployment unit, no service coordination

### Negative

1. **Module Coupling Risk:** Shared infrastructure can become a coupling point
2. **Deployment Coupling:** All modules deploy together
3. **Horizontal Scaling:** Can only scale entire application

### Mitigation

- Shared modules are versioned and changes are backward-compatible
- Module-specific configuration allows behavior differences
- Stateless design enables future decomposition if needed

---

## 5. When to Reconsider

Consider microservices extraction when:
- Specific domains have 10x traffic difference from others
- Different teams own different domains
- Domain-specific technology requirements emerge (e.g., graph DB for recommendations)
- Deployment frequency conflicts between domains

---

## 6. References

- [ADR-001: Database Strategy](./ADR-001-DATABASE-ACCESS-AND-MIGRATION-STRATEGY.md)
- [ADR-007: Multi-tenant Isolation](./ADR-007-MULTI-SCHOOL-TENANCY.md)

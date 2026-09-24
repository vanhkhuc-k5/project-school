# Architecture Decision Records (ADR)

This directory contains architectural decisions made for the EduPortal project.

## Index

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [ADR-001](./ADR-001-DATABASE-ACCESS-AND-MIGRATION-STRATEGY.md) | PostgreSQL Single Source of Truth | Accepted | 2026-09-20 |
| [ADR-002](./ADR-002-MODULAR-MONOLITH.md) | Modular Monolith Architecture | Accepted | 2026-09-20 |
| [ADR-003](./ADR-003-POSTGRESQL-PRIMARY.md) | PostgreSQL as Primary Database | Accepted | 2026-09-20 |
| [ADR-004](./ADR-004-TYPESCRIPT-STRATEGY.md) | TypeScript Strategy | Accepted | 2026-09-20 |
| [ADR-005](./ADR-005-AUTHENTICATION.md) | Authentication & Session Strategy | Accepted | 2026-09-20 |
| [ADR-006](./ADR-006-RBAC-PERMISSIONS.md) | RBAC (Role-Based Access Control) | Accepted | 2026-09-20 |
| [ADR-007](./ADR-007-MULTI-SCHOOL-TENANCY.md) | Multi-School Tenancy | Accepted | 2026-09-20 |
| [ADR-008](./ADR-008-API-VERSIONING.md) | API Versioning Strategy | Accepted | 2026-09-20 |
| [ADR-009](./ADR-009-NOTIFICATION-APPROACH.md) | Notification Architecture | Accepted | 2026-09-20 |
| [ADR-010](./ADR-010-AUDIT-LOGGING.md) | Audit Logging Strategy | Accepted | 2026-09-20 |
| [ADR-011](./ADR-011-AI-PROVIDER-ABSTRACTION.md) | AI Provider Abstraction | Accepted | 2026-09-20 |

---

## Creating a New ADR

1. Create a new file `ADR-XXX-TITLE.md` in this directory
2. Use the standard template below
3. Add the ADR to this index
4. Commit with message: `docs: Add ADR-XXX for <title>`

## ADR Template

```markdown
# ADR-XXX: Title

- **Status:** Proposed | Accepted | Deprecated | Superseded
- **Date:** YYYY-MM-DD
- **Author:** Name
- **Supersedes:** ADR-XXX (if applicable)

---

## 1. Context

Describe the problem or situation that requires a decision.

## 2. Decision

Explain the chosen solution and rationale.

## 3. Alternatives Considered

List and evaluate other options that were considered.

## 4. Consequences

Discuss the positive and negative consequences of this decision.

## 5. References

Link to related ADRs, documentation, or external resources.
```

## ADR Status Definitions

| Status | Meaning |
|--------|---------|
| **Proposed** | Under review, not yet decided |
| **Accepted** | Approved and implemented |
| **Deprecated** | No longer recommended, but not removed |
| **Superseded** | Replaced by another ADR |

## When to Create an ADR

Create an ADR when:

- Making a significant architectural decision
- Selecting between multiple significant options
- Adding a new major technology or library
- Changing an existing architectural pattern
- The decision affects multiple teams or modules

## Decision Criteria

Consider creating an ADR when:

- The change affects more than 2 modules
- The change has security implications
- The change affects API contracts
- The change has significant performance impact
- The change requires team coordination

---

**Last Updated:** 2026-09-23

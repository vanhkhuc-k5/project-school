# ADR-003: PostgreSQL as Primary Database

- **Status:** Accepted
- **Date:** 2026-09-20
- **Author:** Principal Software Architect
- **Supersedes:** N/A

---

## 1. Context

EduPortal requires a relational database to manage:
- User accounts with role-based access (18+ tables)
- Academic data (students, teachers, classes, enrollments)
- Grading records with historical snapshots
- Financial transactions (tuition payments)
- Multi-tenant isolation per school

The system needs ACID transactions, complex queries, and horizontal scalability.

---

## 2. Decision

**PostgreSQL** (via Neon Cloud) is the primary and production database.

### 2.1 Why PostgreSQL

| Requirement | PostgreSQL Capability |
|-------------|----------------------|
| ACID Transactions | Full ACID compliance |
| Complex Queries | Advanced SQL (CTEs, window functions) |
| Multi-tenant Isolation | Row-level security (RLS) |
| JSON Support | Native JSONB for flexible schemas |
| Scalability | Neon provides serverless auto-scaling |
| Geo-distribution | Neon multi-region support |

### 2.2 Why Neon Cloud

| Factor | Neon Advantage |
|--------|---------------|
| Serverless | Auto-scales to zero, no idle costs |
| Branching | Ephemeral branches for CI/CD testing |
| Connection Pooling | Built-in Supavisor |
| PostgreSQL Compatible | 100% standard PostgreSQL |
| Cost | Free tier for development |

### 2.3 SQLite as Development/Fallback

SQLite (WAL mode) is used for:
- Local development without internet
- Unit testing with in-memory database
- Offline test scenarios

**Constraint:** SQLite is NEVER used in production. Production deployment requires PostgreSQL connection.

---

## 3. Alternatives Considered

### Option A: MySQL / MariaDB

| Pros | Cons |
|------|------|
| Wide hosting support | Less advanced SQL features |
| Good performance | Weaker JSON support |
| Familiar syntax | No row-level security |

**Verdict:** Rejected. PostgreSQL's advanced SQL features (CTEs, window functions) are valuable for reporting. Row-level security is important for multi-tenant.

### Option B: MongoDB / NoSQL

| Pros | Cons |
|------|------|
| Flexible schema | No ACID transactions |
| Horizontal scaling | Complex joins for relational data |
| JSON native | Requires denormalization |

**Verdict:** Rejected. EduPortal data is highly relational. NoSQL would require complex joins that are inefficient.

### Option C: Supabase (PostgreSQL + Realtime)

| Pros | Cons |
|------|------|
| Built-in auth | Vendor lock-in risk |
| Realtime subscriptions | Additional cost |
| Edge functions | Complexity for simple needs |

**Verdict:** Partially accepted. Supabase client was considered but PostgreSQL + pg driver is simpler and more portable.

---

## 4. Consequences

### Positive

1. **Data Integrity:** ACID transactions prevent partial updates
2. **Reporting Power:** Complex queries with CTEs and window functions
3. **Multi-tenant Security:** Row-level security prevents cross-school access
4. **Scalability:** Serverless scaling handles traffic spikes
5. **Developer Experience:** Standard SQL is well-understood

### Negative

1. **Connection Limits:** Requires connection pooling (Supavisor)
2. **Cold Starts:** Serverless may have latency on first request
3. **Cost:** Neon Pro for high-traffic production

### Mitigation

- Supavisor provides 10,000+ connections from single endpoint
- Connection pool is initialized at startup to avoid cold starts
- Free tier covers development, Pro tier for production

---

## 5. Schema Design Principles

1. **Explicit Relationships:** Foreign keys enforce referential integrity
2. **Soft Deletes:** `deleted_at` timestamp for audit trail
3. **Tenant Scoping:** All user-data tables have `school_id`
4. **Audit Columns:** `created_at`, `updated_at`, `created_by`, `updated_by`
5. **Immutable Snapshots:** Grade snapshots and audit logs are append-only

---

## 6. References

- [ADR-001: Database Access Strategy](./ADR-001-DATABASE-ACCESS-AND-MIGRATION-STRATEGY.md)
- [ADR-007: Multi-tenant Isolation](./ADR-007-MULTI-SCHOOL-TENANCY.md)

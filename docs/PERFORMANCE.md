# EduPortal Performance Baseline & Optimization Guide

## G48 — Performance Baseline

This document establishes the performance baseline for EduPortal and tracks optimizations.

---

## Current Performance Status

### ✅ Baseline Metrics (In-Memory SQLite, Sept 2026)

| Query Category | Query Type | Avg Duration | Status |
|---------------|-----------|-------------|--------|
| Dashboard | Active Students Count | 0.84ms | ✅ |
| Dashboard | Active Teachers Count | 0.16ms | ✅ |
| Dashboard | Classes Count | 0.06ms | ✅ |
| Dashboard | Attendance Today | 0.17ms | ✅ |
| Dashboard | Recent Announcements | 0.14ms | ✅ |
| Dashboard | Enrollment by Grade | 0.13ms | ✅ |
| Auth | User Find by Email | 1.04ms | ✅ |
| Auth | User Find by ID | 0.37ms | ✅ |
| User | List by School (limit 50) | 0.17ms | ✅ |
| Class | List by School (limit 50) | 0.11ms | ✅ |
| Enrollment | Class Roster | 0.10ms | ✅ |
| Enrollment | Student Classes | 0.08ms | ✅ |
| Assignment | List by Teacher | 0.22ms | ✅ |
| Assignment | Get by ID | 0.15ms | ✅ |
| Grade | Student Semester Grades | 0.31ms | ✅ |
| Grade | Class Summary | 0.16ms | ✅ |
| Notification | Unread Count | 0.19ms | ✅ |
| Notification | List (paginated) | 0.10ms | ✅ |
| Report | Full Grade Table Scan | 0.14ms | ✅ |
| Report | Attendance by Student | 0.23ms | ✅ |

**Total Baseline: ~5ms for 20 representative queries**

---

## Index Coverage

All critical queries now use indexes:

| Table | Index | Purpose | Status |
|-------|-------|---------|--------|
| `users` | `idx_users_email` | Login lookups | ✅ |
| `users` | `idx_users_school_id` | School-scoped queries | ✅ |
| `users` | `idx_users_role` | Role-based filtering | ✅ |
| `users` | `idx_users_code` | Student/teacher codes | ✅ |
| `classes` | `idx_classes_school` | School class lists | ✅ |
| `classes` | `idx_classes_academic_year` | Year filtering | ✅ |
| `classes` | `idx_classes_status` | Active classes | ✅ |
| `attendance` | `idx_attendance_student_date` | Attendance records | ✅ |
| `notifications` | `idx_notifications_user` | User notifications | ✅ |
| `announcements` | `idx_announcements_school` | School announcements | ✅ |
| `class_enrollments` | `idx_class_enrollments_class` | Class rosters | ✅ |
| `class_enrollments` | `idx_class_enrollments_student` | Student enrollments | ✅ |
| `refresh_tokens` | `idx_refresh_tokens_user` | Token lookups | ✅ |
| `refresh_tokens` | `idx_refresh_tokens_hash` | Token validation | ✅ |

---

## Optimizations Applied

### 1. Index Coverage (Sept 2026)
- Added `idx_users_role` for role-based queries
- Added `idx_users_code` for student/teacher code lookups
- Added `idx_classes_school` for school-scoped class queries
- Added `idx_classes_academic_year` for year filtering
- Added `idx_classes_status` for active class filtering

### 2. Query Patterns
- All list queries use `LIMIT` for pagination
- Dashboard uses `Promise.all` for parallel queries
- Aggregation queries use indexed columns

### 3. Schema Fixes
- Fixed `classes` table to include `academic_year_id` column
- Fixed `class_enrollments` table to have nullable `academic_year_id`
- Added proper foreign key constraints for `academic_year_id`

---

## Performance Testing Tools

### Run Benchmark
```bash
node tests/performance/benchmark.js
```

### Check Index Usage
```bash
node tests/performance/index-check.mjs
```

---

## Known Performance Considerations

### Large Dataset Scenarios
For datasets >10,000 records:
1. **Report queries** may need query result caching
2. **Dashboard metrics** benefit from periodic aggregation tables
3. **Grade calculations** should use materialized views in PostgreSQL

### PostgreSQL vs SQLite
- PostgreSQL: Use `EXPLAIN ANALYZE` for query optimization
- Neon Cloud: Monitor connection pool usage
- SQLite: WAL mode provides concurrent read performance

---

## Future Optimization Opportunities

1. **Dashboard Caching**: Cache dashboard metrics for 1-5 minutes
2. **Grade Snapshots**: Pre-compute grade calculations monthly
3. **Lazy Loading**: Defer non-critical dashboard widgets
4. **Connection Pooling**: Optimize for PostgreSQL connection limits

---

## Acceptance Criteria

✅ **Core dashboards and lists perform predictably on realistic seeded datasets**
- All benchmark queries under 2ms (SQLite in-memory)
- All critical queries use indexes
- Pagination limits applied to list endpoints

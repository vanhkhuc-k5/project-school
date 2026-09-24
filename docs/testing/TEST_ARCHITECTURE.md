# EduPortal Testing Architecture

## Overview

EduPortal uses a **3-tier testing pyramid**:
- **Unit Tests** (bottom) — Fast, isolated, DB-free
- **Integration Tests** (middle) — API-level with test DB
- **E2E Tests** (top) — Full workflow verification

## Running Tests

```bash
# Run all tests
npm test

# Count tests without running
node tests/count_tests.js
```

## Test Pyramid

```
┌─────────────────────────────────────┐
│         E2E Tests (3 suites)        │  ← Full workflows
│  Academic Cycle, Cross-Role Flows   │
├─────────────────────────────────────┤
│     Integration Tests (25 suites)    │  ← API endpoints
│  Auth, Students, Teachers, Parents   │
├─────────────────────────────────────┤
│        Unit Tests (6 suites)        │  ← Pure functions
│  Gradebook, Auth, RBAC, DB          │
└─────────────────────────────────────┘
```

## Test Infrastructure

### Test Fixtures (`tests/fixtures/testFixtures.js`)

Deterministic, isolated test data for reproducible results:

- **Schools**: `sch_bacau`, `sch_hoasen`
- **Academic Years**: `ay_2025_2026`
- **Users**: admin, principal, teachers, students, parents
- **Classes**: 10A1, 10A2, 7B
- **Subjects**: Math, Physics, Literature

### Test Client (`tests/helpers/testClient.js`)

Custom test framework with:
- `describe(name, fn)` — Group tests into suites
- `test(name, fn)` — Individual test case
- `expect(actual)` — Assertion library
- `api` — HTTP client for integration tests

### Test Database

Tests use isolated SQLite database with automatic migrations. Each test run:
1. Starts fresh server on port 5000
2. Runs migrations
3. Initializes fixtures
4. Executes tests sequentially
5. Stops server

## Unit Tests (DB-Free)

### `gradebook_calculations.test.js`
- Category averaging (equal weights)
- Category averaging (weighted entries)
- Percentage normalization
- Missing categories handling
- Category weight application
- Scale factors (10.0, 4.0)
- Published grades exclusion
- Reproducibility verification

### `auth.test.js`
- Bcrypt hash/compare
- Unicode password handling
- JWT token creation/verification
- Token expiration handling
- Invalid signature rejection

### `database.test.js`
- Schema integrity
- Index verification
- Constraint enforcement

### `database_transactions.test.js`
- Transaction rollback
- Concurrency handling

### `core_domain_schema.test.js`
- Entity relationships
- Foreign key constraints
- Data integrity rules

### `env.test.js`
- Environment variable validation
- Required secrets checking

## Integration Tests

### Authentication & Authorization
- `auth_endpoints.test.js` — Login, logout, token refresh
- `production_auth.test.js` — Multi-tenant auth
- `rbac_permissions.test.js` — Role-based access control

### Core Entities
- `student_endpoints.test.js` — Student operations
- `teacher_endpoints.test.js` — Teacher operations
- `admin_endpoints.test.js` — Admin operations
- `parent_endpoints.test.js` — Parent operations

### Academic Structure
- `academic_structure.test.js` — Schools, subjects, classes
- `academic_config.test.js` — Academic years, semesters
- `student_enrollment.test.js` — Enrollment lifecycle

### Teaching & Learning
- `teacher_assignment.test.js` — Teacher-class assignments
- `assignment_authoring.test.js` — Assignment creation
- `submission_workflow.test.js` — Student submission
- `teacher_grading_workflow.test.js` — Grading workflow
- `timetable_scheduling.test.js` — Schedule management

### Communication
- `announcements.test.js` — School announcements
- `notification_center.test.js` — User notifications
- `parent_teacher_messaging.test.js` — Messaging

### Administrative
- `dashboard_metrics.test.js` — Dashboard data
- `leadership_dashboard.test.js` — Admin dashboards
- `department_head.test.js` — Department operations
- `reporting.test.js` — Reports generation
- `leave_requests.test.js` — Leave management

### Financial
- `tuition_invoices.test.js` — Tuition management
- `payment_gateway.test.js` — Payment processing

### System
- `tenant_isolation.test.js` — Multi-tenant security
- `normalized_profiles.test.js` — Profile normalization
- `import_export.test.js` — Data import/export
- `audit_trail.test.js` — Audit logging

## E2E Tests

### `academic_cycle.test.js`

Full cross-role workflow:
1. Teacher logs in
2. Teacher creates assignment
3. Student sees and submits assignment
4. Teacher grades submission
5. Student/Parent sees published grade

## Coverage Strategy

### High Coverage (Critical Paths)
- Authentication flow
- Authorization checks
- Grade calculations
- Attendance recording
- Assignment submission

### Medium Coverage (Common Operations)
- CRUD operations for all entities
- Error handling
- Input validation

### Low Coverage (Edge Cases)
- File uploads
- Email notifications
- Payment gateway failures

## Best Practices

1. **Isolate tests** — Each test should be independent
2. **Use fixtures** — Don't create ad-hoc test data
3. **Clear state** — Reset mutable data between tests
4. **Fast feedback** — Unit tests should run < 100ms
5. **Deterministic** — No flaky tests with random data
6. **Descriptive names** — Test names explain intent
7. **Single assertion** — One logical assertion per test
8. **No production dependencies** — Tests use isolated DB

## CI/CD Integration

Tests run automatically on:
- Pull request creation
- Push to main branch
- Before deployment

Exit codes:
- `0` — All tests passed
- `1` — One or more tests failed

## Debugging Failed Tests

```bash
# Run specific test file
node tests/runner.js 2>&1 | grep "FAIL"

# Check server logs
curl http://localhost:5000/health

# Verify database state
sqlite3 test.db ".tables"
```

## Adding New Tests

1. **Unit tests**: Add to `tests/unit/[feature].test.js`
2. **Integration tests**: Add to `tests/integration/[feature].test.js`
3. **E2E tests**: Add to `tests/e2e/[workflow].test.js`
4. **Register in runner**: Add import and call in `tests/runner.js`
5. **Add fixtures**: Update `testFixtures.js` if needed

## Test Metrics

- **Total Suites**: 34
- **Unit Tests**: 6 suites
- **Integration Tests**: 25 suites
- **E2E Tests**: 3 suites
- **Target Coverage**: Business logic > 80%

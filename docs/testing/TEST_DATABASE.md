# Test Database Strategy — EduPortal

## Overview

This document describes the database strategy for different environments, with emphasis on **test database isolation** to ensure automated tests never affect production data.

## Environment Matrix

| Environment | NODE_ENV | Database | Auto-Reset | Production Data |
|-------------|----------|----------|------------|-----------------|
| **Development** | `development` | SQLite local + Neon PostgreSQL | ❌ No | ❌ No |
| **Test** | `test` | Isolated Test PostgreSQL | ✅ Yes (per suite) | ❌ BLOCKED |
| **Staging** | `staging` | Staging PostgreSQL | ❌ No | ⚠️ Staging |
| **Production** | `production` | Neon PostgreSQL | ❌ BLOCKED | ✅ Yes |

## Critical Safety Rules

### 1. Test Database Isolation (CRITICAL)

```javascript
// NEVER run tests against production/staging database
if (NODE_ENV === 'test') {
  const productionPatterns = [
    'neon.tech',
    'neondb',
    'ep-',  // Neon endpoint prefix
    'aws.neon',
  ];
  
  const isProductionUrl = productionPatterns.some(
    pattern => DATABASE_URL.includes(pattern)
  );
  
  if (isProductionUrl) {
    throw new Error(`
      [CRITICAL] Refusing to run tests against production database.
      Set DATABASE_URL to a test database before running tests.
      See: docs/testing/TEST_DATABASE.md
    `);
  }
}
```

### 2. Production Database Protection

- **NEVER** auto-seed production database
- **NEVER** auto-migrate production database  
- **NEVER** run tests against production without explicit opt-in
- **NEVER** print database URLs or credentials in logs

### 3. Test Database Requirements

A valid test database must:
- Be a separate PostgreSQL instance or Neon branch
- Have the same schema as production
- Be safe to reset between test suites
- Not contain real user data

## Test Database Setup

### Option A: Neon Branch (Recommended for Cloud)

1. Create a new Neon branch for testing:
   ```
   Dashboard → Branches → Create branch → test-branch
   ```

2. Set environment:
   ```bash
   # .env.test
   DATABASE_URL=postgresql://user:pass@test-branch-pooler.region.neon.tech/testdb?sslmode=require
   NODE_ENV=test
   ```

3. Run tests:
   ```bash
   NODE_ENV=test npm test
   ```

### Option B: Local PostgreSQL

1. Create test database:
   ```bash
   createdb eduportal_test
   ```

2. Set environment:
   ```bash
   DATABASE_URL=postgresql://localhost/eduportal_test
   NODE_ENV=test
   ```

3. Run tests with isolated DB:
   ```bash
   NODE_ENV=test npm test
   ```

### Option C: SQLite (Development Only)

For unit tests that don't require PostgreSQL:
- Use in-memory SQLite
- Mock the database layer
- Run independently of server

## Test Execution Flow

```
1. Runner starts
2. Check NODE_ENV === 'test'
3. Verify DATABASE_URL is not production
4. Reset test database (if using persistent test DB)
5. Run migrations on test DB
6. Seed minimal test data
7. Start test server (or connect to running server)
8. Run test suites
9. Cleanup (per-suite or end-of-run)
```

## Migration Strategy

### Test Database Migrations

```bash
# Run migrations on test database
DATABASE_URL=$TEST_DB_URL npm run db:migrate
```

### Migration Files

All production migrations must also apply to test database:
- `server/shared/database/migrations/0001_*.sql`
- `server/shared/database/migrations/0002_*.sql`
- ... (all through 0019)

### No Migration Cleanup in Tests

Tests should NOT modify migration state. Each test suite should:
- Work with existing schema
- Create test-specific data within transactions
- Rollback after each test

## Seed Data Strategy

### Minimal Seed for Tests

Tests should use minimal, intentional seed data:

```javascript
const TEST_ACCOUNTS = {
  admin: { username: 'test_admin', password: 'test123', role: 'admin' },
  teacher: { username: 'test_teacher', password: 'test123', role: 'teacher' },
  student: { username: 'test_student', password: 'test123', role: 'student' },
  parent: { username: 'test_parent', password: 'test123', role: 'parent' },
};
```

### Test Data Isolation

- Each test suite creates its own test data
- Data is scoped by `school_id` (test school)
- Cleanup happens per-test or per-suite

## Guardrail Implementation

### Database Connection Guard

```javascript
// server/shared/database/connection.js

const PROTECTED_ENVIRONMENTS = ['production', 'staging'];
const DANGEROUS_PATTERNS = ['neon.tech', 'neondb', 'ep-', 'aws.neon'];

export function validateDatabaseUrl() {
  if (PROTECTED_ENVIRONMENTS.includes(config.NODE_ENV)) {
    // Production/staging - continue with warning
    console.warn('⚠️ Running in protected environment');
    return true;
  }
  
  if (config.NODE_ENV === 'test') {
    // Verify not using production DB
    const isProduction = DANGEROUS_PATTERNS.some(
      p => config.DATABASE_URL && config.DATABASE_URL.includes(p)
    );
    
    if (isProduction) {
      throw new Error(`
        [SECURITY] Tests cannot run against production database.
        Set a separate test database URL.
        
        Example:
          DATABASE_URL=postgresql://localhost/eduportal_test
          NODE_ENV=test
          npm test
      `);
    }
    
    console.log('🧪 Running in TEST mode with isolated database');
    return true;
  }
  
  return true;
}
```

### Environment File Separation

```
.env                 # Development (safe defaults)
.env.local          # Local overrides (gitignored)
.env.test           # Test environment (gitignored)
.env.production     # Production secrets (gitignored, never committed)
```

## Troubleshooting

### "Connection refused" errors

1. Is the server running? (`npm run server`)
2. Is the database accessible?
3. Check `DATABASE_URL` is correct

### "Permission denied" errors

1. Verify database user has correct permissions
2. Check connection string format

### Tests fail after schema changes

1. Run migrations on test database
2. Reset test database if schema drift

### Production data in tests

1. **STOP IMMEDIATELY**
2. Verify `NODE_ENV=test`
3. Verify `DATABASE_URL` is not production
4. Re-run with correct environment

## Checklist Before Running Tests

- [ ] `NODE_ENV=test` is set
- [ ] `DATABASE_URL` points to test database (NOT production)
- [ ] Test database has been migrated
- [ ] Test database is safe to reset
- [ ] No production credentials in `.env` that will be committed

## Security Contact

If you discover tests are running against production:
1. **Do not continue**
2. Report to security team immediately
3. Document the environment state
4. Verify no data was modified

---

*Last updated: September 22, 2026*
*Author: AI Agent - G34 Stabilization Pass*

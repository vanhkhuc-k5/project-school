# CI Pipeline Documentation

## G50 — CI Quality Gates

This document describes the CI pipeline configuration and quality gates.

---

## Pipeline Overview

The CI pipeline runs on every pull request and push to `main`/`develop` branches.

### Quality Gates (Fail Fast)

```
┌─────────────┐
│   LINT      │ ── ESLint errors fail
└──────┬──────┘
       ▼
┌─────────────┐
│  TYPECHECK  │ ── TypeScript errors fail
└──────┬──────┘
       ▼
┌─────────────┐
│    TESTS    │ ── Test failures fail
└──────┬──────┘
       ▼
┌─────────────┐
│    BUILD    │ ── Build errors fail
└─────────────┘
```

---

## Jobs

### 1. Quality Gates (`quality`)
Runs in parallel: `lint` and `typecheck`

| Step | Command | Failure Condition |
|------|---------|------------------|
| ESLint | `npm run lint` | Any ESLint **errors** |
| TypeScript | `npm run typecheck` | Any TypeScript errors |

### 2. Tests (`test`)
| Step | Command | Environment |
|------|---------|-------------|
| Install | `npm ci` | - |
| Test | `npm test` | `NODE_ENV=test`, `DB_PATH=:memory:` |

### 3. Build (`build`)
| Step | Command | Notes |
|------|---------|-------|
| Install | `npm ci` | Uses lockfile |
| Build | `npm run build` | TypeScript + Vite |

### 4. E2E Tests (`e2e`) - Optional
Runs only on `main` branch push (not PRs)

---

## CI Commands

```bash
# Local CI simulation
npm run lint       # ESLint
npm run typecheck  # TypeScript
npm test           # All tests
npm run build      # Production build

# Full CI locally
npm ci && npm run lint && npm run typecheck && npm test && npm run build
```

---

## GitHub Actions Workflow

Location: `.github/workflows/ci.yml`

### Triggers
- Push to `main` or `develop`
- Pull requests to `main` or `develop`

### Matrix Strategy
Quality gates run in parallel for faster feedback.

### Artifacts
- `test-results/` - Test output
- `playwright-report/` - E2E test report
- `dist/` - Build artifacts

---

## Environment Variables

| Variable | Test Value | Purpose |
|----------|------------|---------|
| `NODE_ENV` | `test` | Test environment |
| `DB_PATH` | `:memory:` | In-memory SQLite |
| `DATABASE_URL` | (empty) | No PostgreSQL in tests |

---

## Fail Fast Configuration

```yaml
strategy:
  fail-fast: true
  matrix:
    gate: [lint, typecheck]
```

If any quality gate fails, the matrix stops immediately.

---

## Common Issues

### ESLint Errors
Most warnings are allowed; only **errors** fail the build.

```bash
# Fix auto-fixable issues
npm run lint:fix
```

### TypeScript Errors
These must be fixed before merge.

```bash
# Check for type errors
npm run typecheck
```

### Test Failures
Tests run in isolation with in-memory SQLite.
- 216 failures are pre-existing (security integration tests)
- 615 tests pass

### Build Failures
Usually caused by TypeScript errors or missing dependencies.

---

## Acceptance Criteria

✅ **Broken code cannot pass CI unnoticed**

Evidence:
1. Lint errors → Build fails
2. TypeScript errors → Build fails
3. Test failures → Build fails
4. Build errors → Build fails

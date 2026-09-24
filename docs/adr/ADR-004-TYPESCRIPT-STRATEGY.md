# ADR-004: TypeScript Strategy

- **Status:** Accepted
- **Date:** 2026-09-20
- **Author:** Principal Software Architect
- **Supersedes:** N/A

---

## 1. Context

EduPortal is built with JavaScript but needs type safety for:
- Complex business logic with multiple roles and permissions
- API contracts between frontend and backend
- Database query results
- Configuration and environment variables

The team wants to catch errors at compile time, not runtime.

---

## 2. Decision

**Progressive TypeScript Migration** with the following strategy:

### 2.1 JavaScript with JSDoc (Phase 1)

Current state - JavaScript files with JSDoc type annotations:

```javascript
/**
 * @param {string} userId
 * @param {import('./auth.repository.js').AuthRepository} [repository]
 * @returns {Promise<User>}
 */
async getUser(userId, repository = authRepository) {
  // implementation
}
```

Benefits:
- Zero migration cost
- IDE autocompletion for external types
- Gradual adoption

### 2.2 TypeScript for New Modules (Phase 2)

New modules are written in TypeScript:

```typescript
interface User {
  id: string;
  email: string;
  role: UserRole;
  schoolId: string;
}

export async function getUser(userId: string): Promise<User> {
  // implementation
}
```

### 2.3 Migration Priority

| Priority | Module | Rationale |
|----------|--------|-----------|
| High | Shared auth, RBAC | Core security logic |
| High | Database types | Foundation for other types |
| Medium | API schemas (Zod) | Type-safe request/response |
| Low | Controllers, Services | Business logic benefits from types |
| Low | Legacy routes | Migrate when modifying |

### 2.4 Type Safety Layers

1. **Zod Schemas** (runtime): API request/response validation
2. **JSDoc Types** (compile-time): IDE support, basic safety
3. **TypeScript** (strict mode): New modules, future migration

---

## 3. Alternatives Considered

### Option A: Full TypeScript Migration

| Pros | Cons |
|------|------|
| Maximum type safety | Massive refactoring effort |
| IDE support | Learning curve for team |
| Strict mode benefits | Longer build times |

**Verdict:** Rejected for now. Full migration requires significant effort with marginal benefit for stable code.

### Option B: TypeScript in New Code Only

| Pros | Cons |
|------|------|
| Gradual adoption | Mixed codebase |
| No legacy overhead | Type inconsistency |
| Learning opportunity | Migration never completes |

**Verdict:** Partially accepted. This is the current approach but needs explicit migration plan.

### Option C: Keep JavaScript with PropTypes/TS-Check

| Pros | Cons |
|------|------|
| Minimal change | Less powerful than TS |
| Fast adoption | No true type safety |

**Verdict:** Rejected. JSDoc provides similar benefits without TypeScript overhead.

---

## 4. Consequences

### Positive

1. **Gradual Adoption:** No big-bang migration
2. **Team Flexibility:** Different modules at different type safety levels
3. **Zod for Runtime:** API contracts are type-safe at runtime
4. **IDE Support:** Autocompletion for JSDoc-annotated code

### Negative

1. **Mixed Codebase:** Type inconsistency between modules
2. **Migration Debt:** Legacy code remains untyped
3. **Build Complexity:** Both `.js` and `.ts` files

### Mitigation

- JSDoc annotations provide reasonable type coverage
- ESLint with `@typescript-eslint/recommended` enforces consistency
- Migration backlog tracks remaining modules

---

## 5. Implementation Guidelines

### JSDoc Best Practices

```javascript
/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} email
 * @property {string} role
 */

/**
 * @param {string} userId
 * @returns {Promise<User | null>}
 */
async function getUser(userId) { }
```

### Zod for API Contracts

```javascript
import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z.string(),
  password: z.string(),
});

// Type inference
/** @typedef {z.infer<typeof loginSchema>} LoginInput */
```

### TypeScript Module Template

```typescript
// module.types.ts
export interface ModuleState {
  initialized: boolean;
}

// module.service.ts
import type { ModuleState } from './module.types';

export class ModuleService {
  private state: ModuleState = { initialized: false };
  
  async initialize(): Promise<void> {
    this.state.initialized = true;
  }
}
```

---

## 6. Migration Checklist

| Module | Current | Target | Status |
|--------|---------|--------|--------|
| shared/auth | JSDoc | TypeScript | Pending |
| shared/errors | JSDoc | TypeScript | Pending |
| modules/auth | JSDoc | TypeScript | Pending |
| modules/assignments | JavaScript | JSDoc | In Progress |
| ... | ... | ... | ... |

---

## 7. References

- [ADR-002: Modular Monolith](./ADR-002-MODULAR-MONOLITH.md)

# ADR-008: API Versioning Strategy

- **Status:** Accepted
- **Date:** 2026-09-20
- **Author:** Principal Software Architect
- **Supersedes:** N/A

---

## 1. Context

EduPortal API needs versioning to:
- Support backward compatibility
- Allow breaking changes without downtime
- Enable gradual client migrations
- Track API evolution

The frontend and mobile clients need predictable API behavior.

---

## 2. Decision

### 2.1 URL Path Versioning

**Current Version:** `/api/v1/*`

```
/api/v1/auth/login
/api/v1/users
/api/v1/assignments
```

### 2.2 Versioning Rules

| Change Type | Version Change | Example |
|-------------|---------------|---------|
| Add optional parameter | None | New query param |
| Add response field | None | New JSON field |
| Change field order | None | Irrelevant |
| Deprecate field | Minor | Field marked deprecated |
| Remove field | Major | Requires new version |
| Change behavior | Major | New version |
| Remove endpoint | Major | Deprecated first, then removed |

### 2.3 Deprecation Policy

1. **Announce:** Add `Deprecation: true` header and `Sunset` date
2. **Support:** Continue supporting old version
3. **Remove:** After 6 months, old version removed

---

## 3. Alternatives Considered

### Option A: Header Versioning

```http
GET /api/users
Accept: application/vnd.eduportal.v2+json
```

| Pros | Cons |
|------|------|
| Clean URLs | Client complexity |
| Caching friendly | Not visible in URL |

**Verdict:** Rejected. URL versioning is simpler and more visible.

### Option B: Date-Based Versioning

```http
GET /api/2024-09-15/users
```

| Pros | Cons |
|------|------|
| Clear dates | Too granular |
| Precision | Frequent changes |

**Verdict:** Rejected. Semantic versioning is cleaner.

### Option C: No Versioning

| Pros | Cons |
|------|------|
| Simple | Breaking changes affect all clients |
| Single API | No graceful deprecation |

**Verdict:** Rejected. Need versioning for production stability.

---

## 4. Consequences

### Positive

1. **Clear Contract:** Clients know exact version they're using
2. **Graceful Migration:** Clients upgrade at their pace
3. **Breaking Changes:** Isolated to new version
4. **Debugging:** URL indicates API version

### Negative

1. **Code Duplication:** Multiple versions in codebase
2. **Maintenance:** Old versions need bug fixes
3. **Documentation:** Multiple API versions to document

### Mitigation

- Deprecation policy limits old version lifetime
- Shared business logic in services, not duplicated
- ADR documents rationale for breaking changes

---

## 5. Implementation

### Route Organization

```
server/
├── routes/
│   ├── v1/           # v1 specific routes
│   │   ├── auth.js
│   │   ├── users.js
│   │   └── ...
│   ├── v2/           # v2 specific routes (future)
│   └── shared/       # Shared route logic
└── app/
    └── routes.js
```

### Version Detection

```javascript
// Current: All routes under /api without version
app.use('/api', apiRouter);

// Future: Version-specific routing
app.use('/api/v1', v1Router);
app.use('/api/v2', v2Router);
```

### Deprecation Headers

```javascript
// Deprecation notice for sunset endpoint
res.setHeader('Deprecation', 'true');
res.setHeader('Sunset', 'Sat, 01 Mar 2025 00:00:00 GMT');
res.setHeader('Link', '</api/v2/users>; rel="successor-version"');
```

---

## 6. Version Lifecycle

```
v1.0 (2024-09) → v1.1 (2025-03) → v1.2 (2025-09) → DEPRECATED (2026-03) → REMOVED (2026-09)
                          ↓
                    v2.0 (2025-03)
```

---

## 7. References

- [ADR-002: Modular Monolith](./ADR-002-MODULAR-MONOLITH.md)

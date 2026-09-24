// =============================================================================
// Frontend Data Layer — G40
// =============================================================================

This directory contains the standardized frontend API and state management utilities.

## Structure

```
lib/
├── api.types.ts    # TypeScript types for API responses, errors
├── api.cache.ts    # In-memory cache with TTL support

hooks/
├── useApiState.ts    # State management hooks
├── useApi.ts         # Data fetching hooks
└── index.ts          # Exports

services/
└── api.ts           # Typed API client (existing)
```

## Usage Examples

### useApi - Fetching Data

```tsx
import { useApi } from '@/hooks';
import { CacheKeys } from '@/lib/api.cache';

function StudentDashboard() {
  const { data, isLoading, error } = useApi(
    () => studentApi.getDashboard(),
    { cacheKey: CacheKeys.student.dashboard() }
  );

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;
  if (!data) return <EmptyState />;
  
  return <DashboardContent data={data} />;
}
```

### useMutation - Writing Data

```tsx
import { useMutation } from '@/hooks';
import { CacheKeys } from '@/lib/api.cache';

function SubmitAssignment() {
  const { mutate, isLoading } = useMutation(
    (submission) => submissionApi.submit(submission),
    { 
      invalidateKeys: [
        CacheKeys.student.assignments(),
      ],
    }
  );

  return (
    <Button onClick={() => mutate({ assignmentId, fileId })} disabled={isLoading}>
      {isLoading ? 'Đang nộp...' : 'Nộp bài'}
    </Button>
  );
}
```

### useLazyApi - On-Demand Fetching

```tsx
import { useLazyApi } from '@/hooks';

function SearchStudents() {
  const { execute, data, isLoading, error } = useLazyApi(
    (query) => studentApi.search(query)
  );

  return (
    <div>
      <SearchInput onSearch={execute} />
      {isLoading && <Loading />}
      {data && <Results data={data} />}
    </div>
  );
}
```

### Cache Invalidation

```tsx
import { CacheInvalidation } from '@/lib/api.cache';

// After successful submission
CacheInvalidation.onAssignmentChange();

// After grade update
CacheInvalidation.onGradeChange();

// On logout
CacheInvalidation.onAuthChange();
```

## API Response Format

All API calls return a standardized response:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code?: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}
```

## Error Handling

```tsx
import { parseApiError, ApiError, NetworkError } from '@/lib/api.types';

try {
  await mutate(data);
} catch (error) {
  if (error instanceof ApiError) {
    // Handle API error with code
    console.log(error.code, error.status);
  } else if (error instanceof NetworkError) {
    // Handle network error
  } else {
    // Handle generic error
  }
}
```

## Best Practices

1. **Always use typed API clients** - Don't make raw fetch calls in components
2. **Use cache keys** - Enables automatic cache invalidation
3. **Handle all states** - Loading, Error, Empty, Success
4. **Invalidate on write** - Use `useMutation` with `invalidateKeys`
5. **Separate concerns** - Keep UI state local, server state in hooks

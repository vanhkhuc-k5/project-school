// =============================================================================
// ServerStateContext — G40 Frontend Data Layer
// Provides:
// - Cache invalidation broadcast (so all components re-fetch on mutation)
// - useApi / useMutation hooks with auto-invalidation
// - Server state vs local UI state separation
// =============================================================================

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { apiCache, CacheKeys, CacheInvalidation, CacheTTL } from '../lib/api.cache';
import { parseApiError } from '../lib/api.types';
import type { ApiResponse } from '../lib/api.types';

// ── Cache Invalidation Event ───────────────────────────────────────────────
export type CacheInvalidationEvent =
  | 'assignment:create' | 'assignment:update' | 'assignment:delete'
  | 'grade:create' | 'grade:update' | 'grade:publish'
  | 'attendance:record'
  | 'submission:create' | 'submission:grade'
  | 'announcement:create' | 'announcement:update' | 'announcement:publish' | 'announcement:delete'
  | 'user:create' | 'user:update' | 'user:delete'
  | 'class:create' | 'class:update' | 'class:delete'
  | 'enrollment:change'
  | 'tuition:pay'
  | 'leave:submit' | 'leave:update'
  | 'message:send'
  | 'auth:change'  // login or logout
  | 'sync:force';  // manual trigger

// Map events → cache keys to invalidate
const EVENT_TO_INVALIDATION: Record<CacheInvalidationEvent, () => void> = {
  'assignment:create': CacheInvalidation.onAssignmentChange,
  'assignment:update': CacheInvalidation.onAssignmentChange,
  'assignment:delete': CacheInvalidation.onAssignmentChange,
  'grade:create': CacheInvalidation.onGradeChange,
  'grade:update': CacheInvalidation.onGradeChange,
  'grade:publish': CacheInvalidation.onGradeChange,
  'attendance:record': () => { apiCache.invalidateByPrefix('student:'); apiCache.invalidateByPrefix('teacher:'); },
  'submission:create': () => { apiCache.invalidateByPrefix('student:assignments'); apiCache.invalidateByPrefix('teacher:assignments'); },
  'submission:grade': CacheInvalidation.onGradeChange,
  'announcement:create': CacheInvalidation.onAnnouncementChange,
  'announcement:update': CacheInvalidation.onAnnouncementChange,
  'announcement:publish': CacheInvalidation.onAnnouncementChange,
  'announcement:delete': CacheInvalidation.onAnnouncementChange,
  'user:create': () => { apiCache.invalidateByPrefix('admin:'); apiCache.invalidateByPrefix('teacher:'); },
  'user:update': () => { apiCache.invalidateByPrefix('admin:'); apiCache.invalidateByPrefix('teacher:'); },
  'user:delete': () => { apiCache.invalidateByPrefix('admin:'); apiCache.invalidateByPrefix('teacher:'); },
  'class:create': CacheInvalidation.onClassChange,
  'class:update': CacheInvalidation.onClassChange,
  'class:delete': CacheInvalidation.onClassChange,
  'enrollment:change': () => { apiCache.invalidateByPrefix('student:'); apiCache.invalidateByPrefix('parent:'); apiCache.invalidateByPrefix('admin:'); },
  'tuition:pay': () => { apiCache.invalidateByPrefix('parent:'); },
  'leave:submit': () => { apiCache.invalidateByPrefix('parent:'); apiCache.invalidateByPrefix('admin:'); },
  'leave:update': () => { apiCache.invalidateByPrefix('parent:'); apiCache.invalidateByPrefix('admin:'); },
  'message:send': () => { apiCache.invalidateByPrefix('parent:'); apiCache.invalidateByPrefix('teacher:'); },
  'auth:change': CacheInvalidation.onAuthChange,
  'sync:force': () => { /* don't clear, just re-fetch */ },
};

// ── ServerState Context ────────────────────────────────────────────────────
interface ServerStateContextValue {
  /** Broadcast a cache invalidation event. All subscribed components re-fetch. */
  invalidateCache: (event: CacheInvalidationEvent) => void;
  /** Subscribe to cache invalidation events. Returns unsubscribe function. */
  onInvalidate: (callback: (event: CacheInvalidationEvent) => void) => () => void;
  /** Check if a cache key is valid */
  isCached: (key: string) => boolean;
  /** Get cached data if available */
  getCached: <T>(key: string) => T | null;
  /** Clear all cache */
  clearCache: () => void;
}

const ServerStateContext = createContext<ServerStateContextValue | null>(null);

export function ServerStateProvider({ children }: { children: React.ReactNode }) {
  const listenersRef = useRef<Set<(event: CacheInvalidationEvent) => void>>(new Set());

  const invalidateCache = useCallback((event: CacheInvalidationEvent) => {
    // Invalidate cache
    const invalidateFn = EVENT_TO_INVALIDATION[event];
    if (invalidateFn) {
      invalidateFn();
    }
    // Notify all listeners
    listenersRef.current.forEach((cb) => cb(event));
  }, []);

  const onInvalidate = useCallback((callback: (event: CacheInvalidationEvent) => void) => {
    listenersRef.current.add(callback);
    return () => {
      listenersRef.current.delete(callback);
    };
  }, []);

  const isCached = useCallback((key: string) => apiCache.has(key), []);
  const getCached = useCallback(<T,>(key: string): T | null => apiCache.get<T>(key), []);
  const clearCache = useCallback(() => apiCache.clear(), []);

  return (
    <ServerStateContext.Provider value={{ invalidateCache, onInvalidate, isCached, getCached, clearCache }}>
      {children}
    </ServerStateContext.Provider>
  );
}

export function useServerState() {
  const ctx = useContext(ServerStateContext);
  if (!ctx) throw new Error('useServerState must be used within ServerStateProvider');
  return ctx;
}

// ── useApi with cache ──────────────────────────────────────────────────────
interface UseApiOptions<T> {
  cacheKey?: string;
  cacheTtl?: number;
  skip?: boolean;
  deps?: unknown[];
  /** Transform data before storing in cache */
  transform?: (data: unknown) => T;
  /** Invalidate specific cache events after mutation */
  watchInvalidation?: CacheInvalidationEvent[];
}

interface ApiState<T> {
  data: T | null;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
}

export function useApi<T>(
  fetchFn: () => Promise<ApiResponse<T>>,
  options: UseApiOptions<T> = {}
) {
  const {
    cacheKey,
    cacheTtl = CacheTTL.MEDIUM,
    skip = false,
    deps = [],
    transform,
    watchInvalidation = [],
  } = options;

  const [state, setState] = useState<ApiState<T>>({
    data: null,
    isLoading: false,
    error: null,
    isFetching: false,
  });

  const { onInvalidate, getCached } = useServerState();
  const fetchRef = useRef<() => Promise<T | null>>();

  const doFetch = useCallback(async () => {
    if (cacheKey) {
      const cached = getCached<T>(cacheKey);
      if (cached !== null) {
        setState({ data: cached, isLoading: false, isFetching: false, error: null });
        return cached;
      }
    }

    setState((s) => ({ ...s, isLoading: true, isFetching: true, error: null }));

    try {
      const response = await fetchFn();
      if (!response.success) {
        const err = new Error(response.error?.message || response.message || 'Yêu cầu thất bại');
        setState({ data: null, isLoading: false, isFetching: false, error: err });
        return null;
      }

      let data = response.data as T;
      if (transform) data = transform(data);

      if (cacheKey) apiCache.set(cacheKey, data, cacheTtl);

      setState({ data, isLoading: false, isFetching: false, error: null });
      return data;
    } catch (err) {
      const parsed = parseApiError(err);
      setState({ data: null, isLoading: false, isFetching: false, error: parsed });
      return null;
    }
  }, [fetchFn, cacheKey, cacheTtl, transform, getCached, watchInvalidation]); // eslint-disable-line

  // Assign ref so invalidate can call it
  fetchRef.current = doFetch;

  // Initial fetch
  useEffect(() => {
    if (!skip) doFetch();
  }, [skip, doFetch]); // eslint-disable-line

  // Watch cache invalidation events
  useEffect(() => {
    if (watchInvalidation.length === 0) return;
    const unsubs = watchInvalidation.map((event) =>
      onInvalidate((e) => {
        if (e === event) doFetch();
      })
    );
    return () => unsubs.forEach((u) => u());
  }, [watchInvalidation, onInvalidate, doFetch]);

  const refetch = useCallback(() => {
    if (cacheKey) apiCache.delete(cacheKey);
    return doFetch();
  }, [doFetch, cacheKey]);

  const invalidate = useCallback(() => {
    if (cacheKey) apiCache.delete(cacheKey);
    return doFetch();
  }, [doFetch, cacheKey]);

  return {
    ...state,
    refetch,
    invalidate,
  };
}

// ── useMutation with cache invalidation ────────────────────────────────────
interface UseMutationOptions<TArgs, TResult> {
  invalidateKeys?: string[];
  onSuccess?: (data: TResult) => void;
  onError?: (error: Error) => void;
  /** Broadcast cache invalidation event after success */
  invalidateEvent?: CacheInvalidationEvent;
}

interface MutationState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  isSuccess: boolean;
}

export function useMutation<TArgs, TResult>(
  mutationFn: (args: TArgs) => Promise<ApiResponse<TResult>>,
  options: UseMutationOptions<TArgs, TResult> = {}
) {
  const {
    invalidateKeys = [],
    onSuccess,
    onError,
    invalidateEvent,
  } = options;

  const [state, setState] = useState<MutationState<TResult>>({
    data: null,
    isLoading: false,
    error: null,
    isSuccess: false,
  });

  const { invalidateCache } = useServerState();

  const mutate = useCallback(async (args: TArgs) => {
    setState({ data: null, isLoading: true, error: null, isSuccess: false });

    try {
      const response = await mutationFn(args);
      if (!response.success) {
        const err = new Error(response.error?.message || response.message || 'Yêu cầu thất bại');
        setState({ data: null, isLoading: false, error: err, isSuccess: false });
        if (onError) onError(err);
        throw err;
      }

      const data = response.data as TResult;

      // Invalidate cache keys
      for (const key of invalidateKeys) {
        if (key.endsWith(':*')) {
          apiCache.invalidateByPrefix(key.slice(0, -2));
        } else {
          apiCache.delete(key);
        }
      }

      // Broadcast event
      if (invalidateEvent) {
        invalidateCache(invalidateEvent);
      }

      setState({ data, isLoading: false, error: null, isSuccess: true });
      if (onSuccess) onSuccess(data);
      return data;
    } catch (err) {
      const parsed = parseApiError(err);
      setState((s) => ({ ...s, isLoading: false, error: parsed, isSuccess: false }));
      if (onError) onError(parsed);
      throw err;
    }
  }, [mutationFn, invalidateKeys, onSuccess, onError, invalidateEvent, invalidateCache]);

  const reset = useCallback(() => {
    setState({ data: null, isLoading: false, error: null, isSuccess: false });
  }, []);

  return {
    mutate,
    mutateAsync: mutate,
    ...state,
    reset,
  };
}

// ── useLazyApi — triggered fetch ───────────────────────────────────────────
export function useLazyApi<TArgs, TResult>(
  fetchFn: (args: TArgs) => Promise<ApiResponse<TResult>>
) {
  const [state, setState] = useState<{ data: TResult | null; isLoading: boolean; error: Error | null }>({
    data: null,
    isLoading: false,
    error: null,
  });

  const execute = useCallback(async (args: TArgs) => {
    setState({ data: null, isLoading: true, error: null });
    try {
      const response = await fetchFn(args);
      if (!response.success) throw new Error(response.error?.message || response.message || 'Yêu cầu thất bại');
      const data = response.data as TResult;
      setState({ data, isLoading: false, error: null });
      return data;
    } catch (err) {
      const parsed = parseApiError(err);
      setState({ data: null, isLoading: false, error: parsed });
      throw err;
    }
  }, [fetchFn]);

  const reset = useCallback(() => setState({ data: null, isLoading: false, error: null }), []);

  return { execute, ...state, reset };
}

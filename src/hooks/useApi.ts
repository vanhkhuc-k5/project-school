// =============================================================================
// useApi Hook — G40 Frontend Data Layer
// React hook for API calls with caching and state management
// =============================================================================

import { useState, useCallback, useEffect, useRef } from 'react';
import { apiCache, CacheKeys, CacheTTL } from '../lib/api.cache';
import { parseApiError, ApiResponse } from '../lib/api.types';

// =============================================
// useApi: Generic data fetching hook
// =============================================

interface UseApiOptions<T> {
  /** Cache key - if provided, results will be cached */
  cacheKey?: string;
  /** Cache TTL in milliseconds */
  cacheTtl?: number;
  /** Skip the request */
  skip?: boolean;
  /** Dependencies that trigger re-fetch */
  deps?: unknown[];
  /** Transform data before storing in cache */
  transform?: (data: unknown) => T;
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
  } = options;

  const [state, setState] = useState<{
    data: T | null;
    isLoading: boolean;
    error: Error | null;
    isFetching: boolean;
  }>({
    data: null,
    isLoading: false,
    error: null,
    isFetching: false,
  });

  const fetch = useCallback(async () => {
    // Check cache first
    if (cacheKey) {
      const cached = apiCache.get<T>(cacheKey);
      if (cached) {
        setState({ data: cached, isLoading: false, error: null, isFetching: false });
        return cached;
      }
    }

    setState(s => ({ ...s, isLoading: true, isFetching: true, error: null }));

    try {
      const response = await fetchFn();

      if (!response.success) {
        throw new Error(response.error?.message || response.message || 'Yêu cầu thất bại');
      }

      let data = response.data as T;
      
      // Transform if needed
      if (transform) {
        data = transform(data);
      }

      // Cache the result
      if (cacheKey) {
        apiCache.set(cacheKey, data, cacheTtl);
      }

      setState({ data, isLoading: false, isFetching: false, error: null });
      return data;
    } catch (error) {
      const parsedError = parseApiError(error);
      setState(s => ({ 
        ...s, 
        isLoading: false, 
        isFetching: false, 
        error: parsedError 
      }));
      throw error;
    }
  }, [fetchFn, cacheKey, cacheTtl, transform, ...deps]);

  // Initial fetch
  useEffect(() => {
    if (!skip) {
      fetch();
    }
  }, [skip, fetch]);

  // Invalidate cache and re-fetch
  const invalidate = useCallback(async () => {
    if (cacheKey) {
      apiCache.delete(cacheKey);
    }
    return fetch();
  }, [cacheKey, fetch]);

  // Manual refetch
  const refetch = useCallback(async () => {
    return fetch();
  }, [fetch]);

  return {
    data: state.data,
    isLoading: state.isLoading,
    isFetching: state.isFetching,
    error: state.error,
    invalidate,
    refetch,
  };
}

// =============================================
// useMutation: Hook for write operations
// =============================================

interface UseMutationOptions<TArgs, TResult> {
  /** Cache keys to invalidate on success */
  invalidateKeys?: string[];
  /** Callback on success */
  onSuccess?: (data: TResult) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

export function useMutation<TArgs, TResult>(
  mutationFn: (args: TArgs) => Promise<ApiResponse<TResult>>,
  options: UseMutationOptions<TArgs, TResult> = {}
) {
  const { invalidateKeys = [], onSuccess, onError } = options;

  const [state, setState] = useState<{
    data: TResult | null;
    isLoading: boolean;
    error: Error | null;
    isSuccess: boolean;
  }>({
    data: null,
    isLoading: false,
    error: null,
    isSuccess: false,
  });

  const mutate = useCallback(async (args: TArgs) => {
    setState({ data: null, isLoading: true, error: null, isSuccess: false });

    try {
      const response = await mutationFn(args);

      if (!response.success) {
        throw new Error(response.error?.message || response.message || 'Yêu cầu thất bại');
      }

      const data = response.data as TResult;

      // Invalidate cache
      for (const key of invalidateKeys) {
        if (key.endsWith(':*')) {
          apiCache.invalidateByPrefix(key.slice(0, -2));
        } else {
          apiCache.delete(key);
        }
      }

      setState({ data, isLoading: false, error: null, isSuccess: true });
      
      if (onSuccess) {
        onSuccess(data);
      }

      return data;
    } catch (error) {
      const parsedError = parseApiError(error);
      setState(s => ({ ...s, isLoading: false, error: parsedError, isSuccess: false }));
      
      if (onError) {
        onError(parsedError);
      }
      
      throw error;
    }
  }, [mutationFn, invalidateKeys, onSuccess, onError]);

  const reset = useCallback(() => {
    setState({ data: null, isLoading: false, error: null, isSuccess: false });
  }, []);

  return {
    mutate,
    mutateAsync: mutate,
    data: state.data,
    isLoading: state.isLoading,
    error: state.error,
    isSuccess: state.isSuccess,
    reset,
  };
}

// =============================================
// useLazyApi: Triggered data fetching
// =============================================

export function useLazyApi<TArgs, TResult>(
  fetchFn: (args: TArgs) => Promise<ApiResponse<TResult>>
) {
  const [state, setState] = useState<{
    data: TResult | null;
    isLoading: boolean;
    error: Error | null;
  }>({
    data: null,
    isLoading: false,
    error: null,
  });

  const execute = useCallback(async (args: TArgs) => {
    setState({ data: null, isLoading: true, error: null });

    try {
      const response = await fetchFn(args);

      if (!response.success) {
        throw new Error(response.error?.message || response.message || 'Yêu cầu thất bại');
      }

      const data = response.data as TResult;
      setState({ data, isLoading: false, error: null });
      return data;
    } catch (error) {
      const parsedError = parseApiError(error);
      setState(s => ({ ...s, isLoading: false, error: parsedError }));
      throw error;
    }
  }, [fetchFn]);

  const reset = useCallback(() => {
    setState({ data: null, isLoading: false, error: null });
  }, []);

  return {
    execute,
    ...state,
    reset,
  };
}

// =============================================
// useCancellableApi: API calls with cancellation
// =============================================

export function useCancellableApi<TArgs, TResult>(
  fetchFn: (args: TArgs, signal?: AbortSignal) => Promise<ApiResponse<TResult>>
) {
  const abortControllerRef = useRef<AbortController | null>(null);

  const execute = useCallback(async (args: TArgs) => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    const response = await fetchFn(args, abortControllerRef.current.signal);
    return response;
  }, [fetchFn]);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return {
    execute,
    cancel,
  };
}

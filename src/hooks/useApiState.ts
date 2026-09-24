// =============================================================================
// useApiState Hook — G40 Frontend Data Layer
// Manages loading, error, and empty states for API calls
// =============================================================================

import { useState, useCallback, useRef } from 'react';
import type { ApiState, ApiResponse } from '../lib/api.types';
import { parseApiError } from '../lib/api.types';

// =============================================
// useApiState: Generic state management hook
// =============================================

export function useApiState<T>() {
  const [state, setState] = useState<ApiState<T>>({ status: 'idle' });

  const setLoading = useCallback(() => {
    setState({ status: 'loading' });
  }, []);

  const setSuccess = useCallback((data: T) => {
    setState({ status: 'success', data });
  }, []);

  const setError = useCallback((error: Error) => {
    setState({ status: 'error', error });
  }, []);

  const setEmpty = useCallback((data?: T) => {
    setState({ status: 'empty', data });
  }, []);

  const reset = useCallback(() => {
    setState({ status: 'idle' });
  }, []);

  return {
    state,
    setLoading,
    setSuccess,
    setError,
    setEmpty,
    reset,
    // Convenience getters
    isLoading: state.status === 'loading',
    isSuccess: state.status === 'success',
    isError: state.status === 'error',
    isEmpty: state.status === 'empty',
    isIdle: state.status === 'idle',
    data: state.status === 'success' || state.status === 'empty' ? state.data : undefined,
    error: state.status === 'error' ? state.error : undefined,
  };
}

// =============================================
// useApiRequest: Fetch with automatic state management
// =============================================

export function useApiRequest<TArgs, TResult>(
  requestFn: (args: TArgs) => Promise<ApiResponse<TResult>>
) {
  const [state, setState] = useState<ApiState<TResult>>({ status: 'idle' });
  const abortControllerRef = useRef<AbortController | null>(null);

  const execute = useCallback(
    async (args: TArgs, options?: { skipCache?: boolean }) => {
      // Cancel any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      setState({ status: 'loading' });

      try {
        const response = await requestFn(args);

        if (!response.success) {
          throw new Error(response.error?.message || response.message || 'Yêu cầu thất bại');
        }

        const data = response.data as TResult;

        // Check for empty response
        if (data === null || data === undefined ||
            (Array.isArray(data) && data.length === 0)) {
          setState({ status: 'empty', data });
        } else {
          setState({ status: 'success', data });
        }

        return data;
      } catch (error) {
        // Ignore abort errors
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }

        setState({ status: 'error', error: parseApiError(error) });
        throw error;
      }
    },
    [requestFn]
  );

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setState({ status: 'idle' });
    }
  }, []);

  const reset = useCallback(() => {
    cancel();
    setState({ status: 'idle' });
  }, [cancel]);

  return {
    state,
    execute,
    cancel,
    reset,
  };
}

// =============================================
// usePaginatedApiRequest: Paginated data fetching
// =============================================

export interface PaginatedState<T> {
  items: T[];
  page: number;
  hasMore: boolean;
  isLoadingMore: boolean;
  isLoading: boolean;
  isError: boolean;
  error?: Error;
}

export function usePaginatedApiRequest<TArgs, TItem>(
  requestFn: (args: TArgs & { page: number; limit: number }) => Promise<{
    items: TItem[];
    page: number;
    totalPages: number;
    total: number;
  }>,
  options: { pageSize?: number } = {}
) {
  const [state, setState] = useState<PaginatedState<TItem>>({
    items: [],
    page: 0,
    hasMore: false,
    isLoadingMore: false,
    isLoading: false,
    isError: false,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchPage = useCallback(
    async (args: TArgs, page: number) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const isFirstPage = page === 1;
      
      if (isFirstPage) {
        setState(s => ({ ...s, isLoading: true, isError: false }));
      } else {
        setState(s => ({ ...s, isLoadingMore: true, isError: false }));
      }

      try {
        const response = await requestFn({ ...args, page, limit: options.pageSize || 20 });

        setState(s => ({
          items: isFirstPage ? response.items : [...s.items, ...response.items],
          page: response.page,
          hasMore: response.page < response.totalPages,
          isLoadingMore: false,
          isLoading: false,
          isError: false,
        }));

        return response;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }

        setState(s => ({
          ...s,
          isLoadingMore: false,
          isLoading: false,
          isError: true,
          error: parseApiError(error),
        }));
        throw error;
      }
    },
    [requestFn, options.pageSize]
  );

  const loadMore = useCallback(
    async (args: TArgs) => {
      if (state.isLoadingMore || !state.hasMore) return;
      await fetchPage(args, state.page + 1);
    },
    [fetchPage, state.isLoadingMore, state.hasMore, state.page]
  );

  const refresh = useCallback(
    async (args: TArgs) => {
      await fetchPage(args, 1);
    },
    [fetchPage]
  );

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setState({
      items: [],
      page: 0,
      hasMore: false,
      isLoadingMore: false,
      isLoading: false,
      isError: false,
    });
  }, []);

  return {
    ...state,
    fetchPage,
    loadMore,
    refresh,
    reset,
  };
}

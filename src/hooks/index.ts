// =============================================================================
// Hooks Index — G40 Frontend Data Layer
// Central export for all custom hooks
//
// Layer architecture:
// 1. useApiState / useApiRequest / usePaginatedApiRequest
//    → Simple loading/error/empty state, no cache
//
// 2. useApi / useMutation / useLazyApi / useCancellableApi  (./useApi.ts)
//    → Cache support, no cross-component invalidation broadcast
//
// 3. useServerApi / useServerMutation / useServerLazyApi  (ServerStateContext)
//    → Cache + cross-component invalidation via broadcast events
// =============================================================================

// ── Layer 1: State-only hooks (no cache) ─────────────────────────────────────────
export { useApiState, useApiRequest, usePaginatedApiRequest } from './useApiState';
export type { PaginatedState } from './useApiState';

// ── Layer 2: Cache hooks (no broadcast) ─────────────────────────────────────────
export {
  useApi,
  useMutation,
  useLazyApi,
  useCancellableApi,
} from './useApi';

// ── Layer 3: Cache + broadcast hooks ─────────────────────────────────────────────
export {
  useApi as useServerApi,
  useMutation as useServerMutation,
  useLazyApi as useServerLazyApi,
  useServerState,
  type CacheInvalidationEvent,
} from '../context/ServerStateContext';

// =============================================================================
// Type Declarations for JSX Modules
// Allows importing .jsx files from .tsx files
// =============================================================================

// Allow importing .jsx files from .tsx
declare module '*.jsx' {
  import type { ComponentType, ReactElement } from 'react';
  
  interface GenericProps {
    [key: string]: unknown;
    children?: ReactElement | ReactElement[];
  }
  
  const component: ComponentType<GenericProps>;
  export default component;
  export * from module;
}

// Auth Context
declare module '../context/AuthContext' {
  import type { ReactNode } from 'react';
  
  interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar?: string;
    schoolId?: string;
    title?: string;
    department?: string;
    class?: string;
  }

  interface AuthContextValue {
    currentUser: User | null;
    currentRole: string | null;
    isLoadingAuth: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
  }

  export function useAuth(): AuthContextValue;
  export const AuthProvider: React.FC<{ children: ReactNode }>;
}

// Sync Context
declare module '../context/SyncContext' {
  import type { ReactNode } from 'react';
  
  interface SyncContextValue {
    unreadCount: number;
    syncStatus: string;
    isSyncing: boolean;
    triggerSync: () => void;
  }

  export function useSync(): SyncContextValue;
  export const SyncProvider: React.FC<{ children: ReactNode }>;
}

// API Service
declare module '../services/api' {
  interface StandardResponse<T = unknown> {
    success: boolean;
    status?: number;
    message?: string;
    data?: T;
    error?: {
      code?: string;
      message: string;
      details?: Record<string, unknown>;
    };
    meta?: Record<string, unknown>;
  }

  export interface ApiRequestOptions extends RequestInit {
    headers?: Record<string, string>;
    signal?: AbortSignal;
  }

  export function apiRequest<T = unknown>(
    url: string,
    options?: ApiRequestOptions
  ): Promise<StandardResponse<T>>;

  export function getAccessToken(): string | null;
  export function setAccessToken(token: string | null): void;
  export function clearAccessToken(): void;
}

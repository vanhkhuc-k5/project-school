// =============================================================================
// LoadingState Component — G41 Shared UI Components
// Skeleton loaders and loading indicators
// =============================================================================

import React from 'react';

// =============================================
// Skeleton Loaders
// =============================================

export function Skeleton({
  width = '100%',
  height = '1rem',
  className = '',
  rounded = false,
}) {
  return (
    <div
      className={`bg-surface-neutral animate-pulse ${rounded ? 'rounded-full' : 'rounded'} ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({
  lines = 3,
  className = '',
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          width={i === lines - 1 ? '60%' : '100%'}
          height="0.875rem"
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`bg-white border border-hairline rounded-card p-5 space-y-3 ${className}`}>
      <Skeleton width="40%" height="1rem" />
      <SkeletonText lines={2} />
      <div className="flex gap-2 pt-2">
        <Skeleton width="20%" height="1.5rem" rounded />
        <Skeleton width="20%" height="1.5rem" rounded />
      </div>
    </div>
  );
}

// =============================================
// Loading Spinner
// =============================================

export function Spinner({ size = 'md', className = '' }) {
  const sizeStyles = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div
      className={`${sizeStyles[size]} border-2 border-surface-neutral border-t-ocean rounded-full animate-spin ${className}`}
      role="status"
      aria-label="Đang tải"
    />
  );
}

// =============================================
// Full Page Loading State
// =============================================

export function PageLoader({ message = 'Đang tải...', className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center py-20 ${className}`}>
      <Spinner size="lg" className="mb-4" />
      {message && (
        <p className="text-sm text-text-secondary">{message}</p>
      )}
    </div>
  );
}

// =============================================
// Inline Loading Indicator
// =============================================

export function LoadingDots({ className = '' }) {
  return (
    <span className={`inline-flex gap-1 ${className}`} aria-label="Đang tải">
      <span className="w-1.5 h-1.5 bg-ocean rounded-full animate-bounce [animation-delay:-0.32s]" />
      <span className="w-1.5 h-1.5 bg-ocean rounded-full animate-bounce [animation-delay:-0.16s]" />
      <span className="w-1.5 h-1.5 bg-ocean rounded-full animate-bounce" />
    </span>
  );
}

// =============================================
// Button Loading State
// =============================================

export function ButtonSpinner({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      <span>Đang xử lý...</span>
    </span>
  );
}

export default {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  Spinner,
  PageLoader,
  LoadingDots,
  ButtonSpinner,
};

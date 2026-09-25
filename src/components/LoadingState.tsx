// =============================================================================
// LoadingState Component — TypeScript
// =============================================================================

import React from 'react';

// =============================================
// Skeleton Loaders
// =============================================

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  rounded?: boolean;
}

export function Skeleton({
  width = '100%',
  height = '1rem',
  className = '',
  rounded = false,
}: SkeletonProps): React.JSX.Element {
  return (
    <div
      className={`bg-surface-neutral animate-pulse ${rounded ? 'rounded-full' : 'rounded'} ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export function SkeletonText({ lines = 3, className = '' }: SkeletonTextProps): React.JSX.Element {
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

interface SkeletonCardProps {
  height?: string;
  width?: string;
  className?: string;
}

export function SkeletonCard({ height, width, className = '' }: SkeletonCardProps): React.JSX.Element {
  const style: React.CSSProperties = {};
  if (width) style.width = width;
  if (height) style.height = height;

  return (
    <div
      className={`bg-white border border-hairline rounded-card p-5 space-y-3 ${className}`}
      style={Object.keys(style).length > 0 ? style : undefined}
    >
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

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps): React.JSX.Element {
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

interface PageLoaderProps {
  message?: string;
  className?: string;
}

export function PageLoader({ message = 'Đang tải...', className = '' }: PageLoaderProps): React.JSX.Element {
  return (
    <div className={`flex flex-col items-center justify-center py-20 ${className}`}>
      <Spinner size="lg" className="mb-4" />
      {message && (
        <p className="text-sm text-text-secondary">{message}</p>
      )}
    </div>
  );
}

export function LoadingDots({ className = '' }: { className?: string }): React.JSX.Element {
  return (
    <span className={`inline-flex gap-1 ${className}`} aria-label="Đang tải">
      <span className="w-1.5 h-1.5 bg-ocean rounded-full animate-bounce [animation-delay:-0.32s]" />
      <span className="w-1.5 h-1.5 bg-ocean rounded-full animate-bounce [animation-delay:-0.16s]" />
      <span className="w-1.5 h-1.5 bg-ocean rounded-full animate-bounce" />
    </span>
  );
}

export function ButtonSpinner({ className = '' }: { className?: string }): React.JSX.Element {
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

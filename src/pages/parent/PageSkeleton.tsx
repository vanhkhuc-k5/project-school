/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// =============================================================================
// PageSkeleton — Loading skeleton for parent portal pages
// =============================================================================

import React from 'react';

export function PageSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="h-20 bg-surface-neutral rounded animate-pulse" />
      ))}
    </div>
  );
}

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3 p-5">
      {[...Array(lines)].map((_, i) => (
        <div key={i} className={`h-4 bg-surface-neutral rounded animate-pulse ${i === 0 ? 'w-1/2' : 'w-full'}`} />
      ))}
    </div>
  );
}

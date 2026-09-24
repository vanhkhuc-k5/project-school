// =============================================================================
// EmptyState Component — G41 Shared UI Components
// Displays when no data is available
// =============================================================================

import React from 'react';
import { Info, FileX, Inbox } from 'lucide-react';

export function EmptyState({
  title = 'Không có dữ liệu',
  description,
  icon: Icon = Info,
  action,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      <div className="w-16 h-16 rounded-full bg-surface-neutral flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-text-secondary stroke-[1.5]" />
      </div>
      <h3 className="text-base font-medium text-text-primary mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-text-secondary max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// Common empty state variants
EmptyState.NotFound = function NotFoundEmpty({ resourceName = 'dữ liệu', ...props }) {
  return (
    <EmptyState
      icon={FileX}
      title={`Không tìm thấy ${resourceName}`}
      description={`Không có ${resourceName} nào được tìm thấy.`}
      {...props}
    />
  );
};

EmptyState.NoResults = function NoResultsEmpty({ searchQuery, ...props }) {
  return (
    <EmptyState
      icon={Inbox}
      title="Không có kết quả"
      description={
        searchQuery
          ? `Không có kết quả nào cho "${searchQuery}"`
          : 'Không có kết quả phù hợp.'
      }
      {...props}
    />
  );
};

export default EmptyState;

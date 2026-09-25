// =============================================================================
// ErrorState Component — TypeScript
// =============================================================================

import React from 'react';
import { AlertCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from './Button';
import type { LucideIcon } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  error?: unknown;
  onRetry?: () => void;
  className?: string;
  icon?: LucideIcon;
}

export function ErrorState({
  title = 'Đã xảy ra lỗi',
  message = 'Không thể tải dữ liệu. Vui lòng thử lại.',
  error,
  onRetry,
  className = '',
  icon: Icon = AlertCircle,
}: ErrorStateProps): React.JSX.Element {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      <div className="w-16 h-16 rounded-full bg-danger-light flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-danger stroke-[1.5]" />
      </div>
      <h3 className="text-base font-medium text-text-primary mb-2">{title}</h3>
      <p className="text-sm text-text-secondary max-w-sm mb-4">
        {message}
        {error && process.env.NODE_ENV === 'development' && (
          <code className="block mt-2 text-xs text-danger bg-danger-light/50 p-2 rounded text-left overflow-auto">
            {error instanceof Error ? error.message : String(error)}
          </code>
        )}
      </p>
      {onRetry && (
        <Button variant="secondary" icon={RefreshCw} onClick={onRetry}>
          Thử lại
        </Button>
      )}
    </div>
  );
}

// Network error variant
ErrorState.Network = function NetworkError({
  onRetry,
  className = '',
}: {
  onRetry?: () => void;
  className?: string;
}): React.JSX.Element {
  return (
    <ErrorState
      icon={AlertTriangle}
      title="Mất kết nối"
      message="Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng của bạn."
      onRetry={onRetry}
      className={className}
    />
  );
};

// Permission denied variant
ErrorState.Forbidden = function ForbiddenError({
  className = '',
}: {
  className?: string;
}): React.JSX.Element {
  return (
    <ErrorState
      title="Không có quyền truy cập"
      message="Bạn không có quyền xem nội dung này."
      className={className}
    />
  );
};

// Server error variant
ErrorState.Server = function ServerError({
  onRetry,
  className = '',
}: {
  onRetry?: () => void;
  className?: string;
}): React.JSX.Element {
  return (
    <ErrorState
      title="Lỗi máy chủ"
      message="Máy chủ đang gặp sự cố. Vui lòng thử lại sau."
      onRetry={onRetry}
      className={className}
    />
  );
};

export default ErrorState;

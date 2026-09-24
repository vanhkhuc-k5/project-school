// =============================================================================
// Toast/Alert Component — G41 Shared UI Components
// Toast notifications and inline alerts
// =============================================================================

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

// =============================================
// Toast Context
// =============================================

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const newToast = {
      id,
      duration: 5000,
      ...toast,
    };

    setToasts(prev => [...prev, newToast]);

    // Auto-dismiss
    if (newToast.duration > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, newToast.duration);
    }

    return id;
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const success = useCallback((message, options = {}) => {
    return addToast({ type: 'success', message, ...options });
  }, [addToast]);

  const error = useCallback((message, options = {}) => {
    return addToast({ type: 'error', message, duration: 8000, ...options });
  }, [addToast]);

  const warning = useCallback((message, options = {}) => {
    return addToast({ type: 'warning', message, ...options });
  }, [addToast]);

  const info = useCallback((message, options = {}) => {
    return addToast({ type: 'info', message, ...options });
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, dismissToast, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// =============================================
// Toast Container
// =============================================

function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm"
      role="region"
      aria-label="Thông báo"
    >
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
      ))}
    </div>
  );
}

// =============================================
// Individual Toast
// =============================================

function Toast({ toast, onDismiss }) {
  const icons = {
    success: CheckCircle2,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const styles = {
    success: {
      bg: 'bg-white',
      border: 'border-success',
      icon: 'text-success',
      iconBg: 'bg-success-light',
    },
    error: {
      bg: 'bg-white',
      border: 'border-danger',
      icon: 'text-danger',
      iconBg: 'bg-danger-light',
    },
    warning: {
      bg: 'bg-white',
      border: 'border-warning',
      icon: 'text-warning',
      iconBg: 'bg-warning-light',
    },
    info: {
      bg: 'bg-white',
      border: 'border-ocean',
      icon: 'text-ocean',
      iconBg: 'bg-sky',
    },
  };

  const Icon = icons[toast.type] || Info;
  const style = styles[toast.type] || styles.info;

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-card border-l-4 shadow-popover animate-slideIn ${style.bg} ${style.border}`}
      role="alert"
      aria-live="polite"
    >
      <div className={`w-8 h-8 rounded-full ${style.iconBg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-4 h-4 ${style.icon} stroke-[1.75]`} />
      </div>
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="text-sm font-medium text-text-primary">{toast.title}</p>
        )}
        <p className="text-sm text-text-secondary">{toast.message}</p>
      </div>
      <button
        onClick={onDismiss}
        className="p-1 text-text-secondary hover:text-text-primary rounded hover:bg-surface-neutral transition-colors"
        aria-label="Đóng thông báo"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// =============================================
// Inline Alert Component
// =============================================

export function Alert({
  type = 'info',
  title,
  children,
  dismissible = false,
  onDismiss,
  className = '',
}) {
  const icons = {
    success: CheckCircle2,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const styles = {
    success: {
      bg: 'bg-success-light',
      border: 'border-success',
      icon: 'text-success',
    },
    error: {
      bg: 'bg-danger-light',
      border: 'border-danger',
      icon: 'text-danger',
    },
    warning: {
      bg: 'bg-warning-light',
      border: 'border-warning',
      icon: 'text-warning',
    },
    info: {
      bg: 'bg-sky',
      border: 'border-ocean',
      icon: 'text-ocean',
    },
  };

  const Icon = icons[type] || Info;
  const style = styles[type] || styles.info;

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border ${style.bg} ${style.border} ${className}`}
      role="alert"
    >
      <Icon className={`w-5 h-5 ${style.icon} stroke-[1.75] shrink-0 mt-0.5`} />
      <div className="flex-1">
        {title && (
          <p className="text-sm font-medium text-text-primary">{title}</p>
        )}
        {children && (
          <div className="text-sm text-text-secondary">
            {children}
          </div>
        )}
      </div>
      {dismissible && onDismiss && (
        <button
          onClick={onDismiss}
          className="p-1 text-text-secondary hover:text-text-primary rounded hover:bg-white/50 transition-colors"
          aria-label="Đóng"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// =============================================
// Form Validation Alert
// =============================================

export function ValidationAlert({ errors = [], className = '' }) {
  if (!errors || errors.length === 0) return null;

  return (
    <Alert type="error" className={className}>
      <ul className="list-disc list-inside space-y-1">
        {errors.map((error, index) => (
          <li key={index}>{error}</li>
        ))}
      </ul>
    </Alert>
  );
}

export default {
  ToastProvider,
  useToast,
  Alert,
  ValidationAlert,
};

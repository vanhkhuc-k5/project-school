import React from 'react';

export function Badge({
  children,
  variant = 'info', // 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  size = 'md', // 'sm' | 'md'
  icon: Icon,
  className = '',
}) {
  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
  };

  const variantStyles = {
    success: 'bg-success-light text-success',
    warning: 'bg-warning-light text-warning-dark',
    danger: 'bg-danger-light text-danger',
    info: 'bg-sky text-primary',
    neutral: 'bg-surface-neutral text-text-secondary border border-hairline',
    navy: 'bg-primary text-white',
  };

  return (
    <span
      className={`inline-flex items-center rounded-pill tracking-tight select-none ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {Icon && <Icon className="w-3 h-3 stroke-[2] shrink-0" />}
      <span>{children}</span>
    </span>
  );
}

import React from 'react';

export function Button({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'tertiary' | 'danger'
  size = 'md', // 'sm' | 'md' | 'lg'
  icon: Icon,
  iconPosition = 'left',
  className = '',
  disabled = false,
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-150 rounded active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 select-none';

  const sizeStyles = {
    sm: 'h-9 px-3 text-xs gap-1.5',
    md: 'h-11 px-5 text-sm gap-2',
    lg: 'h-12 px-6 text-base gap-2.5',
  };

  const variantStyles = {
    primary: 'bg-primary text-white hover:bg-ocean focus:ring-2 focus:ring-ocean/30 focus:outline-none',
    secondary: 'bg-white text-primary border border-hairline hover:bg-surface-neutral hover:border-hairline-darker focus:ring-2 focus:ring-ocean/20 focus:outline-none',
    tertiary: 'bg-transparent text-ocean hover:text-primary hover:bg-sky/50 focus:outline-none',
    danger: 'bg-danger text-white hover:bg-red-700 focus:ring-2 focus:ring-danger/30 focus:outline-none',
    ghost: 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-neutral',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {Icon && iconPosition === 'left' && <Icon className="w-4 h-4 shrink-0 stroke-[1.75]" />}
      <span>{children}</span>
      {Icon && iconPosition === 'right' && <Icon className="w-4 h-4 shrink-0 stroke-[1.75]" />}
    </button>
  );
}

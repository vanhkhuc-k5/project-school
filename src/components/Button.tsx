// =============================================================================
// Button Component — TypeScript
// =============================================================================

import React from 'react';
import type { LucideIcon } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger' | 'ghost';
  size?: ButtonSize;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  className = '',
  disabled = false,
  type = 'button',
  ...props
}: ButtonProps): React.JSX.Element {
  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'min-h-[36px] min-w-[36px] px-3 text-xs gap-1.5',
    md: 'min-h-[44px] min-w-[44px] px-5 text-sm gap-2',
    lg: 'min-h-[48px] min-w-[48px] px-6 text-base gap-2.5',
  };

  const variantStyles: Record<ButtonVariant, string> = {
    primary: 'bg-primary text-white hover:bg-ocean focus-visible:ring-2 focus-visible:ring-ocean/50 focus-visible:ring-offset-2',
    secondary: 'bg-white text-primary border border-hairline hover:bg-surface-neutral hover:border-ocean focus-visible:ring-2 focus-visible:ring-ocean/50 focus-visible:ring-offset-2',
    tertiary: 'bg-transparent text-ocean hover:text-primary hover:bg-sky/50 focus-visible:ring-2 focus-visible:ring-ocean/50 focus-visible:ring-offset-2',
    danger: 'bg-danger text-white hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-danger/50 focus-visible:ring-offset-2',
    ghost: 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-neutral focus-visible:ring-2 focus-visible:ring-ocean/50 focus-visible:ring-offset-2',
  };

  return (
    <button
      type={type}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center font-medium
        transition-all duration-150 rounded-button
        active:scale-[0.99]
        disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
        select-none
        focus:outline-none
        ${sizeStyles[size]}
        ${variantStyles[variant]}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      {...props}
    >
      {Icon && iconPosition === 'left' && (
        <Icon className="w-4 h-4 shrink-0 stroke-[1.75]" aria-hidden="true" />
      )}
      <span>{children}</span>
      {Icon && iconPosition === 'right' && (
        <Icon className="w-4 h-4 shrink-0 stroke-[1.75]" aria-hidden="true" />
      )}
    </button>
  );
}

// =============================================
// Icon Button (Square)
// =============================================

export function IconButton({
  icon: Icon,
  label,
  variant = 'ghost',
  size = 'md',
  className = '',
  disabled = false,
  type = 'button',
  ...props
}: IconButtonProps): React.JSX.Element {
  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'w-8 h-8',
    md: 'w-11 h-11',
    lg: 'w-12 h-12',
  };

  const variantStyles: Record<ButtonVariant, string> = {
    primary: 'bg-primary text-white hover:bg-ocean',
    secondary: 'bg-white text-text-secondary border border-hairline hover:text-text-primary hover:bg-surface-neutral',
    tertiary: 'bg-transparent text-ocean hover:text-primary hover:bg-sky/50',
    danger: 'bg-danger text-white hover:bg-red-700',
    ghost: 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-neutral',
  };

  return (
    <button
      type={type}
      disabled={disabled}
      aria-label={label}
      className={`
        inline-flex items-center justify-center
        transition-all duration-150 rounded-button
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean/50 focus-visible:ring-offset-2
        ${sizeStyles[size]}
        ${variantStyles[variant]}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      {...props}
    >
      <Icon className="w-5 h-5 stroke-[1.75]" aria-hidden="true" />
    </button>
  );
}

export default Button;

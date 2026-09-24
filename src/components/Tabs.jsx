// =============================================================================
// Tabs Component — G41 Shared UI Components
// Accessible tab navigation
// =============================================================================

import React, { useState, createContext, useContext } from 'react';

// =============================================
// Simple className helper
// =============================================

function cn(...classes) {
  return classes.filter(Boolean).filter(c => typeof c === 'string').join(' ');
}

// =============================================
// Tab Context
// =============================================

const TabsContext = createContext(null);

export function Tabs({
  defaultValue,
  value,
  onValueChange,
  children,
  className = '',
}) {
  const [internalValue, setInternalValue] = useState(defaultValue || '');
  const selectedValue = value ?? internalValue;

  const handleChange = (newValue) => {
    if (value === undefined) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
  };

  return (
    <TabsContext.Provider value={{ value: selectedValue, onChange: handleChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

// =============================================
// Tab List
// =============================================

export function TabList({ children, className = '', variant = 'default' }) {
  const styles = {
    default: 'border-b border-hairline',
    pills: 'bg-surface-neutral p-1 rounded-lg gap-1',
    underline: '',
  };

  return (
    <div
      role="tablist"
      className={cn('flex items-center gap-1', styles[variant] || styles.default, className)}
    >
      {children}
    </div>
  );
}

// =============================================
// Tab Trigger
// =============================================

export function TabTrigger({
  value,
  children,
  className = '',
  disabled = false,
  icon: Icon,
  variant = 'default',
}) {
  const context = useContext(TabsContext);
  const isActive = context?.value === value;

  const baseStyles = 'inline-flex items-center gap-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean/50 focus-visible:ring-offset-2 rounded';

  const variantStyles = {
    default: cn(
      'px-4 py-2.5 text-text-secondary hover:text-text-primary border-b-2 border-transparent -mb-px',
      isActive && 'text-ocean border-ocean'
    ),
    pills: cn(
      'px-3 py-1.5 rounded text-text-secondary hover:text-text-primary',
      isActive && 'bg-white text-primary shadow-sm'
    ),
    underline: cn(
      'px-3 py-2 text-text-secondary hover:text-text-primary border-b-2 border-transparent',
      isActive && 'text-ocean border-ocean'
    ),
  };

  return (
    <button
      role="tab"
      type="button"
      disabled={disabled}
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
      onClick={() => context?.onChange(value)}
      className={cn(
        baseStyles,
        variantStyles[variant] || variantStyles.default,
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
}

// =============================================
// Tab Content
// =============================================

export function TabContent({
  value,
  children,
  className = '',
}) {
  const context = useContext(TabsContext);
  const isActive = context?.value === value;

  if (!isActive) return null;

  return (
    <div
      role="tabpanel"
      tabIndex={0}
      className={cn('pt-4 focus:outline-none', className)}
    >
      {children}
    </div>
  );
}

export default Tabs;

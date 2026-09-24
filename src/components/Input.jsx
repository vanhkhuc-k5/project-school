// =============================================================================
// Input Components — G42 Responsive & Accessibility
// Accessible form inputs with proper labels and error handling
// =============================================================================

import React, { forwardRef } from 'react';
import { AlertCircle } from 'lucide-react';

// =============================================
// Text Input
// =============================================

export const Input = forwardRef(function Input({
  label,
  error,
  icon: Icon,
  helperText,
  className = '',
  id,
  required = false,
  disabled = false,
  'aria-describedby': ariaDescribedBy,
  ...props
}, ref) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '_') : undefined);
  const errorId = `${inputId}_error`;
  const helperId = `${inputId}_helper`;
  
  // Determine what to describe
  const describedBy = [
    error ? errorId : null,
    helperText ? helperId : null,
    ariaDescribedBy,
  ].filter(Boolean).join(' ') || undefined;

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label 
          htmlFor={inputId} 
          className="block text-sm font-medium text-text-primary"
        >
          {label}
          {required && <span className="text-danger ml-1" aria-label="bắt buộc">*</span>}
        </label>
      )}
      
      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3.5 pointer-events-none text-text-secondary" aria-hidden="true">
            <Icon className="w-4 h-4 stroke-[1.75]" />
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          required={required}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          aria-required={required}
          className={`w-full h-11 bg-white border rounded-button text-sm text-text-primary placeholder:text-text-secondary transition-all outline-none disabled:bg-surface-neutral disabled:cursor-not-allowed ${
            Icon ? 'pl-10' : 'pl-3.5'
          } pr-3.5 ${
            error
              ? 'border-danger focus:border-danger focus:ring-2 focus:ring-danger/20 focus-visible:ring-danger/20'
              : 'border-hairline focus:border-ocean focus:ring-2 focus:ring-ocean/15 focus-visible:ring-ocean/50'
          } ${disabled ? 'opacity-60' : ''} ${className}`}
          {...props}
        />
      </div>
      
      {/* Error or Helper Text */}
      {error ? (
        <p id={errorId} className="text-xs text-danger flex items-center gap-1" role="alert">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-xs text-text-secondary">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});

// =============================================
// Select
// =============================================

export const Select = forwardRef(function Select({
  label,
  options = [],
  className = '',
  id,
  error,
  helperText,
  required = false,
  disabled = false,
  placeholder = 'Chọn...',
  'aria-describedby': ariaDescribedBy,
  ...props
}, ref) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '_') : undefined);
  const errorId = `${selectId}_error`;
  const helperId = `${selectId}_helper`;
  
  const describedBy = [
    error ? errorId : null,
    helperText ? helperId : null,
    ariaDescribedBy,
  ].filter(Boolean).join(' ') || undefined;

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label 
          htmlFor={selectId} 
          className="block text-sm font-medium text-text-primary"
        >
          {label}
          {required && <span className="text-danger ml-1" aria-label="bắt buộc">*</span>}
        </label>
      )}
      
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          required={required}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          aria-required={required}
          className={`w-full h-11 bg-white border rounded-button text-sm text-text-primary px-3.5 pr-10 focus:border-ocean focus:ring-2 focus:ring-ocean/15 focus:outline-none focus-visible:ring-ocean/50 transition-all disabled:bg-surface-neutral disabled:cursor-not-allowed appearance-none ${
            error ? 'border-danger focus:border-danger focus:ring-danger/20' : 'border-hairline'
          } ${disabled ? 'opacity-60' : ''} ${className}`}
          {...props}
        >
          <option value="" disabled>{placeholder}</option>
          {options.map((opt, idx) => {
            const val = typeof opt === 'string' ? opt : opt.value;
            const lbl = typeof opt === 'string' ? opt : opt.label;
            return (
              <option key={idx} value={val}>
                {lbl}
              </option>
            );
          })}
        </select>
        
        {/* Custom dropdown arrow */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none" aria-hidden="true">
          <svg className="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      
      {error ? (
        <p id={errorId} className="text-xs text-danger flex items-center gap-1" role="alert">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-xs text-text-secondary">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});

export default { Input, Select };

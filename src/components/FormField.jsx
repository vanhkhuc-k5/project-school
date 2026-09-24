// =============================================================================
// FormField Component — G41 Shared UI Components
// Wrapper for form inputs with labels, helper text, and errors
// =============================================================================

import React from 'react';
import { AlertCircle } from 'lucide-react';

export function FormField({
  label,
  htmlFor,
  error,
  helperText,
  required = false,
  children,
  className = '',
}) {
  const inputId = htmlFor || label?.toLowerCase().replace(/\s+/g, '_');

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-text-primary"
        >
          {label}
          {required && <span className="text-danger ml-1">*</span>}
        </label>
      )}
      
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;
        
        // Clone child to inject id and aria-describedby
        return React.cloneElement(child, {
          id: child.props.id || inputId,
          'aria-describedby': error
            ? `${inputId}_error`
            : helperText
            ? `${inputId}_helper`
            : undefined,
          'aria-invalid': error ? 'true' : undefined,
          className: `${child.props.className || ''} ${
            error ? 'border-danger focus:border-danger focus:ring-danger/20' : ''
          }`.trim(),
        });
      })}
      
      {error && (
        <p
          id={`${inputId}_error`}
          className="text-xs text-danger flex items-center gap-1"
          role="alert"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </p>
      )}
      
      {!error && helperText && (
        <p id={`${inputId}_helper`} className="text-xs text-text-secondary">
          {helperText}
        </p>
      )}
    </div>
  );
}

// =============================================
// Checkbox Field
// =============================================

export function CheckboxField({
  label,
  error,
  className = '',
  children,
}) {
  return (
    <div className={`flex items-start gap-2.5 ${className}`}>
      <input
        type="checkbox"
        className={`mt-0.5 w-4 h-4 rounded border-hairline text-ocean focus:ring-ocean/20 ${
          error ? 'border-danger' : ''
        }`}
      />
      <div className="flex-1">
        {label && (
          <label className="text-sm text-text-primary cursor-pointer">
            {label}
          </label>
        )}
        {children && (
          <p className="text-xs text-text-secondary mt-0.5">{children}</p>
        )}
        {error && (
          <p className="text-xs text-danger mt-1">{error}</p>
        )}
      </div>
    </div>
  );
}

// =============================================
// Radio Field
// =============================================

export function RadioField({
  label,
  name,
  value,
  checked,
  onChange,
  error,
  className = '',
  description,
}) {
  return (
    <div className={`flex items-start gap-2.5 ${className}`}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className={`mt-0.5 w-4 h-4 border-hairline text-ocean focus:ring-ocean/20 ${
          error ? 'border-danger' : ''
        }`}
      />
      <div className="flex-1">
        {label && (
          <label className="text-sm text-text-primary cursor-pointer">
            {label}
          </label>
        )}
        {description && (
          <p className="text-xs text-text-secondary mt-0.5">{description}</p>
        )}
        {error && (
          <p className="text-xs text-danger mt-1">{error}</p>
        )}
      </div>
    </div>
  );
}

// =============================================
// Textarea Field
// =============================================

export function TextareaField({
  label,
  error,
  helperText,
  required = false,
  className = '',
  rows = 4,
  ...props
}) {
  const inputId = label?.toLowerCase().replace(/\s+/g, '_');

  return (
    <FormField
      label={label}
      error={error}
      helperText={helperText}
      required={required}
      className={className}
    >
      <textarea
        id={inputId}
        rows={rows}
        className={`w-full px-3.5 py-2.5 bg-white border rounded-button text-sm text-text-primary placeholder:text-text-secondary transition-all outline-none resize-y min-h-[100px] ${
          error
            ? 'border-danger focus:border-danger focus:ring-2 focus:ring-danger/20'
            : 'border-hairline focus:border-ocean focus:ring-2 focus:ring-ocean/15'
        }`}
        {...props}
      />
    </FormField>
  );
}

export default FormField;

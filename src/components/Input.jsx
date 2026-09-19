import React from 'react';

export function Input({
  label,
  error,
  icon: Icon,
  helperText,
  className = '',
  id,
  ...props
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '_') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-text-primary">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3.5 pointer-events-none text-text-secondary">
            <Icon className="w-4 h-4 stroke-[1.75]" />
          </div>
        )}
        <input
          id={inputId}
          className={`w-full h-11 bg-white border rounded text-sm text-text-primary placeholder:text-text-secondary transition-all outline-none ${
            Icon ? 'pl-10' : 'pl-3.5'
          } pr-3.5 ${
            error
              ? 'border-danger focus:ring-2 focus:ring-danger/20'
              : 'border-hairline focus:border-ocean focus:ring-2 focus:ring-ocean/15'
          } ${className}`}
          {...props}
        />
      </div>
      {error ? (
        <p className="text-xs text-danger flex items-center gap-1 mt-1">
          <span>⚠️</span> {error}
        </p>
      ) : helperText ? (
        <p className="text-xs text-text-secondary mt-1">{helperText}</p>
      ) : null}
    </div>
  );
}

export function Select({
  label,
  options = [],
  className = '',
  id,
  ...props
}) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '_') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-text-primary">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`w-full h-11 bg-white border border-hairline rounded text-sm text-text-primary px-3.5 focus:border-ocean focus:ring-2 focus:ring-ocean/15 focus:outline-none transition-all ${className}`}
        {...props}
      >
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
    </div>
  );
}

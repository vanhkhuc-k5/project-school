import React from 'react';

export function Card({
  children,
  className = '',
  highlighted = false,
  flat = false,
  padding = 'p-5 sm:p-6',
  ...props
}) {
  const baseStyles = 'bg-white rounded-card transition-all';
  const borderStyles = highlighted
    ? 'border border-ocean bg-sky/30'
    : 'border border-hairline';
  const shadowStyles = flat ? '' : 'shadow-whisper';

  return (
    <div
      className={`${baseStyles} ${borderStyles} ${shadowStyles} ${padding} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

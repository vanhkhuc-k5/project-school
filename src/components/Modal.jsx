// =============================================================================
// Modal Component — G42 Responsive & Accessibility
// Accessible dialog with focus trap and keyboard support
// =============================================================================

import React, { useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
  closeOnOverlayClick = true,
}) {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);
  const closeButtonRef = useRef(null);

  // Focus trap
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      onClose?.();
      return;
    }

    // Tab key handling for focus trap
    if (e.key === 'Tab' && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      // Store current focused element
      previousActiveElement.current = document.activeElement;
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      
      // Add keydown listener
      window.addEventListener('keydown', handleKeyDown);
      
      // Focus the close button or first focusable element
      setTimeout(() => {
        if (closeButtonRef.current) {
          closeButtonRef.current.focus();
        } else if (modalRef.current) {
          const firstFocusable = modalRef.current.querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          firstFocusable?.focus();
        }
      }, 0);
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
      
      // Return focus to previous element
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose?.();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F3D5C]/40 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      aria-describedby={title ? undefined : 'modal-description'}
    >
      {/* Overlay */}
      <div
        className="fixed inset-0"
        onClick={handleOverlayClick}
        aria-hidden="true"
      />
      
      {/* Modal Content */}
      <div
        ref={modalRef}
        className={`relative w-full ${maxWidth} bg-white rounded-card shadow-popover border border-hairline overflow-hidden z-10 animate-scaleUp`}
        id="modal-content"
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 hairline-b bg-surface-neutral/60">
            <h2 id="modal-title" className="text-base font-medium text-text-primary">
              {title}
            </h2>
            <button
              ref={closeButtonRef}
              onClick={onClose}
              className="p-2 text-text-secondary hover:text-text-primary rounded-lg hover:bg-hairline/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean/50"
              aria-label="Đóng"
            >
              <X className="w-5 h-5 stroke-[1.75]" />
            </button>
          </div>
        )}
        
        {/* Body */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

export default Modal;

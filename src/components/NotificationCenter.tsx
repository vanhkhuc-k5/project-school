// =============================================================================
// NotificationCenter — TypeScript
// =============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Badge } from './Badge';
import { useSync } from '../context/SyncContext';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Megaphone,
  BookOpen,
  X,
} from 'lucide-react';

interface Notification {
  id: string;
  isRead?: boolean;
  category?: string;
  tag?: string;
  tagType?: string;
  title?: string;
  content?: string;
  sender?: string;
  createdAt?: string;
}

interface NotificationCenterProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function NotificationCenter({
  isOpen = false,
  onClose,
}: NotificationCenterProps): React.JSX.Element | null {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useSync();
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose?.();
      return;
    }

    if (e.key === 'Tab' && panelRef.current) {
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (!first || !last) return;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);

      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 0);
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, handleKeyDown]);

  const filteredNotifs = notifications.filter((n: Notification) => {
    if (activeFilter === 'unread') return !n.isRead;
    if (activeFilter === 'exam') return n.category === 'teacher' || n.tag?.includes('bài tập');
    if (activeFilter === 'admin') return n.category === 'school' || n.tag?.includes('BGH');
    return true;
  });

  const getIcon = (notif: Notification): React.JSX.Element => {
    if (notif.category === 'school') return <Megaphone className="w-4 h-4 text-ocean" aria-hidden="true" />;
    if (notif.tagType === 'warning') return <AlertTriangle className="w-4 h-4 text-warning-dark" aria-hidden="true" />;
    if (notif.tagType === 'success') return <CheckCircle2 className="w-4 h-4 text-success" aria-hidden="true" />;
    return <BookOpen className="w-4 h-4 text-primary" aria-hidden="true" />;
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end p-4 sm:p-6 bg-black/20 backdrop-blur-[2px] animate-fadeIn"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Trung tâm thông báo"
        className="w-full max-w-md bg-white rounded-card border border-hairline shadow-popover flex flex-col max-h-[85vh] overflow-hidden animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-hairline bg-surface-neutral/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-sky text-primary flex items-center justify-center" aria-hidden="true">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Trung tâm Thông báo</h2>
              <p className="text-[11px] text-text-secondary" aria-live="polite">
                {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : 'Tất cả đã được cập nhật'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[11px] text-ocean hover:underline font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean/50 focus-visible:ring-offset-1 rounded"
              >
                Đọc tất cả
              </button>
            )}
            <button
              ref={closeButtonRef}
              onClick={onClose}
              className="p-1.5 rounded text-text-secondary hover:text-text-primary hover:bg-hairline/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean/50"
              aria-label="Đóng trung tâm thông báo"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div
          role="tablist"
          aria-label="Lọc thông báo"
          className="px-4 py-2 border-b border-hairline bg-white flex items-center gap-1.5 overflow-x-auto text-xs"
        >
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'unread', label: `Chưa đọc (${unreadCount})` },
            { id: 'exam', label: 'Khảo thí & Điểm' },
            { id: 'admin', label: 'Toàn trường' },
          ].map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeFilter === tab.id}
              tabIndex={activeFilter === tab.id ? 0 : -1}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-2.5 py-1 rounded text-[11px] whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean/50 ${
                activeFilter === tab.id
                  ? 'bg-primary text-white font-medium'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-neutral'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notification List */}
        <div
          role="region"
          aria-label="Danh sách thông báo"
          aria-live="polite"
          aria-atomic={false}
          className="flex-1 overflow-y-auto"
        >
          {filteredNotifs.length === 0 ? (
            <div className="p-8 text-center text-xs text-text-secondary" role="status">
              Không có thông báo nào trong danh mục này.
            </div>
          ) : (
            <ul>
              {filteredNotifs.map((n: Notification) => (
                <li key={n.id}>
                  <button
                    onClick={() => markAsRead(n.id)}
                    className={`w-full text-left p-4 transition-colors cursor-pointer text-xs space-y-1.5 border-b border-hairline last:border-b-0 ${
                      !n.isRead ? 'bg-sky/20 hover:bg-sky/30' : 'hover:bg-surface-neutral/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="p-1 rounded bg-surface-neutral shrink-0">{getIcon(n)}</span>
                        <Badge variant={(n.tagType as 'info' | 'success' | 'warning' | 'danger' | 'neutral' | 'navy' | 'default') || 'info'} size="sm">
                          {n.tag || 'Thông báo'}
                        </Badge>
                      </div>
                      <span className="text-[10px] text-text-secondary">
                        {n.createdAt ? n.createdAt.substring(0, 16) : 'Vừa xong'}
                      </span>
                    </div>

                    <div className="font-semibold text-text-primary text-xs leading-snug">
                      {n.title}
                    </div>

                    <p className="text-[11px] text-text-secondary line-clamp-2 leading-relaxed">
                      {n.content}
                    </p>

                    <div className="flex items-center justify-between pt-1 text-[10px] text-text-secondary">
                      <span>Từ: <strong className="text-text-primary">{n.sender}</strong></span>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-ocean inline-block" aria-label="Chưa đọc" />
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-hairline bg-surface-neutral/40 text-center text-[11px] text-text-secondary">
          Hệ thống đồng bộ dữ liệu thời gian thực EduPortal
        </div>
      </div>
    </div>
  );
}

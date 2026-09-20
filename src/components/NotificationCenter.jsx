import React, { useState } from 'react';
import { Badge } from './Badge';
import { Button } from './Button';
import { useSync } from '../context/SyncContext';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Check,
  Megaphone,
  CreditCard,
  BookOpen,
  X,
} from 'lucide-react';

export function NotificationCenter({ isOpen, onClose, onNavigateTab }) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useSync();
  const [activeFilter, setActiveFilter] = useState('all');

  if (!isOpen) return null;

  const filteredNotifs = notifications.filter((n) => {
    if (activeFilter === 'unread') return !n.isRead;
    if (activeFilter === 'exam') return n.category === 'teacher' || n.tag?.includes('bài tập');
    if (activeFilter === 'admin') return n.category === 'school' || n.tag?.includes('BGH');
    return true;
  });

  const getIcon = (notif) => {
    if (notif.category === 'school') return <Megaphone className="w-4 h-4 text-ocean" />;
    if (notif.tagType === 'warning') return <AlertTriangle className="w-4 h-4 text-warning-dark" />;
    if (notif.tagType === 'success') return <CheckCircle2 className="w-4 h-4 text-success" />;
    return <BookOpen className="w-4 h-4 text-primary" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4 sm:p-6 bg-black/20 backdrop-blur-[2px] animate-fadeIn">
      <div
        className="w-full max-w-md bg-white rounded-card border border-hairline shadow-popover flex flex-col max-h-[85vh] overflow-hidden animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 hairline-b bg-surface-neutral/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-sky text-primary flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Trung tâm Thông báo</h2>
              <p className="text-[11px] text-text-secondary">
                {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : 'Tất cả đã được cập nhật'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[11px] text-ocean hover:underline font-medium"
              >
                Đọc tất cả
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-hairline/50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="px-4 py-2 hairline-b bg-white flex items-center gap-1.5 overflow-x-auto text-xs">
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'unread', label: `Chưa đọc (${unreadCount})` },
            { id: 'exam', label: 'Khảo thí & Điểm' },
            { id: 'admin', label: 'Toàn trường' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-2.5 py-1 rounded text-[11px] whitespace-nowrap transition-colors ${
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
        <div className="flex-1 overflow-y-auto divide-y divide-hairline">
          {filteredNotifs.length === 0 ? (
            <div className="p-8 text-center text-xs text-text-secondary">
              Không có thông báo nào trong danh mục này.
            </div>
          ) : (
            filteredNotifs.map((n) => (
              <div
                key={n.id}
                onClick={() => markAsRead(n.id)}
                className={`p-4 transition-colors cursor-pointer text-xs space-y-1.5 ${
                  !n.isRead ? 'bg-sky/20 hover:bg-sky/30' : 'hover:bg-surface-neutral/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded bg-surface-neutral shrink-0">{getIcon(n)}</span>
                    <Badge variant={n.tagType || 'info'} size="sm">
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
                    <span className="w-2 h-2 rounded-full bg-ocean inline-block"></span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 hairline-t bg-surface-neutral/40 text-center text-[11px] text-text-secondary">
          Hệ thống đồng bộ dữ liệu thời gian thực EduPortal
        </div>
      </div>
    </div>
  );
}

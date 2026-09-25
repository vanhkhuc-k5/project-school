// =============================================================================
// Header Component — TypeScript
// =============================================================================

import React, { useState } from 'react';
import { Search, Bell, Calendar, LogOut, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext';
import { NotificationCenter } from './NotificationCenter';
import { Badge } from './Badge';

interface RoleBadgeConfig {
  [key: string]: { label: string; variant: 'info' | 'success' | 'warning' | 'neutral' | 'navy' | 'default' };
}

const roleBadgeConfig: RoleBadgeConfig = {
  student: { label: 'Học sinh', variant: 'info' },
  teacher: { label: 'Giáo viên', variant: 'success' },
  parent: { label: 'Phụ huynh', variant: 'warning' },
  admin: { label: 'Ban Giám Hiệu', variant: 'neutral' },
};

interface HeaderProps {
  searchPlaceholder?: string;
  title?: string;
  subtitle?: string;
}

export function Header({
  searchPlaceholder = 'Tìm kiếm bài học, tài liệu, bài tập...',
  title,
  subtitle,
}: HeaderProps): React.JSX.Element {
  const { currentUser, currentRole, logout } = useAuth();
  const { unreadCount, isSyncing, triggerSync } = useSync();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  return (
    <>
      <header className="h-16 bg-white hairline-b px-6 flex items-center justify-between sticky top-0 z-30">
        {/* Left title / search */}
        <div className="flex items-center gap-6 flex-1 max-w-xl">
          {title ? (
            <div>
              <h1 className="text-lg font-medium text-text-primary leading-tight">{title}</h1>
              {subtitle && <p className="text-xs text-text-secondary">{subtitle}</p>}
            </div>
          ) : (
            <label className="relative w-full max-w-xl flex-1">
              <span className="sr-only">{searchPlaceholder}</span>
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary stroke-[1.75] pointer-events-none" aria-hidden="true" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                className="w-full h-10 pl-10 pr-4 bg-surface-neutral text-sm text-text-primary placeholder:text-text-secondary rounded border border-transparent focus:border-ocean focus:bg-white focus:outline-none transition-all"
              />
            </label>
          )}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3.5">
          {/* Live Sync Status Pill */}
          <button
            type="button"
            onClick={triggerSync}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 font-medium hover:bg-emerald-100 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean/50"
            title="Nhấn để đồng bộ lại dữ liệu ngay lập tức"
            aria-label="Đồng bộ dữ liệu ngay"
          >
            <span className={`w-1.5 h-1.5 rounded-full bg-emerald-500 ${isSyncing ? 'animate-ping' : ''}`} aria-hidden="true" />
            <span>{isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ trực tiếp'}</span>
            <RefreshCw className={`w-3 h-3 text-emerald-600 ${isSyncing ? 'animate-spin' : ''}`} aria-hidden="true" />
          </button>

          {/* Notification Button */}
          <button
            onClick={() => setIsNotificationOpen(true)}
            className="relative p-2 rounded text-text-secondary hover:text-text-primary hover:bg-surface-neutral transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean/50"
            aria-label="Mở trung tâm thông báo"
          >
            <Bell className="w-5 h-5 stroke-[1.75]" aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white" aria-label={`${unreadCount} thông báo chưa đọc`}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <button
            className="p-2 rounded text-text-secondary hover:text-text-primary hover:bg-surface-neutral transition-colors hidden sm:block focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean/50"
            aria-label="Mở lịch biểu"
          >
            <Calendar className="w-5 h-5 stroke-[1.75]" aria-hidden="true" />
          </button>

          <div className="h-6 w-px bg-hairline" />

          {/* User profile */}
          <div className="flex items-center gap-3 pl-1">
            {currentUser?.avatar ? (
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-8 h-8 rounded-full object-cover border border-hairline"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-sky text-primary flex items-center justify-center font-medium text-xs">
                {currentUser?.name?.charAt(0) || 'U'}
              </div>
            )}
            <div className="hidden md:block text-left">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text-primary leading-none">
                  {currentUser?.name || 'Người dùng'}
                </span>
                {currentRole && roleBadgeConfig[currentRole] && (
                  <Badge variant={roleBadgeConfig[currentRole].variant} size="sm">
                    {roleBadgeConfig[currentRole].label}
                  </Badge>
                )}
              </div>
              <div className="text-[11px] text-text-secondary mt-1 leading-none">
                {currentUser?.class || currentUser?.department || currentUser?.title || 'Thành viên'}
              </div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 text-text-secondary hover:text-danger rounded hover:bg-danger-light transition-colors ml-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean/50"
              aria-label="Đăng xuất"
            >
              <LogOut className="w-4 h-4 stroke-[1.75]" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <NotificationCenter
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
      />
    </>
  );
}

import React, { useState } from 'react';
import { Search, Bell, Calendar, LogOut, ChevronDown, User, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext';
import { NotificationCenter } from './NotificationCenter';
import { Badge } from './Badge';

const roleBadgeConfig = {
  student: { label: 'Học sinh', variant: 'info' },
  teacher: { label: 'Giáo viên', variant: 'success' },
  parent: { label: 'Phụ huynh', variant: 'warning' },
  admin: { label: 'Ban Giám Hiệu', variant: 'neutral' },
};

export function Header({
  searchPlaceholder = 'Tìm kiếm bài học, tài liệu, bài tập...',
  title,
  subtitle,
}) {
  const { currentUser, currentRole, logout } = useAuth();
  const { unreadCount, syncStatus, isSyncing, triggerSync } = useSync();
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
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary stroke-[1.75]" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                className="w-full h-10 pl-10 pr-4 bg-surface-neutral text-sm text-text-primary placeholder:text-text-secondary rounded border border-transparent focus:border-ocean focus:bg-white focus:outline-none transition-all"
              />
            </div>
          )}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3.5">
          {/* Live Sync Status Pill */}
          <div
            onClick={triggerSync}
            className="cursor-pointer hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 font-medium hover:bg-emerald-100 transition-all"
            title="Nhấn để đồng bộ lại dữ liệu ngay lập tức"
          >
            <span className={`w-1.5 h-1.5 rounded-full bg-emerald-500 ${isSyncing ? 'animate-ping' : ''}`}></span>
            <span>{isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ trực tiếp'}</span>
            <RefreshCw className={`w-3 h-3 text-emerald-600 ${isSyncing ? 'animate-spin' : ''}`} />
          </div>

          {/* Notification Button */}
          <button
            onClick={() => setIsNotificationOpen(true)}
            className="relative p-2 rounded text-text-secondary hover:text-text-primary hover:bg-surface-neutral transition-colors"
            title="Trung tâm thông báo"
          >
            <Bell className="w-5 h-5 stroke-[1.75]" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

        {/* Calendar */}
        <button
          className="p-2 rounded text-text-secondary hover:text-text-primary hover:bg-surface-neutral transition-colors hidden sm:block"
          title="Lịch biểu"
        >
          <Calendar className="w-5 h-5 stroke-[1.75]" />
        </button>

        <div className="h-6 w-px bg-hairline"></div>

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
              {roleBadgeConfig[currentRole] && (
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
            className="p-1.5 text-text-secondary hover:text-danger rounded hover:bg-danger-light transition-colors ml-1"
            title="Đăng xuất"
          >
            <LogOut className="w-4 h-4 stroke-[1.75]" />
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

import React from 'react';
import { Search, Bell, Calendar, LogOut, ChevronDown, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Header({
  searchPlaceholder = 'Tìm kiếm bài học, tài liệu, bài tập...',
  title,
  subtitle,
}) {
  const { currentUser, currentRole, logout } = useAuth();

  return (
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
      <div className="flex items-center gap-4">
        {/* Notification */}
        <button
          className="relative p-2 rounded text-text-secondary hover:text-text-primary hover:bg-surface-neutral transition-colors"
          title="Thông báo"
        >
          <Bell className="w-5 h-5 stroke-[1.75]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full ring-2 ring-white"></span>
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
            <div className="text-sm font-medium text-text-primary leading-none">
              {currentUser?.name || 'Người dùng'}
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
  );
}

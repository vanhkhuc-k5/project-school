// =============================================================================
// CollapsibleSidebar.tsx — Modern Collapsible Navigation Sidebar
// Inspired by modern SaaS EdTech interface with expand/collapse rail support
// =============================================================================

import React from 'react';
import { LogOut, ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react';

export interface SidebarMenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  route: string;
  badge?: string;
  badgeVariant?: 'info' | 'success' | 'warning' | 'danger' | 'neutral';
}

interface CollapsibleSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  menuItems: SidebarMenuItem[];
  activeId: string;
  onNavigate: (route: string) => void;
  roleTitle?: string;
  roleBadge?: string;
  currentUser?: {
    name?: string;
    avatar?: string;
    class?: string;
    department?: string;
    role?: string;
  } | null;
  onLogout: () => void;
  isMobile?: boolean;
  onCloseMobile?: () => void;
}

export function CollapsibleSidebar({
  isCollapsed,
  onToggleCollapse,
  menuItems,
  activeId,
  onNavigate,
  roleTitle = 'Cổng Học sinh',
  currentUser,
  onLogout,
  isMobile = false,
  onCloseMobile,
}: CollapsibleSidebarProps): React.JSX.Element {
  const effectiveCollapsed = isMobile ? false : isCollapsed;

  return (
    <div className="flex flex-col h-full bg-surface-neutral border-r border-hairline select-none">
      {/* Brand Header */}
      <div className={`h-16 flex items-center border-b border-hairline bg-white shrink-0 transition-all duration-300 ${
        effectiveCollapsed ? 'px-3 justify-center' : 'px-5 justify-between'
      }`}>
        <div
          onClick={() => onNavigate(menuItems[0]?.route || '/')}
          className="flex items-center gap-3 cursor-pointer overflow-hidden"
          title="EduPortal Home"
        >
          {/* Logo mark matching modern VLearn style */}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-ocean flex items-center justify-center text-white font-black text-lg shadow-sm shrink-0">
            <span className="tracking-tighter">EP</span>
          </div>
          {!effectiveCollapsed && (
            <div className="min-w-0 transition-opacity duration-200">
              <div className="text-base font-bold text-primary tracking-tight leading-none flex items-center gap-1.5">
                <span>EduPortal</span>
              </div>
              <div className="text-[11px] text-text-secondary mt-1 font-medium leading-none truncate">
                {roleTitle}
              </div>
            </div>
          )}
        </div>

        {/* Desktop Collapse Toggle Button */}
        {!isMobile && (
          <button
            type="button"
            onClick={onToggleCollapse}
            title={effectiveCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
            aria-label={effectiveCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
            className="p-1.5 text-text-secondary hover:text-primary hover:bg-hairline/60 rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean/50"
          >
            {effectiveCollapsed ? (
              <ChevronRight className="w-4 h-4 stroke-[2]" />
            ) : (
              <ChevronLeft className="w-4 h-4 stroke-[2]" />
            )}
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav
        className="flex-1 p-2.5 space-y-1 overflow-y-auto overflow-x-hidden custom-scrollbar"
        aria-label="Điều hướng chính"
      >
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeId === item.id;

          return (
            <div key={item.id} className="relative group">
              <button
                type="button"
                onClick={() => {
                  onNavigate(item.route);
                  if (isMobile && onCloseMobile) onCloseMobile();
                }}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center rounded-lg transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean/50 ${
                  effectiveCollapsed
                    ? 'justify-center p-3'
                    : 'justify-between px-3.5 py-2.5'
                } ${
                  isActive
                    ? 'bg-white text-primary font-semibold shadow-sm border border-hairline/80'
                    : 'text-text-secondary hover:text-text-primary hover:bg-hairline/40'
                }`}
              >
                <div className={`flex items-center ${effectiveCollapsed ? 'justify-center' : 'gap-3 min-w-0'}`}>
                  <Icon
                    className={`w-5 h-5 shrink-0 stroke-[1.85] transition-colors ${
                      isActive ? 'text-ocean' : 'text-text-secondary group-hover:text-text-primary'
                    }`}
                    aria-hidden="true"
                  />
                  {!effectiveCollapsed && (
                    <span className="text-sm truncate leading-snug">{item.label}</span>
                  )}
                </div>

                {!effectiveCollapsed && item.badge && (
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                    item.badgeVariant === 'danger'
                      ? 'bg-red-500 text-white'
                      : item.badgeVariant === 'warning'
                      ? 'bg-amber-500 text-white'
                      : 'bg-ocean text-white'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>

              {/* Floating Tooltip for Collapsed State */}
              {effectiveCollapsed && (
                <div
                  role="tooltip"
                  className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-[#1B2B3A] text-white text-xs font-medium rounded-md shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 flex items-center gap-2"
                >
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="text-[10px] bg-ocean text-white px-1.5 py-0.2 rounded-full">
                      {item.badge}
                    </span>
                  )}
                  {/* Tooltip arrow */}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#1B2B3A]" />
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom Profile Info */}
      <div className="p-3 border-t border-hairline bg-white/60 shrink-0">
        <div className={`flex items-center transition-all duration-300 ${
          effectiveCollapsed ? 'flex-col gap-2 justify-center py-1' : 'justify-between gap-2 p-2 bg-white rounded-xl border border-hairline'
        }`}>
          <div
            className={`flex items-center gap-2.5 overflow-hidden cursor-pointer ${
              effectiveCollapsed ? 'justify-center' : 'min-w-0'
            }`}
            title={currentUser?.name || 'Tài khoản'}
          >
            {currentUser?.avatar ? (
              <img
                src={currentUser.avatar}
                alt=""
                aria-hidden="true"
                className="w-8 h-8 rounded-full object-cover border border-hairline shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                {currentUser?.name?.trim().charAt(0)?.toUpperCase() || 'U'}
              </div>
            )}

            {!effectiveCollapsed && (
              <div className="min-w-0">
                <div className="text-xs font-semibold text-text-primary leading-tight truncate">
                  {currentUser?.name || 'Người dùng'}
                </div>
                <div className="text-[11px] text-text-secondary mt-0.5 truncate">
                  {currentUser?.class || currentUser?.department || 'Thành viên'}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onLogout}
            title="Đăng xuất"
            aria-label="Đăng xuất"
            className="p-1.5 text-text-secondary hover:text-danger rounded-md hover:bg-danger-light transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean/50 shrink-0"
          >
            <LogOut className="w-4 h-4 stroke-[1.85]" />
          </button>
        </div>
      </div>
    </div>
  );
}

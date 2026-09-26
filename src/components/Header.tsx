// =============================================================================
// Header Component — Modern SaaS Design inspired by VLearn Reference
// Features: Top navigation tabs, Language pill, Dark mode toggle, Notifications,
//           User initial avatar, Search, and Live Sync indicator
// =============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  Bell,
  Calendar,
  LogOut,
  RefreshCw,
  Home,
  BookOpen,
  Dumbbell,
  FlaskConical,
  Moon,
  Sun,
  User,
  Settings,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext';
import { NotificationCenter } from './NotificationCenter';
import { Badge } from './Badge';

interface HeaderProps {
  searchPlaceholder?: string;
  title?: string;
  subtitle?: string;
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
}

export function Header({
  searchPlaceholder = 'Tìm kiếm khóa học, bài học, tài liệu...',
  title,
  subtitle,
}: HeaderProps): React.JSX.Element {
  const { currentUser, currentRole, logout } = useAuth();
  const { unreadCount, isSyncing, triggerSync } = useSync();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState<'VI' | 'EN'>('VI');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Determine top navigation links based on active role
  const getNavLinks = () => {
    if (currentRole === 'teacher') {
      return [
        { label: 'Trang chủ', route: '/teacher/dashboard', icon: Home },
        { label: 'Lớp học', route: '/teacher/classes', icon: BookOpen },
        { label: 'Chấm bài', route: '/teacher/assignments', icon: Dumbbell },
        { label: 'Phân tích', route: '/teacher/analytics', icon: FlaskConical, badge: 'Mới' },
      ];
    }
    if (currentRole === 'parent') {
      return [
        { label: 'Trang chủ', route: '/parent/dashboard', icon: Home },
        { label: 'Bảng điểm', route: '/parent/grades', icon: BookOpen },
        { label: 'Học phí VietQR', route: '/parent/tuition', icon: Dumbbell },
        { label: 'Đơn nghỉ', route: '/parent/leave', icon: FlaskConical },
      ];
    }
    if (currentRole === 'admin') {
      return [
        { label: 'Tổng quan', route: '/admin/dashboard', icon: Home },
        { label: 'Học sinh', route: '/admin/students', icon: BookOpen },
        { label: 'Giáo viên', route: '/admin/teachers', icon: Dumbbell },
        { label: 'Báo cáo', route: '/admin/reports', icon: FlaskConical },
      ];
    }
    // Default: Student
    return [
      { label: 'Trang chủ', route: '/student/dashboard', icon: Home },
      { label: 'Khóa học', route: '/student/assignments', icon: BookOpen },
      { label: 'Luyện tập', route: '/student/resources', icon: Dumbbell, badge: 'Sắp ra mắt' },
      { label: 'Lab & AI', route: '/student/ai-tutor', icon: FlaskConical, badge: 'Mới', hasDropdown: true },
    ];
  };

  const navLinks = getNavLinks();

  const getInitial = (name?: string) => {
    if (!name) return 'K';
    const parts = name.trim().split(' ');
    return parts[parts.length - 1].charAt(0).toUpperCase();
  };

  return (
    <>
      <header className="h-16 bg-white border-b border-hairline px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        {/* Left Section: Optional Page Title or Horizontal Top Nav */}
        <div className="flex items-center gap-6 min-w-0">
          {title ? (
            <div>
              <h1 className="text-base sm:text-lg font-bold text-text-primary leading-tight truncate">{title}</h1>
              {subtitle && <p className="text-xs text-text-secondary truncate">{subtitle}</p>}
            </div>
          ) : (
            /* Top Navigation matching reference image */
            <nav className="hidden md:flex items-center gap-1 sm:gap-2">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname.startsWith(link.route);

                return (
                  <button
                    key={link.route}
                    type="button"
                    onClick={() => navigate(link.route)}
                    className={`relative flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-primary font-bold'
                        : 'text-text-secondary hover:text-text-primary hover:bg-hairline/40'
                    }`}
                  >
                    <Icon className={`w-4 h-4 stroke-[2] ${isActive ? 'text-ocean' : 'text-text-secondary'}`} />
                    <span>{link.label}</span>

                    {link.badge && (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                        link.badge === 'Mới' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-ocean/10 text-ocean'
                      }`}>
                        {link.badge}
                      </span>
                    )}

                    {link.hasDropdown && (
                      <ChevronDown className="w-3 h-3 text-text-secondary -ml-1" />
                    )}

                    {/* Active Bottom Red/Brand Indicator Line as in reference image */}
                    {isActive && (
                      <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-red-600 rounded-full" />
                    )}
                  </button>
                );
              })}
            </nav>
          )}
        </div>

        {/* Right Section: Utilities & Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Search Trigger */}
          <div className="relative">
            {isSearchOpen ? (
              <div className="flex items-center bg-surface-neutral rounded-lg px-2.5 py-1 border border-ocean">
                <Search className="w-4 h-4 text-ocean shrink-0 mr-2" />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  autoFocus
                  onBlur={() => setIsSearchOpen(false)}
                  className="bg-transparent text-xs text-text-primary outline-none w-44 sm:w-60"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                title="Tìm kiếm"
                className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-neutral rounded-lg transition-colors"
              >
                <Search className="w-4 h-4 stroke-[2]" />
              </button>
            )}
          </div>

          {/* Live Sync Status */}
          <button
            type="button"
            onClick={triggerSync}
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 font-medium hover:bg-emerald-100 transition-all cursor-pointer"
            title="Đồng bộ dữ liệu"
          >
            <span className={`w-1.5 h-1.5 rounded-full bg-emerald-500 ${isSyncing ? 'animate-ping' : ''}`} />
            <span>{isSyncing ? 'Đang đồng bộ...' : 'Trực tiếp'}</span>
            <RefreshCw className={`w-3 h-3 text-emerald-600 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>

          {/* Language Switcher Pill: EN | VI (Matching Reference Image) */}
          <div className="flex items-center bg-surface-neutral rounded-lg p-0.5 border border-hairline text-xs font-semibold">
            <button
              type="button"
              onClick={() => setCurrentLang('EN')}
              className={`px-2 py-0.5 rounded transition-all ${
                currentLang === 'EN'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setCurrentLang('VI')}
              className={`px-2 py-0.5 rounded transition-all ${
                currentLang === 'VI'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              VI
            </button>
          </div>

          {/* Dark Mode Toggle */}
          <button
            type="button"
            onClick={() => setIsDarkMode(!isDarkMode)}
            title={isDarkMode ? 'Chế độ sáng' : 'Chế độ tối'}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-neutral rounded-lg transition-colors"
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-amber-500 stroke-[2]" />
            ) : (
              <Moon className="w-4 h-4 stroke-[2]" />
            )}
          </button>

          {/* Notification Button */}
          <button
            type="button"
            onClick={() => setIsNotificationOpen(true)}
            className="relative p-2 text-text-secondary hover:text-text-primary hover:bg-surface-neutral rounded-lg transition-colors"
            title="Thông báo"
            aria-label="Mở trung tâm thông báo"
          >
            <Bell className="w-4 h-4 stroke-[2]" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Vertical Divider */}
          <div className="h-5 w-px bg-hairline mx-0.5" />

          {/* User Profile Avatar Circle (Matching Reference Image "[K]") */}
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-ocean/30 transition-all focus:outline-none"
              aria-expanded={isUserMenuOpen}
              aria-haspopup="true"
            >
              {currentUser?.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name || 'User'}
                  className="w-8 h-8 rounded-full object-cover border border-hairline shadow-xs"
                />
              ) : (
                /* Sleek circle avatar with initial e.g. "K" */
                <div className="w-8 h-8 rounded-full bg-[#0F3D5C] text-white flex items-center justify-center font-bold text-xs tracking-tight shadow-xs hover:bg-[#1C6FA8] transition-colors">
                  {getInitial(currentUser?.name)}
                </div>
              )}
            </button>

            {/* User Dropdown Menu */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-popover border border-hairline py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-2.5 border-b border-hairline">
                  <div className="text-sm font-bold text-text-primary truncate">
                    {currentUser?.name || 'Người dùng'}
                  </div>
                  <div className="text-xs text-text-secondary mt-0.5 truncate">
                    {currentUser?.email || 'user@school.edu.vn'}
                  </div>
                  <div className="mt-1.5">
                    <Badge variant="info" size="sm">
                      {currentRole === 'teacher' ? 'Giáo viên' : currentRole === 'parent' ? 'Phụ huynh' : currentRole === 'admin' ? 'Quản trị viên' : 'Học sinh'}
                    </Badge>
                  </div>
                </div>

                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      if (currentRole === 'student') navigate('/student/dashboard');
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-text-primary hover:bg-surface-neutral transition-colors text-left"
                  >
                    <User className="w-3.5 h-3.5 text-text-secondary" />
                    <span>Hồ sơ cá nhân</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      if (currentRole === 'student') navigate('/student/timetable');
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-text-primary hover:bg-surface-neutral transition-colors text-left"
                  >
                    <Calendar className="w-3.5 h-3.5 text-text-secondary" />
                    <span>Lịch biểu & Thời khóa biểu</span>
                  </button>
                </div>

                <div className="border-t border-hairline pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      logout();
                      navigate('/login');
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors text-left font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5 text-red-600" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              </div>
            )}
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

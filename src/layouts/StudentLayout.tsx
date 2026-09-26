// =============================================================================
// StudentLayout — Full-Width Top-Navigation & SaaS Learning Layout
// Features: Full-width sticky top navigation, Global broadcast banner,
//           Mobile slide-out drawer, 100% responsive without left sidebar
// =============================================================================

import React, { useState, useEffect, type ReactNode, Suspense } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  Home,
  BookOpen,
  Layers,
  Award,
  Sparkles,
  Calendar,
  UserCheck,
  Bell,
  X,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/Header';
import { GlobalBroadcastBanner } from '../components/GlobalBroadcastBanner';

// Mobile menu hook
function useMobileMenu(): { isOpen: boolean; toggle: () => void; close: () => void } {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 1024) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return {
    isOpen,
    toggle: () => setIsOpen((prev) => !prev),
    close: () => setIsOpen(false),
  };
}

export function StudentLayout(): ReactNode {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isOpen: isMobileMenuOpen, toggle: toggleMobileMenu, close: closeMobileMenu } = useMobileMenu();

  const menuItems = [
    { id: 'home', label: 'Trang chủ', icon: Home, route: '/student/dashboard' },
    { id: 'assignments', label: 'Khóa học & Bài tập', icon: BookOpen, route: '/student/assignments' },
    { id: 'timetable', label: 'Thời khóa biểu', icon: Calendar, route: '/student/timetable' },
    { id: 'grades', label: 'Điểm số & Học bạ', icon: Award, route: '/student/grades' },
    { id: 'resources', label: 'Kho học liệu', icon: Layers, route: '/student/resources' },
    { id: 'ai-tutor', label: 'Gia sư AI', icon: Sparkles, route: '/student/ai-tutor', badge: 'Mới' },
    { id: 'attendance', label: 'Chuyên cần', icon: UserCheck, route: '/student/attendance' },
    { id: 'announcements', label: 'Thông báo', icon: Bell, route: '/student/announcements' },
  ];

  const handleNavigation = (route: string): void => {
    navigate(route);
    closeMobileMenu();
  };

  const handleLogout = async (): Promise<void> => {
    closeMobileMenu();
    await logout();
    navigate('/login');
  };

  const getInitial = (name?: string) => {
    if (!name) return 'K';
    const parts = name.trim().split(' ');
    return parts[parts.length - 1].charAt(0).toUpperCase();
  };

  return (
    <>
      {/* Skip to main content link for WCAG Accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-primary focus:rounded focus:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean"
      >
        Chuyển đến nội dung chính
      </a>

      <div className="min-h-screen flex flex-col bg-[#F8F9FB] w-full">
        {/* Dải thông báo toàn trường (Global Broadcast Banner) trải dài 100% */}
        <GlobalBroadcastBanner />

        {/* Header Full-Width Chuẩn VLearn Top-Nav */}
        <Header
          showLogo={true}
          logoHref="/student/dashboard"
          onToggleMobileMenu={toggleMobileMenu}
          isMobileMenuOpen={isMobileMenuOpen}
        />

        {/* Mobile Slide-Out Drawer Overlay */}
        {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 transition-opacity animate-fade-in"
              onClick={closeMobileMenu}
              aria-hidden="true"
            />

            {/* Mobile Drawer */}
            <aside
              className="relative w-72 sm:w-80 bg-white h-full shadow-2xl flex flex-col justify-between z-10 animate-in slide-in-from-left duration-200 border-r border-hairline"
              role="dialog"
              aria-modal="true"
              aria-label="Menu điều hướng học sinh"
            >
              <div className="flex flex-col flex-1 min-h-0">
                {/* Drawer Header */}
                <div className="h-16 px-5 border-b border-hairline flex items-center justify-between shrink-0 bg-white">
                  <button
                    type="button"
                    onClick={() => handleNavigation('/student/dashboard')}
                    className="flex items-center gap-2.5 text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean rounded-lg"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-ocean flex items-center justify-center text-white font-black text-sm shadow-xs">
                      <span className="tracking-tighter">EP</span>
                    </div>
                    <div>
                      <div className="text-base font-extrabold text-primary tracking-tight leading-none">
                        EduPortal
                      </div>
                      <div className="text-[10px] text-text-secondary mt-1 font-medium leading-none">
                        Cổng Học sinh
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={closeMobileMenu}
                    className="p-1.5 text-text-secondary hover:text-text-primary rounded-lg hover:bg-surface-neutral transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean"
                    aria-label="Đóng menu"
                  >
                    <X className="w-5 h-5 stroke-[2]" />
                  </button>
                </div>

                {/* User Profile Snippet in Drawer */}
                <div className="p-4 mx-3 my-3 bg-surface-neutral rounded-xl border border-hairline flex items-center gap-3 shrink-0">
                  {currentUser?.avatar ? (
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.name || 'Học sinh'}
                      className="w-9 h-9 rounded-full object-cover border border-hairline shadow-xs shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-[#0F3D5C] text-white flex items-center justify-center font-bold text-xs tracking-tight shadow-xs shrink-0">
                      {getInitial(currentUser?.name)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-text-primary truncate">
                      {currentUser?.name || 'Học sinh'}
                    </div>
                    <div className="text-[11px] text-text-secondary truncate mt-0.5">
                      {currentUser?.email || 'student@school.edu.vn'}
                    </div>
                  </div>
                </div>

                {/* Navigation Items */}
                <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                    Phân hệ học tập
                  </div>
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.route === '/student/dashboard'
                      ? (location.pathname === '/student/dashboard' || location.pathname === '/student')
                      : location.pathname.startsWith(item.route);

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleNavigation(item.route)}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors text-left cursor-pointer ${
                          isActive
                            ? 'bg-sky text-primary font-bold border-l-4 border-primary'
                            : 'text-text-secondary hover:text-text-primary hover:bg-surface-neutral'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon className={`w-4 h-4 stroke-[2] shrink-0 ${isActive ? 'text-primary' : 'text-text-secondary'}`} />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 shrink-0">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Drawer Footer / Logout */}
              <div className="p-4 border-t border-hairline bg-surface-neutral/50">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4 stroke-[2]" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* Main Content Area — Trải rộng không gian ngang với đệm max-w-[1440px] */}
        <main
          id="main-content"
          className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto focus:outline-none"
          tabIndex={-1}
        >
          <Suspense
            fallback={
              <div className="min-h-[400px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-4 border-ocean/30 border-t-ocean rounded-full animate-spin" />
                  <span className="text-sm text-text-secondary">Đang tải...</span>
                </div>
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
    </>
  );
}

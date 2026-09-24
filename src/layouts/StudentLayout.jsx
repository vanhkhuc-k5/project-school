// =============================================================================
// StudentLayout — G42 Responsive & Accessibility
// Student portal layout with keyboard navigation and mobile support
// =============================================================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Home, BookOpen, Layers, Award, Sparkles, LogOut, Calendar, UserCheck, Bell, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/Header';
import { GlobalBroadcastBanner } from '../components/GlobalBroadcastBanner';

// Map of routes to menu IDs
const ROUTE_TO_ID = {
  '/student/dashboard': 'home',
  '/student/timetable': 'timetable',
  '/student/assignments': 'assignments',
  '/student/attendance': 'attendance',
  '/student/grades': 'grades',
  '/student/resources': 'resources',
  '/student/announcements': 'announcements',
  '/student/ai-tutor': 'ai-tutor',
};

// Active route detection
function useActiveRoute() {
  const location = useLocation();
  return ROUTE_TO_ID[location.pathname] || 'home';
}

// Mobile menu hook
function useMobileMenu() {
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

  return { isOpen, toggle: () => setIsOpen(!isOpen), close: () => setIsOpen(false) };
}

export function StudentLayout() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const activeTab = useActiveRoute();
  const { isOpen: isMobileMenuOpen, toggle: toggleMobileMenu, close: closeMobileMenu } = useMobileMenu();

  const menuItems = [
    { id: 'home', label: 'Trang chủ', icon: Home, route: '/student/dashboard' },
    { id: 'timetable', label: 'Thời khóa biểu', icon: Calendar, route: '/student/timetable' },
    { id: 'assignments', label: 'Bài tập', icon: BookOpen, route: '/student/assignments' },
    { id: 'attendance', label: 'Chuyên cần', icon: UserCheck, route: '/student/attendance' },
    { id: 'grades', label: 'Điểm số', icon: Award, route: '/student/grades' },
    { id: 'resources', label: 'Kho học liệu', icon: Layers, route: '/student/resources' },
    { id: 'announcements', label: 'Thông báo', icon: Bell, route: '/student/announcements' },
    { id: 'ai-tutor', label: 'Gia sư AI', icon: Sparkles, route: '/student/ai-tutor', badge: 'AI Mới' },
  ];

  const handleNavigation = (route) => {
    navigate(route);
    closeMobileMenu();
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Sidebar content (shared between desktop and mobile)
  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center gap-3 hairline-b bg-white shrink-0">
        <img src="/assets/logo.png" alt="EduPortal Logo" className="w-8 h-8 object-contain" />
        <div>
          <div className="text-base font-medium text-primary tracking-tight leading-none">EduPortal</div>
          <div className="text-[11px] text-text-secondary mt-1 leading-none">Cổng Học sinh</div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto" aria-label="Điều hướng chính">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.route)}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean/50 ${
                isActive
                  ? 'bg-sky text-primary font-medium'
                  : 'text-text-secondary hover:text-text-primary hover:bg-hairline/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 stroke-[1.75] ${isActive ? 'text-primary' : 'text-text-secondary'}`} aria-hidden="true" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-pill bg-ocean text-white">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom profile info */}
      <div className="p-3 border-t border-hairline shrink-0">
        <div className="p-3 bg-white rounded-card border border-hairline flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src={currentUser?.avatar || '/assets/student_avatar.png'}
              alt=""
              aria-hidden="true"
              className="w-9 h-9 rounded-full object-cover border border-hairline"
            />
            <div>
              <div className="text-xs font-medium text-text-primary leading-tight">
                {currentUser?.name || 'Nguyễn Minh Khang'}
              </div>
              <div className="text-[11px] text-text-secondary mt-0.5">
                {currentUser?.class || 'Lớp 11A1 • K52'}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Đăng xuất"
            aria-label="Đăng xuất"
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-text-secondary hover:text-danger rounded hover:bg-danger-light transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean/50"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Skip to main content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-primary focus:rounded focus:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean"
      >
        Chuyển đến nội dung chính
      </a>

      <div className="min-h-screen flex bg-[#F8F9FB]">
        {/* Desktop Sidebar */}
        <aside
          className="hidden lg:flex w-64 bg-surface-neutral flex-col justify-between shrink-0"
          aria-label="Thanh điều hướng"
        >
          <SidebarContent />
        </aside>

        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <div
              className="lg:hidden fixed inset-0 bg-black/50 z-40"
              onClick={closeMobileMenu}
              aria-hidden="true"
            />
            
            {/* Mobile Sidebar */}
            <aside
              className="lg:hidden fixed inset-y-0 left-0 w-72 bg-surface-neutral z-50 shadow-xl"
              aria-label="Menu điều hướng"
            >
              <SidebarContent />
            </aside>
          </>
        )}

        {/* Mobile Header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-hairline">
          <div className="flex items-center justify-between h-14 px-4">
            <button
              onClick={toggleMobileMenu}
              className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-text-secondary hover:text-text-primary rounded hover:bg-surface-neutral transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean/50"
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label={isMobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
            
            <div className="flex items-center gap-2">
              <img src="/assets/logo.png" alt="EduPortal Logo" className="w-7 h-7" />
              <span className="font-medium text-primary">EduPortal</span>
            </div>
            
            <div className="w-11" /> {/* Spacer for centering */}
          </div>
        </div>

        {/* Main Container */}
        <div className="flex-1 flex flex-col min-w-0 pt-14 lg:pt-0">
          <GlobalBroadcastBanner />
          <Header />
          <main
            id="main-content"
            className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto focus:outline-none"
            tabIndex={-1}
          >
            <Outlet />
          </main>
        </div>
      </div>
    </>
  );
}

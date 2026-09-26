// =============================================================================
// StudentLayout — Modern Collapsible Sidebar & SaaS Navigation
// Features: Collapsible desktop sidebar (rail/expanded), mobile drawer, keyboard accessible
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
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/Header';
import { GlobalBroadcastBanner } from '../components/GlobalBroadcastBanner';
import { CollapsibleSidebar, type SidebarMenuItem } from '../components/CollapsibleSidebar';

// Map of routes to menu IDs
const ROUTE_TO_ID: Record<string, string> = {
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
function useActiveRoute(): string {
  const location = useLocation();
  return ROUTE_TO_ID[location.pathname] || 'home';
}

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

  return {
    isOpen,
    toggle: () => setIsOpen(!isOpen),
    close: () => setIsOpen(false),
  };
}

export function StudentLayout(): ReactNode {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const activeTab = useActiveRoute();
  const { isOpen: isMobileMenuOpen, toggle: toggleMobileMenu, close: closeMobileMenu } = useMobileMenu();

  // Collapsible sidebar state with localStorage persistence
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('eduportal_sidebar_collapsed') === 'true';
  });

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('eduportal_sidebar_collapsed', String(next));
      return next;
    });
  };

  const menuItems: SidebarMenuItem[] = [
    { id: 'home', label: 'Trang chủ', icon: Home, route: '/student/dashboard' },
    { id: 'timetable', label: 'Thời khóa biểu', icon: Calendar, route: '/student/timetable' },
    { id: 'assignments', label: 'Khóa học & Bài tập', icon: BookOpen, route: '/student/assignments' },
    { id: 'attendance', label: 'Chuyên cần', icon: UserCheck, route: '/student/attendance' },
    { id: 'grades', label: 'Điểm số & Học bạ', icon: Award, route: '/student/grades' },
    { id: 'resources', label: 'Kho học liệu', icon: Layers, route: '/student/resources' },
    { id: 'announcements', label: 'Thông báo', icon: Bell, route: '/student/announcements' },
    { id: 'ai-tutor', label: 'Gia sư AI', icon: Sparkles, route: '/student/ai-tutor', badge: 'Mới' },
  ];

  const handleNavigation = (route: string): void => {
    navigate(route);
    closeMobileMenu();
  };

  const handleLogout = async (): Promise<void> => {
    await logout();
    navigate('/login');
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

      <div className="min-h-screen flex bg-[#F8F9FB]">
        {/* Desktop Collapsible Sidebar */}
        <aside
          className={`hidden lg:flex flex-col justify-between shrink-0 transition-all duration-300 ease-in-out ${
            isSidebarCollapsed ? 'w-20' : 'w-64'
          }`}
          aria-label="Thanh điều hướng"
        >
          <CollapsibleSidebar
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={toggleSidebarCollapse}
            menuItems={menuItems}
            activeId={activeTab}
            onNavigate={handleNavigation}
            roleTitle="Cổng Học sinh"
            currentUser={currentUser}
            onLogout={handleLogout}
          />
        </aside>

        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <div
              className="lg:hidden fixed inset-0 bg-black/50 z-40 animate-fade-in"
              onClick={closeMobileMenu}
              aria-hidden="true"
            />

            {/* Mobile Drawer */}
            <aside
              className="lg:hidden fixed inset-y-0 left-0 w-72 z-50 shadow-2xl animate-in slide-in-from-left duration-200"
              aria-label="Menu điều hướng"
            >
              <CollapsibleSidebar
                isCollapsed={false}
                onToggleCollapse={() => {}}
                menuItems={menuItems}
                activeId={activeTab}
                onNavigate={handleNavigation}
                roleTitle="Cổng Học sinh"
                currentUser={currentUser}
                onLogout={handleLogout}
                isMobile={true}
                onCloseMobile={closeMobileMenu}
              />
            </aside>
          </>
        )}

        {/* Mobile Header Bar */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-hairline">
          <div className="flex items-center justify-between h-14 px-4">
            <button
              onClick={toggleMobileMenu}
              className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-text-secondary hover:text-text-primary rounded hover:bg-surface-neutral transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean/50"
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label={isMobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-ocean flex items-center justify-center text-white font-bold text-sm">
                EP
              </div>
              <span className="font-bold text-primary tracking-tight">EduPortal</span>
            </div>

            <div className="w-11" />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 pt-14 lg:pt-0">
          <GlobalBroadcastBanner />
          <Header onToggleSidebar={toggleSidebarCollapse} isSidebarCollapsed={isSidebarCollapsed} />
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
      </div>
    </>
  );
}

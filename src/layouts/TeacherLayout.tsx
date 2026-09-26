// =============================================================================
// TeacherLayout — Modern Collapsible Sidebar & SaaS Navigation
// Teacher portal layout with keyboard navigation and collapsible sidebar
// =============================================================================

import React, { useState, useEffect, type ReactNode, Suspense } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  BarChart2,
  FileText,
  Calendar,
  MessageSquare,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/Header';
import { GlobalBroadcastBanner } from '../components/GlobalBroadcastBanner';
import { CollapsibleSidebar, type SidebarMenuItem } from '../components/CollapsibleSidebar';

// Map of routes to menu IDs
const ROUTE_TO_ID: Record<string, string> = {
  '/teacher/dashboard': 'overview',
  '/teacher/schedule': 'schedule',
  '/teacher/classes': 'classes',
  '/teacher/assignments': 'assignments',
  '/teacher/messages': 'messages',
  '/teacher/analytics': 'analytics',
  '/teacher/reports': 'reports',
};

// Active route detection
function useActiveRoute(): string {
  const location = useLocation();
  return ROUTE_TO_ID[location.pathname] || 'overview';
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

export function TeacherLayout(): ReactNode {
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
    { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard, route: '/teacher/dashboard' },
    { id: 'schedule', label: 'Lịch giảng dạy', icon: Calendar, route: '/teacher/schedule' },
    { id: 'classes', label: 'Lớp học & Sổ đầu bài', icon: Users, route: '/teacher/classes' },
    { id: 'assignments', label: 'Bài tập & Chấm điểm', icon: ClipboardCheck, route: '/teacher/assignments' },
    { id: 'messages', label: 'Tin nhắn', icon: MessageSquare, route: '/teacher/messages' },
    { id: 'analytics', label: 'Phân tích phổ điểm', icon: BarChart2, route: '/teacher/analytics' },
    { id: 'reports', label: 'Báo cáo chất lượng', icon: FileText, route: '/teacher/reports' },
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
          aria-label="Thanh điều hướng giáo viên"
        >
          <CollapsibleSidebar
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={toggleSidebarCollapse}
            menuItems={menuItems}
            activeId={activeTab}
            onNavigate={handleNavigation}
            roleTitle="Cổng Giáo viên"
            currentUser={currentUser}
            onLogout={handleLogout}
          />
        </aside>

        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <>
            <div
              className="lg:hidden fixed inset-0 bg-black/50 z-40 animate-fade-in"
              onClick={closeMobileMenu}
              aria-hidden="true"
            />

            <aside
              className="lg:hidden fixed inset-y-0 left-0 w-72 z-50 shadow-2xl animate-in slide-in-from-left duration-200"
              aria-label="Menu điều hướng giáo viên"
            >
              <CollapsibleSidebar
                isCollapsed={false}
                onToggleCollapse={() => {}}
                menuItems={menuItems}
                activeId={activeTab}
                onNavigate={handleNavigation}
                roleTitle="Cổng Giáo viên"
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
              aria-label={isMobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-ocean flex items-center justify-center text-white font-bold text-sm">
                EP
              </div>
              <span className="font-bold text-primary tracking-tight">EduPortal Giáo viên</span>
            </div>

            <div className="w-11" />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 pt-14 lg:pt-0">
          <GlobalBroadcastBanner />
          <Header
            searchPlaceholder="Tìm kiếm học sinh, bài giảng, chuyên đề..."
            onToggleSidebar={toggleSidebarCollapse}
            isSidebarCollapsed={isSidebarCollapsed}
          />
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

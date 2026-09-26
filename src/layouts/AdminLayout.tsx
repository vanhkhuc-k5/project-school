// =============================================================================
// AdminLayout — Modern Collapsible Sidebar & SaaS Navigation
// Executive & System Admin portal layout with collapsible sidebar
// =============================================================================

import React, { useState, useEffect, type ReactNode, Suspense } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  BarChart2,
  Users,
  BookOpen,
  Award,
  FileText,
  Shield,
  Settings,
  Bell,
  Clock,
  UserCheck,
  MessageSquare,
  Database,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/Header';
import { GlobalBroadcastBanner } from '../components/GlobalBroadcastBanner';
import { CollapsibleSidebar, type SidebarMenuItem } from '../components/CollapsibleSidebar';

const ROUTE_TO_ID: Record<string, string> = {
  '/admin': 'overview',
  '/admin/dashboard': 'overview',
  '/admin/overview': 'overview',
  '/admin/academic': 'academic',
  '/admin/teachers': 'teachers',
  '/admin/students': 'students',
  '/admin/attendance': 'attendance',
  '/admin/assessment': 'assessment',
  '/admin/parents': 'parents',
  '/admin/communication': 'communication',
  '/admin/reports': 'reports',
  '/admin/data': 'data',
  '/admin/announcements': 'announcements',
  '/admin/system': 'system',
  '/admin/roles': 'system',
  '/admin/settings': 'system',
};

function useActiveRoute(): string {
  const location = useLocation();
  const path = location.pathname;
  for (const [route, id] of Object.entries(ROUTE_TO_ID)) {
    if (path === route || path.startsWith(route + '/')) return id;
  }
  return 'overview';
}

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

export function AdminLayout(): ReactNode {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const activeTab = useActiveRoute();
  const { isOpen: isMobileMenuOpen, toggle: toggleMobileMenu, close: closeMobileMenu } = useMobileMenu();

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
    { id: 'overview', label: 'Tổng quan toàn trường', icon: BarChart2, route: '/admin/dashboard' },
    { id: 'announcements', label: 'Quản lý Thông báo', icon: Bell, route: '/admin/announcements' },
    { id: 'academic', label: 'Cấu trúc học vụ', icon: BookOpen, route: '/admin/academic' },
    { id: 'teachers', label: 'Quản lý giáo viên', icon: Users, route: '/admin/teachers' },
    { id: 'students', label: 'Học sinh & Điểm số', icon: Award, route: '/admin/students' },
    { id: 'attendance', label: 'Chuyên cần toàn trường', icon: Clock, route: '/admin/attendance' },
    { id: 'assessment', label: 'Khảo thí & Kỳ thi', icon: Award, route: '/admin/assessment' },
    { id: 'parents', label: 'Phụ huynh học sinh', icon: UserCheck, route: '/admin/parents' },
    { id: 'communication', label: 'Kênh liên lạc', icon: MessageSquare, route: '/admin/communication' },
    { id: 'reports', label: 'Báo cáo & Thống kê', icon: FileText, route: '/admin/reports' },
    { id: 'data', label: 'Dữ liệu & Import/Export', icon: Database, route: '/admin/data' },
    { id: 'system', label: 'Hệ thống & An ninh', icon: Shield, route: '/admin/system' },
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
        {/* Desktop Sidebar */}
        <aside
          className={`hidden lg:flex flex-col justify-between shrink-0 transition-all duration-300 ease-in-out ${
            isSidebarCollapsed ? 'w-20' : 'w-64'
          }`}
          aria-label="Thanh điều hướng Ban Giám Hiệu"
        >
          <CollapsibleSidebar
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={toggleSidebarCollapse}
            menuItems={menuItems}
            activeId={activeTab}
            onNavigate={handleNavigation}
            roleTitle="Ban Giám Hiệu & Quản trị"
            currentUser={currentUser}
            onLogout={handleLogout}
          />
        </aside>

        {/* Mobile Sidebar */}
        {isMobileMenuOpen && (
          <>
            <div
              className="lg:hidden fixed inset-0 bg-black/50 z-40 animate-fade-in"
              onClick={closeMobileMenu}
              aria-hidden="true"
            />

            <aside
              className="lg:hidden fixed inset-y-0 left-0 w-72 z-50 shadow-2xl animate-in slide-in-from-left duration-200"
              aria-label="Menu điều hướng quản trị"
            >
              <CollapsibleSidebar
                isCollapsed={false}
                onToggleCollapse={() => {}}
                menuItems={menuItems}
                activeId={activeTab}
                onNavigate={handleNavigation}
                roleTitle="Ban Giám Hiệu & Quản trị"
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
              <span className="font-bold text-primary tracking-tight">EduPortal BGH</span>
            </div>

            <div className="w-11" />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 pt-14 lg:pt-0">
          <GlobalBroadcastBanner />
          <Header
            searchPlaceholder="Tìm hồ sơ học sinh, giáo viên, báo cáo học vụ..."
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

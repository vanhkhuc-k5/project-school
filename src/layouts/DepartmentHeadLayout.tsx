// =============================================================================
// DepartmentHeadLayout — Modern Collapsible Sidebar & SaaS Navigation
// Department Head Portal layout with specialized navigation
// =============================================================================

import React, { useState, useEffect, type ReactNode, Suspense } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  ClipboardCheck,
  BarChart3,
  Users,
  FileCheck,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/Header';
import { GlobalBroadcastBanner } from '../components/GlobalBroadcastBanner';
import { CollapsibleSidebar, type SidebarMenuItem } from '../components/CollapsibleSidebar';

// Map of routes to menu IDs
const ROUTE_TO_ID: Record<string, string> = {
  '/department': 'dashboard',
  '/department/dashboard': 'dashboard',
  '/department/curriculum': 'curriculum',
  '/department/lesson-plans': 'lesson-plans',
  '/department/assessments': 'assessments',
  '/department/team': 'team',
  '/department/reports': 'reports',
};

function useActiveRoute(): string {
  const location = useLocation();
  if (ROUTE_TO_ID[location.pathname]) {
    return ROUTE_TO_ID[location.pathname];
  }
  const pathSegments = location.pathname.split('/');
  if (pathSegments[1] === 'department') {
    const subPath = pathSegments[2] || '';
    if (subPath === 'curriculum') return 'curriculum';
    if (subPath === 'lesson-plans') return 'lesson-plans';
    if (subPath === 'assessments') return 'assessments';
    if (subPath === 'team') return 'team';
    if (subPath === 'reports') return 'reports';
  }
  return 'dashboard';
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

  return { isOpen, toggle: () => setIsOpen(!isOpen), close: () => setIsOpen(false) };
}

export function DepartmentHeadLayout(): ReactNode {
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

  const handleLogout = async (): Promise<void> => {
    await logout();
    navigate('/login');
  };

  const menuItems: SidebarMenuItem[] = [
    { id: 'dashboard', label: 'Tổng quan Tổ Bộ Môn', icon: LayoutDashboard, route: '/department/dashboard' },
    { id: 'curriculum', label: 'Khung Chương Trình', icon: BookOpen, route: '/department/curriculum' },
    { id: 'lesson-plans', label: 'Duyệt Kế Hoạch', icon: ClipboardCheck, route: '/department/lesson-plans' },
    { id: 'assessments', label: 'Khảo Thí', icon: BarChart3, route: '/department/assessments' },
    { id: 'team', label: 'Quản lý Tổ', icon: Users, route: '/department/team' },
    { id: 'reports', label: 'Báo cáo Bộ môn', icon: FileCheck, route: '/department/reports' },
  ];

  const handleNavigation = (route: string): void => {
    navigate(route);
    closeMobileMenu();
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
          aria-label="Thanh điều hướng Trưởng Bộ Môn"
        >
          <CollapsibleSidebar
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={toggleSidebarCollapse}
            menuItems={menuItems}
            activeId={activeTab}
            onNavigate={handleNavigation}
            roleTitle="Trưởng Bộ Môn"
            currentUser={currentUser}
            onLogout={handleLogout}
          />
        </aside>

        {/* Mobile Sidebar */}
        {isMobileMenuOpen && (
          <>
            <div
              className="lg:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 transition-opacity"
              onClick={closeMobileMenu}
              aria-hidden="true"
            />
            <aside
              className="lg:hidden fixed inset-y-0 left-0 w-72 z-50 shadow-2xl animate-in slide-in-from-left duration-200"
              aria-label="Menu điều hướng"
            >
              <CollapsibleSidebar
                isCollapsed={false}
                onToggleCollapse={closeMobileMenu}
                menuItems={menuItems}
                activeId={activeTab}
                onNavigate={handleNavigation}
                roleTitle="Trưởng Bộ Môn"
                currentUser={currentUser}
                onLogout={handleLogout}
                isMobile
                onCloseMobile={closeMobileMenu}
              />
            </aside>
          </>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <GlobalBroadcastBanner />
          
          <Header
            searchPlaceholder="Tìm kế hoạch, giáo án, đề thi..."
            onToggleSidebar={toggleSidebarCollapse}
            isSidebarCollapsed={isSidebarCollapsed}
          />

          {/* Mobile Header Bar */}
          <div className="lg:hidden bg-white border-b border-hairline px-4 py-2.5 flex items-center justify-between">
            <button
              onClick={toggleMobileMenu}
              className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center text-text-secondary hover:text-text-primary rounded-lg hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean/50"
              aria-expanded={isMobileMenuOpen}
              aria-label={isMobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <span className="font-semibold text-sm text-primary">Cổng Trưởng Bộ Môn</span>
            <div className="w-10" />
          </div>

          <main
            id="main-content"
            className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto focus:outline-none"
            tabIndex={-1}
          >
            <Suspense
              fallback={
                <div className="min-h-[400px] flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-ocean/30 border-t-ocean rounded-full animate-spin" />
                    <span className="text-sm text-text-secondary">Đang tải dữ liệu...</span>
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

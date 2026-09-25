// =============================================================================
// DepartmentHeadLayout — G39 Layout
// Department Head Portal layout with specialized navigation
// =============================================================================

import React, { useState, useEffect, Suspense } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  ClipboardCheck,
  BarChart3,
  Building2,
  Settings,
  LogOut,
  Bell,
  Menu,
  X,
  Users,
  FileCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/Header';
import { GlobalBroadcastBanner } from '../components/GlobalBroadcastBanner';

// Map of routes to menu IDs
const ROUTE_TO_ID = {
  '/department': 'dashboard',
  '/department/dashboard': 'dashboard',
  '/department/curriculum': 'curriculum',
  '/department/lesson-plans': 'lesson-plans',
  '/department/assessments': 'assessments',
};

// Active route detection
function useActiveRoute() {
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
  }
  return 'dashboard';
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

export function DepartmentHeadLayout() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const activeTab = useActiveRoute();
  const { isOpen: isMobileMenuOpen, toggle: toggleMobileMenu, close: closeMobileMenu } = useMobileMenu();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const mainNavItems = [
    { id: 'dashboard', label: 'Tổng quan Tổ Bộ Môn', icon: LayoutDashboard, route: '/department/dashboard' },
    { id: 'curriculum', label: 'Khung Chương Trình', icon: BookOpen, route: '/department/curriculum' },
    { id: 'lesson-plans', label: 'Duyệt Kế Hoạch', icon: ClipboardCheck, route: '/department/lesson-plans' },
    { id: 'assessments', label: 'Khảo Thí', icon: BarChart3, route: '/department/assessments' },
  ];

  const systemNavItems = [
    { id: 'team', label: 'Quản lý Tổ', icon: Users, route: '/department/team' },
    { id: 'reports', label: 'Báo cáo Bộ môn', icon: FileCheck, route: '/department/reports' },
  ];

  const handleNavigation = (route) => {
    navigate(route);
    closeMobileMenu();
  };

  // Sidebar content
  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="h-16 px-6 flex items-center gap-3 hairline-b bg-white shrink-0">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple to-ocean flex items-center justify-center">
          <Users className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="text-base font-medium text-primary tracking-tight leading-none">EduPortal</div>
          <div className="text-[11px] text-text-secondary mt-1 leading-none">Trưởng Bộ Môn</div>
        </div>
      </div>

      {/* Section: Main Navigation */}
      <div className="px-5 pt-5 pb-2 text-[11px] font-medium text-text-secondary uppercase tracking-wider">
        Bộ môn
      </div>
      <nav className="p-3 space-y-1" aria-label="Điều hướng chính">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.route)}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean/50 ${
                isActive
                  ? 'bg-sky text-primary font-medium'
                  : 'text-text-secondary hover:text-text-primary hover:bg-hairline/40'
              }`}
            >
              <Icon className={`w-5 h-5 stroke-[1.75] ${isActive ? 'text-primary' : 'text-text-secondary'}`} aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Section: System */}
      <div className="px-5 pt-3 pb-2 text-[11px] font-medium text-text-secondary uppercase tracking-wider">
        Hệ thống
      </div>
      <nav className="p-3 space-y-1" aria-label="Cài đặt hệ thống">
        {systemNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.route)}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean/50 ${
                isActive
                  ? 'bg-sky text-primary font-medium'
                  : 'text-text-secondary hover:text-text-primary hover:bg-hairline/40'
              }`}
            >
              <Icon className={`w-5 h-5 stroke-[1.75] ${isActive ? 'text-primary' : 'text-text-secondary'}`} aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Profile */}
      <div className="p-3 border-t border-hairline shrink-0">
        <div className="p-3 bg-white rounded-card border border-hairline flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src={currentUser?.avatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120&h=120'}
              alt=""
              aria-hidden="true"
              className="w-8 h-8 rounded-full object-cover border border-hairline"
            />
            <div>
              <div className="text-xs font-medium text-text-primary leading-tight">
                {currentUser?.name || 'TS. Nguyễn Văn A'}
              </div>
              <div className="text-[11px] text-text-secondary mt-0.5">
                {currentUser?.title || 'Trưởng BM Toán'}
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
      {/* Skip to main content */}
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
            <div
              className="lg:hidden fixed inset-0 bg-black/50 z-40"
              onClick={closeMobileMenu}
              aria-hidden="true"
            />
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
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple to-ocean flex items-center justify-center">
                <Users className="w-4 h-4 text-white" />
              </div>
              <span className="font-medium text-primary">Trưởng Bộ Môn</span>
            </div>
            
            <div className="w-11" />
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 pt-14 lg:pt-0">
          <GlobalBroadcastBanner />
          <Header searchPlaceholder="Tìm kế hoạch, giáo án, đề thi..." />
          <main
            id="main-content"
            className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto focus:outline-none"
            tabIndex={-1}
          >
            <Suspense fallback={
              <div className="min-h-[400px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-4 border-ocean/30 border-t-ocean rounded-full animate-spin" />
                  <span className="text-sm text-text-secondary">Đang tải...</span>
                </div>
              </div>
            }>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>
    </>
  );
}

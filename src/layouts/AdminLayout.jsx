// =============================================================================
// AdminLayout — G42 Responsive & Accessibility
// Admin portal layout with keyboard navigation and mobile support
// =============================================================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { BarChart2, BookOpen, Users, Award, FileText, Shield, Settings, LogOut, Bell, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/Header';
import { GlobalBroadcastBanner } from '../components/GlobalBroadcastBanner';

// Map of routes to menu IDs
const ROUTE_TO_ID = {
  '/admin': 'overview',
  '/admin/overview': 'overview',
  '/admin/curriculum': 'curriculum',
  '/admin/teachers': 'teachers',
  '/admin/students': 'students',
  '/admin/reports': 'reports',
  '/admin/roles': 'roles',
  '/admin/announcements': 'announcements',
  '/admin/settings': 'settings',
};

// Active route detection
function useActiveRoute() {
  const location = useLocation();
  return ROUTE_TO_ID[location.pathname] || 'overview';
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

export function AdminLayout() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const activeTab = useActiveRoute();
  const { isOpen: isMobileMenuOpen, toggle: toggleMobileMenu, close: closeMobileMenu } = useMobileMenu();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const mainNavItems = [
    { id: 'overview', label: 'Tổng quan toàn trường', icon: BarChart2, route: '/admin/overview' },
    { id: 'curriculum', label: 'Chuyên môn & Khối lớp', icon: BookOpen, route: '/admin/curriculum' },
    { id: 'teachers', label: 'Quản lý giáo viên', icon: Users, route: '/admin/teachers' },
    { id: 'students', label: 'Học sinh & Điểm số', icon: Award, route: '/admin/students' },
    { id: 'reports', label: 'Báo cáo & Thông báo', icon: FileText, route: '/admin/reports' },
  ];

  const systemNavItems = [
    { id: 'roles', label: 'Phân quyền & Tài khoản', icon: Shield, route: '/admin/roles' },
    { id: 'announcements', label: 'Quản lý Thông báo', icon: Bell, route: '/admin/announcements' },
    { id: 'settings', label: 'Cài đặt hệ thống', icon: Settings, route: '/admin/settings' },
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
        <img src="/assets/logo.png" alt="EduPortal Logo" className="w-8 h-8 object-contain" />
        <div>
          <div className="text-base font-medium text-primary tracking-tight leading-none">EduPortal</div>
          <div className="text-[11px] text-text-secondary mt-1 leading-none">Ban Giám Hiệu & Quản trị</div>
        </div>
      </div>

      {/* Section: Main Navigation */}
      <div className="px-5 pt-5 pb-2 text-[11px] font-medium text-text-secondary uppercase tracking-wider">
        Cổng quản trị & BGH
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
                {currentUser?.name || 'GS.TS Vũ Hoài Nam'}
              </div>
              <div className="text-[11px] text-text-secondary mt-0.5">
                {currentUser?.title || 'Hiệu trưởng • BGH'}
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
              <img src="/assets/logo.png" alt="EduPortal Logo" className="w-7 h-7" />
              <span className="font-medium text-primary">EduPortal</span>
            </div>
            
            <div className="w-11" />
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 pt-14 lg:pt-0">
          <GlobalBroadcastBanner />
          <Header searchPlaceholder="Tìm hồ sơ, giáo viên, lớp học..." />
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

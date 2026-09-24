// =============================================================================
// ParentLayout — G42 Responsive & Accessibility
// Parent portal layout with mobile navigation and keyboard support
// =============================================================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Home, Award, Calendar, Bell, CreditCard, MessageSquare, Phone, LogOut, FileCheck, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/Header';
import { GlobalBroadcastBanner } from '../components/GlobalBroadcastBanner';

// Map of routes to menu IDs
const ROUTE_TO_ID = {
  '/parent': 'home',
  '/parent/dashboard': 'home',
  '/parent/grades': 'grades',
  '/parent/schedule': 'schedule',
  '/parent/leave': 'leave',
  '/parent/tuition': 'tuition',
  '/parent/notices': 'notices',
  '/parent/messages': 'messages',
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

export function ParentLayout() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const activeTab = useActiveRoute();
  const { isOpen: isMobileMenuOpen, toggle: toggleMobileMenu, close: closeMobileMenu } = useMobileMenu();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const menuItems = [
    { id: 'home', label: 'Trang chủ', icon: Home, route: '/parent/dashboard' },
    { id: 'grades', label: 'Kết quả học tập', icon: Award, route: '/parent/grades' },
    { id: 'schedule', label: 'Lịch học & Thi', icon: Calendar, route: '/parent/schedule' },
    { id: 'leave', label: 'Đơn xin nghỉ học', icon: FileCheck, route: '/parent/leave' },
    { id: 'tuition', label: 'Học phí & Dịch vụ', icon: CreditCard, route: '/parent/tuition' },
    { id: 'notices', label: 'Thông báo trường', icon: Bell, route: '/parent/notices' },
    { id: 'messages', label: 'Tin nhắn giáo viên', icon: MessageSquare, route: '/parent/messages' },
  ];

  const handleNavigation = (route) => {
    navigate(route);
    closeMobileMenu();
  };

  // Sidebar content (shared between desktop and mobile)
  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-hairline bg-white shrink-0">
        <img src="/assets/logo.png" alt="EduPortal Logo" className="w-8 h-8 object-contain" />
        <div>
          <div className="text-base font-medium text-primary tracking-tight leading-none">EduPortal</div>
          <div className="text-[11px] text-text-secondary mt-1 leading-none">Cổng Phụ huynh</div>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto" aria-label="Điều hướng chính">
        {menuItems.map((item) => {
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

      {/* Bottom utility hotline & Profile */}
      <div className="p-3 space-y-2 border-t border-hairline shrink-0">
        <div className="px-3 py-2 bg-white rounded border border-hairline flex items-center justify-between text-[11px] text-text-secondary">
          <div className="flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-ocean" aria-hidden="true" />
            <span>Hotline:</span>
            <strong className="text-text-primary">1900 6868</strong>
          </div>
          <span className="text-[10px] text-success font-medium">Hỗ trợ 24/7</span>
        </div>

        <div className="p-3 bg-white rounded-card border border-hairline flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src={currentUser?.avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=120&h=120'}
              alt=""
              aria-hidden="true"
              className="w-9 h-9 rounded-full object-cover border border-hairline"
            />
            <div>
              <div className="text-xs font-medium text-text-primary leading-tight">
                {currentUser?.name || 'Bác Nguyễn Văn Thành'}
              </div>
              <div className="text-[11px] text-text-secondary mt-0.5">
                Phụ huynh em Khôi
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-text-secondary hover:text-danger rounded hover:bg-danger-light transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean/50"
            aria-label="Đăng xuất"
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

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 pt-14 lg:pt-0">
          <GlobalBroadcastBanner />
          <Header searchPlaceholder="Tìm kiếm kết quả học tập, biên lai, thông báo..." />
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

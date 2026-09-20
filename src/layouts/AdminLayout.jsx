import React from 'react';
import { BarChart2, BookOpen, Users, Award, FileText, Shield, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/Header';
import { GlobalBroadcastBanner } from '../components/GlobalBroadcastBanner';

export function AdminLayout({ children, currentTab = 'overview', onTabChange }) {
  const { currentUser, logout } = useAuth();

  const mainNav = [
    { id: 'overview', label: 'Tổng quan toàn trường', icon: BarChart2 },
    { id: 'curriculum', label: 'Chuyên môn & Khối lớp', icon: BookOpen },
    { id: 'teachers', label: 'Quản lý giáo viên', icon: Users },
    { id: 'students', label: 'Học sinh & Điểm số', icon: Award },
    { id: 'reports', label: 'Báo cáo & Thông báo', icon: FileText },
  ];

  const systemNav = [
    { id: 'roles', label: 'Phân quyền & Tài khoản', icon: Shield },
    { id: 'settings', label: 'Cài đặt hệ thống', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex bg-[#F8F9FB]">
      {/* Sidebar */}
      <aside className="w-64 bg-surface-neutral hairline-r flex flex-col justify-between shrink-0 select-none">
        <div>
          {/* Brand */}
          <div className="h-16 px-6 flex items-center gap-3 hairline-b bg-white">
            <img src="/assets/logo.png" alt="EduPortal Logo" className="w-8 h-8 object-contain" />
            <div>
              <div className="text-base font-medium text-primary tracking-tight leading-none">EduPortal</div>
              <div className="text-[11px] text-text-secondary mt-1 leading-none">Ban Giám Hiệu & Quản trị</div>
            </div>
          </div>

          {/* Section 1 */}
          <div className="px-5 pt-5 pb-2 text-[11px] font-medium text-text-secondary uppercase tracking-wider">
            Cổng quản trị & BGH
          </div>
          <nav className="p-3 space-y-1">
            {mainNav.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange?.(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded text-sm transition-colors ${
                    isActive
                      ? 'bg-sky text-primary font-medium'
                      : 'text-text-secondary hover:text-text-primary hover:bg-hairline/40'
                  }`}
                >
                  <Icon className={`w-4 h-4 stroke-[1.75] ${isActive ? 'text-primary' : 'text-text-secondary'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Section 2: Hệ thống */}
          <div className="px-5 pt-3 pb-2 text-[11px] font-medium text-text-secondary uppercase tracking-wider">
            Hệ thống
          </div>
          <nav className="p-3 space-y-1">
            {systemNav.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange?.(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded text-sm transition-colors ${
                    isActive
                      ? 'bg-sky text-primary font-medium'
                      : 'text-text-secondary hover:text-text-primary hover:bg-hairline/40'
                  }`}
                >
                  <Icon className={`w-4 h-4 stroke-[1.75] ${isActive ? 'text-primary' : 'text-text-secondary'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Profile */}
        <div className="p-3">
          <div className="p-3 bg-white rounded-card border border-hairline flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img
                src={currentUser?.avatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120&h=120'}
                alt="Admin Avatar"
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
              onClick={logout}
              title="Đăng xuất"
              className="p-1 text-text-secondary hover:text-danger rounded hover:bg-danger-light transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <GlobalBroadcastBanner />
        <Header searchPlaceholder="Tìm hồ sơ, giáo viên, lớp học..." />
        <main className="flex-1 p-6 sm:p-8 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

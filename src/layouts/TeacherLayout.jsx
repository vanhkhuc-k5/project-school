import React from 'react';
import { LayoutDashboard, Users, ClipboardCheck, BarChart2, FileText, Settings, HelpCircle, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/Header';
import { GlobalBroadcastBanner } from '../components/GlobalBroadcastBanner';

export function TeacherLayout({ children, currentTab = 'analytics', onTabChange }) {
  const { currentUser, logout } = useAuth();

  const menuItems = [
    { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'classes', label: 'Lớp học & Điểm danh', icon: Users },
    { id: 'assignments', label: 'Bài tập & Đánh giá', icon: ClipboardCheck },
    { id: 'analytics', label: 'Phân tích năng lực', icon: BarChart2 },
    { id: 'reports', label: 'Báo cáo học tập', icon: FileText },
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
              <div className="text-[11px] text-text-secondary mt-1 leading-none">Cổng Giáo viên</div>
            </div>
          </div>

          {/* Section title */}
          <div className="px-5 pt-5 pb-2 text-[11px] font-medium text-text-secondary uppercase tracking-wider">
            Quản lý chuyên môn
          </div>

          {/* Nav links */}
          <nav className="p-3 space-y-1">
            {menuItems.map((item) => {
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

        {/* Bottom utility links & Profile */}
        <div className="p-3 space-y-2">
          <div className="space-y-1 hairline-t pt-2">
            <button className="w-full flex items-center gap-3 px-3.5 py-2 rounded text-xs text-text-secondary hover:text-text-primary hover:bg-hairline/40">
              <Settings className="w-4 h-4 stroke-[1.75]" />
              <span>Cài đặt</span>
            </button>
            <button className="w-full flex items-center gap-3 px-3.5 py-2 rounded text-xs text-text-secondary hover:text-text-primary hover:bg-hairline/40">
              <HelpCircle className="w-4 h-4 stroke-[1.75]" />
              <span>Trợ giúp</span>
            </button>
          </div>

          <div className="p-3 bg-white rounded-card border border-hairline flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img
                src={currentUser?.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=120&h=120'}
                alt="Teacher Avatar"
                className="w-8 h-8 rounded-full object-cover border border-hairline"
              />
              <div>
                <div className="text-xs font-medium text-text-primary leading-tight">
                  {currentUser?.name || 'Cô Mai Lan'}
                </div>
                <div className="text-[11px] text-text-secondary mt-0.5">
                  {currentUser?.department || 'Tổ Toán học'}
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

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <GlobalBroadcastBanner />
        <Header searchPlaceholder="Tìm kiếm học sinh, bài giảng, chuyên đề..." />
        <main className="flex-1 p-6 sm:p-8 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

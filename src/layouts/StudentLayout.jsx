import React from 'react';
import { Home, BookOpen, Layers, Award, Sparkles, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/Header';
import { GlobalBroadcastBanner } from '../components/GlobalBroadcastBanner';

export function StudentLayout({ children, currentTab = 'home', onTabChange }) {
  const { currentUser, logout } = useAuth();

  const menuItems = [
    { id: 'home', label: 'Trang chủ', icon: Home },
    { id: 'assignments', label: 'Bài tập', icon: BookOpen },
    { id: 'resources', label: 'Kho học liệu', icon: Layers },
    { id: 'grades', label: 'Điểm số', icon: Award },
    { id: 'ai-tutor', label: 'Gia sư AI', icon: Sparkles, badge: 'AI Mới' },
  ];

  return (
    <div className="min-h-screen flex bg-[#F8F9FB]">
      {/* Sidebar */}
      <aside className="w-64 bg-surface-neutral hairline-r flex flex-col justify-between shrink-0 select-none">
        <div>
          {/* Brand Header */}
          <div className="h-16 px-6 flex items-center gap-3 hairline-b bg-white">
            <img src="/assets/logo.png" alt="EduPortal Logo" className="w-8 h-8 object-contain" />
            <div>
              <div className="text-base font-medium text-primary tracking-tight leading-none">EduPortal</div>
              <div className="text-[11px] text-text-secondary mt-1 leading-none">Cổng Học sinh</div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange?.(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded text-sm transition-colors ${
                    isActive
                      ? 'bg-sky text-primary font-medium'
                      : 'text-text-secondary hover:text-text-primary hover:bg-hairline/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 stroke-[1.75] ${isActive ? 'text-primary' : 'text-text-secondary'}`} />
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
        </div>

        {/* Bottom profile info */}
        <div className="p-3">
          <div className="p-3 bg-white rounded-card border border-hairline flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img
                src={currentUser?.avatar || '/assets/student_avatar.png'}
                alt="Avatar"
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
              onClick={logout}
              title="Đăng xuất"
              className="p-1.5 text-text-secondary hover:text-danger rounded hover:bg-danger-light transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        <GlobalBroadcastBanner />
        <Header />
        <main className="flex-1 p-6 sm:p-8 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

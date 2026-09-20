import React from 'react';
import { Home, Award, Calendar, Bell, CreditCard, MessageSquare, Phone, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/Header';
import { GlobalBroadcastBanner } from '../components/GlobalBroadcastBanner';

export function ParentLayout({ children, currentTab = 'home', onTabChange }) {
  const { currentUser, logout } = useAuth();

  const menuItems = [
    { id: 'home', label: 'Trang chủ', icon: Home },
    { id: 'grades', label: 'Kết quả học tập', icon: Award },
    { id: 'schedule', label: 'Lịch học & Thi', icon: Calendar },
    { id: 'notices', label: 'Thông báo trường', icon: Bell },
    { id: 'tuition', label: 'Học phí & Dịch vụ', icon: CreditCard },
    { id: 'messages', label: 'Tin nhắn giáo viên', icon: MessageSquare },
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
              <div className="text-[11px] text-text-secondary mt-1 leading-none">Cổng Phụ huynh</div>
            </div>
          </div>

          {/* Child active chip */}
          <div className="p-3">
            <div className="p-3 bg-white rounded-card border border-hairline flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-sky text-primary flex items-center justify-center font-medium text-xs">
                🎓
              </div>
              <div>
                <div className="text-xs font-medium text-text-primary">Nguyễn Minh Khôi</div>
                <div className="text-[11px] text-text-secondary">Lớp 10A1 • 2024-2025</div>
              </div>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="px-3 space-y-1">
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

        {/* Bottom utility hotline & Profile */}
        <div className="p-3 space-y-2">
          <div className="px-3 py-2 bg-white rounded border border-hairline flex items-center justify-between text-[11px] text-text-secondary">
            <div className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-ocean" />
              <span>Hotline:</span>
              <strong className="text-text-primary">1900 6868</strong>
            </div>
            <span className="text-[10px] text-success font-medium">Hỗ trợ 24/7</span>
          </div>

          <div className="p-3 bg-white rounded-card border border-hairline flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img
                src={currentUser?.avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=120&h=120'}
                alt="Parent Avatar"
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
              onClick={logout}
              title="Đăng xuất"
              className="p-1.5 text-text-secondary hover:text-danger rounded hover:bg-danger-light transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <GlobalBroadcastBanner />
        <Header searchPlaceholder="Tìm kiếm kết quả học tập, biên lai, thông báo..." />
        <main className="flex-1 p-6 sm:p-8 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

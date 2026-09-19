import React from 'react';
import { Home, Award, Calendar, Bell, CreditCard, MessageSquare, Phone, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/Header';

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
            <img src="/assets/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
            <div>
              <div className="text-base font-medium text-primary tracking-tight leading-none">Cổng Phụ Huynh</div>
              <div className="text-[11px] text-text-secondary mt-1 leading-none">Hệ Thống Giáo Dục Số</div>
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

        {/* Support hotline */}
        <div className="p-4 m-3 bg-white rounded-card border border-hairline space-y-2 text-xs">
          <div className="flex items-center gap-2 text-text-primary font-medium">
            <Phone className="w-3.5 h-3.5 text-ocean" />
            <span>Hỗ trợ nhà trường</span>
          </div>
          <div className="text-text-secondary text-[11px] leading-relaxed">
            Hotline: <strong className="text-text-primary">1900 6868</strong><br />
            8:00 - 17:30 (Thứ 2 - Thứ 7)
          </div>
          <button
            onClick={logout}
            className="w-full mt-2 pt-2 hairline-t flex items-center justify-center gap-1.5 text-danger hover:underline text-[11px]"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header searchPlaceholder="Tìm kiếm kết quả học tập, biên lai, thông báo..." />
        <main className="flex-1 p-6 sm:p-8 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

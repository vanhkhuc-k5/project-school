import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, GraduationCap, Users, BookOpen, Key, ChevronUp, ChevronDown } from 'lucide-react';

export function RoleSwitcher({ currentView, setCurrentView }) {
  const { currentRole, switchRole } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const roles = [
    {
      id: 'student',
      label: 'Học sinh',
      role: 'student',
      view: 'student-dashboard',
      icon: GraduationCap,
      color: 'text-ocean',
    },
    {
      id: 'ai-tutor',
      label: 'Gia sư AI',
      role: 'student',
      view: 'student-ai-tutor',
      icon: BookOpen,
      color: 'text-ocean',
    },
    {
      id: 'teacher',
      label: 'Giáo viên',
      role: 'teacher',
      view: 'teacher-analytics',
      icon: Users,
      color: 'text-primary',
    },
    {
      id: 'teacher-create',
      label: 'GV: Tạo bài',
      role: 'teacher',
      view: 'teacher-create-assignment',
      icon: BookOpen,
      color: 'text-primary',
    },
    {
      id: 'parent',
      label: 'Phụ huynh',
      role: 'parent',
      view: 'parent-dashboard',
      icon: Users,
      color: 'text-success',
    },
    {
      id: 'admin',
      label: 'Ban Giám Hiệu',
      role: 'admin',
      view: 'admin-dashboard',
      icon: Shield,
      color: 'text-warning-dark',
    },
    {
      id: 'login',
      label: 'Đăng nhập',
      role: 'guest',
      view: 'login',
      icon: Key,
      color: 'text-text-secondary',
    },
  ];

  return (
    <aside aria-label="Demo role selector" className="fixed bottom-4 right-4 z-50 bg-white border border-hairline rounded-xl shadow-popover p-2 text-xs transition-all">
      <div className="flex items-center justify-between gap-3 px-2 py-1 hairline-b mb-1.5">
        <div className="flex items-center gap-1.5 font-medium text-text-primary">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Chuyển đổi giao diện Demo</span>
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 hover:bg-surface-neutral rounded text-text-secondary"
        >
          {collapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {!collapsed && (
        <div className="flex flex-wrap gap-1.5 max-w-xs">
          {roles.map((r) => {
            const Icon = r.icon;
            const isActive = currentView === r.view;
            return (
              <button
                key={r.id}
                onClick={() => {
                  switchRole(r.role);
                  setCurrentView(r.view);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded transition-all ${
                  isActive
                    ? 'bg-primary text-white font-medium shadow-sm'
                    : 'bg-surface-neutral hover:bg-sky text-text-primary'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : r.color}`} />
                <span>{r.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </aside>
  );
}

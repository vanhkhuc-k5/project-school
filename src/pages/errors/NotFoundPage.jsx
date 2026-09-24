// =============================================================================
// 404 Not Found Page — G39 Real Routing
// =============================================================================

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const ROLE_DASHBOARDS = {
  student: '/student',
  teacher: '/teacher',
  parent: '/parent',
  admin: '/admin',
  school_admin: '/admin',
  super_admin: '/admin',
  principal: '/leadership',
  vice_principal: '/leadership',
  department_head: '/department',
};

function HomeButton() {
  const navigate = useNavigate();
  const { currentUser, currentRole } = useAuth();

  const target = currentUser && ROLE_DASHBOARDS[currentRole]
    ? ROLE_DASHBOARDS[currentRole]
    : '/login';

  return (
    <button
      onClick={() => navigate(target)}
      className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-ocean text-white rounded-lg hover:bg-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean/50"
    >
      <Home className="w-5 h-5" />
      Về trang chủ
    </button>
  );
}

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <div className="text-center max-w-md relative z-10">
        {/* Error Code */}
        <div className="mb-6">
          <span className="text-8xl font-bold text-hairline">404</span>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-semibold text-text-primary mb-3">
          Trang không tìm thấy
        </h1>

        {/* Description */}
        <p className="text-sm text-text-secondary mb-8">
          Xin lỗi, trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <HomeButton />
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-hairline text-text-primary rounded-lg hover:bg-surface-neutral transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean/50"
          >
            <ArrowLeft className="w-5 h-5" />
            Quay lại
          </button>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-sky/30 rounded-full opacity-60 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-ocean/10 rounded-full opacity-60 blur-3xl" />
      </div>
    </div>
  );
}

export default NotFoundPage;

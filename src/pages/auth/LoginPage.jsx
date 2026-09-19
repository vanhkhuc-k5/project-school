import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { MOCK_USERS } from '../../mock/authData';
import {
  GraduationCap,
  Briefcase,
  Users,
  Shield,
  Eye,
  EyeOff,
  CheckCircle2,
  ArrowRight,
  HelpCircle,
  Lock,
} from 'lucide-react';

export function LoginPage({ onLoginSuccess }) {
  const { login } = useAuth();
  const [selectedRole, setSelectedRole] = useState('student');
  const [identifier, setIdentifier] = useState('HS-2024-889');
  const [password, setPassword] = useState('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const roleTabs = [
    { id: 'student', label: 'Học sinh', icon: GraduationCap, codeExample: 'HS-2024-889', tip: 'Dành cho học sinh: Dùng mã học sinh (VD: HS-2024-889) hoặc Email trường cấp.' },
    { id: 'teacher', label: 'Giáo viên', icon: Briefcase, codeExample: 'mailan@school.edu.vn', tip: 'Dành cho giáo viên: Sử dụng email nội bộ do phòng CNTT nhà trường cấp.' },
    { id: 'parent', label: 'Phụ huynh', icon: Users, codeExample: 'PH-10A1-042', tip: 'Dành cho phụ huynh: Sử dụng số điện thoại đăng ký sổ liên lạc hoặc mã định danh.' },
    { id: 'admin', label: 'Quản trị', icon: Shield, codeExample: 'bgh.hoainam@school.edu.vn', tip: 'Dành cho Ban Giám Hiệu & Quản trị viên hệ thống có xác thực 2 lớp.' },
  ];

  const handleRoleSelect = (roleId) => {
    setSelectedRole(roleId);
    const user = MOCK_USERS[roleId];
    if (user) {
      setIdentifier(user.code || user.email);
    }
  };

  const handleLogin = (e) => {
    e?.preventDefault();
    login(selectedRole);
    onLoginSuccess?.(selectedRole);
  };

  const currentTabInfo = roleTabs.find((r) => r.id === selectedRole);

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col justify-between">
      {/* Top Bar */}
      <header className="h-16 bg-white hairline-b px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/assets/logo.png" alt="EduPortal Logo" className="w-7 h-7 object-contain" />
          <span className="font-medium text-primary text-base">EduPortal</span>
          <span className="text-hairline-darker hidden sm:inline">|</span>
          <span className="text-text-secondary text-xs hidden sm:inline">Academic Identity Service</span>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <span className="text-primary font-medium hover:underline cursor-pointer">Login</span>
          <span className="text-text-secondary hover:text-text-primary cursor-pointer hidden sm:inline">Assistance</span>
          <span className="text-text-secondary hover:text-text-primary cursor-pointer hidden sm:inline">Status</span>
          <div className="w-7 h-7 rounded-full bg-surface-neutral border border-hairline flex items-center justify-center text-text-secondary">
            <Lock className="w-3.5 h-3.5 stroke-[1.75]" />
          </div>
        </div>
      </header>

      {/* Main Content Split Screen */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left: Login Form Card */}
          <div className="bg-white rounded-card border border-hairline p-7 sm:p-8 shadow-whisper">
            <div className="flex items-center gap-3 mb-5">
              <img src="/assets/logo.png" alt="EduPortal" className="w-9 h-9 object-contain" />
              <div>
                <h2 className="text-base font-medium text-primary leading-tight">EduPortal</h2>
                <p className="text-xs text-text-secondary">Cổng thông tin giáo dục số</p>
              </div>
            </div>

            <div className="mb-6">
              <h1 className="text-xl font-medium text-text-primary">Đăng nhập hệ thống</h1>
              <p className="text-xs text-text-secondary mt-1">
                Chọn vai trò để truy cập đúng phân hệ của bạn
              </p>
            </div>

            {/* Role Tabs */}
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-surface-neutral rounded border border-hairline mb-4">
              {roleTabs.map((tab) => {
                const Icon = tab.icon;
                const isSelected = selectedRole === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleRoleSelect(tab.id)}
                    className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded text-xs transition-all ${
                      isSelected
                        ? 'bg-sky text-primary font-medium shadow-sm'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 stroke-[1.75] shrink-0" />
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Role Tip Box */}
            <div className="p-3 bg-sky/40 border border-ocean/20 rounded mb-5 flex items-start gap-2.5 text-xs text-text-secondary">
              <HelpCircle className="w-4 h-4 text-ocean shrink-0 mt-0.5" />
              <p className="leading-relaxed">{currentTabInfo?.tip}</p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-primary mb-1.5">
                  Email hoặc Mã định danh
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="nhap_ma_hoac_email@school.edu.vn"
                  className="w-full h-11 px-3.5 bg-white border border-hairline rounded text-sm text-text-primary placeholder:text-text-secondary focus:border-ocean focus:ring-2 focus:ring-ocean/15 outline-none transition-all"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-text-primary">Mật khẩu</label>
                  <a href="#forgot" onClick={(e) => e.preventDefault()} className="text-xs text-ocean hover:underline">
                    Quên mật khẩu?
                  </a>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-11 pl-3.5 pr-10 bg-white border border-hairline rounded text-sm text-text-primary focus:border-ocean focus:ring-2 focus:ring-ocean/15 outline-none transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-text-secondary">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-hairline text-primary focus:ring-ocean"
                  />
                  <span>Ghi nhớ đăng nhập trên thiết bị này</span>
                </label>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full justify-center mt-2"
                icon={ArrowRight}
                iconPosition="right"
              >
                Đăng nhập
              </Button>

              <div className="relative my-4 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-hairline"></div>
                </div>
                <span className="relative px-3 bg-white text-xs text-text-secondary">
                  hoặc tiếp tục với
                </span>
              </div>

              <button
                type="button"
                onClick={handleLogin}
                className="w-full h-11 bg-surface-neutral hover:bg-hairline/50 border border-hairline rounded text-xs font-medium text-text-primary flex items-center justify-center gap-2.5 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                </svg>
                <span>Đăng nhập bằng Google Workspace for Education</span>
              </button>
            </form>

            <div className="mt-6 pt-4 hairline-t text-center text-[11px] text-text-secondary leading-relaxed">
              Cần trợ giúp đăng nhập? Liên hệ Phòng Đào tạo: <a href="mailto:hotro@eduportal.vn" className="text-ocean hover:underline">hotro@eduportal.vn</a> | Hotline: <strong>1900 6868</strong>
            </div>
          </div>

          {/* Right: Architectural Hero with Feature Highlights */}
          <div className="relative rounded-card overflow-hidden border border-hairline bg-primary text-white min-h-[520px] flex flex-col justify-between p-7 shadow-whisper">
            <img
              src="/assets/school_interior.png"
              alt="Nordic School Architecture"
              className="absolute inset-0 w-full h-full object-cover opacity-35"
            />

            {/* Top pill badge */}
            <div className="relative z-10 flex justify-between items-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-white/90 text-primary text-xs font-medium backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Năm học 2024 - 2025</span>
              </span>
            </div>

            {/* Bottom Card */}
            <div className="relative z-10 bg-white text-text-primary rounded-card p-6 border border-hairline shadow-popover space-y-4">
              <div className="flex items-center gap-2 text-xs font-medium text-ocean uppercase tracking-wider">
                <span className="text-sm">✦</span>
                <span>Hệ thống giáo dục thông minh</span>
              </div>
              <p className="text-sm font-medium text-text-primary leading-snug">
                “Môi trường giáo dục hiện đại, kết nối tri thức và công nghệ AI hỗ trợ học tập cá nhân hóa.”
              </p>

              <div className="space-y-2 text-xs text-text-secondary">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                  <span>Trợ lý học tập AI 24/7 theo sát từng chuyên đề và bài tập</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                  <span>Báo cáo phân tích thế mạnh & tiến độ rèn luyện tức thời</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                  <span>Kênh liên lạc thông suốt và bảo mật giữa Gia đình & Nhà trường</span>
                </div>
              </div>

              <div className="pt-3 hairline-t flex items-center justify-between text-[11px] text-text-secondary">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-primary" />
                  <span>Bảo mật chuẩn Quốc tế • Mã hóa 256-bit</span>
                </div>
                <span className="font-medium text-primary bg-sky px-2 py-0.5 rounded-pill">
                  EduShield 2.4
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-14 hairline-t bg-white px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-text-secondary gap-2">
        <div>Secure Scandinavian Academic Network © 2024 EduPortal</div>
        <div className="flex items-center gap-4">
          <a href="#privacy" onClick={(e) => e.preventDefault()} className="hover:text-text-primary">Privacy Policy</a>
          <a href="#terms" onClick={(e) => e.preventDefault()} className="hover:text-text-primary">Terms of Service</a>
          <a href="#contact" onClick={(e) => e.preventDefault()} className="hover:text-text-primary">School Contact & Support</a>
          <span className="text-hairline-darker">|</span>
          <span>Norsk / English / Tiếng Việt</span>
        </div>
      </footer>
    </div>
  );
}

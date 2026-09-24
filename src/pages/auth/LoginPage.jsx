import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/Button';
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
  AlertCircle,
  Key,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export function LoginPage({ onLoginSuccess }) {
  const { login } = useAuth();
  const [selectedRole, setSelectedRole] = useState('student');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showTestAccounts, setShowTestAccounts] = useState(false);

  const roleTabs = [
    {
      id: 'student',
      label: 'Học sinh',
      icon: GraduationCap,
      placeholder: 'VD: teststudent1 hoặc email học sinh',
      tip: 'Dành cho học sinh: Sử dụng mã định danh học sinh (VD: teststudent1) hoặc email trường cấp.',
      testAccount: { code: 'teststudent1', pass: 'devpassword123', name: 'Em Nguyễn Văn Test (Lớp 10A)' },
    },
    {
      id: 'teacher',
      label: 'Giáo viên',
      icon: Briefcase,
      placeholder: 'VD: testteacher1 hoặc email giáo viên',
      tip: 'Dành cho giáo viên: Sử dụng email nội bộ do phòng CNTT nhà trường cấp (VD: testteacher1).',
      testAccount: { code: 'testteacher1', pass: 'devpassword123', name: 'Thầy Đỗ Văn Test (Tổ Toán học)' },
    },
    {
      id: 'parent',
      label: 'Phụ huynh',
      icon: Users,
      placeholder: 'VD: testparent1 hoặc email phụ huynh',
      tip: 'Dành cho phụ huynh: Sử dụng mã định danh liên lạc học sinh (VD: testparent1) hoặc email đã đăng ký.',
      testAccount: { code: 'testparent1', pass: 'devpassword123', name: 'Ông Nguyễn Văn Phụ Huynh (PH em Test)' },
    },
    {
      id: 'admin',
      label: 'Quản trị',
      icon: Shield,
      placeholder: 'VD: testadmin hoặc email quản trị',
      tip: 'Dành cho Ban Giám Hiệu & Quản trị viên hệ thống có chữ ký số và phân quyền quản lý cấp cao.',
      testAccount: { code: 'testadmin', pass: 'devpassword123', name: 'Admin Test Dev (Quản trị)' },
    },
  ];

  const handleRoleSelect = (roleId) => {
    setSelectedRole(roleId);
    setErrorMessage('');
  };

  const fillTestAccount = (roleId) => {
    const tab = roleTabs.find((r) => r.id === roleId);
    if (tab) {
      setSelectedRole(roleId);
      setIdentifier(tab.testAccount.code);
      setPassword(tab.testAccount.pass);
      setErrorMessage('');
    }
  };

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!identifier.trim()) {
      setErrorMessage('Vui lòng nhập Email hoặc Mã định danh');
      return;
    }
    if (!password.trim()) {
      setErrorMessage('Vui lòng nhập mật khẩu');
      return;
    }

    setErrorMessage('');
    setIsLoggingIn(true);
    try {
      const result = await login(selectedRole, identifier.trim(), password.trim());
      if (result?.success) {
        const targetRole = result.user?.role || selectedRole;
        onLoginSuccess?.(targetRole);
      } else {
        setErrorMessage(result?.message || 'Tài khoản hoặc mật khẩu không chính xác');
      }
    } catch {
      setErrorMessage('Lỗi kết nối đến hệ thống xác thực');
    } finally {
      setIsLoggingIn(false);
    }
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
          <span className="text-text-secondary text-xs hidden sm:inline">Academic Identity & Access Management</span>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <span className="text-primary font-medium">Cổng Đăng Nhập Chính Thức</span>
          <span className="text-text-secondary hover:text-text-primary cursor-pointer hidden sm:inline">Hướng dẫn</span>
          <span className="text-text-secondary hover:text-text-primary cursor-pointer hidden sm:inline">Hỗ trợ kỹ thuật</span>
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
                <p className="text-xs text-text-secondary">Cổng thông tin & dịch vụ giáo dục số</p>
              </div>
            </div>

            <div className="mb-6">
              <h1 className="text-xl font-medium text-text-primary">Đăng nhập tài khoản</h1>
              <p className="text-xs text-text-secondary mt-1">
                Chọn phân hệ đào tạo để truy cập không gian làm việc của bạn
              </p>
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="p-3 mb-4 bg-danger-light border border-danger/20 rounded text-xs text-danger flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

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
            <form onSubmit={handleLogin} className="space-y-4" noValidate>
              <div>
                <label htmlFor="login-identifier" className="block text-xs font-medium text-text-primary mb-1.5">
                  Email hoặc Mã định danh
                </label>
                <input
                  id="login-identifier"
                  type="text"
                  value={identifier}
                  autoComplete={selectedRole === 'parent' ? 'tel' : selectedRole === 'teacher' ? 'email' : 'username'}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder={currentTabInfo?.placeholder || 'Nhập mã hoặc email'}
                  className="w-full h-11 px-3.5 bg-white border border-hairline rounded text-sm text-text-primary placeholder:text-text-secondary focus:border-ocean focus:ring-2 focus:ring-ocean/15 outline-none transition-all"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="login-password" className="text-xs font-medium text-text-primary">
                    Mật khẩu
                  </label>
                  <a href="#forgot" onClick={(e) => e.preventDefault()} className="text-xs text-ocean hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean/50 focus-visible:ring-offset-1 rounded">
                    Quên mật khẩu?
                  </a>
                </div>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    autoComplete="current-password"
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    placeholder="Nhập mật khẩu"
                    className="w-full h-11 pl-3.5 pr-10 bg-white border border-hairline rounded text-sm text-text-primary placeholder:text-text-secondary focus:border-ocean focus:ring-2 focus:ring-ocean/15 outline-none transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary p-1 min-w-[44px] min-h-[44px] flex items-center justify-center -mr-1 rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean/50"
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label htmlFor="login-remember" className="flex items-center gap-2 cursor-pointer select-none text-xs text-text-secondary">
                  <input
                    id="login-remember"
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
                disabled={isLoggingIn}
              >
                {isLoggingIn ? 'Đang xác thực hệ thống...' : 'Đăng nhập'}
              </Button>

              <div className="relative my-4 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-hairline"></div>
                </div>
                <span className="relative px-3 bg-white text-xs text-text-secondary">
                  hoặc đăng nhập bằng SSO
                </span>
              </div>

              <button
                type="button"
                onClick={() => fillTestAccount(selectedRole)}
                className="w-full h-11 bg-surface-neutral hover:bg-hairline/50 border border-hairline rounded text-xs font-medium text-text-primary flex items-center justify-center gap-2.5 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                </svg>
                <span>Google Workspace for Education</span>
              </button>
            </form>

            {/* Quick Test Accounts Accordion for Evaluation */}
            <div className="mt-5 pt-3 hairline-t">
              <button
                type="button"
                onClick={() => setShowTestAccounts(!showTestAccounts)}
                className="w-full flex items-center justify-between text-xs text-text-secondary hover:text-text-primary py-1"
              >
                <span className="flex items-center gap-1.5 font-medium">
                  <Key className="w-3.5 h-3.5 text-ocean" />
                  <span>Tài khoản kiểm thử hệ thống (Dành cho ban thẩm định)</span>
                </span>
                {showTestAccounts ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showTestAccounts && (
                <div className="mt-2.5 grid grid-cols-2 gap-2 p-2.5 bg-surface-neutral rounded border border-hairline text-xs">
                  {roleTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => fillTestAccount(tab.id)}
                      className="p-2 text-left bg-white hover:bg-sky/50 border border-hairline rounded transition-colors group"
                    >
                      <div className="font-medium text-primary flex items-center justify-between">
                        <span>{tab.label}</span>
                        <span className="text-[10px] text-ocean opacity-0 group-hover:opacity-100 transition-opacity">Chọn &rarr;</span>
                      </div>
                      <div className="text-[11px] text-text-secondary mt-0.5 truncate">{tab.testAccount.code}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 hairline-t text-center text-[11px] text-text-secondary leading-relaxed">
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
          <a href="#privacy" onClick={(e) => e.preventDefault()} className="hover:text-text-primary">Chính sách bảo mật</a>
          <a href="#terms" onClick={(e) => e.preventDefault()} className="hover:text-text-primary">Điều khoản dịch vụ</a>
          <a href="#contact" onClick={(e) => e.preventDefault()} className="hover:text-text-primary">Hỗ trợ kỹ thuật</a>
          <span className="text-hairline-darker">|</span>
          <span>Tiếng Việt / English</span>
        </div>
      </footer>
    </div>
  );
}

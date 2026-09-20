import React, { useState, useEffect } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { ADMIN_DASHBOARD_DATA } from '../../mock/adminData';
import { adminApi } from '../../services/api';
import { useSync } from '../../context/SyncContext';
import {
  Users,
  Briefcase,
  Layers,
  Award,
  TrendingUp,
  Download,
  Bell,
  AlertTriangle,
  Clock,
  ShieldCheck,
  RefreshCw,
  FileText,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  Plus,
  Search,
  Key,
  Edit2,
  Trash2,
  BookOpen,
  DollarSign,
  Shield,
  Send,
  Printer,
  Check,
  X,
  CreditCard,
} from 'lucide-react';

export function AdminDashboard({ activeTab = 'overview', onTabChange }) {
  const { lastSync, triggerSync } = useSync();
  const [data, setData] = useState(ADMIN_DASHBOARD_DATA);
  const [selectedYear, setSelectedYear] = useState('Năm học 2024 - 2025');
  const [selectedTerm, setSelectedTerm] = useState('Học kỳ II (Hiện tại)');

  // Sync & Feedback
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState(null);

  // Broadcast modal
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastSent, setBroadcastSent] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastContent, setBroadcastContent] = useState('');

  // User Management
  const [users, setUsers] = useState([]);
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userSearch, setUserSearch] = useState('');
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // New User Form
  const [newUserName, setNewUserName] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('teacher');
  const [newUserCode, setNewUserCode] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserClass, setNewUserClass] = useState('cls_10A1');
  const [isSavingUser, setIsSavingUser] = useState(false);

  // Classes & Teachers
  const [classesList, setClassesList] = useState([]);
  const [teachersList, setTeachersList] = useState([]);
  const [isCreateClassModalOpen, setIsCreateClassModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassGrade, setNewClassGrade] = useState(10);
  const [newClassTeacher, setNewClassTeacher] = useState('');

  // Financials & Audit
  const [financials, setFinancials] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);

  const showToast = (msg) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  // Fetch overview data
  const fetchOverview = async () => {
    const res = await adminApi.getOverview();
    if (res) setData(res);
  };

  useEffect(() => {
    fetchOverview();
  }, [lastSync]);

  // Fetch tab-specific data
  useEffect(() => {
    if (activeTab === 'roles') {
      adminApi.getUsers({ role: userRoleFilter, search: userSearch }).then((res) => {
        if (res) setUsers(res);
      });
    } else if (activeTab === 'curriculum') {
      adminApi.getClasses().then((res) => {
        if (res) setClassesList(res);
      });
    } else if (activeTab === 'teachers') {
      adminApi.getTeachers().then((res) => {
        if (res) setTeachersList(res);
      });
    } else if (activeTab === 'reports') {
      adminApi.getFinancials().then((res) => {
        if (res) setFinancials(res);
      });
    } else if (activeTab === 'settings') {
      adminApi.getAuditLogs().then((res) => {
        if (res) setAuditLogs(res);
      });
    }
  }, [activeTab, userRoleFilter, userSearch, lastSync]);

  const handleSyncMoet = async () => {
    setIsSyncing(true);
    try {
      await adminApi.syncMoet();
      await triggerSync();
      setSyncSuccess(true);
      showToast('Đồng bộ cơ sở dữ liệu học bạ số với Bộ GD&ĐT thành công!');
      await fetchOverview();
      setTimeout(() => setSyncSuccess(false), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastTitle.trim()) return;
    setBroadcastSent(true);
    try {
      await adminApi.broadcastNotice(broadcastTitle, broadcastContent);
      await triggerSync();
      showToast('Đã phát thông báo khẩn toàn trường tới tất cả các phân hệ!');
      await fetchOverview();
      setTimeout(() => {
        setBroadcastSent(false);
        setIsBroadcastModalOpen(false);
        setBroadcastTitle('');
        setBroadcastContent('');
      }, 1200);
    } catch {
      setBroadcastSent(false);
    }
  };

  // User Actions
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setIsSavingUser(true);
    try {
      const res = await adminApi.createUser({
        name: newUserName,
        username: newUserUsername,
        email: newUserEmail,
        role: newUserRole,
        code: newUserCode,
        phone: newUserPhone,
        classId: newUserClass,
      });
      if (res?.success) {
        showToast(`Tạo tài khoản ${newUserName} thành công!`);
        setIsCreateUserModalOpen(false);
        setNewUserName('');
        setNewUserUsername('');
        setNewUserEmail('');
        setNewUserCode('');
        setNewUserPhone('');
        await triggerSync();
        const updated = await adminApi.getUsers({ role: userRoleFilter, search: userSearch });
        if (updated) setUsers(updated);
      } else {
        alert(res?.message || 'Không thể tạo tài khoản');
      }
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleResetPassword = async (userId, name) => {
    if (confirm(`Bạn có chắc chắn muốn đặt lại mật khẩu cho ${name} về mặc định (123456)?`)) {
      await adminApi.resetPassword(userId);
      await triggerSync();
      showToast(`Mật khẩu của ${name} đã được đặt lại về 123456`);
    }
  };

  const handleDeleteUser = async (userId, name) => {
    if (confirm(`Bạn có chắc chắn muốn xóa tài khoản ${name}?`)) {
      await adminApi.deleteUser(userId);
      await triggerSync();
      showToast(`Đã xóa tài khoản ${name} khỏi hệ thống`);
      const updated = await adminApi.getUsers({ role: userRoleFilter, search: userSearch });
      if (updated) setUsers(updated);
    }
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    const res = await adminApi.createClass({
      name: newClassName,
      gradeLevel: Number(newClassGrade),
      academicYear: selectedYear,
      homeroomTeacherId: newClassTeacher || null,
    });
    if (res?.success) {
      showToast(`Đã mở lớp ${newClassName} thành công!`);
      setIsCreateClassModalOpen(false);
      setNewClassName('');
      await triggerSync();
      const updated = await adminApi.getClasses();
      if (updated) setClassesList(updated);
    }
  };

  return (
    <div className="space-y-6">
      {/* Global Toast */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-primary text-white px-5 py-3 rounded-card shadow-whisper flex items-center gap-3 border border-ocean/30 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
          <span className="text-xs font-medium">{feedbackToast}</span>
        </div>
      )}

      {/* Top Header & Executive Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-text-secondary mb-1">
            <span>Ban Giám Hiệu</span>
            <span>/</span>
            <span className="text-text-primary font-medium">
              {activeTab === 'overview' && 'Tổng quan toàn trường'}
              {activeTab === 'roles' && 'Phân quyền & Quản trị tài khoản'}
              {activeTab === 'curriculum' && 'Chuyên môn & Khối lớp'}
              {activeTab === 'teachers' && 'Hội đồng Sư phạm'}
              {activeTab === 'students' && 'Học sinh & Điểm số'}
              {activeTab === 'reports' && 'Báo cáo & Cổng thông báo'}
              {activeTab === 'settings' && 'Cài đặt hệ thống & Kiểm toán'}
            </span>
            <span className="text-[11px] text-text-secondary">• {data.lastSync}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-medium text-text-primary">
              {activeTab === 'overview' && 'Tổng quan tình hình trường học'}
              {activeTab === 'roles' && 'Danh mục tài khoản người dùng'}
              {activeTab === 'curriculum' && 'Cơ cấu tổ chức lớp học & Khối'}
              {activeTab === 'teachers' && 'Danh mục Hội đồng Sư phạm'}
              {activeTab === 'students' && 'Đánh giá học lực & Xếp hạng toàn trường'}
              {activeTab === 'reports' && 'Cổng thông báo & Tài chính số VietQR'}
              {activeTab === 'settings' && 'Nhật ký kiểm toán & Cấu hình bảo mật'}
            </h1>
            <Badge variant="success" size="sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Trực tuyến</span>
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="h-10 px-3 bg-white border border-hairline rounded text-xs font-medium text-text-primary focus:border-ocean outline-none"
          >
            <option>Năm học 2024 - 2025</option>
            <option>Năm học 2023 - 2024</option>
          </select>

          <select
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            className="h-10 px-3 bg-white border border-hairline rounded text-xs font-medium text-text-primary focus:border-ocean outline-none"
          >
            <option>Học kỳ II (Hiện tại)</option>
            <option>Học kỳ I</option>
          </select>

          <Button
            variant="secondary"
            size="md"
            icon={Download}
            onClick={() => window.print()}
          >
            Xuất PDF/In
          </Button>

          <Button
            variant="primary"
            size="md"
            icon={Bell}
            onClick={() => setIsBroadcastModalOpen(true)}
          >
            Thông báo toàn trường
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW DASHBOARD                                                 */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 4 Large Institutional KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card
              padding="p-5"
              className="cursor-pointer hover:border-ocean transition-colors"
              onClick={() => onTabChange?.('students')}
            >
              <div className="flex items-start justify-between">
                <div className="text-[11px] font-medium text-text-secondary uppercase tracking-wider">
                  Tổng học sinh
                </div>
                <div className="w-8 h-8 rounded bg-surface-neutral flex items-center justify-center text-primary">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-semibold text-primary">{data.kpis.students.total}</span>
                <Badge variant="success" size="sm">{data.kpis.students.diff}</Badge>
              </div>
              <div className="text-xs text-text-secondary mt-2 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                <span>{data.kpis.students.subStatus}</span>
              </div>
            </Card>

            <Card
              padding="p-5"
              className="cursor-pointer hover:border-ocean transition-colors"
              onClick={() => onTabChange?.('teachers')}
            >
              <div className="flex items-start justify-between">
                <div className="text-[11px] font-medium text-text-secondary uppercase tracking-wider">
                  Tổng giáo viên
                </div>
                <div className="w-8 h-8 rounded bg-surface-neutral flex items-center justify-center text-primary">
                  <Briefcase className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-semibold text-primary">{data.kpis.teachers.total}</span>
                <Badge variant="info" size="sm">{data.kpis.teachers.active} trực tiếp</Badge>
              </div>
              <div className="text-xs text-text-secondary mt-2">
                Tỷ lệ HS/GV: <strong>{data.kpis.teachers.ratio}</strong>
              </div>
            </Card>

            <Card
              padding="p-5"
              className="cursor-pointer hover:border-ocean transition-colors"
              onClick={() => onTabChange?.('curriculum')}
            >
              <div className="flex items-start justify-between">
                <div className="text-[11px] font-medium text-text-secondary uppercase tracking-wider">
                  Quy mô lớp học
                </div>
                <div className="w-8 h-8 rounded bg-surface-neutral flex items-center justify-center text-primary">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-semibold text-primary">{data.kpis.classes.total}</span>
                <span className="text-sm font-normal text-text-secondary">lớp</span>
              </div>
              <div className="text-xs text-text-secondary mt-2">
                {data.kpis.classes.breakdown} • {data.kpis.classes.occupancy}
              </div>
            </Card>

            <Card
              padding="p-5"
              className="cursor-pointer hover:border-ocean transition-colors"
              onClick={() => onTabChange?.('students')}
            >
              <div className="flex items-start justify-between">
                <div className="text-[11px] font-medium text-text-secondary uppercase tracking-wider">
                  Điểm TB toàn trường
                </div>
                <div className="w-8 h-8 rounded bg-surface-neutral flex items-center justify-center text-primary">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-semibold text-primary">{data.kpis.averageGpa.score}</span>
                <span className="text-xs text-text-secondary">{data.kpis.averageGpa.scale}</span>
                <Badge variant="success" size="sm">{data.kpis.averageGpa.diff}</Badge>
              </div>
              <div className="text-xs text-text-secondary mt-2">
                {data.kpis.averageGpa.note}
              </div>
            </Card>
          </div>

          {/* Academic Charts: Left Grade Comparison, Right Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Card padding="p-6" className="lg:col-span-8 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-medium text-text-primary">
                    So sánh điểm trung bình các môn theo khối
                  </h2>
                  <p className="text-xs text-text-secondary">
                    Đánh giá đồng đều năng lực học thuật giữa các khối 10, 11 và 12
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-primary"></span>
                    <span>Khối 10</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-ocean"></span>
                    <span>Khối 11</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-sky-light border border-ocean/40"></span>
                    <span>Khối 12</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                {data.gradeSubjectComparison.map((item) => (
                  <div key={item.subject} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-text-primary">{item.subject}</span>
                      <span className="text-text-secondary font-mono">
                        ĐTB: <strong>{item.avg.toFixed(2)}</strong> (K10: {item.k10} • K11: {item.k11} • K12: {item.k12})
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 h-3 bg-surface-neutral rounded overflow-hidden p-0.5">
                      <div style={{ width: `${(item.k10 / 10) * 100}%` }} className="bg-primary h-full rounded-sm"></div>
                      <div style={{ width: `${(item.k11 / 10) * 100}%` }} className="bg-ocean h-full rounded-sm"></div>
                      <div style={{ width: `${(item.k12 / 10) * 100}%` }} className="bg-sky border border-ocean/30 h-full rounded-sm"></div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card padding="p-6" className="lg:col-span-4 space-y-4">
              <div>
                <h2 className="text-base font-medium text-text-primary">Phân bổ xếp loại học lực</h2>
                <p className="text-xs text-text-secondary">Quy chuẩn thông tư Bộ GD&ĐT</p>
              </div>

              <div className="space-y-3 pt-2">
                {data.distribution.groups.map((group) => (
                  <div key={group.name} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-text-primary font-medium">{group.name}</span>
                      <span className="text-text-secondary">
                        <strong>{group.percent}%</strong> ({group.count.toLocaleString('vi-VN')} em)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-surface-neutral rounded-full overflow-hidden">
                      <div
                        style={{ width: `${group.percent}%` }}
                        className={`h-full ${group.color} rounded-full`}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-surface-neutral rounded border border-hairline text-xs text-text-secondary space-y-1">
                <div className="font-semibold text-text-primary flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-success" />
                  <span>Chuẩn chất lượng trường trọng điểm</span>
                </div>
                <p className="leading-relaxed">
                  Tỷ lệ học sinh đạt chuẩn Xuất sắc và Giỏi chiếm 66% tổng sĩ số, vượt chỉ tiêu đầu năm 4.2%.
                </p>
              </div>
            </Card>
          </div>

          {/* Bottom Grid: Alerts & Audit Logs */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Card padding="p-6" className="lg:col-span-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning-dark" />
                  <h3 className="text-base font-medium text-text-primary">Cảnh báo can thiệp sư phạm</h3>
                </div>
                <Badge variant="warning">{data.academicAlerts.length} cảnh báo</Badge>
              </div>

              <div className="space-y-3">
                {data.academicAlerts.map((alert) => (
                  <div key={alert.id} className="p-4 bg-amber-50/70 border border-amber-200 rounded-card space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-900">{alert.class}</span>
                      <Badge variant="danger" size="sm">{alert.drop}</Badge>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">{alert.content}</p>
                    <div className="text-[11px] text-ocean font-medium pt-1">{alert.teacher}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card padding="p-6" className="lg:col-span-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <h3 className="text-base font-medium text-text-primary">Nhật ký hoạt động hệ thống</h3>
                </div>
                <button
                  onClick={() => onTabChange?.('settings')}
                  className="text-xs text-ocean hover:underline font-medium"
                >
                  Xem toàn bộ
                </button>
              </div>

              <div className="space-y-3">
                {data.recentActivities.slice(0, 5).map((act) => (
                  <div key={act.id} className="p-3 bg-surface-neutral/60 rounded border border-hairline flex items-center justify-between text-xs">
                    <span className="text-text-primary font-medium">{act.text}</span>
                    <Badge variant={act.badgeType} size="sm">{act.badge}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ROLES & USER ACCOUNTS                                              */}
      {/* ========================================================================= */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-medium text-text-primary">Quản lý phân quyền & Tài khoản</h2>
              <p className="text-xs text-text-secondary mt-1">
                Quản trị toàn bộ danh sách tài khoản Học sinh, Giáo viên, Phụ huynh và Cán bộ quản lý trên cơ sở dữ liệu trường.
              </p>
            </div>
            <Button
              variant="primary"
              size="md"
              icon={Plus}
              onClick={() => setIsCreateUserModalOpen(true)}
            >
              Thêm tài khoản mới
            </Button>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-card border border-hairline">
            <div className="flex items-center gap-2 overflow-x-auto">
              {[
                { id: 'all', label: 'Tất cả vai trò' },
                { id: 'teacher', label: 'Giáo viên' },
                { id: 'student', label: 'Học sinh' },
                { id: 'parent', label: 'Phụ huynh' },
                { id: 'admin', label: 'Ban giám hiệu' },
              ].map((rf) => (
                <button
                  key={rf.id}
                  onClick={() => setUserRoleFilter(rf.id)}
                  className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                    userRoleFilter === rf.id
                      ? 'bg-primary text-white'
                      : 'bg-surface-neutral text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {rf.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-text-secondary absolute left-3 top-2.5" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Tìm tên, username, mã..."
                className="w-full pl-9 pr-3 py-2 bg-surface-neutral border border-hairline rounded text-xs text-text-primary focus:outline-none focus:border-ocean"
              />
            </div>
          </div>

          {/* Users Table */}
          <Card padding="p-0" className="overflow-hidden">
            <div className="p-4 bg-surface-neutral hairline-b flex items-center justify-between text-xs">
              <span className="font-semibold text-text-primary">
                Tìm thấy {users.length} tài khoản người dùng
              </span>
              <span className="text-text-secondary">Trạng thái: 100% tài khoản bảo mật ISO 27001</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-neutral text-text-secondary font-medium hairline-b">
                  <tr>
                    <th className="py-3 px-4">Họ và tên</th>
                    <th className="py-3 px-4">Tên đăng nhập / Mã</th>
                    <th className="py-3 px-3 text-center">Vai trò</th>
                    <th className="py-3 px-4">Email / SĐT</th>
                    <th className="py-3 px-4">Đơn vị / Lớp</th>
                    <th className="py-3 px-3 text-center">Trạng thái</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-sky/20 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120&h=120'}
                            alt={u.name}
                            className="w-7 h-7 rounded-full object-cover border border-hairline"
                          />
                          <span className="font-semibold text-text-primary">{u.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <div className="text-text-primary font-medium">{u.username}</div>
                        <div className="text-[10px] text-text-secondary">{u.code}</div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge
                          variant={
                            u.role === 'admin'
                              ? 'danger'
                              : u.role === 'teacher'
                              ? 'primary'
                              : u.role === 'student'
                              ? 'info'
                              : 'neutral'
                          }
                          size="sm"
                        >
                          {u.role === 'admin'
                            ? 'BGH'
                            : u.role === 'teacher'
                            ? 'Giáo viên'
                            : u.role === 'student'
                            ? 'Học sinh'
                            : 'Phụ huynh'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-text-secondary">
                        <div>{u.email}</div>
                        <div className="text-[10px] font-mono">{u.phone}</div>
                      </td>
                      <td className="py-3 px-4 text-text-secondary font-medium">
                        {u.class_name || (u.role === 'teacher' ? 'Tổ chuyên môn' : 'Toàn trường')}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge variant="success" size="sm">Hoạt động</Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleResetPassword(u.id, u.name)}
                            title="Đặt lại mật khẩu về 123456"
                            className="p-1.5 hover:bg-hairline rounded text-ocean transition-colors"
                          >
                            <Key className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            title="Xóa tài khoản"
                            className="p-1.5 hover:bg-danger-light rounded text-danger transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CURRICULUM & CLASSES                                               */}
      {/* ========================================================================= */}
      {activeTab === 'curriculum' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-medium text-text-primary">Cơ cấu tổ chức lớp học & Khối chuyên</h2>
              <p className="text-xs text-text-secondary mt-1">
                Quản lý các lớp học chính khóa, phân công giáo viên chủ nhiệm và phòng học cố định.
              </p>
            </div>
            <Button
              variant="primary"
              size="md"
              icon={Plus}
              onClick={() => setIsCreateClassModalOpen(true)}
            >
              Mở thêm lớp mới
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classesList.map((cls) => (
              <Card key={cls.id} padding="p-5" className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-primary">Lớp {cls.name}</h3>
                    <div className="text-xs text-text-secondary">Khối {cls.grade_level} • Năm học {cls.academic_year}</div>
                  </div>
                  <Badge variant="info">Phòng 302</Badge>
                </div>

                <div className="p-3 bg-surface-neutral rounded border border-hairline text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Sĩ số học sinh:</span>
                    <span className="font-semibold text-text-primary">{cls.student_count || 38} em</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Điểm trung bình lớp:</span>
                    <span className="font-bold text-ocean font-mono">{cls.avg_gpa || '8.65'} / 10</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Giáo viên chủ nhiệm:</span>
                    <span className="font-medium text-primary">{cls.homeroom_teacher_name || 'Cô Lê Hoàng Lan'}</span>
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between text-xs">
                  <span className="text-text-secondary">Chuyên cần: 99.2%</span>
                  <button className="text-ocean hover:underline font-medium">Chi tiết lớp →</button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: TEACHERS DIRECTORY                                                 */}
      {/* ========================================================================= */}
      {activeTab === 'teachers' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-medium text-text-primary">Danh mục Hội đồng Sư phạm</h2>
              <p className="text-xs text-text-secondary mt-1">
                Toàn bộ đội ngũ cán bộ giảng dạy, tổ chuyên môn và lịch công tác phân bổ.
              </p>
            </div>
            <Badge variant="info">Tổng 127 Giáo viên</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teachersList.map((t) => (
              <Card key={t.id} padding="p-5" className="flex flex-col justify-between space-y-3">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={t.avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=120&h=120'}
                      alt={t.name}
                      className="w-12 h-12 rounded-full object-cover border border-hairline"
                    />
                    <div>
                      <div className="text-sm font-semibold text-text-primary">{t.name}</div>
                      <div className="text-xs text-ocean font-medium">{t.department}</div>
                      <div className="text-[11px] text-text-secondary font-mono">{t.code}</div>
                    </div>
                  </div>

                  <div className="p-3 bg-surface-neutral rounded border border-hairline text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Chủ nhiệm:</span>
                      <span className="font-semibold text-text-primary">{t.homeroomClass}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Định mức tiết dạy:</span>
                      <span className="font-medium text-text-primary">{t.workload}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Email:</span>
                      <span className="font-mono text-[11px] text-text-secondary">{t.email}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 hairline-t flex items-center justify-between text-xs">
                  <Badge variant="success" size="sm">Đang giảng dạy</Badge>
                  <button className="text-ocean hover:underline font-medium">Hồ sơ chuyên môn</button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: STUDENTS & ACADEMIC RANKINGS                                       */}
      {/* ========================================================================= */}
      {activeTab === 'students' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-medium text-text-primary">Đánh giá học lực & Xếp hạng toàn trường</h2>
              <p className="text-xs text-text-secondary mt-1">
                Thống kê học sinh giỏi tiêu biểu, năng lực các khối và danh sách cần hỗ trợ bồi dưỡng.
              </p>
            </div>
            <Button variant="secondary" size="md" icon={Printer} onClick={() => window.print()}>
              In báo cáo học lực
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Students */}
            <Card padding="p-6" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-ocean" />
                  <h3 className="text-base font-medium text-text-primary">Top 5 học sinh xuất sắc tiêu biểu</h3>
                </div>
                <Badge variant="success">Điểm GPA {'>'} 9.2</Badge>
              </div>

              <div className="space-y-3">
                {[
                  { name: 'Nguyễn Minh Châu', class: 'Lớp 7B', gpa: '9.20', badge: 'Thủ khoa THCS' },
                  { name: 'Nguyễn Minh Khôi', class: 'Lớp 10A1', gpa: '8.96', badge: 'Giải Nhất Sáng tạo Robot' },
                  { name: 'Trần Thảo Linh', class: 'Lớp 11A1', gpa: '9.35', badge: 'Đội tuyển HSG Quốc gia' },
                  { name: 'Vũ Đức Nam', class: 'Lớp 12 Chuyên Toán', gpa: '9.45', badge: 'Thủ khoa kỳ thi thử' },
                  { name: 'Phạm Quỳnh Anh', class: 'Lớp 10A2', gpa: '9.15', badge: 'Huy chương Bạc Tin học trẻ' },
                ].map((st, idx) => (
                  <div key={idx} className="p-3 bg-surface-neutral rounded border border-hairline flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-semibold text-text-primary">{st.name}</div>
                        <div className="text-[11px] text-text-secondary">{st.class} • {st.badge}</div>
                      </div>
                    </div>
                    <span className="font-bold text-base text-ocean font-mono">{st.gpa}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Academic Interventions */}
            <Card padding="p-6" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning-dark" />
                  <h3 className="text-base font-medium text-text-primary">Học sinh cần phụ đạo / Bồi dưỡng sớm</h3>
                </div>
                <Badge variant="warning">3 học sinh</Badge>
              </div>

              <div className="space-y-3">
                {[
                  { name: 'Hoàng Văn Bách', class: 'Lớp 10A1', gpa: '6.2', issue: 'Hổng kiến thức Hình học không gian', note: 'Đã giao bài tập bổ trợ trên hệ thống AI' },
                  { name: 'Lê Tuấn Tú', class: 'Lớp 10A5', gpa: '5.8', issue: 'Điểm kiểm tra Đại số đợt 2 dưới trung bình', note: 'GVBM đã hẹn phụ đạo sau giờ học' },
                  { name: 'Đỗ Thúy Vy', class: 'Lớp 11B5', gpa: '6.4', issue: 'Vắng 2 buổi thực hành Vật lý', note: 'Đã gửi thông báo tới phụ huynh' },
                ].map((st, idx) => (
                  <div key={idx} className="p-3.5 bg-amber-50/70 border border-amber-200 rounded text-xs space-y-1">
                    <div className="flex items-center justify-between font-semibold text-text-primary">
                      <span>{st.name} • {st.class}</span>
                      <Badge variant="danger" size="sm">ĐTB: {st.gpa}</Badge>
                    </div>
                    <div className="text-text-secondary">{st.issue}</div>
                    <div className="text-[11px] text-ocean font-medium pt-1">Tiến độ: {st.note}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: REPORTS & BROADCAST CENTER                                         */}
      {/* ========================================================================= */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-medium text-text-primary">Báo cáo tổng hợp & Cổng phát thông báo toàn trường</h2>
              <p className="text-xs text-text-secondary mt-1">
                Phát thanh thông điệp khẩn cấp đồng bộ tới tất cả học sinh, giáo viên, phụ huynh và đối soát tài chính số.
              </p>
            </div>
            <Button
              variant="primary"
              size="md"
              icon={Bell}
              onClick={() => setIsBroadcastModalOpen(true)}
            >
              Soạn thông báo khẩn
            </Button>
          </div>

          {/* Financial Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card padding="p-5">
              <div className="text-xs text-text-secondary">Tổng học phí đã lập hóa đơn</div>
              <div className="text-2xl font-bold text-primary mt-1">
                {financials?.totalBilled || '7.953.250.000'} đ
              </div>
              <div className="text-xs text-text-secondary mt-2">Học kỳ I (2.450 học sinh)</div>
            </Card>

            <Card padding="p-5">
              <div className="text-xs text-text-secondary">Thu qua cổng VietQR Napas 24/7</div>
              <div className="text-2xl font-bold text-success mt-1">
                {financials?.totalCollected || '7.523.250.000'} đ
              </div>
              <div className="text-xs text-success mt-2 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Tỷ lệ hoàn thành: {financials?.collectionRate || '95.1%'}</span>
              </div>
            </Card>

            <Card padding="p-5">
              <div className="text-xs text-text-secondary">Số tiền chưa thu / Quá hạn</div>
              <div className="text-2xl font-bold text-warning-dark mt-1">
                {financials?.pendingAmount || '430.000.000'} đ
              </div>
              <div className="text-xs text-text-secondary mt-2">Đã tự động gửi SMS & App thông báo nhắc nợ</div>
            </Card>
          </div>

          {/* Quick Broadcast Box */}
          <Card padding="p-6" className="space-y-4">
            <div className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              <h3 className="text-base font-semibold text-text-primary">Trung tâm phát thông báo toàn trường</h3>
            </div>
            <form onSubmit={handleSendBroadcast} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Tiêu đề thông báo</label>
                <input
                  type="text"
                  required
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="Ví dụ: Kế hoạch nghỉ lễ và đảm bảo an toàn học sinh..."
                  className="w-full px-3.5 py-2 text-xs bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Nội dung chi tiết</label>
                <textarea
                  rows={3}
                  required
                  value={broadcastContent}
                  onChange={(e) => setBroadcastContent(e.target.value)}
                  placeholder="Nội dung truyền tải sẽ lập tức xuất hiện trên Banner khẩn cấp của toàn bộ tài khoản Học sinh, Giáo viên và Phụ huynh..."
                  className="w-full px-3.5 py-2 text-xs bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean"
                />
              </div>
              <div className="flex justify-end">
                <Button variant="primary" size="md" icon={Send} disabled={broadcastSent || !broadcastTitle.trim()}>
                  {broadcastSent ? 'Đang phát thanh...' : 'Phát thông báo ngay'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: SETTINGS & AUDIT LOGS                                              */}
      {/* ========================================================================= */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-medium text-text-primary">Cài đặt hệ thống & Nhật ký kiểm toán an ninh</h2>
              <p className="text-xs text-text-secondary mt-1">
                Ghi vết hoạt động toàn trường, quản lý kết nối chuẩn dữ liệu quốc gia và bảo mật ISO 27001.
              </p>
            </div>
            <Button
              variant="secondary"
              size="md"
              icon={RefreshCw}
              disabled={isSyncing}
              onClick={handleSyncMoet}
            >
              {isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ dữ liệu Bộ GD&ĐT'}
            </Button>
          </div>

          {/* MOET Sync Status Card */}
          <Card padding="p-5" className="border-l-4 border-l-ocean flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-ocean" />
                <span className="text-sm font-semibold text-text-primary">Kết nối cổng thông tin Bộ GD&ĐT (EMIS / ISO 27001)</span>
                <Badge variant="success" size="sm">Đang đồng bộ</Badge>
              </div>
              <p className="text-xs text-text-secondary">
                Học bạ điện tử và chứng nhận số của 2.450 học sinh được đối soát an toàn theo quy chuẩn quốc gia.
              </p>
            </div>
            <div className="text-xs text-text-secondary font-mono">
              Lần đồng bộ cuối: Hôm nay 08:30:00
            </div>
          </Card>

          {/* Audit Logs Table */}
          <Card padding="p-0" className="overflow-hidden">
            <div className="p-4 bg-surface-neutral hairline-b">
              <h3 className="text-sm font-semibold text-text-primary">Nhật ký kiểm toán an ninh & Hành động người dùng</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-neutral text-text-secondary font-medium hairline-b">
                  <tr>
                    <th className="py-3 px-4">Thời gian</th>
                    <th className="py-3 px-4">Người thực hiện</th>
                    <th className="py-3 px-3 text-center">Vai trò</th>
                    <th className="py-3 px-6">Hành động / Thao tác trên hệ thống</th>
                    <th className="py-3 px-4 text-center">Phân loại</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-sky/20 transition-colors">
                      <td className="py-3 px-4 font-mono text-text-secondary">{log.created_at}</td>
                      <td className="py-3 px-4 font-semibold text-text-primary">{log.actor_name}</td>
                      <td className="py-3 px-3 text-center">
                        <Badge variant="neutral" size="sm">{log.role}</Badge>
                      </td>
                      <td className="py-3 px-6 text-text-primary">{log.action}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={log.badge_type} size="sm">{log.badge}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE USER MODAL                                                */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isCreateUserModalOpen}
        onClose={() => setIsCreateUserModalOpen(false)}
        title="Tạo tài khoản người dùng mới"
      >
        <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
          <div>
            <label className="block text-text-secondary mb-1 font-medium">Họ và tên (*)</label>
            <input
              type="text"
              required
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              placeholder="Ví dụ: Thầy Nguyễn Văn An"
              className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-secondary mb-1 font-medium">Tên đăng nhập (*)</label>
              <input
                type="text"
                required
                value={newUserUsername}
                onChange={(e) => setNewUserUsername(e.target.value)}
                placeholder="vanan.nguyen"
                className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean font-mono"
              />
            </div>
            <div>
              <label className="block text-text-secondary mb-1 font-medium">Vai trò phân quyền (*)</label>
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value)}
                className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean"
              >
                <option value="teacher">Giáo viên</option>
                <option value="student">Học sinh</option>
                <option value="parent">Phụ huynh</option>
                <option value="admin">Ban Giám Hiệu</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-secondary mb-1 font-medium">Email</label>
              <input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="vanan@school.edu.vn"
                className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean"
              />
            </div>
            <div>
              <label className="block text-text-secondary mb-1 font-medium">Số điện thoại</label>
              <input
                type="text"
                value={newUserPhone}
                onChange={(e) => setNewUserPhone(e.target.value)}
                placeholder="0912 345 678"
                className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-secondary mb-1 font-medium">Mã định danh</label>
              <input
                type="text"
                value={newUserCode}
                onChange={(e) => setNewUserCode(e.target.value)}
                placeholder="GV-2024-08"
                className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean font-mono"
              />
            </div>
            {newUserRole === 'student' && (
              <div>
                <label className="block text-text-secondary mb-1 font-medium">Lớp học chính khóa</label>
                <select
                  value={newUserClass}
                  onChange={(e) => setNewUserClass(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean"
                >
                  <option value="cls_10A1">Lớp 10A1</option>
                  <option value="cls_10A2">Lớp 10A2</option>
                  <option value="cls_07B">Lớp 7B</option>
                </select>
              </div>
            )}
          </div>

          <div className="p-3 bg-sky/30 border border-ocean/20 rounded text-[11px] text-text-secondary">
            Mật khẩu khởi tạo mặc định là: <strong className="font-mono text-ocean">123456</strong>. Người dùng sẽ được yêu cầu đổi mật khẩu ở lần đăng nhập đầu tiên.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setIsCreateUserModalOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSavingUser}
            >
              {isSavingUser ? 'Đang tạo...' : 'Tạo tài khoản'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: CREATE CLASS MODAL                                               */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isCreateClassModalOpen}
        onClose={() => setIsCreateClassModalOpen(false)}
        title="Mở thêm lớp học mới"
      >
        <form onSubmit={handleCreateClass} className="space-y-4 text-xs">
          <div>
            <label className="block text-text-secondary mb-1 font-medium">Tên lớp học (*)</label>
            <input
              type="text"
              required
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              placeholder="Ví dụ: 10A3 hoặc 11A4"
              className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-secondary mb-1 font-medium">Khối học</label>
              <select
                value={newClassGrade}
                onChange={(e) => setNewClassGrade(e.target.value)}
                className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean"
              >
                <option value={10}>Khối 10 (THPT)</option>
                <option value={11}>Khối 11 (THPT)</option>
                <option value={12}>Khối 12 (THPT)</option>
                <option value={7}>Khối 7 (THCS)</option>
              </select>
            </div>
            <div>
              <label className="block text-text-secondary mb-1 font-medium">Năm học</label>
              <input
                type="text"
                disabled
                value={selectedYear}
                className="w-full px-3 py-2 bg-surface-neutral/60 border border-hairline rounded text-text-secondary"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setIsCreateClassModalOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
            >
              Mở lớp học
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: BROADCAST MODAL                                                  */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isBroadcastModalOpen}
        onClose={() => setIsBroadcastModalOpen(false)}
        title="Phát thông báo khẩn cấp toàn trường"
      >
        <form onSubmit={handleSendBroadcast} className="space-y-4 text-xs">
          <div>
            <label className="block text-text-secondary mb-1 font-medium">Tiêu đề thông báo (*)</label>
            <input
              type="text"
              required
              value={broadcastTitle}
              onChange={(e) => setBroadcastTitle(e.target.value)}
              placeholder="Nhập tiêu đề thông báo từ Ban Giám Hiệu..."
              className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean"
            />
          </div>

          <div>
            <label className="block text-text-secondary mb-1 font-medium">Nội dung chi tiết (*)</label>
            <textarea
              rows={4}
              required
              value={broadcastContent}
              onChange={(e) => setBroadcastContent(e.target.value)}
              placeholder="Ghi rõ thông điệp khẩn cấp hoặc kế hoạch..."
              className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean"
            />
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-900 leading-relaxed">
            Thông báo này sẽ phát trực tiếp lên thanh Broadcast Banner của 2.450 học sinh, 127 giáo viên và phụ huynh.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setIsBroadcastModalOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              icon={Send}
              disabled={broadcastSent || !broadcastTitle.trim()}
            >
              {broadcastSent ? 'Đang phát thanh...' : 'Phát thông báo ngay'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// =============================================================================
// DepartmentDashboardPage — G39 Department Head Dashboard
// Team overview, teaching progress, pending lesson plans
// =============================================================================

import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardList,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { PageLoader } from '../../components/LoadingState';
import { apiRequest } from '../../services/api';

// Type definitions
interface TeamMember {
  id: string;
  name: string;
  avatar: string;
  subject: string;
  status: 'active' | 'on_leave' | 'busy';
  pendingPlans: number;
  gradedRate: number;
}

interface PendingItem {
  id: string;
  type: 'lesson_plan' | 'material' | 'exam';
  title: string;
  submitter: string;
  className: string;
  submittedAt: string;
  priority: 'high' | 'normal' | 'low';
}

// Mock data
const MOCK_TEAM: TeamMember[] = [
  { id: '1', name: 'Nguyễn Thị Lan Anh', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120&h=120', subject: 'Toán', status: 'active', pendingPlans: 2, gradedRate: 95 },
  { id: '2', name: 'Trần Văn Minh', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120&h=120', subject: 'Toán', status: 'busy', pendingPlans: 0, gradedRate: 88 },
  { id: '3', name: 'Lê Thị Hương', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=120&h=120', subject: 'Toán', status: 'on_leave', pendingPlans: 3, gradedRate: 0 },
  { id: '4', name: 'Phạm Quốc Hùng', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=120&h=120', subject: 'Toán', status: 'active', pendingPlans: 1, gradedRate: 92 },
];

const MOCK_PENDING: PendingItem[] = [
  { id: '1', type: 'lesson_plan', title: 'Kế hoạch giảng dạy chương 3 - Hàm số', submitter: 'Nguyễn Thị Lan Anh', className: '11A1', submittedAt: '2026-09-25T08:00:00Z', priority: 'high' },
  { id: '2', type: 'lesson_plan', title: 'Bài giảng Hình học không gian', submitter: 'Phạm Quốc Hùng', className: '12A2', submittedAt: '2026-09-24T16:30:00Z', priority: 'normal' },
  { id: '3', type: 'material', title: 'Tài liệu ôn tập giữa kỳ', submitter: 'Nguyễn Thị Lan Anh', className: '10A1', submittedAt: '2026-09-24T10:00:00Z', priority: 'normal' },
  { id: '4', type: 'exam', title: 'Ma trận đề thi học kỳ 1', submitter: 'Trần Văn Minh', className: '10A1, 10A2', submittedAt: '2026-09-23T14:00:00Z', priority: 'high' },
];

export function DepartmentDashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [pending, setPending] = useState<PendingItem[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Simulate API calls
      await new Promise(resolve => setTimeout(resolve, 500));
      setTeam(MOCK_TEAM);
      setPending(MOCK_PENDING);
    } catch (err) {
      console.error('Failed to fetch department data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <PageLoader />
      </div>
    );
  }

  const stats = {
    totalTeachers: team.length,
    activeTeachers: team.filter(t => t.status === 'active').length,
    pendingPlans: pending.filter(p => p.type === 'lesson_plan').length,
    avgGradedRate: Math.round(team.reduce((acc, t) => acc + t.gradedRate, 0) / team.length),
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-medium text-text-primary">Tổng quan Tổ Bộ Môn</h1>
        <p className="text-sm text-text-secondary mt-1">
          Theo dõi hoạt động và tiến độ giảng dạy của bộ môn
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <Users className="w-6 h-6 text-ocean mx-auto mb-2" />
          <p className="text-2xl font-semibold text-text-primary">{stats.totalTeachers}</p>
          <p className="text-xs text-text-secondary">Giáo viên</p>
        </Card>
        <Card className="p-4 text-center">
          <CheckCircle className="w-6 h-6 text-success mx-auto mb-2" />
          <p className="text-2xl font-semibold text-success">{stats.activeTeachers}</p>
          <p className="text-xs text-text-secondary">Đang hoạt động</p>
        </Card>
        <Card className="p-4 text-center">
          <Clock className="w-6 h-6 text-warning mx-auto mb-2" />
          <p className="text-2xl font-semibold text-warning">{stats.pendingPlans}</p>
          <p className="text-xs text-text-secondary">Chờ duyệt kế hoạch</p>
        </Card>
        <Card className="p-4 text-center">
          <TrendingUp className="w-6 h-6 text-ocean mx-auto mb-2" />
          <p className="text-2xl font-semibold text-text-primary">{stats.avgGradedRate}%</p>
          <p className="text-xs text-text-secondary">Tỷ lệ chấm bài</p>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Overview */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-text-primary">Đội ngũ Bộ môn</h2>
            <button
              onClick={() => navigate('/leadership/staff')}
              className="text-sm text-ocean hover:underline flex items-center gap-1"
            >
              Chi tiết
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            {team.map((member) => (
              <div key={member.id} className="flex items-center gap-3 p-3 bg-surface-neutral rounded-lg">
                <img
                  src={member.avatar}
                  alt={member.name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-hairline"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-text-primary truncate">{member.name}</p>
                    <Badge
                      variant={member.status === 'active' ? 'success' : member.status === 'on_leave' ? 'warning' : 'info'}
                      size="sm"
                    >
                      {member.status === 'active' ? 'Hoạt động' : member.status === 'on_leave' ? 'Nghỉ phép' : 'Bận'}
                    </Badge>
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">{member.subject}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-text-primary">{member.gradedRate}%</p>
                  <p className="text-[10px] text-text-secondary">Đã chấm</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Pending Approvals */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-text-primary">Chờ phê duyệt</h2>
            <button
              onClick={() => navigate('/department/lesson-plans')}
              className="text-sm text-ocean hover:underline flex items-center gap-1"
            >
              Xem tất cả
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            {pending.map((item) => (
              <div
                key={item.id}
                className={`p-3 rounded-lg border ${
                  item.priority === 'high'
                    ? 'bg-danger-light/20 border-danger/30'
                    : 'bg-surface-neutral border-transparent'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{item.title}</p>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {item.submitter} • {item.className}
                    </p>
                  </div>
                  <Badge
                    variant={item.type === 'lesson_plan' ? 'info' : item.type === 'exam' ? 'warning' : 'default'}
                    size="sm"
                  >
                    {item.type === 'lesson_plan' ? 'Kế hoạch' : item.type === 'exam' ? 'Đề thi' : 'Tài liệu'}
                  </Badge>
                </div>
                <p className="text-[10px] text-text-secondary mt-2">
                  {new Date(item.submittedAt).toLocaleString('vi-VN')}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Teaching Progress */}
      <Card className="p-5">
        <h2 className="text-lg font-medium text-text-primary mb-4">Tiến độ giảng dạy theo lớp</h2>
        <div className="space-y-4">
          {[
            { className: '10A1', progress: 65, topic: 'Hàm số bậc nhất' },
            { className: '10A2', progress: 60, topic: 'Phương trình' },
            { className: '11A1', progress: 75, topic: 'Hình học không gian' },
            { className: '11A2', progress: 70, topic: 'Lượng giác' },
            { className: '12A1', progress: 80, topic: 'Tích phân' },
          ].map((item) => (
            <div key={item.className} className="flex items-center gap-4">
              <span className="w-16 text-sm font-medium text-text-primary">{item.className}</span>
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-text-secondary">{item.topic}</span>
                  <span className="font-medium text-text-primary">{item.progress}%</span>
                </div>
                <div className="h-2 bg-surface-neutral rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      item.progress >= 75 ? 'bg-success' : item.progress >= 50 ? 'bg-ocean' : 'bg-warning'
                    }`}
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

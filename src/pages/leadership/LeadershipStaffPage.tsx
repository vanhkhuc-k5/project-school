// =============================================================================
// LeadershipStaffPage — G39 Teacher Management for Leadership
// Teacher profiles, assignments, workload, evaluations
// =============================================================================

import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  Star,
  TrendingUp,
  BookOpen,
  Calendar,
  MoreVertical,
  Mail,
  Phone,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { PageLoader } from '../../components/LoadingState';
import { EmptyState } from '../../components/EmptyState';
import { apiRequest } from '../../services/api';

// Type definitions
interface TeacherProfile {
  id: string;
  name: string;
  avatar: string;
  email: string;
  phone: string;
  subject: string;
  department: string;
  classes: number;
  students: number;
  assignments: number;
  gradedAssignments: number;
  evaluation: {
    score: number;
    trend: 'up' | 'down' | 'stable';
    period: string;
  };
  status: 'active' | 'on_leave' | 'inactive';
}

interface StaffFilters {
  search: string;
  department: string;
  status: string;
  sortBy: 'name' | 'workload' | 'evaluation' | 'recent';
}

// Mock data for development
const MOCK_TEACHERS: TeacherProfile[] = [
  {
    id: '1',
    name: 'Nguyễn Thị Lan Anh',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120&h=120',
    email: 'lananh@truonghoc.edu.vn',
    phone: '0912 345 678',
    subject: 'Toán',
    department: 'Toán học',
    classes: 4,
    students: 142,
    assignments: 28,
    gradedAssignments: 24,
    evaluation: { score: 4.5, trend: 'up', period: 'Học kỳ 1' },
    status: 'active',
  },
  {
    id: '2',
    name: 'Trần Văn Minh',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120&h=120',
    email: 'minhtran@truonghoc.edu.vn',
    phone: '0934 567 890',
    subject: 'Vật lý',
    department: 'Khoa học Tự nhiên',
    classes: 3,
    students: 108,
    assignments: 21,
    gradedAssignments: 21,
    evaluation: { score: 4.2, trend: 'stable', period: 'Học kỳ 1' },
    status: 'active',
  },
  {
    id: '3',
    name: 'Lê Thị Hương',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=120&h=120',
    email: 'huongle@truonghoc.edu.vn',
    phone: '0901 234 567',
    subject: 'Ngữ văn',
    department: 'Ngôn ngữ',
    classes: 5,
    students: 178,
    assignments: 35,
    gradedAssignments: 30,
    evaluation: { score: 4.8, trend: 'up', period: 'Học kỳ 1' },
    status: 'active',
  },
  {
    id: '4',
    name: 'Phạm Quốc Hùng',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=120&h=120',
    email: 'hungpham@truonghoc.edu.vn',
    phone: '0987 654 321',
    subject: 'Hóa học',
    department: 'Khoa học Tự nhiên',
    classes: 3,
    students: 95,
    assignments: 18,
    gradedAssignments: 15,
    evaluation: { score: 3.9, trend: 'down', period: 'Học kỳ 1' },
    status: 'active',
  },
  {
    id: '5',
    name: 'Đỗ Thị Mai',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=120&h=120',
    email: 'maido@truonghoc.edu.vn',
    phone: '0963 852 741',
    subject: 'Tiếng Anh',
    department: 'Ngôn ngữ',
    classes: 4,
    students: 156,
    assignments: 32,
    gradedAssignments: 32,
    evaluation: { score: 4.6, trend: 'up', period: 'Học kỳ 1' },
    status: 'on_leave',
  },
];

const DEPARTMENTS = [
  'Tất cả',
  'Toán học',
  'Khoa học Tự nhiên',
  'Ngôn ngữ',
  'Xã hội',
  'Nghệ thuật',
  'Thể chất',
];

// Evaluation Badge
function EvaluationBadge({ score, trend }: { score: number; trend: 'up' | 'down' | 'stable' }) {
  const getVariant = (score: number) => {
    if (score >= 4.5) return 'success';
    if (score >= 3.5) return 'info';
    if (score >= 2.5) return 'warning';
    return 'danger';
  };

  const getLabel = (score: number) => {
    if (score >= 4.5) return 'Xuất sắc';
    if (score >= 3.5) return 'Tốt';
    if (score >= 2.5) return 'Đạt';
    return 'Cần cải thiện';
  };

  return (
    <div className="flex items-center gap-2">
      <Badge variant={getVariant(score)} size="sm">
        {score.toFixed(1)} - {getLabel(score)}
      </Badge>
      {trend === 'up' && <TrendingUp className="w-4 h-4 text-success" />}
      {trend === 'down' && <TrendingUp className="w-4 h-4 text-danger rotate-180" />}
    </div>
  );
}

// Teacher Card
function TeacherCard({ teacher }: { teacher: TeacherProfile }) {
  const [expanded, setExpanded] = useState(false);
  const workloadPercent = Math.round((teacher.assignments / 40) * 100);

  return (
    <Card className="p-4">
      <div className="flex items-start gap-4">
        <img
          src={teacher.avatar}
          alt={teacher.name}
          className="w-14 h-14 rounded-full object-cover border-2 border-hairline"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-medium text-text-primary">{teacher.name}</h3>
              <p className="text-sm text-text-secondary">{teacher.subject} • {teacher.department}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={teacher.status === 'active' ? 'success' : teacher.status === 'on_leave' ? 'warning' : 'default'}
                size="sm"
              >
                {teacher.status === 'active' ? 'Đang dạy' : teacher.status === 'on_leave' ? 'Nghỉ phép' : 'Không hoạt động'}
              </Badge>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-3">
            <div className="text-center p-2 bg-surface-neutral rounded-lg">
              <p className="text-lg font-semibold text-ocean">{teacher.classes}</p>
              <p className="text-[10px] text-text-secondary">Lớp</p>
            </div>
            <div className="text-center p-2 bg-surface-neutral rounded-lg">
              <p className="text-lg font-semibold text-ocean">{teacher.students}</p>
              <p className="text-[10px] text-text-secondary">Học sinh</p>
            </div>
            <div className="text-center p-2 bg-surface-neutral rounded-lg">
              <p className="text-lg font-semibold text-ocean">{teacher.gradedAssignments}/{teacher.assignments}</p>
              <p className="text-[10px] text-text-secondary">Đã chấm</p>
            </div>
          </div>

          {/* Workload Progress */}
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-text-secondary">Khối lượng công việc</span>
              <span className="text-text-secondary">{workloadPercent}%</span>
            </div>
            <div className="h-1.5 bg-surface-neutral rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  workloadPercent >= 80 ? 'bg-warning' : 'bg-ocean'
                }`}
                style={{ width: `${workloadPercent}%` }}
              />
            </div>
          </div>

          {/* Evaluation */}
          <div className="mt-3 flex items-center justify-between">
            <EvaluationBadge score={teacher.evaluation.score} trend={teacher.evaluation.trend} />
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-ocean hover:underline flex items-center gap-1"
            >
              {expanded ? 'Thu gọn' : 'Chi tiết'}
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {/* Expanded Details */}
          {expanded && (
            <div className="mt-4 pt-4 border-t border-hairline space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-text-secondary" />
                <a href={`mailto:${teacher.email}`} className="text-ocean hover:underline">
                  {teacher.email}
                </a>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-text-secondary" />
                <span className="text-text-primary">{teacher.phone}</span>
              </div>
              <div className="flex gap-2 mt-3">
                <Button variant="secondary" size="sm" className="flex-1">
                  Xem hồ sơ
                </Button>
                <Button variant="secondary" size="sm" className="flex-1">
                  Giao việc
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export function LeadershipStaffPage() {
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [filters, setFilters] = useState<StaffFilters>({
    search: '',
    department: 'Tất cả',
    status: 'all',
    sortBy: 'name',
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const response = await apiRequest<TeacherProfile[]>('/api/leadership/teachers', {
        method: 'GET',
      });

      if (response.success && response.data) {
        setTeachers(response.data);
      } else {
        setTeachers(MOCK_TEACHERS);
      }
    } catch {
      setTeachers(MOCK_TEACHERS);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort teachers
  const filteredTeachers = teachers
    .filter((teacher) => {
      if (filters.search && !teacher.name.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      if (filters.department !== 'Tất cả' && teacher.department !== filters.department) {
        return false;
      }
      if (filters.status !== 'all' && teacher.status !== filters.status) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      switch (filters.sortBy) {
        case 'name':
          return a.name.localeCompare(b.name, 'vi');
        case 'workload':
          return b.assignments - a.assignments;
        case 'evaluation':
          return b.evaluation.score - a.evaluation.score;
        default:
          return 0;
      }
    });

  // Stats
  const stats = {
    total: teachers.length,
    active: teachers.filter((t) => t.status === 'active').length,
    onLeave: teachers.filter((t) => t.status === 'on_leave').length,
    avgEvaluation: (teachers.reduce((acc, t) => acc + t.evaluation.score, 0) / teachers.length).toFixed(1),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <PageLoader />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium text-text-primary">Đội ngũ Giáo viên</h1>
          <p className="text-sm text-text-secondary mt-1">
            Quản lý và theo dõi thông tin giáo viên
          </p>
        </div>
        <Button variant="primary">
          <BookOpen className="w-4 h-4 mr-2" />
          Thêm Giáo viên
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <Users className="w-6 h-6 text-ocean mx-auto mb-2" />
          <p className="text-2xl font-semibold text-text-primary">{stats.total}</p>
          <p className="text-xs text-text-secondary">Tổng số</p>
        </Card>
        <Card className="p-4 text-center">
          <Star className="w-6 h-6 text-success mx-auto mb-2" />
          <p className="text-2xl font-semibold text-text-primary">{stats.avgEvaluation}</p>
          <p className="text-xs text-text-secondary">Đánh giá TB</p>
        </Card>
        <Card className="p-4 text-center">
          <BookOpen className="w-6 h-6 text-ocean mx-auto mb-2" />
          <p className="text-2xl font-semibold text-text-primary">{stats.active}</p>
          <p className="text-xs text-text-secondary">Đang dạy</p>
        </Card>
        <Card className="p-4 text-center">
          <Calendar className="w-6 h-6 text-warning mx-auto mb-2" />
          <p className="text-2xl font-semibold text-text-primary">{stats.onLeave}</p>
          <p className="text-xs text-text-secondary">Nghỉ phép</p>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Tìm kiếm giáo viên..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              icon={Search}
              className="w-full"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as StaffFilters['sortBy'] })}
              className="px-3 py-2 border border-hairline rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30"
            >
              <option value="name">Theo tên</option>
              <option value="workload">Theo khối lượng</option>
              <option value="evaluation">Theo đánh giá</option>
            </select>
            <Button
              variant="secondary"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Bộ lọc
            </Button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-hairline">
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block text-xs text-text-secondary mb-1">Bộ môn</label>
                <select
                  value={filters.department}
                  onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                  className="px-3 py-2 border border-hairline rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Trạng thái</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="px-3 py-2 border border-hairline rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30"
                >
                  <option value="all">Tất cả</option>
                  <option value="active">Đang dạy</option>
                  <option value="on_leave">Nghỉ phép</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilters({ search: '', department: 'Tất cả', status: 'all', sortBy: 'name' })}
                >
                  Xóa bộ lọc
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Teacher List */}
      {filteredTeachers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Không tìm thấy giáo viên"
          description="Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredTeachers.map((teacher) => (
            <TeacherCard key={teacher.id} teacher={teacher} />
          ))}
        </div>
      )}
    </div>
  );
}

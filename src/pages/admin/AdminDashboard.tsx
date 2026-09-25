// =============================================================================
// AdminDashboard — Admin V2 Phase 01: Command Center (TypeScript)
// Uses REAL data from dashboard API. No fake numbers.
// =============================================================================
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { dashboardApi, DashboardMetrics } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  Briefcase,
  UserRound,
  Layers,
  AlertTriangle,
  Info,
  AlertCircle,
  RefreshCw,
  Clock,
  CheckCircle2,
  Bell,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ── Type Definitions ───────────────────────────────────────────────────────────

type Priority = 'critical' | 'warning' | 'info';
type Alert = DashboardMetrics['alerts'][number];

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: number | undefined;
  subValue?: string;
  variant?: 'default' | 'highlighted' | 'success' | 'warning' | 'danger';
  onClick?: () => void;
  loading?: boolean;
}

interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
}

interface AttendanceRates {
  present: number;
  absent: number;
  late: number;
  excused: number;
}

interface AttendanceData {
  date?: string;
  summary: AttendanceSummary;
  rates: AttendanceRates;
}

interface AssignmentsData {
  total?: number;
  draft?: number;
  published?: number;
  closed?: number;
  overdue?: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatNumber(num: number | undefined | null): string {
  if (num === null || num === undefined) return '—';
  return num.toLocaleString('vi-VN');
}

function formatRelativeTime(dateStr: string | undefined | null): string {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  if (days < 7) return `${days} ngày trước`;
  return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

// ── Priority Badge ─────────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: Priority }): React.ReactElement {
  const config: Record<Priority, { variant: 'danger' | 'warning' | 'info'; icon: LucideIcon; label: string }> = {
    critical: { variant: 'danger', icon: AlertTriangle, label: 'Khẩn cấp' },
    warning: { variant: 'warning', icon: AlertCircle, label: 'Cảnh báo' },
    info: { variant: 'info', icon: Info, label: 'Thông tin' },
  };
  const cfg = config[priority] || config.info;
  const Icon = cfg.icon;
  return (
    <Badge variant={cfg.variant} size="sm" icon={Icon}>
      {cfg.label}
    </Badge>
  );
}

// ── Metric Card ────────────────────────────────────────────────────────────────

function MetricCard({ icon: Icon, label, value, subValue, variant = 'default', onClick, loading }: MetricCardProps): React.ReactElement {
  const baseClasses = 'relative overflow-hidden transition-all hover:shadow-whisper';
  const variantClasses: Record<string, string> = {
    default: 'bg-white border border-hairline',
    highlighted: 'bg-ocean/5 border border-ocean/30',
    success: 'bg-success-light/30 border border-success/20',
    warning: 'bg-warning-light/30 border border-warning/20',
    danger: 'bg-danger-light/30 border border-danger/20',
  };

  if (loading) {
    return (
      <Card className={`${baseClasses} ${variantClasses[variant]} min-h-[140px]`} padding="p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-24 bg-gray-200 rounded" />
          <div className="h-10 w-20 bg-gray-200 rounded" />
          <div className="h-3 w-32 bg-gray-200 rounded" />
        </div>
      </Card>
    );
  }

  const card = (
    <Card className={`${baseClasses} ${variantClasses[variant]} ${onClick ? 'cursor-pointer hover:border-ocean' : ''}`} padding="p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-text-secondary font-medium leading-tight">{label}</p>
          <p className="text-3xl font-bold text-text-primary mt-2 tracking-tight">{formatNumber(value)}</p>
          {subValue && (
            <p className="text-xs text-text-secondary mt-1.5 leading-snug">{subValue}</p>
          )}
        </div>
        {Icon && (
          <div className={`p-3 rounded-xl shrink-0 ml-3 ${
            variant === 'danger' ? 'bg-danger-light' :
            variant === 'warning' ? 'bg-warning-light' :
            variant === 'success' ? 'bg-success-light' :
            'bg-sky'
          }`}>
            <Icon className={`w-6 h-6 ${
              variant === 'danger' ? 'text-danger' :
              variant === 'warning' ? 'text-warning-dark' :
              variant === 'success' ? 'text-success' :
              'text-primary'
            }`} />
          </div>
        )}
      </div>
      {onClick && (
        <div className="absolute bottom-3 right-3">
          <ChevronRight className="w-4 h-4 text-text-secondary" />
        </div>
      )}
    </Card>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="w-full text-left"
        aria-label={`${label}: ${formatNumber(value)}. Nhấn để xem chi tiết.`}
      >
        {card}
      </button>
    );
  }

  return card;
}

// ── Attendance Card ────────────────────────────────────────────────────────────

function AttendanceCard({ attendance, loading }: { attendance: AttendanceData | undefined; loading: boolean }): React.ReactElement {
  if (loading) {
    return (
      <Card className="min-h-[200px]" padding="p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-32 bg-gray-200 rounded" />
          <div className="grid grid-cols-4 gap-3 mt-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded-lg" />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  const summary = attendance?.summary ?? { total: 0, present: 0, absent: 0, late: 0, excused: 0 };
  const rates = attendance?.rates ?? { present: 0, absent: 0, late: 0, excused: 0 };

  const stats = [
    { label: 'Có mặt', value: summary.present, rate: rates.present, color: 'text-success', bg: 'bg-success-light' },
    { label: 'Vắng', value: summary.absent, rate: rates.absent, color: 'text-danger', bg: 'bg-danger-light' },
    { label: 'Đi muộn', value: summary.late, rate: rates.late, color: 'text-warning-dark', bg: 'bg-warning-light' },
    { label: 'Có phép', value: summary.excused, rate: rates.excused, color: 'text-primary', bg: 'bg-sky' },
  ];

  return (
    <Card className="min-h-[200px]" padding="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-medium text-text-primary">Điểm danh hôm nay</h3>
          <p className="text-xs text-text-secondary mt-0.5">{formatDate(attendance?.date)} • {formatNumber(summary.total)} học sinh</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => {}}>
          Chi tiết
        </Button>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className={`${stat.bg} rounded-xl p-3 text-center`}>
            <p className={`text-xl font-bold ${stat.color}`}>{formatNumber(stat.value)}</p>
            <p className="text-xs text-text-secondary mt-1">{stat.label}</p>
            <p className="text-[10px] text-text-secondary/70">{stat.rate}%</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Assignments Card ────────────────────────────────────────────────────────────

function AssignmentsCard({ assignments, loading }: { assignments: AssignmentsData | undefined; loading: boolean }): React.ReactElement {
  if (loading) {
    return (
      <Card className="min-h-[200px]" padding="p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-28 bg-gray-200 rounded" />
          <div className="space-y-2 mt-4">
            {[1,2,3].map(i => <div key={i} className="h-8 bg-gray-200 rounded" />)}
          </div>
        </div>
      </Card>
    );
  }

  const { total = 0, draft = 0, published = 0, closed = 0, overdue = 0 } = assignments ?? {};

  const rows: Array<{ label: string; value: number; variant: string }> = [
    { label: 'Đã đăng', value: published, variant: 'success' },
    { label: 'Bản nháp', value: draft, variant: 'neutral' },
    { label: 'Đã đóng', value: closed, variant: 'text-secondary' },
    ...(overdue > 0 ? [{ label: 'Quá hạn', value: overdue, variant: 'danger' }] : []),
  ];

  return (
    <Card className="min-h-[200px]" padding="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-medium text-text-primary">Bài tập</h3>
          <p className="text-xs text-text-secondary mt-0.5">Tổng cộng {formatNumber(total)} bài tập</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => {}}>
          Chi tiết
        </Button>
      </div>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between py-2 border-b border-hairline last:border-0">
            <span className="text-sm text-text-secondary">{row.label}</span>
            <span className={`text-sm font-medium ${row.variant === 'danger' ? 'text-danger' : row.variant === 'success' ? 'text-success' : 'text-text-primary'}`}>
              {formatNumber(row.value)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Action Center ──────────────────────────────────────────────────────────────

function ActionCenterCard({ actionCenter, loading }: { actionCenter: DashboardMetrics['actionCenter'] | undefined; loading: boolean }): React.ReactElement {
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card className="min-h-[200px]" padding="p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-28 bg-gray-200 rounded" />
          {[1,2,3].map(i => <div key={i} className="h-12 bg-gray-200 rounded" />)}
        </div>
      </Card>
    );
  }

  const items = [
    {
      id: 'homeroom',
      label: 'Lớp chưa có GVCN',
      count: actionCenter?.classesWithoutHomeroom?.length ?? 0,
      icon: Layers,
      color: 'text-warning-dark',
      bg: 'bg-warning-light',
      action: () => navigate('/admin/academic'),
    },
    {
      id: 'no-assignment',
      label: 'GV chưa có phân công',
      count: actionCenter?.teachersWithoutAssignment?.length ?? 0,
      icon: Briefcase,
      color: 'text-warning-dark',
      bg: 'bg-warning-light',
      action: () => navigate('/admin/teachers'),
    },
    {
      id: 'no-parent',
      label: 'HS chưa liên kết phụ huynh',
      count: actionCenter?.studentsWithoutParent?.length ?? 0,
      icon: Users,
      color: 'text-warning-dark',
      bg: 'bg-warning-light',
      action: () => navigate('/admin/students'),
    },
    {
      id: 'absence',
      label: 'HS nghỉ nhiều',
      count: actionCenter?.excessiveAbsence?.length ?? 0,
      icon: AlertCircle,
      color: 'text-primary',
      bg: 'bg-sky',
      action: () => navigate('/admin/reports'),
    },
  ];

  const hasItems = items.some(i => i.count > 0);

  return (
    <Card className="min-h-[200px]" padding="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-medium text-text-primary">Việc cần xử lý</h3>
          <p className="text-xs text-text-secondary mt-0.5">
            {hasItems ? 'Cần được giải quyết sớm' : 'Không có việc cần xử lý'}
          </p>
        </div>
        {!hasItems && <CheckCircle2 className="w-6 h-6 text-success" />}
      </div>
      {hasItems ? (
        <div className="space-y-2">
          {items.filter(i => i.count > 0).map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={item.action}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-surface-neutral hover:bg-sky/50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${item.bg}`}>
                    <Icon className={`w-4 h-4 ${item.color}`} />
                  </div>
                  <span className="text-sm font-medium text-text-primary">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-danger">{item.count}</span>
                  <ArrowRight className="w-4 h-4 text-text-secondary group-hover:text-primary transition-colors" />
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <CheckCircle2 className="w-10 h-10 text-success mb-2" />
          <p className="text-sm text-text-secondary">Mọi thứ đã được sắp xếp</p>
        </div>
      )}
    </Card>
  );
}

// ── Alerts Section ──────────────────────────────────────────────────────────────

function AlertsSection({ alerts, loading }: { alerts: Alert[] | undefined; loading: boolean }): React.ReactElement {
  if (loading) {
    return (
      <Card className="min-h-[120px]" padding="p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-20 bg-gray-200 rounded" />
          {[1,2].map(i => <div key={i} className="h-14 bg-gray-200 rounded" />)}
        </div>
      </Card>
    );
  }

  if (!alerts || alerts.length === 0) {
    return (
      <Card className="min-h-[120px]" padding="p-5">
        <h3 className="text-base font-medium text-text-primary mb-3">Cảnh báo hệ thống</h3>
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <ShieldCheck className="w-8 h-8 text-success mb-2" />
          <p className="text-sm text-text-secondary">Không có cảnh báo nào</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="min-h-[120px]" padding="p-5">
      <h3 className="text-base font-medium text-text-primary mb-3">Cảnh báo hệ thống</h3>
      <div className="space-y-2">
        {alerts.slice(0, 5).map((alert) => (
          <div
            key={alert.id}
            className={`flex items-start gap-3 p-3 rounded-xl ${
              alert.priority === 'critical' ? 'bg-danger-light/50 border border-danger/20' :
              alert.priority === 'warning' ? 'bg-warning-light/50 border border-warning/20' :
              'bg-sky/30 border border-ocean/20'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              <PriorityBadge priority={alert.priority} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary">{alert.title}</p>
              <p className="text-xs text-text-secondary mt-0.5 line-clamp-1">{alert.message}</p>
            </div>
            <div className="shrink-0 text-xs text-text-secondary">
              {alert.count > 1 && <span className="font-medium">{alert.count}</span>}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Data Quality Card ──────────────────────────────────────────────────────────

function DataQualityCard({ dataQuality, loading }: { dataQuality: DashboardMetrics['dataQuality'] | undefined; loading: boolean }): React.ReactElement {
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card className="min-h-[160px]" padding="p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-32 bg-gray-200 rounded" />
          <div className="h-8 w-20 bg-gray-200 rounded" />
          <div className="h-4 w-48 bg-gray-200 rounded" />
        </div>
      </Card>
    );
  }

  const dq = dataQuality as DashboardMetrics['dataQuality'] | null | undefined;
  const healthScore = dq?.healthScore ?? 100;
  const healthStatus = dq?.healthStatus ?? 'good';
  const totalStudents = dq?.totalStudents ?? 0;
  const totalTeachers = dq?.totalTeachers ?? 0;
  const totalClasses = dq?.totalClasses ?? 0;
  const issueRecords = dq?.issues as { classesWithoutHomeroom?: number; teachersWithoutAssignment?: number; studentsWithoutParent?: number; overdueAssignments?: number } ?? { classesWithoutHomeroom: 0, teachersWithoutAssignment: 0, studentsWithoutParent: 0, overdueAssignments: 0 };
  const classesWithoutHomeroom = issueRecords.classesWithoutHomeroom ?? 0;
  const teachersWithoutAssignment = issueRecords.teachersWithoutAssignment ?? 0;
  const studentsWithoutParent = issueRecords.studentsWithoutParent ?? 0;
  const overdueAssignments = issueRecords.overdueAssignments ?? 0;
  const totalIssues = classesWithoutHomeroom + teachersWithoutAssignment + studentsWithoutParent + overdueAssignments;

  const healthColor = healthStatus === 'good' ? 'text-success' : healthStatus === 'warning' ? 'text-warning-dark' : 'text-danger';
  const healthBg = healthStatus === 'good' ? 'bg-success-light' : healthStatus === 'warning' ? 'bg-warning-light' : 'bg-danger-light';
  const healthLabel = healthStatus === 'good' ? 'Tốt' : healthStatus === 'warning' ? 'Cần cải thiện' : 'Nghiêm trọng';

  const qualityIssues = [
    { label: 'Lớp chưa GVCN', value: classesWithoutHomeroom, isWarning: classesWithoutHomeroom > 0 },
    { label: 'GV chưa phân công', value: teachersWithoutAssignment, isWarning: teachersWithoutAssignment > 0 },
    { label: 'HS chưa phụ huynh', value: studentsWithoutParent, isWarning: studentsWithoutParent > 0 },
    { label: 'Bài tập quá hạn', value: overdueAssignments, isWarning: overdueAssignments > 0 },
  ];

  return (
    <Card className="min-h-[160px]" padding="p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-medium text-text-primary">Chất lượng dữ liệu</h3>
          <p className="text-xs text-text-secondary mt-0.5">Độ hoàn thiện hồ sơ</p>
        </div>
        <button onClick={() => navigate('/admin/reports')} className="text-xs text-ocean hover:underline">
          Báo cáo chi tiết
        </button>
      </div>
      <div className="flex items-center gap-4 mb-4">
        <div className={`p-3 rounded-xl ${healthBg}`}>
          <span className={`text-2xl font-bold ${healthColor}`}>{healthScore}%</span>
        </div>
        <div>
          <p className={`text-sm font-medium ${healthColor}`}>{healthLabel}</p>
          <p className="text-xs text-text-secondary mt-0.5">
            {totalStudents + totalTeachers + totalClasses} hồ sơ • {totalIssues} vấn đề
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {qualityIssues.map((issue) => (
          <div key={issue.label} className="flex items-center justify-between p-2 bg-surface-neutral rounded-lg">
            <span className="text-text-secondary">{issue.label}</span>
            <span className={`font-medium ${issue.isWarning ? (issue.label.includes('Bài tập') ? 'text-danger' : 'text-warning-dark') : 'text-text-primary'}`}>
              {issue.value}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Recent Activity ────────────────────────────────────────────────────────────

interface ActivityItem {
  id: string;
  text: string;
  actor?: string;
  time?: string;
  badge?: string;
  badgeType?: string;
}

function RecentActivityCard({ activities, loading }: { activities: ActivityItem[] | undefined; loading: boolean }): React.ReactElement {
  if (loading) {
    return (
      <Card className="min-h-[200px]" padding="p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-24 bg-gray-200 rounded" />
          {[1,2,3,4].map(i => <div key={i} className="h-10 bg-gray-200 rounded" />)}
        </div>
      </Card>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <Card className="min-h-[200px]" padding="p-5">
        <h3 className="text-base font-medium text-text-primary mb-4">Hoạt động gần đây</h3>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Clock className="w-8 h-8 text-text-secondary/40 mb-2" />
          <p className="text-sm text-text-secondary">Chưa có hoạt động nào</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="min-h-[200px]" padding="p-5">
      <h3 className="text-base font-medium text-text-primary mb-4">Hoạt động gần đây</h3>
      <div className="space-y-3 max-h-[320px] overflow-y-auto">
        {activities.map((activity) => (
          <div key={activity.id} className="flex gap-3 py-2 border-b border-hairline last:border-0">
            <div className="w-2 h-2 rounded-full bg-ocean mt-2 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text-primary leading-snug">{activity.text}</p>
              <div className="flex items-center gap-2 mt-1">
                {activity.actor && (
                  <span className="text-xs text-text-secondary">{activity.actor}</span>
                )}
                <span className="text-xs text-text-secondary/60">•</span>
                <span className="text-xs text-text-secondary">{formatRelativeTime(activity.time)}</span>
                {activity.badge && (
                  <>
                    <span className="text-xs text-text-secondary/60">•</span>
                    <Badge variant="neutral" size="sm">{activity.badge}</Badge>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Recent Announcements ────────────────────────────────────────────────────────

interface RecentAnnouncement {
  id: string;
  title: string;
  content?: string;
  priority?: string;
  author?: string;
  publishedAt?: string;
}

function RecentAnnouncementsCard({ announcements, loading }: { announcements: RecentAnnouncement[] | undefined; loading: boolean }): React.ReactElement {
  if (loading) {
    return (
      <Card className="min-h-[200px]" padding="p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-32 bg-gray-200 rounded" />
          {[1,2,3].map(i => <div key={i} className="h-14 bg-gray-200 rounded" />)}
        </div>
      </Card>
    );
  }

  if (!announcements || announcements.length === 0) {
    return (
      <Card className="min-h-[200px]" padding="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-medium text-text-primary">Thông báo gần đây</h3>
          <Button variant="ghost" size="sm" onClick={() => {}}>Xem tất cả</Button>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Bell className="w-8 h-8 text-text-secondary/40 mb-2" />
          <p className="text-sm text-text-secondary">Chưa có thông báo nào</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="min-h-[200px]" padding="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-medium text-text-primary">Thông báo gần đây</h3>
        <Button variant="ghost" size="sm" onClick={() => {}}>Xem tất cả</Button>
      </div>
      <div className="space-y-3 max-h-[280px] overflow-y-auto">
        {announcements.slice(0, 5).map((ann) => (
          <div key={ann.id} className="p-3 bg-surface-neutral rounded-xl">
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-sm font-medium text-text-primary line-clamp-1 flex-1">{ann.title}</h4>
              <Badge
                variant={ann.priority === 'urgent' ? 'danger' : ann.priority === 'important' ? 'warning' : 'info'}
                size="sm"
              >
                {ann.priority === 'urgent' ? 'Khẩn' : ann.priority === 'important' ? 'Quan trọng' : 'Thường'}
              </Badge>
            </div>
            {ann.content && (
              <p className="text-xs text-text-secondary mt-1 line-clamp-2">{ann.content}</p>
            )}
            <p className="text-xs text-text-secondary/60 mt-2">
              {ann.author || 'Admin'} • {formatRelativeTime(ann.publishedAt)}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Main Dashboard Component ────────────────────────────────────────────────

export function AdminDashboard(): React.ReactElement {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const loadMetrics = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const data = await dashboardApi.getMetrics();
      if (data) {
        setMetrics(data);
        setLastRefresh(new Date());
      } else {
        setError('Không nhận được dữ liệu từ máy chủ');
      }
    } catch (err) {
      console.error('Dashboard load error:', err);
      const msg = err instanceof Error ? err.message : 'Lỗi khi tải dữ liệu dashboard';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics]);

  const handleRefresh = (): void => {
    void loadMetrics();
  };

  const { quickStats, attendance, assignments, actionCenter, alerts, dataQuality, recentActivity, recentAnnouncements } = metrics ?? {};

  const refreshTime = lastRefresh
    ? lastRefresh.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : 'Đang tải...';

  return (
    <div className="space-y-6">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium text-text-primary tracking-tight">
            Command Center
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {currentUser?.name || 'Quản trị viên'} • Cập nhật lúc {refreshTime}
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={handleRefresh}
          disabled={loading}
          icon={RefreshCw}
          iconPosition="left"
          className={loading ? '[&_svg]:animate-spin' : ''}
        >
          Làm mới
        </Button>
      </div>

      {/* ── Error Banner ──────────────────────────────────────────────────── */}
      {error && (
        <Card className="bg-danger-light/50 border border-danger/20" padding="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-danger shrink-0" />
              <p className="text-sm text-danger">{error}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleRefresh}>Thử lại</Button>
          </div>
        </Card>
      )}

      {/* ── Top Metrics Row ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Users}
          label="Học sinh"
          value={quickStats?.students?.total}
          subValue={quickStats?.students?.label}
          loading={loading}
          onClick={() => navigate('/admin/students')}
        />
        <MetricCard
          icon={Briefcase}
          label="Giáo viên"
          value={quickStats?.teachers?.total}
          subValue={quickStats?.teachers?.label}
          loading={loading}
          onClick={() => navigate('/admin/teachers')}
        />
        <MetricCard
          icon={UserRound}
          label="Phụ huynh"
          value={quickStats?.parents?.total}
          subValue={quickStats?.parents?.label}
          loading={loading}
        />
        <MetricCard
          icon={Layers}
          label="Lớp học"
          value={quickStats?.classes?.total}
          subValue={quickStats?.classes?.label}
          loading={loading}
          onClick={() => navigate('/admin/academic')}
        />
      </div>

      {/* ── Middle Row: Attendance + Assignments ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AttendanceCard attendance={attendance} loading={loading} />
        <AssignmentsCard assignments={assignments} loading={loading} />
      </div>

      {/* ── Action Center + Alerts ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ActionCenterCard actionCenter={actionCenter} loading={loading} />
        <AlertsSection alerts={alerts} loading={loading} />
      </div>

      {/* ── Data Quality ─────────────────────────────────────────────────── */}
      <DataQualityCard dataQuality={dataQuality} loading={loading} />

      {/* ── Bottom Row: Activity + Announcements ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentActivityCard activities={recentActivity} loading={loading} />
        <RecentAnnouncementsCard announcements={recentAnnouncements} loading={loading} />
      </div>
    </div>
  );
}

export default AdminDashboard;

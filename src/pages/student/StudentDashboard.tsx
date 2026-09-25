// =============================================================================
// StudentDashboard — TypeScript with Next Class Reminder Widget
// =============================================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { SkeletonCard } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { studentApi, logbookApi } from '../../services/api';
import {
  Calendar,
  Clock,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  BookOpen,
  ChevronRight,
  Bell,
  TrendingDown,
  Minus,
  AlertCircle,
  Users,
  AlertTriangle,
  Loader2,
  Shield,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// TypeScript Interfaces
// ─────────────────────────────────────────────────────────────────────────────

interface StudentInfo {
  name?: string;
  dateText?: string;
  className?: string;
}

interface KpiData {
  weeklyAverage?: {
    score?: number;
    diff?: string;
    count?: number;
  };
  todayClassesCount?: number;
}

interface TodayClass {
  subject?: string;
  period?: string | number;
  time?: string;
  room?: string;
  teacher?: string;
}

interface Assignment {
  id: string | number;
  subject?: string;
  title?: string;
  remaining?: string;
  deadline?: string;
  submissionStatus?: string;
  actionLabel?: string;
  actionVariant?: string;
  tag?: string;
  tagType?: 'danger' | 'warning' | 'info' | 'success' | 'neutral';
  isOverdue?: boolean;
}

interface Grade {
  id: string | number;
  subject?: string;
  testName?: string;
  category?: string;
  score: number;
  maxScore?: number;
  teacher?: string;
  feedback?: string;
  gradedAt?: string;
}

interface Announcement {
  id: string | number;
  title?: string;
  content?: string;
  author_name?: string;
  sender_name?: string;
  scope?: string;
  priority?: 'urgent' | 'important' | 'normal';
}

interface Competency {
  topic?: string;
  percent?: number;
  hint?: string;
}

interface Competencies {
  strengths?: Competency[];
  needsPractice?: Competency[];
  aiSuggestion?: {
    message?: string;
  };
}

interface AttendanceSummary {
  rate?: number | string | null;
  present?: number;
  absent?: number;
  late?: number;
  excused?: number;
  total?: number;
}

interface DashboardData {
  student?: StudentInfo;
  kpis?: KpiData;
  todayClasses?: TodayClass[];
  overdueAssignments?: Assignment[];
  dueSoonAssignments?: Assignment[];
  totalPendingAssignments?: number;
  recentGrades?: Grade[];
  attendanceSummary?: AttendanceSummary;
  announcements?: Announcement[];
  competencies?: Competencies;
}

// ─────────────────────────────────────────────────────────────────────────────
// KPI Card Component
// ─────────────────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  unit,
  badge,
  badgeVariant,
  subtext,
  subtextClass = '',
}: {
  icon: React.ElementType;
  label: string;
  value?: string | number | null;
  unit?: string;
  badge?: React.ReactNode;
  badgeVariant?: string;
  subtext?: React.ReactNode;
  subtextClass?: string;
}): React.JSX.Element {
  return (
    <Card className="flex flex-col justify-between" padding="p-5">
      <div className="flex items-start justify-between">
        <div className="w-8 h-8 rounded bg-surface-neutral flex items-center justify-center text-primary shrink-0">
          <Icon className="w-4 h-4 stroke-[1.75]" />
        </div>
        {badge && <Badge variant={badgeVariant as 'success' | 'warning' | 'danger' | 'info' | 'neutral' | undefined}>{badge}</Badge>}
      </div>
      <div className="mt-4">
        <div className="text-xs text-text-secondary">{label}</div>
        <div className="text-2xl font-semibold text-primary mt-0.5 leading-none">
          {value ?? '—'}
          {unit && <span className="text-sm font-normal text-text-secondary ml-0.5">{unit}</span>}
        </div>
        {subtext && (
          <div className={`text-xs mt-2 flex items-center gap-1 ${subtextClass}`}>
            {subtext}
          </div>
        )}
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Attendance Rate Bar Component
// ─────────────────────────────────────────────────────────────────────────────

function AttendanceBar({
  present = 0,
  absent = 0,
  late = 0,
  excused = 0,
  total = 0,
  rate = 0,
}: AttendanceSummary): React.JSX.Element {
  const pct = (p: number) => (total > 0 ? (p / total) * 100 : 0);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-secondary">Chuyên cần</span>
        <span className={`font-semibold ${
          Number(rate) >= 90 ? 'text-success' : Number(rate) >= 75 ? 'text-warning' : 'text-danger'
        }`}>
          {rate ?? 0}%
        </span>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
        <div className="bg-success transition-all" style={{ width: `${pct(present)}%` }} title={`Có mặt: ${present}`} />
        <div className="bg-warning transition-all" style={{ width: `${pct(late)}%` }} title={`Đi muộn: ${late}`} />
        <div className="bg-danger transition-all" style={{ width: `${pct(absent)}%` }} title={`Vắng: ${absent}`} />
        <div className="bg-surface-neutral flex-1" title={`Miễn: ${excused}`} />
      </div>
      <div className="flex gap-4 text-[11px] text-text-secondary">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />Có mặt {present}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-warning inline-block" />Muộn {late}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-danger inline-block" />Vắng {absent}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Assignment Row Component
// ─────────────────────────────────────────────────────────────────────────────

function AssignmentRow({
  assignment,
  onClick,
}: {
  assignment: Assignment;
  onClick?: (id: string | number) => void;
}): React.JSX.Element {
  const {
    id, subject, title, remaining, deadline,
    submissionStatus, actionLabel, actionVariant,
    tag, tagType, isOverdue,
  } = assignment;

  return (
    <div className="p-4 rounded-card border border-hairline hover:border-hairline-darker transition-colors bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="space-y-1.5 flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-ocean shrink-0">{subject}:</span>
          <h3 className="text-sm font-medium text-text-primary truncate">{title || 'Bài tập'}</h3>
          <Badge variant={tagType === 'danger' ? 'danger' : tagType === 'warning' ? 'warning' : 'info'} size="sm">{tag}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
          <span className={`flex items-center gap-1 font-medium ${isOverdue ? 'text-danger' : 'text-warning'}`}>
            <Clock className="w-3.5 h-3.5 shrink-0" />
            {remaining}
          </span>
          <span>•</span>
          <span>Hạn: {deadline}</span>
          {submissionStatus === 'submitted' && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1 text-success font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                Đã nộp
              </span>
            </>
          )}
        </div>
      </div>
      <Button
        variant={actionVariant === 'secondary' ? 'secondary' : 'primary'}
        size="sm"
        className="shrink-0 self-start sm:self-center"
        onClick={() => onClick?.(id)}
      >
        {actionLabel}
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Grade Row Component
// ─────────────────────────────────────────────────────────────────────────────

function GradeRow({ grade }: { grade: Grade }): React.JSX.Element {
  const { subject, testName, category, score, maxScore = 10, teacher, feedback } = grade;
  const pct = maxScore > 0 ? ((score / maxScore) * 100).toFixed(0) : '?';
  const isHigh = Number(pct) >= 80;
  const isMid = Number(pct) >= 60;

  return (
    <tr className="hover:bg-surface-neutral/40 transition-colors">
      <th scope="row" className="py-3 px-3 text-left">
        <div className="font-medium text-text-primary text-sm">{subject}</div>
        <div className="text-xs text-text-secondary mt-0.5">
          {testName || 'Bài kiểm tra'}
          {category && <span className="ml-1 text-ocean">· {category}</span>}
        </div>
      </th>
      <td className="py-3 px-3 text-center">
        <div className={`font-semibold text-base leading-none ${
          isHigh ? 'text-success' : isMid ? 'text-warning' : 'text-danger'
        }`}>
          {score}
        </div>
        <div className="text-[11px] text-text-secondary">/{maxScore}</div>
      </td>
      <td className="py-3 px-3 max-w-xs">
        {feedback ? (
          <div className="text-xs text-text-secondary italic">
            <span className="not-italic text-ocean font-medium">{teacher || 'GV'}:</span>{' '}
            {feedback}
          </div>
        ) : (
          <span className="text-xs text-text-secondary">—</span>
        )}
      </td>
      <td className="py-3 px-3 text-center">
        <Badge variant={isHigh ? 'success' : isMid ? 'warning' : 'danger'} size="sm">
          {isHigh ? 'Tốt' : isMid ? 'Khá' : 'Cần cố gắng'}
        </Badge>
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Announcement Item Component
// ─────────────────────────────────────────────────────────────────────────────

function AnnouncementItem({ item }: { item: Announcement }): React.JSX.Element {
  return (
    <div className="p-3 rounded-card border border-hairline bg-white space-y-1">
      <div className="flex items-start gap-2">
        <Bell className="w-3.5 h-3.5 text-ocean shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-medium text-text-primary line-clamp-1">{item.title}</h4>
          <p className="text-[11px] text-text-secondary">{item.content}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] text-text-secondary">{item.author_name || item.sender_name || 'Ban Giám hiệu'}</span>
            {(item.scope === 'school' || item.scope === 'all') && (
              <Badge variant="info" size="sm">Toàn trường</Badge>
            )}
            {item.priority === 'urgent' && (
              <Badge variant="danger" size="sm">Khẩn</Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Next Class Reminder Widget
// ─────────────────────────────────────────────────────────────────────────────

interface NextClassInfo {
  subject?: string;
  period?: string | number;
  time?: string;
  room?: string;
  teacher?: string;
}

function getNextClass(todayClasses: TodayClass[]): NextClassInfo | null {
  if (!todayClasses || todayClasses.length === 0) return null;

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTotalMinutes = currentHour * 60 + currentMinute;

  // Parse time strings like "07:00 - 07:45" or "07:00"
  const parseTimeToMinutes = (timeStr?: string): number => {
    if (!timeStr) return -1;
    const match = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (!match) return -1;
    return parseInt(match[1]) * 60 + parseInt(match[2]);
  };

  // Find the next upcoming class
  for (const cls of todayClasses) {
    const startMinutes = parseTimeToMinutes(cls.time);
    if (startMinutes === -1) continue;

    // Check if this class starts at or after current time (with 5-min buffer)
    if (startMinutes >= currentTotalMinutes - 5) {
      return {
        subject: cls.subject,
        period: cls.period,
        time: cls.time,
        room: cls.room,
        teacher: cls.teacher,
      };
    }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Dashboard Component
// ─────────────────────────────────────────────────────────────────────────────

export function StudentDashboard(): React.JSX.Element {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    studentApi.getDashboard()
      .then((res) => {
        if (!cancelled) {
          setData(res as DashboardData);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Không thể tải dashboard. Vui lòng thử lại.';
          setError(msg);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, []);

  // ── Loading State ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-16 w-full bg-surface-neutral rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <div className="space-y-6">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  // ── Error State ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <ErrorState
        title="Đã xảy ra lỗi"
        message={error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  // ── Data ──────────────────────────────────────────────────────────────────
  const {
    student,
    kpis,
    todayClasses = [],
    overdueAssignments = [],
    dueSoonAssignments = [],
    totalPendingAssignments = 0,
    recentGrades = [],
    attendanceSummary,
    announcements = [],
    competencies = {},
  } = data || {};

  const allAssignments = [...overdueAssignments, ...dueSoonAssignments];
  const { strengths = [], needsPractice = [], aiSuggestion } = competencies;

  // GPA diff direction
  const gpaDiff = kpis?.weeklyAverage?.diff;
  const GpaTrendIcon = gpaDiff?.startsWith('+') ? TrendingUp
    : gpaDiff?.startsWith('-') ? TrendingDown : Minus;
  const gpaTrendColor = gpaDiff?.startsWith('+') ? 'text-success'
    : gpaDiff?.startsWith('-') ? 'text-danger' : 'text-text-secondary';

  // ── Next Class Reminder ────────────────────────────────────────────────────
  const nextClass = getNextClass(todayClasses);

  return (
    <div className="space-y-6">
      {/* ── Next Class Reminder Banner ──────────────────────────────────────── */}
      {nextClass && (
        <div className="bg-gradient-to-r from-ocean/10 via-sky/20 to-primary/10 border border-ocean/30 rounded-card p-4 flex items-center gap-4 animate-fade-in">
          <div className="w-10 h-10 rounded-full bg-ocean/20 flex items-center justify-center shrink-0">
            <span className="text-xl">🔔</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-ocean uppercase tracking-wider mb-0.5">
              Tiết học tiếp theo
            </div>
            <div className="text-sm font-semibold text-text-primary">
              <span className="text-ocean">{nextClass.subject}</span>
              <span className="text-text-secondary font-normal mx-1">•</span>
              <span>Tiết {nextClass.period}</span>
              <span className="text-text-secondary font-normal mx-1">•</span>
              <span>{nextClass.time}</span>
            </div>
            <div className="text-xs text-text-secondary mt-0.5">
              <span>Phòng {nextClass.room}</span>
              {nextClass.teacher && (
                <>
                  <span className="mx-1">•</span>
                  <span>GV: {nextClass.teacher}</span>
                </>
              )}
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            icon={BookOpen}
            className="shrink-0"
            onClick={() => navigate('/student/timetable')}
          >
            Xem lịch học
          </Button>
        </div>
      )}

      {/* ── Welcome Banner ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium text-text-primary">
            Chào buổi sáng, {student?.name || 'Học sinh'} 👋
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {student?.dateText}
            {student?.className && <span> • {student.className}</span>}
          </p>
          {totalPendingAssignments > 0 ? (
            <p className="text-sm text-danger mt-1">
              Bạn có <strong>{totalPendingAssignments} bài tập</strong> cần hoàn thành.
            </p>
          ) : (
            <p className="text-sm text-success mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              Không có bài tập chờ — bạn đã cập nhật hết!
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="md" icon={Calendar} onClick={() => navigate('/student/timetable')}>
            Lịch biểu
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={BookOpen}
            onClick={() => navigate('/student/assignments')}
          >
            Bài tập
          </Button>
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Assignments */}
        <KpiCard
          icon={BookOpen}
          label="Bài tập chờ"
          value={totalPendingAssignments}
          unit="bài"
          badge={
            overdueAssignments.length > 0
              ? `${overdueAssignments.length} quá hạn`
              : totalPendingAssignments > 0
                ? `${totalPendingAssignments} chờ`
                : 'OK'
          }
          badgeVariant={overdueAssignments.length > 0 ? 'danger' : totalPendingAssignments > 0 ? 'warning' : 'success'}
          subtext={
            overdueAssignments.length > 0
              ? 'Có bài đã quá hạn — cần xử lý ngay'
              : totalPendingAssignments > 0
                ? 'Làm ngay để không bị quá hạn'
                : 'Tất cả đã hoàn thành'
          }
          subtextClass={overdueAssignments.length > 0 ? 'text-danger' : totalPendingAssignments > 0 ? 'text-warning' : 'text-success'}
        />

        {/* GPA */}
        <KpiCard
          icon={TrendingUp}
          label="Điểm trung bình"
          value={kpis?.weeklyAverage?.score?.toFixed(1) ?? '—'}
          unit="/10"
          badge={
            gpaDiff ? (
              <span className={`flex items-center gap-0.5 ${gpaTrendColor}`}>
                <GpaTrendIcon className="w-3 h-3" />
                {gpaDiff}
              </span>
            ) : undefined
          }
          subtext={
            kpis?.weeklyAverage?.count
              ? `Dựa trên ${kpis.weeklyAverage.count} bài đã công bố`
              : 'Chưa có điểm công bố'
          }
        />

        {/* Attendance */}
        <KpiCard
          icon={CheckCircle2}
          label="Chuyên cần"
          value={attendanceSummary?.rate ?? '—'}
          unit="%"
          badge={
            attendanceSummary
              ? Number(attendanceSummary.rate) >= 90 ? 'Tốt'
                : Number(attendanceSummary.rate) >= 75 ? 'Cần cải thiện'
                : 'Cảnh báo'
              : undefined
          }
          badgeVariant={
            !attendanceSummary ? 'neutral'
              : Number(attendanceSummary.rate) >= 90 ? 'success'
              : Number(attendanceSummary.rate) >= 75 ? 'warning' : 'danger'
          }
        />

        {/* Today's Classes */}
        <KpiCard
          icon={Calendar}
          label="Tiết học hôm nay"
          value={kpis?.todayClassesCount ?? todayClasses.length}
          unit="tiết"
          badge="Hôm nay"
          subtext={
            todayClasses.length > 0
              ? todayClasses.map((c) => c.subject).slice(0, 2).join(', ') +
                (todayClasses.length > 2 ? ` +${todayClasses.length - 2}` : '')
              : 'Không có tiết học hôm nay'
          }
        />
      </div>

      {/* ── Attendance Bar (full width, only if data exists) ─────────────── */}
      {attendanceSummary && (
        <Card padding="p-5">
          <AttendanceBar {...attendanceSummary} />
        </Card>
      )}

      {/* ── Main Grid ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Assignments + Grades */}
        <div className="lg:col-span-2 space-y-6">

          {/* Overdue Assignments */}
          {overdueAssignments.length > 0 && (
            <Card padding="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-danger" />
                  <h2 className="text-base font-medium text-danger">Bài tập quá hạn</h2>
                </div>
                <Badge variant="danger" size="sm">{overdueAssignments.length} bài</Badge>
              </div>
              <div className="space-y-3">
                {overdueAssignments.map((a) => (
                  <AssignmentRow key={a.id} assignment={a} onClick={() => navigate('/student/assignments')} />
                ))}
              </div>
            </Card>
          )}

          {/* Due Soon Assignments */}
          <Card padding="p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary stroke-[1.75]" />
                <div>
                  <h2 className="text-base font-medium text-text-primary">Bài tập sắp đến hạn</h2>
                  <p className="text-xs text-text-secondary">
                    {dueSoonAssignments.length > 0
                      ? 'Ưu tiên những bài gần hết hạn nhất'
                      : 'Không có bài sắp đến hạn'}
                  </p>
                </div>
              </div>
              {dueSoonAssignments.length > 0 && (
                <button
                  onClick={() => navigate('/student/assignments')}
                  className="text-xs font-medium text-ocean hover:underline flex items-center gap-1"
                >
                  Xem tất cả <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {dueSoonAssignments.length === 0 ? (
              <EmptyState
                description="Không có bài tập nào sắp đến hạn trong 7 ngày tới."
                icon={CheckCircle2}
              />
            ) : (
              <div className="space-y-3">
                {dueSoonAssignments.map((a) => (
                  <AssignmentRow key={a.id} assignment={a} onClick={() => navigate('/student/assignments')} />
                ))}
              </div>
            )}
          </Card>

          {/* Recent Grades */}
          <Card padding="p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary stroke-[1.75]" />
                <div>
                  <h2 className="text-base font-medium text-text-primary">Điểm số gần đây</h2>
                  <p className="text-xs text-text-secondary">Chỉ hiển thị điểm đã được công bố</p>
                </div>
              </div>
            </div>
            {recentGrades.length === 0 ? (
              <EmptyState
                description="Chưa có điểm nào được công bố."
                icon={TrendingUp}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-surface-neutral text-text-secondary text-xs">
                      <th className="py-2.5 px-3 font-medium text-left">Môn & Bài kiểm tra</th>
                      <th className="py-2.5 px-3 font-medium text-center">Điểm</th>
                      <th className="py-2.5 px-3 font-medium text-left">Nhận xét giáo viên</th>
                      <th className="py-2.5 px-3 font-medium text-center">Đánh giá</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {recentGrades.map((g) => (
                      <GradeRow key={g.id} grade={g} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Right: Competencies + Announcements + Timetable */}
        <div className="space-y-6">

          {/* Competencies */}
          <Card padding="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-ocean" />
                <h2 className="text-base font-medium text-text-primary">Năng lực chuyên đề</h2>
              </div>
              <Badge variant="info">AI Phân tích</Badge>
            </div>

            {strengths.length > 0 && (
              <div className="space-y-3 mb-5">
                <div className="text-[11px] font-medium text-success uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Điểm mạnh nổi bật
                </div>
                {strengths.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium text-text-primary">
                      <span className="truncate">{item.topic}</span>
                      <span className="text-ocean shrink-0 ml-2">{item.percent}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-neutral rounded-full overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full transition-all"
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {needsPractice.length > 0 && (
              <div className="space-y-3 mb-5 pt-3 border-t border-hairline">
                <div className="text-[11px] font-medium text-warning-dark uppercase tracking-wider flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Cần rèn luyện thêm
                </div>
                {needsPractice.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium text-text-primary">
                      <span className="truncate">{item.topic}</span>
                      <span className="text-danger shrink-0 ml-2">{item.percent}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-neutral rounded-full overflow-hidden">
                      <div
                        className="bg-danger h-full rounded-full transition-all"
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                    {item.hint && (
                      <p className="text-[11px] text-text-secondary">{item.hint}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {strengths.length === 0 && needsPractice.length === 0 && (
              <EmptyState
                description="Chưa có dữ liệu năng lực. Giáo viên sẽ cập nhật sớm."
                icon={Sparkles}
              />
            )}

            {/* AI Suggestion */}
            {aiSuggestion && (
              <div className="p-4 bg-sky/50 rounded-card border border-ocean/20 space-y-3 mt-4">
                <div className="flex items-center gap-2 text-xs font-medium text-primary">
                  <Sparkles className="w-4 h-4 text-ocean shrink-0" />
                  Gợi ý từ Gia sư AI
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {aiSuggestion.message}
                </p>
                <div className="flex gap-2 pt-1">
                  <Button variant="primary" size="sm" className="flex-1" onClick={() => navigate('/student/ai-tutor')}>
                    Luyện tập ngay
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Announcements */}
          <Card padding="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                <h2 className="text-base font-medium text-text-primary">Thông báo</h2>
              </div>
              {announcements.length > 0 && (
                <Badge variant="neutral">{announcements.length}</Badge>
              )}
            </div>
            {announcements.length === 0 ? (
              <EmptyState description="Không có thông báo mới." icon={Bell} />
            ) : (
              <div className="space-y-3">
                {announcements.map((item) => (
                  <AnnouncementItem key={item.id} item={item} />
                ))}
              </div>
            )}
          </Card>

          {/* Today's Timetable */}
          <Card padding="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <h2 className="text-base font-medium text-text-primary">Thời khóa biểu hôm nay</h2>
              </div>
              <Badge variant="neutral">Hôm nay</Badge>
            </div>
            {todayClasses.length === 0 ? (
              <EmptyState description="Không có tiết học nào hôm nay." icon={Calendar} />
            ) : (
              <div className="space-y-3">
                {todayClasses.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-surface-neutral rounded-card border border-hairline space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-ocean">{item.period}</span>
                      <span className="text-xs text-text-secondary">{item.time}</span>
                    </div>
                    <div className="text-sm font-medium text-text-primary">{item.subject}</div>
                    <div className="text-xs text-text-secondary">
                      {item.room && `${item.room} • `}{item.teacher}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ClassMonitorDisciplineWidget — Nề nếp & Thi đua 15 phút
// Features: Quick roll call, log discipline violations by group
// Only visible to students with class_monitor role
// ─────────────────────────────────────────────────────────────────────────────

interface ClassMonitorDisciplineWidgetProps {
  classId?: string;
}

const VIOLATION_TYPES = [
  { key: 'uniform', label: 'Đồng phục', icon: '👔', points: -1 },
  { key: 'late', label: 'Đi muộn', icon: '⏰', points: -1 },
  { key: 'no_homework', label: 'Chưa học bài', icon: '📚', points: -1 },
  { key: 'disruptive', label: 'Mất trật tự', icon: '🔊', points: -2 },
  { key: 'other', label: 'Khác', icon: '⚠️', points: -1 },
];

function ClassMonitorDisciplineWidget({ classId }: ClassMonitorDisciplineWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string; code: string } | null>(null);
  const [selectedViolation, setSelectedViolation] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [groupSummary, setGroupSummary] = useState<Array<{
    group_id: string;
    group_name: string;
    violation_count: number;
    total_points: number;
    students_involved: number;
  }>>([]);

  // Mock class groups for demo (in real app, fetch from API)
  const classGroups = [
    { id: 'grp_1', name: 'Nhóm 1' },
    { id: 'grp_2', name: 'Nhóm 2' },
    { id: 'grp_3', name: 'Nhóm 3' },
    { id: 'grp_4', name: 'Nhóm 4' },
  ];

  // Mock students for demo
  const mockStudents = [
    { id: 'stu_001', name: 'Nguyễn Văn An', code: 'HS001' },
    { id: 'stu_002', name: 'Trần Thị Bình', code: 'HS002' },
    { id: 'stu_003', name: 'Lê Hoàng Cường', code: 'HS003' },
    { id: 'stu_004', name: 'Phạm Thị Dung', code: 'HS004' },
  ];

  useEffect(() => {
    if (isExpanded && classId) {
      // Load group summary
      logbookApi.getGroupDisciplineSummary(classId).then((result) => {
        if (result && Array.isArray(result)) {
          setGroupSummary(result as typeof groupSummary);
        }
      }).catch(() => {
        // Use mock data if API fails
      });
    }
  }, [isExpanded, classId]);

  const handleReportViolation = async () => {
    if (!selectedStudent || !selectedViolation || !classId) {
      setErrorMsg('Vui lòng chọn học sinh và loại vi phạm');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await logbookApi.createDisciplineRecord({
        class_id: classId,
        group_id: selectedGroup || undefined,
        student_id: selectedStudent.id,
        date: new Date().toISOString().split('T')[0],
        period_number: 0,
        violation_type: selectedViolation as 'uniform' | 'late' | 'no_homework' | 'disruptive' | 'other',
        points_deducted: VIOLATION_TYPES.find(v => v.key === selectedViolation)?.points || -1,
        notes: notes || undefined,
      });
      setSuccessMsg(`Đã ghi nhận vi phạm "${VIOLATION_TYPES.find(v => v.key === selectedViolation)?.label}" cho ${selectedStudent.name}`);
      
      // Reset form
      setSelectedStudent(null);
      setSelectedViolation(null);
      setNotes('');
      
      // Refresh summary
      const result = await logbookApi.getGroupDisciplineSummary(classId);
      if (result && Array.isArray(result)) {
        setGroupSummary(result as typeof groupSummary);
      }
    } catch (e) {
      setErrorMsg('Lỗi khi ghi nhận vi phạm');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card padding="p-5" className="border-ocean/30 bg-gradient-to-r from-ocean/5 to-transparent">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-ocean/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-ocean" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <span>🛡️</span> Nề nếp & Thi đua Lớp
            </h3>
            <p className="text-xs text-text-secondary">Ghi nhận vi phạm nề nếp • 15 phút đầu giờ</p>
          </div>
        </div>
        <Button
          variant={isExpanded ? 'secondary' : 'primary'}
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? 'Thu gọn' : 'Mở rộng'}
        </Button>
      </div>

      {/* Group Summary */}
      {isExpanded && (
        <>
          <div className="grid grid-cols-4 gap-3 mb-4">
            {classGroups.map((group) => {
              const summary = groupSummary.find(g => g.group_id === group.id);
              return (
                <div
                  key={group.id}
                  onClick={() => setSelectedGroup(selectedGroup === group.id ? null : group.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all text-center ${
                    selectedGroup === group.id
                      ? 'border-ocean bg-ocean/10'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-xs font-medium text-text-primary">{group.name}</div>
                  <div className="text-lg font-bold text-danger">{summary?.violation_count || 0}</div>
                  <div className="text-[10px] text-text-secondary">vi phạm</div>
                </div>
              );
            })}
          </div>

          {/* Report Form */}
          <div className="bg-white rounded-lg border border-hairline p-4 space-y-4">
            <div className="text-xs font-medium text-text-primary mb-2">📝 Ghi nhận vi phạm</div>
            
            {/* Student Selection */}
            <div>
              <label className="block text-xs text-text-secondary mb-1">Học sinh vi phạm</label>
              <select
                value={selectedStudent?.id || ''}
                onChange={(e) => {
                  const student = mockStudents.find(s => s.id === e.target.value);
                  setSelectedStudent(student || null);
                }}
                className="w-full h-9 px-3 bg-white border border-hairline rounded text-xs text-text-primary outline-none focus:border-ocean"
              >
                <option value="">-- Chọn học sinh --</option>
                {mockStudents.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>

            {/* Violation Type */}
            <div>
              <label className="block text-xs text-text-secondary mb-1">Loại vi phạm</label>
              <div className="grid grid-cols-3 gap-2">
                {VIOLATION_TYPES.map(vtype => (
                  <button
                    key={vtype.key}
                    type="button"
                    onClick={() => setSelectedViolation(selectedViolation === vtype.key ? null : vtype.key)}
                    className={`p-2 rounded border text-xs transition-all ${
                      selectedViolation === vtype.key
                        ? 'border-danger bg-red-50 text-danger'
                        : 'border-gray-200 hover:border-gray-300 text-text-primary'
                    }`}
                  >
                    <span>{vtype.icon}</span>
                    <span className="ml-1">{vtype.label}</span>
                    <span className="block text-[10px] text-text-secondary">{vtype.points} điểm</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs text-text-secondary mb-1">Ghi chú (tùy chọn)</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2 bg-white border border-hairline rounded text-xs text-text-primary outline-none focus:border-ocean resize-none"
                placeholder="Chi tiết vi phạm..."
              />
            </div>

            {/* Messages */}
            {successMsg && (
              <div className="p-2 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {successMsg}
              </div>
            )}
            {errorMsg && (
              <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {errorMsg}
              </div>
            )}

            {/* Submit */}
            <Button
              variant="danger"
              size="sm"
              className="w-full"
              icon={AlertTriangle}
              onClick={handleReportViolation}
              disabled={saving || !selectedStudent || !selectedViolation}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Đang ghi nhận...
                </>
              ) : (
                'Ghi nhận vi phạm'
              )}
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { SkeletonCard, Skeleton } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { studentApi } from '../../services/api';
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
} from 'lucide-react';

// ─── KPI Card ───────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, unit, badge, badgeVariant, subtext, subtextClass = '' }) {
  return (
    <Card className="flex flex-col justify-between" padding="p-5">
      <div className="flex items-start justify-between">
        <div className="w-8 h-8 rounded bg-surface-neutral flex items-center justify-center text-primary shrink-0">
          <Icon className="w-4 h-4 stroke-[1.75]" />
        </div>
        {badge && <Badge variant={badgeVariant || 'info'}>{badge}</Badge>}
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

// ─── Attendance Rate Bar ─────────────────────────────────────────────────────
function AttendanceBar({ present, absent, late, excused, total, rate }) {
  const pct = (p) => (total > 0 ? (p / total) * 100 : 0);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-secondary">Chuyên cần</span>
        <span className={`font-semibold ${rate >= 90 ? 'text-success' : rate >= 75 ? 'text-warning' : 'text-danger'}`}>
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

// ─── Assignment Row ───────────────────────────────────────────────────────────
function AssignmentRow({ assignment, onClick }) {
  const {
    id, subject, title, remaining, deadline,
    submissionStatus, actionLabel, actionVariant,
    tag, tagType, isOverdue,
  } = assignment;

  return (
    <div
      className="p-4 rounded-card border border-hairline hover:border-hairline-darker transition-colors bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3"
    >
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

// ─── Grade Row ───────────────────────────────────────────────────────────────
function GradeRow({ grade }) {
  const { subject, testName, category, score, maxScore, teacher, feedback, gradedAt } = grade;
  const pct = maxScore > 0 ? ((score / maxScore) * 100).toFixed(0) : '?';
  const isHigh = pct >= 80;
  const isMid = pct >= 60;

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
        <div className={`font-semibold text-base leading-none ${isHigh ? 'text-success' : isMid ? 'text-warning' : 'text-danger'}`}>
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

// ─── Announcement Item ────────────────────────────────────────────────────────
function AnnouncementItem({ item }) {
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

// ─── Main Dashboard Component ─────────────────────────────────────────────────
export function StudentDashboard({ onNavigateToAiTutor, onNavigateToTimetable, onNavigateToAssignments }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    studentApi.getDashboard()
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'Không thể tải dashboard. Vui lòng thử lại.');
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, []);

  // ── Loading State ─────────────────────────────────────────────────────────
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

  // ── Error State ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <ErrorState
        title="Đã xảy ra lỗi"
        message={error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  // ── Data ───────────────────────────────────────────────────────────────────
  const {
    student, kpis,
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

  return (
    <div className="space-y-6">
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
            ) : null
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
              ? attendanceSummary.rate >= 90 ? 'Tốt'
                : attendanceSummary.rate >= 75 ? 'Cần cải thiện'
                : 'Cảnh báo'
              : null
          }
          badgeVariant={
            !attendanceSummary ? 'neutral'
              : attendanceSummary.rate >= 90 ? 'success'
              : attendanceSummary.rate >= 75 ? 'warning' : 'danger'
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
                message="Không có bài tập nào sắp đến hạn trong 7 ngày tới."
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
                message="Chưa có điểm nào được công bố."
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
                message="Chưa có dữ liệu năng lực. Giáo viên sẽ cập nhật sớm."
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
              <EmptyState message="Không có thông báo mới." icon={Bell} />
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
              <EmptyState message="Không có tiết học nào hôm nay." icon={Calendar} />
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

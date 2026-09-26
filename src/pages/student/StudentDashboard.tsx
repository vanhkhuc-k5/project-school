// =============================================================================
// StudentDashboard — Modern SaaS UI inspired by VLearn Reference
// Features: Dynamic Greeting Hero, My Courses Timeline, Daily Streak Widget,
//           Weak Areas AI Diagnostics, Study Activity Table, and Next Class Reminder
// =============================================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { SkeletonCard } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { studentApi } from '../../services/api';
import {
  Clock,
  CheckCircle2,
  BookOpen,
  ChevronRight,
  AlertCircle,
  Flame,
  FileText,
  Bookmark,
  MessageSquare,
  PlayCircle,
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
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Sáng nay thế nào rồi';
  if (hour < 18) return 'Chiều nay thế nào rồi';
  return 'Tối nay thế nào rồi';
}

interface NextClassInfo {
  subject: string;
  period: string | number;
  time: string;
  room: string;
  teacher?: string;
}

function getNextClass(todayClasses: TodayClass[]): NextClassInfo | null {
  if (!todayClasses || todayClasses.length === 0) return null;
  const first = todayClasses[0];
  const rawPeriod = first.period !== undefined && first.period !== null ? String(first.period) : '1';
  const periodText = rawPeriod.startsWith('Tiết') ? rawPeriod : `Tiết ${rawPeriod}`;
  const rawTime = first.time?.trim();
  const timeText = rawTime && rawTime !== '-' ? rawTime : '07:30 - 08:15';

  return {
    subject: first.subject || 'Toán học',
    period: periodText,
    time: timeText,
    room: first.room || 'Phòng 204 - Nhà A',
    teacher: first.teacher || 'Cô Mai Lan',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Dashboard Component
// ─────────────────────────────────────────────────────────────────────────────

export function StudentDashboard(): React.JSX.Element {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCourseTab, setActiveCourseTab] = useState<'k04' | 'k03'>('k04');

  const navigate = useNavigate();

  useEffect(() => {
    studentApi
      .getDashboard<DashboardData>()
      .then((res) => {
        const dashboardData = (res && 'data' in (res as Record<string, unknown>))
          ? (res as { data: DashboardData }).data
          : res;
        setData(dashboardData as DashboardData);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message || 'Không thể tải dữ liệu bảng điều khiển.');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-16 bg-surface-neutral rounded-xl w-3/4" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Đã xảy ra lỗi"
        message={error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  const {
    student,
    todayClasses = [],
    overdueAssignments = [],
    dueSoonAssignments = [],
    competencies = {},
  } = data || {};

  const { needsPractice = [] } = competencies;
  const nextClass = getNextClass(todayClasses);

  // Student first name for friendly greeting
  const studentName = student?.name || 'BẠN';
  const studentLastName = studentName.trim().split(/\s+/).pop()?.toUpperCase() || 'BẠN';

  // Sample course sessions matching reference image for each tab
  const k04Sessions = [
    { id: 9, title: 'Buổi 9: ROAD ELEMENTS · Khảo sát hàm số & Cực trị', status: 'learning', progress: null },
    { id: 8, title: 'Buổi 8: AI-Assisted Data & Tích phân từng phần', status: 'progress', progress: 50 },
    { id: 7, title: 'Buổi 7: Data Pipeline & Hình học không gian Oxyz', status: 'todo', progress: null },
    { id: 6, title: 'Buổi 6: Data Workflow & Phương trình mũ - logarit', status: 'todo', progress: null },
    { id: 5, title: 'Buổi 5: Segmentation Dataset & Xác suất có điều kiện', status: 'todo', progress: null },
    { id: 4, title: 'Buổi 4: Keypoint and Pose Data & Dãy số - Cấp số nhân', status: 'todo', progress: null },
    { id: 3, title: 'Buổi 3: MultiFrame Tracking & Số phức lượng giác', status: 'todo', progress: null },
    { id: 2, title: 'Buổi 2: Object Detection & Khối tròn xoay', status: 'todo', progress: null },
  ];

  const k03Sessions = [
    { id: 12, title: 'Buổi 12: Tổng ôn Chuyên đề · Hình học không gian nâng cao', status: 'learning', progress: null },
    { id: 11, title: 'Buổi 11: Phương pháp tọa độ hóa khối đa diện Oxyz', status: 'progress', progress: 80 },
    { id: 10, title: 'Buổi 10: Ứng dụng tích phân tính diện tích & thể tích', status: 'todo', progress: null },
    { id: 9, title: 'Buổi 9: Hàm số lũy thừa & Cực trị hàm hợp', status: 'todo', progress: null },
    { id: 8, title: 'Buổi 8: Số phức và các dạng toán vận dụng cao', status: 'todo', progress: null },
    { id: 7, title: 'Buổi 7: Xác suất biến cố & Biến ngẫu nhiên rời rạc', status: 'todo', progress: null },
    { id: 6, title: 'Buổi 6: Cấp số cộng, cấp số nhân và dãy số giới hạn', status: 'todo', progress: null },
    { id: 5, title: 'Buổi 5: Bất phương trình mũ và logarit chứa tham số', status: 'todo', progress: null },
  ];

  const courseSessions = activeCourseTab === 'k04' ? k04Sessions : k03Sessions;

  // Learning streak days matching reference image
  const streakDays = [
    { day: 'T4', active: false },
    { day: 'T5', active: true },
    { day: 'T6', active: true },
    { day: 'T7', active: true },
    { day: 'CN', active: false },
    { day: 'T2', active: false },
    { day: 'T3', active: false },
  ];

  return (
    <div className="space-y-6">
      {/* ── 1. Hero Greeting Banner (Matching Reference Image) ──────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-transparent pt-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1B2B3A] tracking-tight flex items-center gap-2">
            <span>{getTimeGreeting()}</span>
            <span className="text-[#0F3D5C] uppercase">{studentLastName}?</span>
            <span className="text-2xl animate-bounce">👋</span>
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1 flex items-center gap-1.5 flex-wrap">
            <span className="text-amber-500 font-bold">🌟</span>
            {activeCourseTab === 'k04' ? (
              <span>Ghi chú gần nhất môn <strong>Toán học (Giải tích 12)</strong>. Còn 8 buổi phía trước.</span>
            ) : (
              <span>Ghi chú gần nhất môn <strong>Ôn tập THPT (Hình học & Giải tích)</strong>. Còn 6 buổi phía trước.</span>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/student/assignments')}
          className="bg-[#0F3D5C] hover:bg-[#0c2f47] text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-all shrink-0 self-start sm:self-center cursor-pointer hover:shadow-md active:scale-98"
        >
          Vào khóa học
        </button>
      </div>

      {/* ── 2. Next Class Reminder (Contextual Alert) ──────────────────────── */}
      {nextClass && (
        <div className="bg-gradient-to-r from-ocean/10 via-sky/20 to-primary/10 border border-ocean/30 rounded-xl p-3.5 sm:p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-ocean/20 flex items-center justify-center shrink-0 text-ocean font-bold">
              <Clock className="w-5 h-5 stroke-[2]" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-ocean uppercase tracking-wider">
                Tiết học tiếp theo hôm nay
              </div>
              <div className="text-sm font-bold text-text-primary truncate">
                {nextClass.subject} • {nextClass.period} ({nextClass.time})
              </div>
              <div className="text-xs text-text-secondary truncate">
                {nextClass.room} • GV: {nextClass.teacher}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/student/timetable')}
            className="text-xs font-semibold text-ocean hover:text-primary hover:underline shrink-0 flex items-center gap-1"
          >
            Thời khóa biểu <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── 3. Main Split Layout (Left: 65%, Right: 35%) ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── LEFT COLUMN (8 / 12 cols = approx 67%) ──────────────────────── */}
        <div className="lg:col-span-8 space-y-6">
          {/* Section: Khóa Học Của Tôi (My Courses) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm sm:text-base font-extrabold text-[#1B2B3A] tracking-wider uppercase">
                Khóa học của tôi
              </h2>
              <button
                type="button"
                onClick={() => navigate('/student/assignments')}
                className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 uppercase tracking-wide"
              >
                <span>Xem tất cả</span>
                <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>

            {/* Course Tabs (Underline style matching reference photo) */}
            <div className="border-b border-hairline flex items-center gap-6 text-xs sm:text-sm font-bold">
              <button
                type="button"
                onClick={() => setActiveCourseTab('k04')}
                className={`pb-2.5 transition-all relative cursor-pointer ${
                  activeCourseTab === 'k04'
                    ? 'text-primary font-bold'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <span>K04-L23-P1 · Khóa 4 Phase 1</span>
                {activeCourseTab === 'k04' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveCourseTab('k03')}
                className={`pb-2.5 transition-all relative cursor-pointer ${
                  activeCourseTab === 'k03'
                    ? 'text-primary font-bold'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <span>K03-L34-P1 · Ôn tập THPT</span>
                {activeCourseTab === 'k03' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            </div>

            {/* Session / Lesson List Card (Clean Divided List) */}
            <Card padding="p-0" className="overflow-hidden border border-hairline shadow-xs">
              <div className="divide-y divide-hairline">
                {courseSessions.map((session) => {
                  const isLearning = session.status === 'learning';
                  const isProgress = session.status === 'progress';

                  return (
                    <div
                      key={session.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate('/student/assignments')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigate('/student/assignments');
                        }
                      }}
                      className={`px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean ${
                        isLearning
                          ? 'bg-sky/50 hover:bg-sky/70 font-semibold'
                          : 'hover:bg-surface-neutral/60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {isLearning ? (
                          <div className="w-5 h-5 rounded-full bg-ocean flex items-center justify-center text-white shrink-0 shadow-xs">
                            <PlayCircle className="w-4 h-4 fill-white text-ocean" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-hairline-darker flex items-center justify-center shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-transparent" />
                          </div>
                        )}
                        <span className={`text-xs sm:text-sm truncate ${
                          isLearning ? 'text-primary font-bold' : 'text-text-primary'
                        }`}>
                          {session.title}
                        </span>
                      </div>

                      {/* Right Tag / Progress Indicator */}
                      <div className="shrink-0 flex items-center">
                        {isLearning && (
                          <span className="text-[11px] font-bold text-ocean tracking-wider">
                            ĐANG HỌC...
                          </span>
                        )}
                        {isProgress && session.progress && (
                          <span className="text-xs font-semibold text-text-secondary bg-surface-neutral px-2 py-0.5 rounded">
                            {session.progress}%
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Section: Bài Tập Đến Hạn & Điểm Số TT22 */}
          <Card padding="p-5" className="border border-hairline shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-ocean stroke-[2]" />
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                  Bài tập & Đề thi cần hoàn thành
                </h3>
              </div>
              <button
                type="button"
                onClick={() => navigate('/student/assignments')}
                className="text-xs font-semibold text-ocean hover:underline"
              >
                Xem chi tiết
              </button>
            </div>

            {dueSoonAssignments.length === 0 && overdueAssignments.length === 0 ? (
              <div className="p-6 text-center text-xs text-text-secondary bg-surface-neutral/50 rounded-lg">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
                Tuyệt vời! Bạn không có bài tập nào còn tồn đọng.
              </div>
            ) : (
              <div className="space-y-2.5">
                {[...overdueAssignments, ...dueSoonAssignments].slice(0, 3).map((a) => (
                  <div
                    key={a.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate('/student/assignments')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate('/student/assignments');
                      }
                    }}
                    className="p-3 rounded-lg border border-hairline hover:border-ocean/40 transition-colors flex items-center justify-between gap-3 cursor-pointer bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-ocean">{a.subject}:</span>
                        <span className="text-xs font-semibold text-text-primary truncate">{a.title}</span>
                      </div>
                      <div className="text-[11px] text-text-secondary mt-0.5 flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-amber-500" />
                        <span>Hạn nộp: {a.deadline || 'Hôm nay'}</span>
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      className="shrink-0 text-xs px-3 py-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/student/assignments');
                      }}
                    >
                      Làm bài
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* ── RIGHT COLUMN (4 / 12 cols = approx 33%) ─────────────────────── */}
        <div className="lg:col-span-4 space-y-6">
          {/* 1. CHUỖI NGÀY HỌC (Daily Streak Card - Matching Reference Photo) */}
          <div className="space-y-2">
            <h3 className="text-xs sm:text-sm font-extrabold text-[#1B2B3A] tracking-wider uppercase">
              Chuỗi ngày học
            </h3>

            {/* Dark Navy Solid Card */}
            <div className="bg-[#0F3D5C] text-white rounded-xl p-5 shadow-sm relative overflow-hidden">
              {/* Subtle background flame watermark */}
              <Flame className="w-28 h-28 absolute -right-6 -bottom-6 text-white/5 pointer-events-none" />

              <div className="flex items-start justify-between">
                <div>
                  <div className="text-4xl sm:text-5xl font-black tracking-tight leading-none">
                    3
                  </div>
                  <div className="text-xs font-medium text-white/80 mt-1">
                    ngày liên tiếp
                  </div>
                </div>
                {/* Active fire badge icon */}
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-amber-400">
                  <Flame className="w-6 h-6 fill-amber-400 stroke-amber-500" />
                </div>
              </div>

              {/* 7 Days Streak Indicators */}
              <div className="grid grid-cols-7 gap-1.5 text-center mt-5 pt-4 border-t border-white/10">
                {streakDays.map((d, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-1">
                    {d.active ? (
                      <Flame className="w-4 h-4 fill-red-500 text-red-500 animate-pulse" />
                    ) : (
                      <Flame className="w-4 h-4 text-white/30 stroke-[1.5]" />
                    )}
                    <span className="text-[10px] text-white/70 font-semibold">{d.day}</span>
                  </div>
                ))}
              </div>

              <div className="text-[11px] text-white/60 text-center mt-3 pt-2">
                Hôm nay đã tính
              </div>
            </div>
          </div>

          {/* 2. CHỖ BẠN ĐANG YẾU (Weak Areas / Diagnostics Card) */}
          <div className="space-y-2">
            <h3 className="text-xs sm:text-sm font-extrabold text-[#1B2B3A] tracking-wider uppercase">
              Chỗ bạn đang yếu
            </h3>

            <Card padding="p-4" className="border border-hairline shadow-xs">
              {needsPractice.length > 0 ? (
                <div className="space-y-2.5">
                  <div className="text-xs font-semibold text-text-primary">
                    {needsPractice[0].topic}
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {needsPractice[0].hint || 'Cần xem lại công thức và làm bài trắc nghiệm bổ trợ.'}
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full text-xs mt-1"
                    onClick={() => navigate('/student/ai-tutor')}
                  >
                    Luyện tập với AI ngay
                  </Button>
                </div>
              ) : (
                <div className="text-xs text-text-secondary leading-relaxed">
                  Chưa đo được phần nào. Làm một bài quiz để EduPortal biết bạn đang ở đâu.
                </div>
              )}
            </Card>
          </div>

          {/* 3. HOẠT ĐỘNG HỌC TẬP (Activity Summary Table Matching Reference Photo) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-extrabold text-[#1B2B3A] tracking-wider uppercase">
                Hoạt động học tập
              </h3>
              <button
                type="button"
                onClick={() => navigate('/student/resources')}
                className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-0.5 uppercase tracking-wide"
              >
                <span>Xem tất cả</span>
                <ChevronRight className="w-3 h-3 stroke-[2.5]" />
              </button>
            </div>

            <Card padding="p-0" className="border border-hairline shadow-xs overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-surface-neutral/80 text-text-secondary border-b border-hairline uppercase text-[10px] font-bold">
                    <th className="py-2.5 px-4 font-bold">Loại</th>
                    <th className="py-2.5 px-4 font-bold text-right">Số lượng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline text-text-primary">
                  <tr className="hover:bg-surface-neutral/40 transition-colors">
                    <td className="py-3 px-4 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-ocean stroke-[1.85]" />
                      <span>Ghi chú</span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold">1</td>
                  </tr>
                  <tr className="hover:bg-surface-neutral/40 transition-colors">
                    <td className="py-3 px-4 flex items-center gap-2">
                      <Bookmark className="w-4 h-4 text-amber-500 stroke-[1.85]" />
                      <span>Đoạn đánh dấu</span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold">0</td>
                  </tr>
                  <tr className="hover:bg-surface-neutral/40 transition-colors">
                    <td className="py-3 px-4 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-purple-500 stroke-[1.85]" />
                      <span>Câu hỏi Tutor</span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold">3</td>
                  </tr>
                  <tr className="hover:bg-surface-neutral/40 transition-colors">
                    <td className="py-3 px-4 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500 stroke-[1.85]" />
                      <span>Trang cần ôn</span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold">0</td>
                  </tr>
                </tbody>
              </table>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

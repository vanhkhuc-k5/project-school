// TeacherSchedulePage.tsx — TypeScript conversion with real API integration
import React, { useState, useEffect } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { timetableApi } from '../../services/api';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  Printer,
  RefreshCw,
  AlertCircle,
  BookOpen,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface PeriodSlot {
  period: number;
  subject: string;
  className?: string;
  class?: string;
  time: string;
  room?: string;
}

interface DaySchedule {
  day: string;
  dayOfWeek?: number;
  periods: PeriodSlot[];
}

interface TimetableResponse {
  schedule: DaySchedule[];
  meta?: {
    totalSlots?: number;
    semester?: string;
  };
}

interface ClassMetadata {
  name: string;
  studentCount?: number;
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function TeacherSchedulePage() {
  const [schedule, setSchedule] = useState<DaySchedule[]>([]);
  const [metadata, setMetadata] = useState<{ totalSlots?: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');

  // Dynamic today calculation
  const todayIdx = new Date().getDay();
  const dayMap: Record<number, string> = {
    1: 'Thứ Hai', 2: 'Thứ Ba', 3: 'Thứ Tư',
    4: 'Thứ Năm', 5: 'Thứ Sáu', 6: 'Thứ Bảy', 0: 'Chủ Nhật'
  };
  const todayDayName = dayMap[todayIdx] || 'Thứ Hai';

  const [selectedDay, setSelectedDay] = useState<string>(
    todayDayName === 'Chủ Nhật' ? 'Thứ Hai' : todayDayName
  );
  const daysOfWeek = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

  const fetchSchedule = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await timetableApi.getTeacherTimetable();
      if (res) {
        const data = res as TimetableResponse;
        setSchedule(data.schedule || []);
        setMetadata(data.meta || null);
      } else {
        setSchedule([]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải lịch giảng dạy.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  const getSubjectColor = (subject = ''): string => {
    if (subject.includes('Toán')) return 'border-l-4 border-l-ocean bg-ocean/5 text-primary';
    if (subject.includes('Lý') || subject.includes('Vật lý')) return 'border-l-4 border-l-indigo-500 bg-indigo-50/50 text-indigo-900';
    if (subject.includes('Hóa')) return 'border-l-4 border-l-emerald-500 bg-emerald-50/50 text-emerald-900';
    if (subject.includes('Sinh')) return 'border-l-4 border-l-teal-500 bg-teal-50/50 text-teal-900';
    if (subject.includes('Văn') || subject.includes('Ngữ văn')) return 'border-l-4 border-l-amber-500 bg-amber-50/50 text-amber-900';
    if (subject.includes('Anh') || subject.includes('Tiếng Anh')) return 'border-l-4 border-l-rose-500 bg-rose-50/50 text-rose-900';
    if (subject.includes('Tin')) return 'border-l-4 border-l-sky-500 bg-sky/20 text-sky-950';
    return 'border-l-4 border-l-primary bg-surface-neutral text-text-primary';
  };

  const currentDayData = schedule.find((s) => s.day === selectedDay) || { day: selectedDay, periods: [] };
  const todayData = schedule.find((s) => s.day === todayDayName);
  const todayPeriodCount = todayData?.periods?.length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-medium text-text-primary">Lịch giảng dạy cá nhân</h1>
            <Badge variant="info">Học kỳ I (2024 - 2025)</Badge>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Thời khóa biểu các lớp được phân công giảng dạy trong tuần
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center bg-white border border-hairline rounded p-1">
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                viewMode === 'week' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Lưới cả tuần
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                viewMode === 'day' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Xem theo ngày
            </button>
          </div>

          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={fetchSchedule} disabled={loading}>
            Làm mới
          </Button>
          <Button variant="secondary" size="sm" icon={Printer} onClick={() => window.print()}>
            In lịch dạy
          </Button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="secondary" size="sm" onClick={fetchSchedule}>Thử lại</Button>
        </div>
      )}

      {/* Summary card */}
      <Card padding="p-4" className="bg-gradient-to-r from-sky/20 via-white to-surface-neutral border-ocean/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-text-primary">
                Hôm nay ({todayDayName}): {todayPeriodCount > 0 ? `${todayPeriodCount} tiết dạy` : 'Không có tiết dạy'}
              </div>
              <div className="text-xs text-text-secondary mt-0.5">
                Tổng cộng {metadata?.totalSlots || 0} tiết dạy đã xếp lịch trong tuần
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="success">Chính thức</Badge>
          </div>
        </div>
      </Card>

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white rounded-card border border-hairline p-4 space-y-3 animate-pulse">
              <div className="h-5 bg-hairline rounded w-1/2"></div>
              <div className="h-20 bg-surface-neutral rounded"></div>
              <div className="h-20 bg-surface-neutral rounded"></div>
            </div>
          ))}
        </div>
      )}

      {/* Week Grid Mode */}
      {!loading && viewMode === 'week' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {daysOfWeek.slice(0, 5).map((dayName) => {
            const dayObj = schedule.find((s) => s.day === dayName) || { day: dayName, periods: [] };
            const isToday = dayName === todayDayName;

            return (
              <div
                key={dayName}
                className={`bg-white rounded-card border transition-all flex flex-col ${
                  isToday ? 'border-primary ring-2 ring-ocean/20 shadow-md' : 'border-hairline hover:border-hairline-darker'
                }`}
              >
                {/* Day Header */}
                <div className={`p-3.5 border-b flex items-center justify-between ${
                  isToday ? 'bg-primary text-white' : 'bg-surface-neutral text-text-primary'
                }`}>
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 stroke-[1.75]" />
                    <span className="font-semibold text-sm">{dayName}</span>
                  </div>
                  {isToday && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-primary uppercase tracking-wider">
                      Hôm nay
                    </span>
                  )}
                </div>

                {/* Periods list */}
                <div className="p-3 space-y-2.5 flex-1">
                  {dayObj.periods && dayObj.periods.length > 0 ? (
                    dayObj.periods.map((p, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded border text-xs transition-all hover:scale-[1.02] ${getSubjectColor(p.subject)}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs uppercase tracking-tight">{p.subject}</span>
                          <span className="text-[10px] text-text-secondary bg-white/80 px-1.5 py-0.5 rounded border border-hairline font-mono">
                            Tiết {p.period}
                          </span>
                        </div>
                        <div className="text-[11px] font-semibold text-primary flex items-center gap-1 mt-1">
                          <Users className="w-3 h-3" />
                          <span>Lớp: {p.className || p.class || '10A1'}</span>
                        </div>
                        <div className="text-[11px] text-text-secondary flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" />
                          <span>{p.time}</span>
                        </div>
                        <div className="text-[11px] text-text-secondary flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate">{p.room}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-xs text-text-secondary italic">
                      Không có tiết dạy
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Day View Mode */}
      {!loading && viewMode === 'day' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {daysOfWeek.map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-4 py-2 rounded-card text-sm font-medium transition-all shrink-0 ${
                  selectedDay === day
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-white text-text-secondary hover:bg-surface-neutral border border-hairline'
                }`}
              >
                {day} {day === todayDayName && '• Hôm nay'}
              </button>
            ))}
          </div>

          <Card padding="p-6">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-hairline">
              <div>
                <h3 className="text-lg font-semibold text-text-primary">
                  Chi tiết lịch dạy {selectedDay}
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Tổng số: {currentDayData.periods?.length || 0} tiết dạy
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {currentDayData.periods && currentDayData.periods.length > 0 ? (
                currentDayData.periods.map((p, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-card border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:shadow-sm ${getSubjectColor(p.subject)}`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2.5 py-1 rounded bg-white text-primary font-bold text-xs border border-hairline">
                          Tiết {p.period}
                        </span>
                        <h4 className="text-base font-semibold text-text-primary">{p.subject}</h4>
                        <Badge variant="info">Lớp {p.className || p.class || '10A1'}</Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-text-secondary pt-1">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {p.time}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5" />
                          {p.room}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-sm text-text-secondary">
                  Không có tiết dạy nào được phân bổ cho {selectedDay}.
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

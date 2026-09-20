import React, { useState, useEffect } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { studentApi } from '../../services/api';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  Video,
  ChevronLeft,
  ChevronRight,
  Printer,
  BookOpen,
  Info,
  Sparkles,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';

export function StudentTimetablePage() {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState('Thứ Năm');
  const [viewMode, setViewMode] = useState('week'); // 'week' | 'day'
  const [selectedPeriod, setSelectedPeriod] = useState(null);

  useEffect(() => {
    let mounted = true;
    studentApi.getTimetable().then((data) => {
      if (mounted) {
        setSchedule(data || []);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const daysOfWeek = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

  // Current live session mock for Thursday
  const liveSession = {
    subject: 'Tin học Python',
    time: '14:00 - 15:35',
    period: 'Tiết 6 - 7 (Buổi Chiều)',
    teacher: 'Thầy Lê Quốc Tuấn',
    room: 'Phòng máy Lab 2 (Tầng 2 - Nhà B)',
    topic: 'Cấu trúc dữ liệu mảng và thuật toán sắp xếp nổi bọt (Bubble Sort)',
    meetLink: 'https://meet.google.com/edu-10a1-py',
    materials: 'Bài thực hành Lab 04 - Thao tác List & Tuple',
  };

  const getSubjectColor = (subject = '') => {
    if (subject.includes('Toán')) return 'border-l-4 border-l-ocean bg-ocean/5 text-primary';
    if (subject.includes('Lý') || subject.includes('Vật lý')) return 'border-l-4 border-l-indigo-500 bg-indigo-50/50 text-indigo-900';
    if (subject.includes('Hóa')) return 'border-l-4 border-l-emerald-500 bg-emerald-50/50 text-emerald-900';
    if (subject.includes('Sinh')) return 'border-l-4 border-l-teal-500 bg-teal-50/50 text-teal-900';
    if (subject.includes('Văn')) return 'border-l-4 border-l-amber-500 bg-amber-50/50 text-amber-900';
    if (subject.includes('Anh')) return 'border-l-4 border-l-rose-500 bg-rose-50/50 text-rose-900';
    if (subject.includes('Tin')) return 'border-l-4 border-l-sky-500 bg-sky/20 text-sky-950';
    return 'border-l-4 border-l-primary bg-surface-neutral text-text-primary';
  };

  const currentDayData = schedule.find((s) => s.day === selectedDay) || { day: selectedDay, periods: [] };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-medium text-text-primary">Thời khóa biểu điện tử</h1>
            <Badge variant="info">Tuần 14 (Học kỳ I)</Badge>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Lớp 10A1 • Chuyên Toán - Tin • Áp dụng từ 20/09/2026 - 26/09/2026
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

          <Button variant="secondary" size="sm" icon={Printer} onClick={() => window.print()}>
            In biểu mẫu
          </Button>
        </div>
      </div>

      {/* Live / Upcoming Session Spotlight Card */}
      <Card className="border-ocean/30 bg-gradient-to-r from-ocean/5 via-white to-sky/10" padding="p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                Tiết học tiếp theo hôm nay
              </span>
              <span className="text-xs text-text-secondary">• Bắt đầu lúc {liveSession.time}</span>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-primary flex items-center gap-2">
                <span>{liveSession.subject}</span>
                <span className="text-xs font-normal px-2 py-0.5 rounded bg-sky text-primary border border-ocean/20">
                  {liveSession.period}
                </span>
              </h2>
              <p className="text-sm text-text-secondary mt-0.5 flex items-center gap-2">
                <span className="font-medium text-text-primary">{liveSession.topic}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-text-secondary pt-1">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-primary stroke-[2]" />
                {liveSession.teacher}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-ocean stroke-[2]" />
                {liveSession.room}
              </span>
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-amber-600 stroke-[2]" />
                {liveSession.materials}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <a
              href={liveSession.meetLink}
              target="_blank"
              rel="noreferrer"
              className="h-11 px-5 rounded bg-primary text-white hover:bg-primary/90 text-sm font-medium flex items-center gap-2 shadow-sm transition-all"
            >
              <Video className="w-4 h-4" />
              <span>Vào lớp trực tuyến</span>
            </a>
          </div>
        </div>
      </Card>

      {/* Week Grid Mode */}
      {viewMode === 'week' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {daysOfWeek.slice(0, 5).map((dayName) => {
            const dayObj = schedule.find((s) => s.day === dayName) || {
              day: dayName,
              periods: [
                { period: 1, subject: 'Toán học', time: '07:30 - 08:15', teacher: 'Cô Mai Lan', room: 'Phòng 201' },
                { period: 2, subject: 'Ngữ văn', time: '08:20 - 09:05', teacher: 'Cô Hoàng Lan', room: 'Phòng 201' },
                { period: 3, subject: 'Vật lý', time: '09:20 - 10:05', teacher: 'Thầy Dũng', room: 'Phòng 201' },
              ],
            };
            const isToday = dayName === 'Thứ Năm';

            return (
              <div
                key={dayName}
                className={`bg-white rounded-card border transition-all flex flex-col ${
                  isToday ? 'border-primary ring-2 ring-ocean/20 shadow-md' : 'border-hairline hover:border-hairline-darker'
                }`}
              >
                {/* Day Header */}
                <div
                  className={`p-3.5 border-b flex items-center justify-between ${
                    isToday ? 'bg-primary text-white' : 'bg-surface-neutral text-text-primary'
                  }`}
                >
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
                        onClick={() => setSelectedPeriod({ ...p, day: dayName })}
                        className={`p-3 rounded border text-xs cursor-pointer transition-all hover:scale-[1.02] ${getSubjectColor(
                          p.subject
                        )}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs uppercase tracking-tight">{p.subject}</span>
                          <span className="text-[10px] text-text-secondary bg-white/80 px-1.5 py-0.5 rounded border border-hairline">
                            Tiết {p.period}
                          </span>
                        </div>
                        <div className="text-[11px] text-text-secondary flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" />
                          <span>{p.time}</span>
                        </div>
                        <div className="text-[11px] text-text-secondary flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate">{p.room}</span>
                        </div>
                        <div className="text-[11px] font-medium text-text-primary mt-1.5 flex items-center gap-1">
                          <User className="w-3 h-3 text-text-secondary" />
                          <span>{p.teacher}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-xs text-text-secondary italic">
                      Không có tiết học
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Day View Mode */
        <div className="space-y-4">
          {/* Day selector pills */}
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
                {day} {day === 'Thứ Năm' && '• Hôm nay'}
              </button>
            ))}
          </div>

          <Card padding="p-6">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-hairline">
              <div>
                <h3 className="text-lg font-semibold text-text-primary">
                  Chi tiết lịch học {selectedDay}
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Tổng số: {currentDayData.periods?.length || 0} tiết học
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {currentDayData.periods && currentDayData.periods.length > 0 ? (
                currentDayData.periods.map((p, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-card border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:shadow-sm ${getSubjectColor(
                      p.subject
                    )}`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2.5 py-1 rounded bg-white text-primary font-bold text-xs border border-hairline">
                          Tiết {p.period}
                        </span>
                        <h4 className="text-base font-semibold text-text-primary">{p.subject}</h4>
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
                        <span className="flex items-center gap-1.5 font-medium text-text-primary">
                          <User className="w-3.5 h-3.5 text-text-secondary" />
                          {p.teacher}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedPeriod({ ...p, day: selectedDay })}
                        className="px-3 py-1.5 text-xs font-medium rounded bg-white text-text-primary border border-hairline hover:bg-surface-neutral transition-colors"
                      >
                        Đề cương bài học
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-sm text-text-secondary">
                  Không có tiết học nào được phân bổ cho {selectedDay}.
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Lesson Details Modal */}
      {selectedPeriod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-card max-w-lg w-full p-6 shadow-xl border border-hairline space-y-4">
            <div className="flex items-start justify-between border-b border-hairline pb-3">
              <div>
                <span className="text-xs font-semibold text-ocean uppercase tracking-wider">
                  {selectedPeriod.day} • Tiết {selectedPeriod.period}
                </span>
                <h3 className="text-xl font-bold text-text-primary mt-1">
                  {selectedPeriod.subject}
                </h3>
              </div>
              <button
                onClick={() => setSelectedPeriod(null)}
                className="text-text-secondary hover:text-text-primary p-1 rounded hover:bg-surface-neutral"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="p-3 bg-surface-neutral rounded border border-hairline space-y-1.5">
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span>Khung giờ giảng dạy:</span>
                  <span className="font-semibold text-text-primary">{selectedPeriod.time}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span>Phòng học quy định:</span>
                  <span className="font-semibold text-text-primary">{selectedPeriod.room}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span>Giáo viên phụ trách:</span>
                  <span className="font-semibold text-primary">{selectedPeriod.teacher}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold text-text-secondary uppercase">
                  Nội dung trọng tâm bài giảng:
                </div>
                <p className="text-xs text-text-primary leading-relaxed bg-white p-3 rounded border border-hairline">
                  Trọng tâm tuần này gồm lý thuyết cốt lõi, bài tập minh họa mẫu và câu hỏi trắc nghiệm củng cố kiến thức theo khung chương trình GDPT 2018 của Bộ Giáo dục & Đào tạo.
                </p>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold text-text-secondary uppercase">
                  Học liệu & Đề cương khuyến nghị:
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded bg-sky/20 border border-ocean/20 text-xs text-primary font-medium">
                  <BookOpen className="w-4 h-4 shrink-0" />
                  <span className="truncate">Tài liệu chuyên đề PDF & Bài tập tự luyện Online</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-hairline">
              <Button variant="secondary" size="sm" onClick={() => setSelectedPeriod(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

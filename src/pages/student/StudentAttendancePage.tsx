// =============================================================================
// StudentAttendancePage — TypeScript with full Vietnamese diacritics
// =============================================================================

import React, { useState, useEffect } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { attendanceApi } from '../../services/api';
import {
  UserCheck,
  FileText,
  ShieldCheck,
  TrendingUp,
  Download,
  Filter,
  AlertCircle,
  Loader2,
  BookOpen,
  User,
} from 'lucide-react';

// ── TypeScript interfaces ─────────────────────────────────────────────────────

type AttendanceStatusCode = 'PRESENT' | 'LATE' | 'EXCUSED' | 'ABSENT' | 'present' | 'late' | 'excused' | 'absent';

interface AttendanceStatusMap {
  label: string;
  variant: 'success' | 'warning' | 'info' | 'danger';
}

interface AttendanceRecord {
  date: string;
  period?: number;
  subject?: string;
  teacher?: string;
  statusCode?: AttendanceStatusCode;
  status?: string;
  note?: string;
}

interface AttendanceSummary {
  rate: string | null;
  presentDays: number;
  totalDays: number;
  lateDays: number;
  excusedDays: number;
  absentDays: number;
  status?: string;
  records: AttendanceRecord[];
}

// ── Status mapping with proper Vietnamese diacritics ────────────────────────────

const STATUS_MAP: Record<string, AttendanceStatusMap> = {
  PRESENT: { label: 'Có mặt', variant: 'success' },
  present: { label: 'Có mặt', variant: 'success' },
  LATE: { label: 'Đi muộn', variant: 'warning' },
  late: { label: 'Đi muộn', variant: 'warning' },
  EXCUSED: { label: 'Nghỉ có phép', variant: 'info' },
  excused: { label: 'Nghỉ có phép', variant: 'info' },
  ABSENT: { label: 'Vắng không phép', variant: 'danger' },
  absent: { label: 'Vắng không phép', variant: 'danger' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDay(d: string): string {
  const map = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  try {
    return map[new Date(d).getDay()] ?? '';
  } catch {
    return '';
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function StudentAttendancePage(): React.JSX.Element {
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState<boolean>(false);

  const loadData = (): void => {
    setLoading(true);
    setError(null);
    attendanceApi.getStudentAttendance()
      .then((res) => {
        setAttendance(res as AttendanceSummary | null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Không thể tải dữ liệu';
        setError(msg);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const records: AttendanceRecord[] = attendance?.records ?? [];
  const hasPeriod = records.some((r) => r.period !== undefined);

  const filteredRecords = records.filter((r) => {
    const s = (r.statusCode ?? r.status ?? '').toUpperCase();
    if (filterStatus === 'PRESENT') return s === 'PRESENT';
    if (filterStatus === 'LATE') return s === 'LATE';
    if (filterStatus === 'EXCUSED') return s === 'EXCUSED';
    if (filterStatus === 'ABSENT') return s === 'ABSENT';
    return true;
  });

  const rate = attendance?.rate ?? null;
  const presentDays = attendance?.presentDays ?? 0;
  const totalDays = attendance?.totalDays ?? 0;
  const lateDays = attendance?.lateDays ?? 0;
  const excusedDays = attendance?.excusedDays ?? 0;
  const absentDays = attendance?.absentDays ?? 0;
  const statusLabel = attendance?.status ?? null;

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-medium text-text-primary">Sổ theo dõi chuyên cần</h1>
            {statusLabel && !loading && !error && (
              <Badge variant={absentDays === 0 ? 'success' : absentDays <= 2 ? 'warning' : 'danger'}>
                {statusLabel}
              </Badge>
            )}
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Lịch sử điểm danh cá nhân được ghi nhận bởi giáo viên
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="secondary" size="sm" icon={Download} onClick={() => window.print()}>
            Xuất PDF
          </Button>
          <Button variant="primary" size="sm" icon={FileText} onClick={() => setIsLeaveModalOpen(true)}>
            Quy định
          </Button>
        </div>
      </div>

      {/* ── Loading State ───────────────────────────────────────────────────── */}
      {loading && (
        <Card padding="p-10" className="flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-ocean" />
          <p className="text-sm text-text-secondary">Đang tải dữ liệu...</p>
        </Card>
      )}

      {/* ── Error State ─────────────────────────────────────────────────────── */}
      {!loading && error && (
        <Card padding="p-6" className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="w-8 h-8 text-danger" />
          <p className="text-sm text-danger font-medium">{error}</p>
          <Button variant="secondary" size="sm" onClick={loadData}>Thử lại</Button>
        </Card>
      )}

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      {!loading && !error && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Tỷ lệ chuyên cần */}
            <Card padding="p-5" className="flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <span className="text-xs font-semibold text-text-secondary uppercase">Tỷ lệ chuyên cần</span>
                {rate !== null && (
                  <Badge variant={parseFloat(rate) >= 95 ? 'success' : 'warning'}>{rate}</Badge>
                )}
              </div>
              <div className="mt-4">
                <div className="text-3xl font-bold text-primary">{rate ?? 'N/A'}</div>
                {totalDays > 0 && (
                  <div className="text-xs text-text-secondary mt-1 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{presentDays} / {totalDays} buổi</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Buổi có mặt */}
            <Card padding="p-5" className="flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <span className="text-xs font-semibold text-text-secondary uppercase">Buổi có mặt</span>
                <span className="w-2.5 h-2.5 rounded-full bg-primary mt-0.5" />
              </div>
              <div className="mt-4">
                <div className="text-3xl font-bold text-text-primary">
                  {presentDays} <span className="text-sm font-normal text-text-secondary">/ {totalDays}</span>
                </div>
                {lateDays > 0 && (
                  <div className="text-xs text-amber-700 mt-1">Đi muộn {lateDays} buổi</div>
                )}
              </div>
            </Card>

            {/* Đi muộn */}
            <Card padding="p-5" className="flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <span className="text-xs font-semibold text-text-secondary uppercase">Đi muộn</span>
                <Badge variant={lateDays === 0 ? 'success' : 'warning'}>{lateDays} buổi</Badge>
              </div>
              <div className="mt-4">
                <div className="text-3xl font-bold text-amber-700">
                  {String(lateDays).padStart(2, '0')} <span className="text-sm font-normal text-text-secondary">buổi</span>
                </div>
              </div>
            </Card>

            {/* Nghỉ học */}
            <Card padding="p-5" className="flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <span className="text-xs font-semibold text-text-secondary uppercase">Nghỉ học</span>
                <Badge variant={absentDays === 0 ? 'success' : 'danger'}>
                  {absentDays === 0 ? 'Tốt' : `${absentDays} vắng`}
                </Badge>
              </div>
              <div className="mt-4">
                <div className="text-3xl font-bold text-ocean">
                  {String(excusedDays).padStart(2, '0')} <span className="text-sm font-normal text-text-secondary">có phép</span>
                </div>
                <div className="text-xs text-text-secondary mt-1">{absentDays} buổi vắng không phép</div>
              </div>
            </Card>
          </div>

          {/* Attendance Table */}
          <Card padding="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-hairline mb-5">
              <div>
                <h3 className="text-lg font-semibold text-text-primary">Nhật ký điểm danh</h3>
                <p className="text-xs text-text-secondary mt-0.5">Tổng {records.length} bản ghi</p>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-text-secondary" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="text-xs border border-hairline rounded px-3 py-1.5 bg-white text-text-primary focus:outline-none focus:border-ocean"
                >
                  <option value="all">Tất cả</option>
                  <option value="PRESENT">Có mặt</option>
                  <option value="LATE">Đi muộn</option>
                  <option value="EXCUSED">Nghỉ có phép</option>
                  <option value="ABSENT">Vắng không phép</option>
                </select>
              </div>
            </div>

            {filteredRecords.length === 0 ? (
              <div className="py-10 text-center">
                <UserCheck className="w-8 h-8 text-text-secondary/40 mx-auto mb-2" />
                <p className="text-sm text-text-secondary">
                  {records.length === 0 ? 'Chưa có bản ghi.' : 'Không có bản ghi phù hợp.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-hairline bg-surface-neutral/60 text-text-secondary font-medium uppercase tracking-wider">
                      <th className="py-3 px-4">Ngày</th>
                      <th className="py-3 px-4">Thứ</th>
                      {hasPeriod && <th className="py-3 px-4">Tiết</th>}
                      <th className="py-3 px-4">Môn học</th>
                      <th className="py-3 px-4">Giáo viên</th>
                      <th className="py-3 px-4">Trạng thái</th>
                      <th className="py-3 px-4">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {filteredRecords.map((item, idx) => {
                      const code = (item.statusCode ?? item.status ?? '').toUpperCase();
                      const mapped = STATUS_MAP[code] ?? { label: item.status ?? '', variant: 'info' as const };
                      return (
                        <tr key={idx} className="hover:bg-sky/5 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-text-primary">{item.date}</td>
                          <td className="py-3.5 px-4 text-text-secondary">{getDay(item.date)}</td>
                          {hasPeriod && (
                            <td className="py-3.5 px-4 text-text-secondary">
                              {item.period ? `Tiết ${item.period}` : '-'}
                            </td>
                          )}
                          <td className="py-3.5 px-4 text-text-secondary">
                            <div className="flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5 shrink-0" />
                              <span>{item.subject || '-'}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-text-secondary">
                            <div className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 shrink-0" />
                              <span>{item.teacher || '-'}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge variant={mapped.variant}>{mapped.label}</Badge>
                          </td>
                          <td className="py-3.5 px-4 text-text-secondary max-w-xs truncate">
                            {item.note || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {/* ── Attendance Regulations Modal ───────────────────────────────────── */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-card max-w-md w-full p-6 shadow-xl border border-hairline space-y-4">
            <div className="flex items-start justify-between border-b border-hairline pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-ocean" />
                <h3 className="text-lg font-bold text-text-primary">Quy định Chuyên cần</h3>
              </div>
              <button
                onClick={() => setIsLeaveModalOpen(false)}
                className="text-text-secondary hover:text-text-primary p-1 rounded"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-xs text-text-secondary leading-relaxed">
              <p>1. Nghỉ học phải có phụ huynh thông báo trước 07:00 sáng ngày nghỉ.</p>
              <p>2. Đi muộn quá 3 lần trong tháng sẽ ảnh hưởng đến xếp loại hạnh kiểm.</p>
              <p>3. Vắng không phép quá 3 ngày trong học kỳ sẽ bị xử lý kỷ luật.</p>
            </div>
            <div className="flex items-center justify-end pt-3 border-t border-hairline">
              <Button variant="primary" size="sm" onClick={() => setIsLeaveModalOpen(false)}>
                Tôi đã hiểu
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

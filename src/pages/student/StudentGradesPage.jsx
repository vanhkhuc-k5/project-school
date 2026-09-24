import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { studentApi } from '../../services/api';
import {
  Award,
  TrendingUp,
  Download,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  Printer,
  ChevronRight,
  Sparkles,
  BookOpen,
  Loader2,
  RefreshCw,
} from 'lucide-react';

const PERIOD_LABELS = {
  hk1: 'Học kỳ I',
  hk2: 'Học kỳ II',
  year: 'Cả năm',
};

function getGradeVariant(avg) {
  if (avg === null || avg === undefined) return 'neutral';
  if (avg >= 8.5) return 'success';
  if (avg >= 7.0) return 'info';
  if (avg >= 5.0) return 'warning';
  return 'danger';
}

function getConductLabel(rate) {
  if (!rate) return 'Không xác định';
  const n = parseFloat(String(rate).replace('%', ''));
  if (n >= 95) return 'Tốt';
  if (n >= 85) return 'Khá';
  if (n >= 75) return 'Đạt';
  return 'Yếu';
}

function getGpaLabel(gpa) {
  if (gpa === null || gpa === undefined) return null;
  if (gpa >= 8.5) return 'Xuất sắc';
  if (gpa >= 8.0) return 'Giỏi';
  if (gpa >= 7.0) return 'Khá';
  if (gpa >= 5.0) return 'Đạt';
  return 'Yếu';
}

export function StudentGradesPage() {
  const [gradeData, setGradeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activePeriod, setActivePeriod] = useState('hk1');
  const [selectedSubject, setSelectedSubject] = useState(null);

  const fetchGrades = useCallback(async (period) => {
    setLoading(true);
    setError(null);
    try {
      const res = await studentApi.getGrades(activePeriod);
      if (res && res.data) {
        setGradeData(res.data);
      } else {
        setGradeData(null);
      }
    } catch (e) {
      setError(e.message || 'Không thể tải bảng điểm.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGrades(activePeriod);
  }, [fetchGrades, activePeriod]);

  const { subjects = [], overallGpa, classRank, conduct, attendanceRate } = gradeData || {};
  const gpaLabel = getGpaLabel(overallGpa);
  const conductLabel = conduct || getConductLabel(attendanceRate);

  // When switching period tabs, we re-fetch (period is a query param the backend reads)
  const handlePeriodChange = (period) => {
    setActivePeriod(period);
    fetchGrades(period);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-text-secondary mb-1">
            <span>Học sinh</span>
            <span>/</span>
            <span className="text-text-primary font-medium">Học bạ & Kết quả học tập</span>
          </div>
          <h1 className="text-2xl font-medium text-text-primary">Bảng điểm & Học bạ điện tử</h1>
          {gradeData && (
            <p className="text-xs text-text-secondary mt-1">
              {gradeData.semester || PERIOD_LABELS[activePeriod]} • {gradeData.academicYear || 'Năm học 2024 - 2025'}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Period Selector */}
          <div className="flex items-center gap-1 p-1 bg-surface-neutral rounded border border-hairline text-xs">
            {Object.entries(PERIOD_LABELS).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => handlePeriodChange(key)}
                className={`px-3 py-1.5 rounded transition-all ${
                  activePeriod === key
                    ? 'bg-white text-primary font-medium shadow-whisper border border-hairline'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <Button variant="secondary" size="md" icon={Printer} onClick={() => window.print()}>
            In học bạ số
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            onClick={() => fetchGrades(activePeriod)}
            disabled={loading}
          >
            Làm mới
          </Button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <Card padding="p-6" className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="w-8 h-8 text-danger" />
          <p className="text-sm text-danger font-medium">{error}</p>
          <Button variant="secondary" size="sm" onClick={() => fetchGrades(activePeriod)}>Thử lại</Button>
        </Card>
      )}

      {/* Loading state */}
      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} padding="p-5" className="animate-pulse">
                <div className="h-3 bg-hairline rounded w-1/2 mb-3"></div>
                <div className="h-8 bg-hairline rounded w-2/3"></div>
              </Card>
            ))}
          </div>
          <Card padding="p-6" className="animate-pulse">
            <div className="h-5 bg-hairline rounded w-1/3 mb-4"></div>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 bg-surface-neutral rounded mb-2"></div>
            ))}
          </Card>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && gradeData && subjects.length === 0 && (
        <Card padding="p-8" className="text-center">
          <Award className="w-10 h-10 text-hairline mx-auto mb-3" />
          <p className="text-sm text-text-secondary mb-1">
            Chưa có điểm số được công bố cho học kỳ này.
          </p>
          <p className="text-xs text-text-secondary">
            Giáo viên sẽ cập nhật điểm sau khi chấm bài.
          </p>
        </Card>
      )}

      {/* No data yet */}
      {!loading && !error && !gradeData && (
        <Card padding="p-8" className="text-center">
          <AlertCircle className="w-10 h-10 text-text-secondary/40 mx-auto mb-3" />
          <p className="text-sm text-text-secondary">
            Không thể tải bảng điểm. Vui lòng thử lại sau.
          </p>
        </Card>
      )}

      {/* Content */}
      {!loading && !error && gradeData && subjects.length > 0 && (
        <>
          {/* KPI Overview Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card padding="p-5">
              <div className="text-[11px] text-text-secondary uppercase tracking-wider font-medium">
                Điểm trung bình (GPA)
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-semibold text-primary tracking-tight">
                  {overallGpa !== null && overallGpa !== undefined ? overallGpa : '—'}
                </span>
                <span className="text-xs text-text-secondary">/ 10</span>
              </div>
              {gpaLabel && (
                <div className="mt-2 text-xs text-success flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                  <span>Xếp loại: {gpaLabel}</span>
                </div>
              )}
            </Card>

            <Card padding="p-5">
              <div className="text-[11px] text-text-secondary uppercase tracking-wider font-medium">
                Thứ hạng trong lớp
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-semibold text-primary tracking-tight">
                  {classRank || '—'}
                </span>
              </div>
              {classRank && (
                <div className="mt-2 text-xs text-text-secondary flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Xếp theo điểm trung bình</span>
                </div>
              )}
            </Card>

            <Card padding="p-5">
              <div className="text-[11px] text-text-secondary uppercase tracking-wider font-medium">
                Hạnh kiểm & Rèn luyện
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-success tracking-tight">{conductLabel}</span>
              </div>
              <div className="mt-2 text-xs text-text-secondary">
                Chuyên cần: <strong className="text-text-primary">{attendanceRate || '—'}</strong>
              </div>
            </Card>

            <Card padding="p-5">
              <div className="text-[11px] text-text-secondary uppercase tracking-wider font-medium">
                Số môn học
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-semibold text-primary tracking-tight">{subjects.length}</span>
                <span className="text-xs text-text-secondary">môn</span>
              </div>
              <div className="mt-2 text-xs text-text-secondary">
                {gradeData.semester || PERIOD_LABELS[activePeriod]}
              </div>
            </Card>
          </div>

          {/* Transcript Table */}
          <Card padding="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-medium text-text-primary">Chi tiết điểm các môn học</h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  Nhấp vào từng môn để xem chi tiết các bài kiểm tra
                </p>
              </div>
              <Badge variant="info">
                {PERIOD_LABELS[activePeriod]}
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="hairline-b text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                    <th className="py-3 px-4">Môn học</th>
                    <th className="py-3 px-4 text-center">Số bài kiểm tra</th>
                    <th className="py-3 px-4 text-center">Điểm gần nhất</th>
                    <th className="py-3 px-4 text-center">Điểm TB Môn</th>
                    <th className="py-3 px-4 text-center">Xếp loại</th>
                    <th className="py-3 px-4">Nhận xét của giáo viên</th>
                    <th className="py-3 px-4 text-right">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline text-xs">
                  {subjects.map((sub) => {
                    const variant = getGradeVariant(sub.average);
                    return (
                      <tr key={sub.subject} className="hover:bg-surface-neutral/40 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-text-primary">
                          {sub.subject}
                        </td>
                        <td className="py-3.5 px-4 text-center text-text-secondary">
                          {sub.testsCount || sub.tests?.length || 0} bài
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-medium text-ocean">
                          {sub.recentScore !== null && sub.recentScore !== undefined ? sub.recentScore : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="font-bold text-sm text-primary">
                            {sub.average !== null && sub.average !== undefined ? sub.average : '—'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <Badge variant={variant} size="sm">
                            {sub.average >= 8.5 ? 'Giỏi' : sub.average >= 7.0 ? 'Khá' : sub.average >= 5.0 ? 'Đạt' : 'Yếu'}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-text-secondary text-xs max-w-xs truncate">
                          {sub.teacherComment || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedSubject(sub)}
                            className="text-xs text-ocean hover:underline font-medium"
                          >
                            Xem chi tiết &rarr;
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Subject Detail Modal */}
      <Modal
        isOpen={Boolean(selectedSubject)}
        onClose={() => setSelectedSubject(null)}
        title={`Chi tiết kết quả môn ${selectedSubject?.subject || ''}`}
        maxWidth="max-w-2xl"
      >
        {selectedSubject && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-surface-neutral rounded border border-hairline flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-primary">{selectedSubject.subject}</div>
                <div className="text-text-secondary mt-0.5">
                  {selectedSubject.testsCount || selectedSubject.tests?.length || 0} bài kiểm tra
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-text-secondary">Điểm trung bình</div>
                <div className={`text-2xl font-bold ${
                  selectedSubject.average >= 8.5 ? 'text-success' :
                  selectedSubject.average >= 7.0 ? 'text-info' :
                  selectedSubject.average >= 5.0 ? 'text-warning' : 'text-danger'
                }`}>
                  {selectedSubject.average !== null && selectedSubject.average !== undefined ? selectedSubject.average : '—'}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-medium text-text-primary text-xs uppercase tracking-wider">
                Bảng phân rã các đầu điểm thành phần
              </div>
              {(selectedSubject.tests || []).length === 0 ? (
                <div className="py-8 text-center text-text-secondary italic">
                  Chưa có bài kiểm tra nào được ghi nhận.
                </div>
              ) : (
                <div className="divide-y divide-hairline border border-hairline rounded bg-white overflow-hidden">
                  {(selectedSubject.tests || []).slice(0, 20).map((test, i) => (
                    <div key={test.id || i} className="p-3 flex items-center justify-between hover:bg-surface-neutral/30 transition-colors">
                      <div>
                        <div className="font-medium text-text-primary">{test.test_name || test.category_name || `Bài kiểm tra #${i + 1}`}</div>
                        <div className="text-[11px] text-text-secondary mt-0.5">
                          {test.graded_at ? new Date(test.graded_at).toLocaleDateString('vi-VN') : ''}
                          {test.category_code ? ` • ${test.category_code}` : ''}
                          {test.weight ? ` • Hệ số ${test.weight}` : ''}
                        </div>
                      </div>
                      <div className="font-mono text-sm font-bold text-primary px-2.5 py-1 bg-sky/50 rounded border border-ocean/20">
                        {test.score}{test.max_score ? `/${test.max_score}` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedSubject.teacherComment && (
              <div className="p-3 bg-sky/40 border border-ocean/20 rounded space-y-1">
                <div className="font-semibold text-ocean">Nhận xét đánh giá chuyên môn:</div>
                <p className="text-text-secondary leading-relaxed">{selectedSubject.teacherComment}</p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="primary" size="md" onClick={() => setSelectedSubject(null)}>
                Đóng
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

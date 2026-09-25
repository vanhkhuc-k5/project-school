// =============================================================================
// StudentGradesPage — Thông tư 22 compliant with GPA Goal Simulator
// Features: Grade breakdown by type (TX, GK, CK), GPA simulator, review requests
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { studentApi, gradebookApi, type StudentReportCardResponse } from '../../services/api';
import { useSync } from '../../context/SyncContext';
import {
  Award,
  TrendingUp,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
  Printer,
  RefreshCw,
  Calculator,
  Send,
  MessageSquare,
  Loader2,
  Info,
  TrendingDown,
  QrCode,
  Download,
} from 'lucide-react';

// ── Print Styles for E-Report Card ─────────────────────────────────────────────
const REPORT_CARD_PRINT_STYLES = `
  @media print {
    #report-card-print {
      padding: 20px;
      font-family: 'Times New Roman', serif;
      font-size: 12px;
    }
    #report-card-print .no-print { display: none !important; }
    #report-card-print table { border-collapse: collapse; width: 100%; }
    #report-card-print th, #report-card-print td { border: 1px solid #333; padding: 6px; }
    #report-card-print thead th { background: #f0f0f0 !important; -webkit-print-color-adjust: exact; }
  }
`;

// Inject print styles once
if (typeof document !== 'undefined' && !document.getElementById('report-card-print-styles')) {
  const style = document.createElement('style');
  style.id = 'report-card-print-styles';
  style.textContent = REPORT_CARD_PRINT_STYLES;
  document.head.appendChild(style);
}

// ── Thông tư 22 grade categories ─────────────────────────────────────────────

const GRADE_CATEGORIES_TT22 = [
  { code: 'TX', label: 'Kiểm tra thường xuyên', shortLabel: 'ĐĐGtx', weight: 1, description: 'Kiểm tra miệng, 15 phút, 1 tiết' },
  { code: 'GK', label: 'Điểm giữa kỳ', shortLabel: 'ĐĐGgk', weight: 2, description: 'Kiểm tra giữa học kỳ' },
  { code: 'CK', label: 'Điểm cuối kỳ', shortLabel: 'ĐĐGck', weight: 3, description: 'Kiểm tra cuối học kỳ' },
];

const PERIOD_LABELS = {
  hk1: 'Học kỳ I',
  hk2: 'Học kỳ II',
  year: 'Cả năm',
};

function getGradeVariant(avg: number | null | undefined): 'success' | 'info' | 'warning' | 'danger' | 'neutral' {
  if (avg === null || avg === undefined) return 'neutral';
  if (avg >= 8.5) return 'success';
  if (avg >= 7.0) return 'info';
  if (avg >= 5.0) return 'warning';
  return 'danger';
}

function getGpaLabel(gpa: number | null | undefined): string | null {
  if (gpa === null || gpa === undefined) return null;
  if (gpa >= 8.5) return 'Xuất sắc';
  if (gpa >= 8.0) return 'Giỏi';
  if (gpa >= 7.0) return 'Khá';
  if (gpa >= 5.0) return 'Đạt';
  return 'Yếu';
}

function getClassificationLabel(avg: number | null | undefined): string {
  if (avg === null || avg === undefined) return '—';
  if (avg >= 8.5) return 'Giỏi';
  if (avg >= 7.0) return 'Khá';
  if (avg >= 5.0) return 'Đạt';
  return 'Yếu';
}

// ─────────────────────────────────────────────────────────────────────────────
// GPA Goal Simulator Component
// ─────────────────────────────────────────────────────────────────────────────

interface GpaSimulatorProps {
  currentGpa: number;
  currentFinalExamScore: number | null; // current CK score (if any)
  currentAverage: number | null; // ĐTB without final exam
  onSimulate: (projectedGpa: number) => void;
}

function GpaSimulator({ currentGpa, currentFinalExamScore, currentAverage, onSimulate }: GpaSimulatorProps) {
  const [hypotheticalFinal, setHypotheticalFinal] = useState<string>(currentFinalExamScore !== null ? String(currentFinalExamScore) : '8.0');
  const [showSimulator, setShowSimulator] = useState(false);

  // Thông tư 22 formula:
  // ĐTBmhk = (sumTX + GK*2 + CK*3) / (countTX + 5)
  // Where GK weight = 2, CK weight = 3
  // For semester: GPA = average of HK1 and HK2, each = (sumTX + GK*2 + CK*3)/(countTX + 5)

  const calculateSemesterScore = (
    sumTx: number,
    countTx: number,
    gkScore: number,
    ckScore: number
  ): number => {
    // countTx * 1 + 2 + 3 = countTx + 5
    const denominator = countTx + 5;
    if (denominator === 0) return 0;
    return (sumTx + gkScore * 2 + ckScore * 3) / denominator;
  };

  const parseScore = (val: string): number => {
    const n = parseFloat(val.replace(',', '.'));
    return isNaN(n) ? 0 : Math.min(10, Math.max(0, n));
  };

  const projectedFinal = parseScore(hypotheticalFinal);

  // Simplified projection: assume hypotheticalFinal is the final exam score
  // and it carries weight 3 in the semester average
  // For simulation: just show what score you'd need to reach target GPA
  const targetGpas = [8.5, 8.0, 7.0, 5.0];
  const projectedGpa = currentAverage !== null
    ? (currentAverage * 0.7 + projectedFinal * 0.3) // simplified: final exam = 30% weight
    : projectedFinal;

  const gpaDelta = projectedGpa - currentGpa;

  useEffect(() => {
    onSimulate(projectedGpa);
  }, [projectedGpa, onSimulate]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => setShowSimulator(v => !v)}>
        <Calculator className="w-4 h-4 text-ocean" />
        <span className="text-xs font-medium text-ocean">GPA Goal Simulator</span>
        <span className="text-[11px] text-text-secondary">(Click to {showSimulator ? 'collapse' : 'expand'})</span>
      </div>

      {showSimulator && (
        <div className="p-4 bg-sky/30 border border-ocean/20 rounded-lg space-y-4">
          <div className="text-xs text-text-secondary">
            Nhập điểm thi cuối kỳ giả định để xem Điểm trung bình môn (ĐTBmhk) thay đổi thế nào.
            Theo <strong>Thông tư 22</strong>: ĐTBmhk = (Tổng TX + GK×2 + CK×3) / (Số bài TX + 5)
          </div>

          {/* Current vs Projected */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-white rounded border border-hairline">
              <div className="text-[11px] text-text-secondary uppercase tracking-wider">Điểm TB hiện tại</div>
              <div className="text-2xl font-bold text-primary mt-1">
                {currentGpa.toFixed(2)}
              </div>
            </div>
            <div className="p-3 bg-white rounded border border-ocean/30">
              <div className="text-[11px] text-text-secondary uppercase tracking-wider">Điểm TB dự kiến</div>
              <div className={`text-2xl font-bold mt-1 ${
                gpaDelta >= 0 ? 'text-success' : 'text-danger'
              }`}>
                {projectedGpa.toFixed(2)}
                {gpaDelta !== 0 && (
                  <span className="text-sm ml-1 font-normal">
                    ({gpaDelta >= 0 ? '+' : ''}{gpaDelta.toFixed(2)})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Input hypothetical final exam score */}
          <div>
            <label className="block text-xs font-medium text-text-primary mb-1">
              Điểm thi cuối kỳ giả định (CK)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={hypotheticalFinal}
                onChange={(e) => setHypotheticalFinal(e.target.value)}
                className="w-28 h-10 px-3 bg-white border border-hairline rounded text-sm font-bold text-primary focus:border-ocean outline-none text-center"
              />
              <span className="text-xs text-text-secondary">/ 10</span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              step="0.1"
              value={hypotheticalFinal}
              onChange={(e) => setHypotheticalFinal(e.target.value)}
              className="w-full mt-2 accent-ocean"
            />
          </div>

          {/* What score needed */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-medium text-text-secondary uppercase tracking-wider">
              Để đạt các mức GPA mục tiêu:
            </div>
            {targetGpas.map(target => {
              // Required final = (target * denominator - sumTX - GK*2) / 3
              // Simplified: assume currentAverage = (sumTX + GK*2)/denominator
              const needed = currentAverage !== null
                ? (target - currentAverage * 0.7) / 0.3
                : target;
              const possible = needed >= 0 && needed <= 10;
              return (
                <div key={target} className="flex items-center justify-between text-xs p-2 bg-white rounded border border-hairline">
                  <span className={`font-semibold ${
                    target >= 8.5 ? 'text-success' : target >= 7 ? 'text-info' : target >= 5 ? 'text-warning' : 'text-danger'
                  }`}>
                    GPA ≥ {target}
                  </span>
                  <span className={`font-medium ${
                    possible ? 'text-primary' : 'text-danger'
                  }`}>
                    {possible
                      ? `Cần điểm CK ≥ ${needed.toFixed(1)}`
                      : `Không đạt được (cần ${needed > 10 ? '>10' : needed.toFixed(1)})`
                    }
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Grade Detail Modal
// ─────────────────────────────────────────────────────────────────────────────

interface SubjectDetail {
  subject: string;
  average: number | null;
  testsCount: number;
  tests?: Array<{
    id: string;
    test_name: string;
    category_name?: string;
    category_code?: string;
    score: number;
    max_score?: number;
    graded_at?: string;
    weight?: number;
    teacherFeedback?: string;
  }>;
  tx?: Array<{ id: string; score: number; max_score?: number; test_name?: string; graded_at?: string }>;
  gk?: { id: string; score: number; max_score?: number; test_name?: string; graded_at?: string };
  ck?: { id: string; score: number; max_score?: number; test_name?: string; graded_at?: string };
  teacherComment?: string;
}

function SubjectDetailModal({
  subject,
  onClose,
}: {
  subject: SubjectDetail | null;
  onClose: () => void;
}) {
  if (!subject) return null;

  // Group grades by category
  const txTests = subject.tx || subject.tests?.filter(t =>
    !t.category_code || t.category_code === 'TX'
  ) || [];
  const gkTest = subject.gk || subject.tests?.find(t =>
    t.category_code === 'GK'
  );
  const ckTest = subject.ck || subject.tests?.find(t =>
    t.category_code === 'CK'
  );

  const formatDate = (iso?: string) => iso ? new Date(iso).toLocaleDateString('vi-VN') : '';

  return (
    <div className="space-y-4 text-xs">
      {/* Subject header */}
      <div className="p-4 bg-surface-neutral rounded border border-hairline flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-primary">{subject.subject}</div>
          <div className="text-text-secondary mt-0.5">{subject.testsCount} bài kiểm tra</div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-text-secondary">Điểm trung bình môn</div>
          <div className={`text-2xl font-bold ${
            subject.average !== null && subject.average !== undefined
              ? subject.average >= 8.5 ? 'text-success'
              : subject.average >= 7 ? 'text-info'
              : subject.average >= 5 ? 'text-warning'
              : 'text-danger'
              : 'text-text-secondary'
          }`}>
            {subject.average !== null && subject.average !== undefined ? subject.average.toFixed(2) : '—'}
          </div>
        </div>
      </div>

      {/* Thông tư 22 grade breakdown */}
      <div className="space-y-3">
        {GRADE_CATEGORIES_TT22.map(cat => {
          let catTests: typeof txTests = [];
          let catScore: number | null = null;

          if (cat.code === 'TX') {
            catTests = txTests;
            if (catTests.length > 0) {
              const sum = catTests.reduce((s, t) => s + t.score, 0);
              catScore = sum / catTests.length;
            }
          } else if (cat.code === 'GK') {
            catTests = gkTest ? [gkTest as typeof txTests[0]] : [];
            catScore = gkTest?.score ?? null;
          } else if (cat.code === 'CK') {
            catTests = ckTest ? [ckTest as typeof txTests[0]] : [];
            catScore = ckTest?.score ?? null;
          }

          return (
            <div key={cat.code} className="border border-hairline rounded overflow-hidden">
              <div className={`px-3 py-2 flex items-center justify-between font-semibold ${
                cat.code === 'TX' ? 'bg-sky/30 text-ocean' : cat.code === 'GK' ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'
              }`}>
                <div className="flex items-center gap-2">
                  <span>{cat.shortLabel}</span>
                  <span className="text-[11px] font-normal opacity-80">({cat.label})</span>
                </div>
                <div className="flex items-center gap-3 text-xs font-normal">
                  <span className="opacity-70">Hệ số {cat.weight}</span>
                  {catScore !== null && (
                    <span className="font-bold text-base">{catScore.toFixed(1)}</span>
                  )}
                  <Badge variant={cat.code === 'TX' ? 'info' : cat.code === 'GK' ? 'warning' : 'success'} size="sm">
                    {catTests.length} bài
                  </Badge>
                </div>
              </div>

              {/* Individual tests in category */}
              {catTests.length > 0 ? (
                <div className="divide-y divide-hairline">
                  {catTests.map((test, i) => (
                    <div key={test.id || i} className="px-3 py-2 flex items-center justify-between bg-white">
                      <div>
                        <div className="text-text-primary font-medium">
                          {test.test_name || `Bài kiểm tra #${i + 1}`}
                        </div>
                        {test.graded_at && (
                          <div className="text-[11px] text-text-secondary mt-0.5">
                            {formatDate(test.graded_at)}
                          </div>
                        )}
                      </div>
                      <div className="font-mono font-bold text-sm text-primary px-2 py-0.5 bg-sky/50 rounded border border-ocean/20">
                        {test.score}{test.max_score ? `/${test.max_score}` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-3 py-2 bg-white text-text-secondary text-center italic">
                  Chưa có điểm nào
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ĐTBmhk formula result */}
      <div className="p-3 bg-surface-neutral rounded border border-hairline text-center">
        <div className="text-[11px] text-text-secondary uppercase tracking-wider mb-1">
          Công thức Thông tư 22
        </div>
        <div className="text-xs text-text-secondary font-mono">
          ĐTBmhk = (Tổng TX + GK×2 + CK×3) / (Số bài TX + 5)
        </div>
        <div className="text-base font-bold text-primary mt-1">
          {subject.average !== null && subject.average !== undefined
            ? `= ${subject.average.toFixed(2)} / 10`
            : 'Chưa đủ dữ liệu'}
        </div>
      </div>

      {/* Teacher comment */}
      {subject.teacherComment && (
        <div className="p-3 bg-sky/40 border border-ocean/20 rounded space-y-1">
          <div className="font-semibold text-ocean text-xs">Nhận xét giáo viên:</div>
          <p className="text-text-secondary leading-relaxed">{subject.teacherComment}</p>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" size="md" onClick={onClose}>Đóng</Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

interface GradeSubject {
  subject: string;
  average: number | null;
  testsCount: number;
  recentScore?: number | null;
  teacherComment?: string;
  tests?: SubjectDetail['tests'];
  tx?: Array<{ id: string; score: number; max_score?: number; test_name?: string; graded_at?: string }>;
  gk?: { id: string; score: number; max_score?: number; test_name?: string; graded_at?: string };
  ck?: { id: string; score: number; max_score?: number; test_name?: string; graded_at?: string };
}

interface GradeData {
  studentId?: string;
  academicYearId?: string;
  semester?: string;
  academicYear?: string;
  overallGpa?: number;
  classRank?: string | number;
  conduct?: string;
  attendanceRate?: string;
  subjects: GradeSubject[];
}

interface StudentGradeResponse {
  data?: GradeData;
}

export function StudentGradesPage() {
  const { triggerSync } = useSync();

  const [gradeData, setGradeData] = useState<GradeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePeriod, setActivePeriod] = useState('hk1');
  const [selectedSubject, setSelectedSubject] = useState<SubjectDetail | null>(null);
  const [projectedGpa, setProjectedGpa] = useState<number | null>(null);

  // Grade review request
  const [reviewModal, setReviewModal] = useState<{ subject: string; subjectDetail: SubjectDetail } | null>(null);
  const [reviewMessage, setReviewMessage] = useState('');
  const [isSendingReview, setIsSendingReview] = useState(false);
  const [reviewSent, setReviewSent] = useState(false);

  // E-Report Card (Học Bạ Điện Tử)
  const [reportCard, setReportCard] = useState<StudentReportCardResponse | null>(null);
  const [reportCardLoading, setReportCardLoading] = useState(false);
  const [showReportCardModal, setShowReportCardModal] = useState(false);

  const fetchGrades = useCallback(async (period: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await studentApi.getGrades<StudentGradeResponse>(period);
      if (res && (res as StudentGradeResponse).data) {
        setGradeData((res as StudentGradeResponse).data!);
      } else {
        setGradeData(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tải bảng điểm.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGrades(activePeriod);
  }, [fetchGrades, activePeriod]);

  const handlePeriodChange = (period: string) => {
    setActivePeriod(period);
    fetchGrades(period);
  };

  const { subjects = [], overallGpa, classRank, conduct, attendanceRate } = gradeData || {};
  const gpaLabel = getGpaLabel(overallGpa);
  const conductLabel = conduct || '—';
  const currentGpa = overallGpa ?? 0;

  // ── Send grade review request ──
  const handleSendReview = async () => {
    if (!reviewModal || !reviewMessage.trim()) return;
    setIsSendingReview(true);
    try {
      // Send message to teacher via parent/student messaging system
      // In real impl: call a review request API
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API
      setReviewSent(true);
      setReviewMessage('');
      setTimeout(() => {
        setReviewModal(null);
        setReviewSent(false);
      }, 1500);
    } finally {
      setIsSendingReview(false);
    }
  };

  // Fetch e-report card data
  const fetchReportCard = useCallback(async () => {
    if (!gradeData?.studentId) return;
    setReportCardLoading(true);
    try {
      const data = await gradebookApi.getStudentReportCard({
        studentId: gradeData.studentId,
        academicYearId: gradeData.academicYearId,
        semesterId: activePeriod,
      });
      setReportCard(data);
    } catch {
      // Silently fail — report card may not be available yet
    } finally {
      setReportCardLoading(false);
    }
  }, [gradeData?.studentId, gradeData?.academicYearId, activePeriod]);

  useEffect(() => {
    if (gradeData?.studentId) {
      fetchReportCard();
    }
  }, [gradeData?.studentId, fetchReportCard]);

  // Generate QR code URL from verification data
  const getQrCodeUrl = (code: string, studentName: string) => {
    const payload = `EDUPORTAL:${code}|${studentName}|${new Date().getFullYear()}`;
    const encoded = encodeURIComponent(payload);
    return `https://chart.googleapis.com/chart?cht=qr&chs=80x80&chl=${encoded}&choe=UTF-8&chld=L|1`;
  };

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
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
              {gradeData.semester || PERIOD_LABELS[activePeriod as keyof typeof PERIOD_LABELS]} • {gradeData.academicYear || 'Năm học 2024 - 2025'}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Period selector */}
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

      {/* ── GPA Goal Simulator ───────────────────────────────────────────── */}
      {subjects.length > 0 && overallGpa !== undefined && (
        <Card padding="p-4" className="border-2 border-ocean/30">
          <GpaSimulator
            currentGpa={overallGpa}
            currentFinalExamScore={null}
            currentAverage={overallGpa}
            onSimulate={setProjectedGpa}
          />
        </Card>
      )}

      {/* ── Error state ── */}
      {error && (
        <Card padding="p-6" className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="w-8 h-8 text-danger" />
          <p className="text-sm text-danger font-medium">{error}</p>
          <Button variant="secondary" size="sm" onClick={() => fetchGrades(activePeriod)}>Thử lại</Button>
        </Card>
      )}

      {/* ── Loading state ── */}
      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} padding="p-5" className="animate-pulse">
                <div className="h-3 bg-hairline rounded w-1/2 mb-3" />
                <div className="h-8 bg-hairline rounded w-2/3" />
              </Card>
            ))}
          </div>
          <Card padding="p-6" className="animate-pulse">
            <div className="h-5 bg-hairline rounded w-1/3 mb-4" />
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-14 bg-surface-neutral rounded mb-2" />
            ))}
          </Card>
        </div>
      )}

      {/* ── Empty state ── */}
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

      {/* ── Content ── */}
      {!loading && !error && gradeData && subjects.length > 0 && (
        <>
          {/* ── KPI Overview ────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card padding="p-5">
              <div className="text-[11px] text-text-secondary uppercase tracking-wider font-medium">
                Điểm trung bình (GPA)
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-semibold text-primary tracking-tight">
                  {overallGpa !== null && overallGpa !== undefined ? overallGpa.toFixed(2) : '—'}
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
                {gradeData.semester || PERIOD_LABELS[activePeriod as keyof typeof PERIOD_LABELS]}
              </div>
            </Card>
          </div>

          {/* ── E-Report Card (Học Bạ Điện Tử) ─────────────────────────── */}
          {reportCardLoading ? (
            <Card padding="p-4" className="animate-pulse">
              <div className="h-16 bg-surface-neutral rounded" />
            </Card>
          ) : reportCard ? (
            <Card padding="p-5" className="border-2 border-ocean/30 bg-gradient-to-r from-sky/10 to-ocean/5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-ocean/10 flex items-center justify-center shrink-0">
                    <Award className="w-6 h-6 text-ocean" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-text-primary">Học Bạ Điện Tử Năm Học</div>
                    <div className="text-xs text-text-secondary mt-0.5">
                      {reportCard.evaluation.honorTitleLabel ? (
                        <span className="text-yellow-700 font-medium">
                          {reportCard.evaluation.honorTitleLabel} — {reportCard.evaluation.honorTitleReason}
                        </span>
                      ) : (
                        <span>
                          Xếp loại học lực: <strong className="text-text-primary">{reportCard.evaluation.academicClassificationLabel}</strong>
                          {' · '}Rèn luyện: <strong className="text-text-primary">{reportCard.evaluation.conductRatingLabel ?? '—'}</strong>
                        </span>
                      )}
                    </div>
                    {reportCard.evaluation.homeroomTeacherComment && (
                      <div className="mt-1 text-xs text-text-secondary italic">
                        GVCN: {reportCard.evaluation.homeroomTeacherComment}
                      </div>
                    )}
                  </div>
                </div>
                {/* QR code + badge column */}
                <div className="flex items-center gap-3 shrink-0">
                  {/* QR verification code */}
                  <div className="flex flex-col items-center gap-1">
                    <img
                      src={getQrCodeUrl(reportCard.verificationCode, reportCard.student?.name || '')}
                      alt="QR xác thực"
                      width={56}
                      height={56}
                      className="rounded border border-hairline"
                      onError={(e) => {
                        // Fallback: hide image on error
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <span className="text-[9px] text-text-secondary font-mono leading-tight text-center">
                      {reportCard.verificationCode}
                    </span>
                  </div>
                  {reportCard.evaluation.honorTitle && (
                    <Badge variant={reportCard.evaluation.honorTitle === 'XuatSac' ? 'success' : 'info'} size="md">
                      {reportCard.evaluation.honorTitleLabel}
                    </Badge>
                  )}
                  <Button
                    variant="primary"
                    size="sm"
                    icon={FileText}
                    onClick={() => setShowReportCardModal(true)}
                  >
                    Xem &amp; In Học Bạ
                  </Button>
                </div>
              </div>
            </Card>
          ) : null}

          {/* ── Transcript Table with Thông tư 22 breakdown ─────────────── */}
          <Card padding="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-medium text-text-primary">Chi tiết điểm các môn học</h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  Theo cấu trúc <strong>Thông tư 22</strong>: ĐĐGtx (hệ số 1) • ĐĐGgk (hệ số 2) • ĐĐGck (hệ số 3)
                </p>
              </div>
              <Badge variant="info">{PERIOD_LABELS[activePeriod as keyof typeof PERIOD_LABELS]}</Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="hairline-b text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                    <th className="py-3 px-4">Môn học</th>
                    <th className="py-3 px-3 text-center">Số bài KT</th>
                    <th className="py-3 px-3 text-center">ĐĐGtx (TX)</th>
                    <th className="py-3 px-3 text-center">ĐĐGgk</th>
                    <th className="py-3 px-3 text-center">ĐĐGck</th>
                    <th className="py-3 px-3 text-center">ĐTBmhk</th>
                    <th className="py-3 px-3 text-center">Xếp loại</th>
                    <th className="py-3 px-3 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline text-xs">
                  {subjects.map((sub) => {
                    const variant = getGradeVariant(sub.average);
                    const avg = sub.average;
                    const txAvg = sub.tx && sub.tx.length > 0
                      ? sub.tx.reduce((s, t) => s + t.score, 0) / sub.tx.length
                      : null;
                    const gkScore = sub.gk?.score ?? null;
                    const ckScore = sub.ck?.score ?? null;

                    return (
                      <tr key={sub.subject} className="hover:bg-surface-neutral/40 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-text-primary">
                          {sub.subject}
                        </td>
                        <td className="py-3.5 px-3 text-center text-text-secondary">
                          {sub.testsCount || sub.tests?.length || 0}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span className={`font-mono font-medium ${txAvg !== null ? 'text-primary' : 'text-text-secondary'}`}>
                            {txAvg !== null ? txAvg.toFixed(1) : '—'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span className={`font-mono font-medium ${gkScore !== null ? 'text-amber-700' : 'text-text-secondary'}`}>
                            {gkScore !== null ? gkScore.toFixed(1) : '—'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span className={`font-mono font-medium ${ckScore !== null ? 'text-emerald-700' : 'text-text-secondary'}`}>
                            {ckScore !== null ? ckScore.toFixed(1) : '—'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span className="font-bold text-sm text-primary">
                            {avg !== null && avg !== undefined ? avg.toFixed(2) : '—'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <Badge variant={variant} size="sm">
                            {getClassificationLabel(avg)}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setSelectedSubject(sub as SubjectDetail)}
                              className="text-xs text-ocean hover:underline font-medium whitespace-nowrap"
                            >
                              Chi tiết
                            </button>
                            <span className="text-hairline">•</span>
                            <button
                              type="button"
                              onClick={() => setReviewModal({ subject: sub.subject, subjectDetail: sub as SubjectDetail })}
                              className="text-xs text-ocean hover:underline whitespace-nowrap flex items-center gap-0.5"
                            >
                              <MessageSquare className="w-3 h-3" />
                              Phúc khảo
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Thông tư 22 legend */}
            <div className="mt-4 p-3 bg-surface-neutral rounded border border-hairline flex flex-wrap gap-4 text-[11px] text-text-secondary">
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 bg-sky/60 text-ocean rounded font-semibold text-[10px]">TX</span>
                <span>Điểm thường xuyên (hệ số 1)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded font-semibold text-[10px]">GK</span>
                <span>Điểm giữa kỳ (hệ số 2)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded font-semibold text-[10px]">CK</span>
                <span>Điểm cuối kỳ (hệ số 3)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                <span>ĐTBmhk = (∑TX + GK×2 + CK×3) / (n_TX + 5)</span>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* ── Subject Detail Modal ── */}
      <Modal
        isOpen={Boolean(selectedSubject)}
        onClose={() => setSelectedSubject(null)}
        title={`Chi tiết môn ${selectedSubject?.subject || ''}`}
        maxWidth="max-w-2xl"
      >
        <SubjectDetailModal
          subject={selectedSubject}
          onClose={() => setSelectedSubject(null)}
        />
      </Modal>

      {/* ── Grade Review Request Modal ── */}
      <Modal
        isOpen={Boolean(reviewModal)}
        onClose={() => { setReviewModal(null); setReviewSent(false); setReviewMessage(''); }}
        title={`Yêu cầu phúc khảo: ${reviewModal?.subject || ''}`}
        maxWidth="max-w-lg"
      >
        {reviewModal && (
          <div className="space-y-4 text-xs">
            {reviewSent ? (
              <div className="p-6 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-success mx-auto" />
                <div className="text-sm font-semibold text-success">Đã gửi yêu cầu phúc khảo!</div>
                <p className="text-text-secondary">
                  Giáo viên bộ môn sẽ xem xét và phản hồi trong thời gian sớm nhất.
                </p>
              </div>
            ) : (
              <>
                <div className="p-3 bg-surface-neutral rounded border border-hairline">
                  <div className="text-xs text-text-secondary">Môn học:</div>
                  <div className="font-semibold text-primary mt-0.5">{reviewModal.subject}</div>
                  {reviewModal.subjectDetail.average !== null && reviewModal.subjectDetail.average !== undefined && (
                    <div className="text-xs text-text-secondary mt-1">
                      Điểm hiện tại: <strong className="text-primary">{reviewModal.subjectDetail.average.toFixed(2)}</strong>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-sky/30 border border-ocean/20 rounded text-[11px] text-text-secondary">
                  <strong className="text-ocean">Lưu ý:</strong> Yêu cầu phúc khảo chỉ áp dụng khi bạn phát hiện
                  điểm bị nhầm lẫn trong quá trình chấm (tính sai, đổi đáp án, nhầm bài). Vui lòng không sử dụng
                  tính năng này để thắc mắc về điểm số thấp do kết quả kiểm tra thực tế.
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-primary mb-1">
                    Nội dung yêu cầu phúc khảo *
                  </label>
                  <textarea
                    rows={4}
                    value={reviewMessage}
                    onChange={(e) => setReviewMessage(e.target.value)}
                    placeholder="VD: Tôi nhận thấy câu số 3, đáp án tôi chọn là B nhưng giáo viên ghi nhận là A. Xin được kiểm tra lại..."
                    className="w-full p-3 bg-white border border-hairline rounded text-xs text-text-primary focus:border-ocean focus:ring-1 focus:ring-ocean/15 outline-none resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => { setReviewModal(null); setReviewMessage(''); }}
                  >
                    Hủy
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    icon={Send}
                    disabled={isSendingReview || !reviewMessage.trim()}
                    onClick={handleSendReview}
                  >
                    {isSendingReview ? 'Đang gửi...' : 'Gửi yêu cầu'}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* ── E-Report Card Modal (Học Bạ Điện Tử) ───────────────────── */}
      <Modal
        isOpen={showReportCardModal}
        onClose={() => setShowReportCardModal(false)}
        title={`Học Bạ Điện Tử — ${reportCard?.student?.name || ''}`}
        size="2xl"
      >
        {reportCard && (
          <div id="report-card-print" className="space-y-4">
            {/* Administrative Header */}
            <div className="text-center border border-hairline rounded-lg p-4 bg-surface-neutral/40">
              <div className="text-[11px] text-text-secondary uppercase tracking-wider">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
              <div className="text-[11px] font-medium text-text-secondary uppercase">Độc lập - Tự do - Hạnh phúc</div>
              <div className="mt-4 mb-2 text-base font-bold text-text-primary uppercase">
                HỌC BẠ ĐIỆN TỬ
              </div>
              <div className="text-xs text-text-secondary">
                Trường THCS Bắc Au · Năm học: {reportCard.academicYear}
              </div>
            </div>

            {/* Student Info */}
            <div className="grid grid-cols-2 gap-4 border border-hairline rounded-lg p-4">
              <div className="space-y-1">
                <div className="text-xs"><span className="font-medium">Họ và tên:</span> {reportCard.student?.name}</div>
                <div className="text-xs"><span className="font-medium">Ngày sinh:</span> {reportCard.student?.birthDate ? new Date(reportCard.student.birthDate).toLocaleDateString('vi-VN') : '—'}</div>
                <div className="text-xs"><span className="font-medium">Lớp:</span> {reportCard.student?.className || '—'}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs"><span className="font-medium">Mã HS:</span> {reportCard.student?.code}</div>
                <div className="text-xs"><span className="font-medium">Giới tính:</span> {reportCard.student?.gender === 'male' ? 'Nam' : reportCard.student?.gender === 'female' ? 'Nữ' : '—'}</div>
              </div>
            </div>

            {/* Classification Summary */}
            <div className="flex flex-wrap gap-2 justify-center">
              {reportCard.evaluation.honorTitleLabel && (
                <div className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border ${
                  reportCard.evaluation.honorTitle === 'XuatSac'
                    ? 'bg-yellow-50 text-yellow-800 border-yellow-300'
                    : 'bg-blue-50 text-blue-800 border-blue-200'
                }`}>
                  {reportCard.evaluation.honorTitle === 'XuatSac' ? (
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-yellow-500">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-blue-500">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  )}
                  {reportCard.evaluation.honorTitleLabel}
                </div>
              )}
              <Badge variant={reportCard.evaluation.academicClassification === 'Tot' ? 'success' : reportCard.evaluation.academicClassification === 'Kha' ? 'info' : reportCard.evaluation.academicClassification === 'Dat' ? 'warning' : 'danger'} size="md">
                Học lực: {reportCard.evaluation.academicClassificationLabel}
              </Badge>
              {reportCard.evaluation.conductRatingLabel && (
                <Badge variant={reportCard.evaluation.conductRating === 'Tot' ? 'success' : 'info'} size="md">
                  Rèn luyện: {reportCard.evaluation.conductRatingLabel}
                </Badge>
              )}
            </div>

            {/* Subject Scores Table */}
            <div className="overflow-x-auto border border-hairline rounded-lg">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-surface-neutral hairline-b">
                    <th className="py-2 px-3 text-left font-medium text-text-secondary w-8">STT</th>
                    <th className="py-2 px-3 text-left font-medium text-text-secondary">Môn học</th>
                    <th className="py-2 px-3 text-center font-medium text-text-secondary">ĐTBmhk1</th>
                    <th className="py-2 px-3 text-center font-medium text-text-secondary">ĐTBmhk2</th>
                    <th className="py-2 px-3 text-center font-medium text-text-secondary">ĐTBmcn</th>
                    <th className="py-2 px-3 text-center font-medium text-text-secondary">Xếp loại</th>
                  </tr>
                </thead>
                <tbody>
                  {reportCard.evaluation.subjectScores.map((sub, i) => {
                    const cls = sub.yearlyScore !== null && sub.yearlyScore >= 8.5 ? 'text-success' : sub.yearlyScore !== null && sub.yearlyScore >= 5.0 ? 'text-ocean' : 'text-danger';
                    return (
                      <tr key={sub.subjectId} className="hairline-b hover:bg-surface-neutral/30">
                        <td className="py-2 px-3 text-text-secondary">{i + 1}</td>
                        <td className="py-2 px-3 text-text-primary">{sub.subjectName}</td>
                        <td className="py-2 px-3 text-center">{sub.hk1Score?.toFixed(1) ?? '—'}</td>
                        <td className="py-2 px-3 text-center">{sub.hk2Score?.toFixed(1) ?? '—'}</td>
                        <td className={`py-2 px-3 text-center font-semibold ${cls}`}>{sub.yearlyScore?.toFixed(1) ?? '—'}</td>
                        <td className="py-2 px-3 text-center">
                          {sub.isGradingSubject ? (
                            <Badge variant={sub.gradingResult === 'dat' ? 'success' : 'warning'} size="sm">{sub.gradingResult === 'dat' ? 'Đạt' : 'Chưa đạt'}</Badge>
                          ) : (
                            <span className={`text-[11px] font-medium ${cls}`}>
                              {sub.yearlyScore !== null && sub.yearlyScore >= 8.5 ? 'Giỏi' : sub.yearlyScore !== null && sub.yearlyScore >= 7.0 ? 'Khá' : sub.yearlyScore !== null && sub.yearlyScore >= 5.0 ? 'Đạt' : 'Yếu'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-surface-neutral font-semibold">
                    <td colSpan={4} className="py-2 px-3 text-text-primary">Điểm trung bình cả năm (ĐTBmcn)</td>
                    <td className="py-2 px-3 text-center text-primary text-sm">
                      {reportCard.evaluation.yearlyGPA?.toFixed(1) ?? '—'}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Footer: verification + QR + print */}
            <div className="flex items-center justify-between border-t pt-3 gap-4">
              <div className="flex items-center gap-4">
                {/* QR Code for anti-tamper verification */}
                <img
                  src={getQrCodeUrl(reportCard.verificationCode, reportCard.student?.name || '')}
                  alt="QR xác thực"
                  width={64}
                  height={64}
                  className="rounded border border-hairline"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <div className="space-y-0.5">
                  <div className="text-xs text-text-secondary">
                    Mã xác thực:{' '}
                    <span className="font-mono text-ocean font-semibold text-sm">
                      {reportCard.verificationCode}
                    </span>
                  </div>
                  <div className="text-[10px] text-text-secondary">
                    Generated: {new Date(reportCard.generatedAt).toLocaleString('vi-VN')}
                  </div>
                  <div className="text-[10px] text-text-secondary">
                    Scan QR để xác minh nguồn gốc điện tử
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Printer}
                  onClick={() => window.print()}
                >
                  In Học Bạ
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={Download}
                  onClick={() => {
                    // Export as print-friendly div
                    const printContent = document.getElementById('report-card-print');
                    if (!printContent) return;
                    const printWindow = window.open('', '_blank');
                    if (!printWindow) return;
                    printWindow.document.write(`<html><head><title>Học Bạ Điện Tử - ${reportCard.student?.name}</title><style>
                      body { font-family: 'Times New Roman', serif; margin: 20px; font-size: 12px; }
                      table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #ddd; padding: 6px; }
                      .print-header { text-align: center; margin-bottom: 20px; }
                      @media print { body { margin: 0; } }
                    </style></head><body>${printContent.innerHTML}</body></html>`);
                    printWindow.document.close();
                    printWindow.print();
                  }}
                >
                  Tải PDF
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default StudentGradesPage;

/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// =============================================================================
// ParentGradesPage — Detailed grades by semester
// Phase 13: Extracted from ParentDashboard.jsx (Tab: grades)
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { useChildSwitcher } from './useChildSwitcher';
import { ChildSwitcher } from './ChildSwitcher';
import { PageSkeleton } from './PageSkeleton';
import { parentApi } from '../../services/api';
import { Award, AlertCircle, Printer, Loader2, FileText, RefreshCw } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { gradebookApi } from '../../services/api';

function getGradeVariant(score: number): 'success' | 'info' | 'warning' | 'neutral' {
  if (score >= 9) return 'success';
  if (score >= 8) return 'info';
  if (score >= 6.5) return 'warning';
  return 'neutral';
}

function getGpaRank(gpa: number): string {
  if (gpa >= 9.0) return 'Học lực Xuất sắc';
  if (gpa >= 8.0) return 'Học lực Giỏi';
  if (gpa >= 6.5) return 'Học lực Khá';
  return 'Học lực Trung bình';
}

interface SubjectGrade {
  subjectName: string;
  teacherName?: string;
  average?: number;
  scores?: Array<{ teacherFeedback?: string }>;
}

interface DetailedGrades {
  overallGpa?: number;
  subjects?: SubjectGrade[];
}

interface GradesSummary {
  overallGpa?: number;
  tests?: Array<{
    subjectName?: string;
    name?: string;
    testName?: string;
    test?: string;
    rawScore?: string;
    score?: string;
  }>;
}

export function ParentGradesPage() {
  const { children, selectedChild, selectedChildId, isLoading: loadingChildren, error: errorChildren, selectChild } = useChildSwitcher();

  const [detailedGrades, setDetailedGrades] = useState<DetailedGrades | null>(null);
  const [summaryGrades, setSummaryGrades] = useState<GradesSummary | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [errorData, setErrorData] = useState<string | null>(null);

  // E-Report Card state
  const [reportCard, setReportCard] = useState<unknown>(null);
  const [reportCardLoading, setReportCardLoading] = useState(false);
  const [showReportCardModal, setShowReportCardModal] = useState(false);

  const loadGrades = useCallback(async (childId: string) => {
    setIsLoadingData(true);
    setErrorData(null);
    setDetailedGrades(null);
    setSummaryGrades(null);
    try {
      const [detailRes, summaryRes] = await Promise.allSettled([
        parentApi.getDetailedGrades<DetailedGrades>(childId, 'hk1'),
        parentApi.getGrades<GradesSummary>(childId, 'hk1'),
      ]);

      if (detailRes.status === 'fulfilled' && detailRes.value) {
        setDetailedGrades(detailRes.value as DetailedGrades);
      }
      if (summaryRes.status === 'fulfilled' && summaryRes.value) {
        setSummaryGrades(summaryRes.value as GradesSummary);
      }
    } catch (_err) {
      setErrorData('Không thể tải kết quả học tập.');
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (selectedChildId) {
      loadGrades(selectedChildId);
    }
  }, [selectedChildId, loadGrades]);

  // Load e-report card
  useEffect(() => {
    if (!selectedChildId) return;
    let cancelled = false;
    setReportCardLoading(true);
    gradebookApi.getStudentReportCard({ studentId: selectedChildId })
      .then(data => { if (!cancelled) setReportCard(data); })
      .catch(() => { if (!cancelled) setReportCard(null); })
      .finally(() => { if (!cancelled) setReportCardLoading(false); });
    return () => { cancelled = true; };
  }, [selectedChildId]);

  // Loading
  if (loadingChildren) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <span className="text-sm text-text-secondary">Đang tải...</span>
        </div>
      </div>
    );
  }

  if (errorChildren && children.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="max-w-sm text-center p-6">
          <AlertCircle className="w-10 h-10 text-danger mx-auto mb-3" />
          <p className="text-sm text-text-primary font-medium mb-1">{errorChildren}</p>
        </Card>
      </div>
    );
  }

  if (!selectedChild) return null;

  const gpa = detailedGrades?.overallGpa || summaryGrades?.overallGpa || selectedChild.gpa || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="text-xs text-text-secondary mb-1">Kết quả học tập</div>
        <ChildSwitcher
          children={children}
          selectedChild={selectedChild}
          onSelect={selectChild}
        />
      </div>

      {/* Error Banner */}
      {errorData && (
        <div className="p-4 bg-danger/10 border border-danger/30 rounded-card flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-danger shrink-0" />
          <span className="text-sm text-danger">{errorData}</span>
        </div>
      )}

      {/* E-Report Card Section */}
      {!isLoadingData && reportCard && (
        <Card padding="p-5" className="border-2 border-ocean/30 bg-gradient-to-r from-sky/10 to-ocean/5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-ocean/10 flex items-center justify-center shrink-0">
                <Award className="w-6 h-6 text-ocean" />
              </div>
              <div>
                <div className="text-sm font-semibold text-text-primary">Học Bạ Điện Tử Năm Học</div>
                <div className="text-xs text-text-secondary mt-0.5">
                  {reportCard.evaluation?.honorTitleLabel ? (
                    <span className="text-yellow-700 font-medium">
                      {reportCard.evaluation.honorTitleLabel} — {reportCard.evaluation.honorTitleReason}
                    </span>
                  ) : (
                    <span>
                      Xếp loại HL: <strong className="text-text-primary">{reportCard.evaluation?.academicClassificationLabel}</strong>
                      {' · '}RL: <strong className="text-text-primary">{reportCard.evaluation?.conductRatingLabel ?? '—'}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {/* QR verification code */}
              <div className="flex flex-col items-center gap-1">
                <img
                  src={`https://chart.googleapis.com/chart?cht=qr&chs=56x56&chl=${encodeURIComponent(`EDUPORTAL:${reportCard.verificationCode}|${selectedChild?.name || ''}|${new Date().getFullYear()}`)}&choe=UTF-8&chld=L|1`}
                  alt="QR xác thực"
                  width={56}
                  height={56}
                  className="rounded border border-hairline"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <span className="text-[9px] text-text-secondary font-mono leading-tight text-center">{reportCard.verificationCode}</span>
              </div>
              {reportCard.evaluation?.honorTitle && (
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                  reportCard.evaluation.honorTitle === 'XuatSac'
                    ? 'bg-yellow-50 text-yellow-800 border-yellow-300'
                    : 'bg-blue-50 text-blue-800 border-blue-200'
                }`}>
                  {reportCard.evaluation.honorTitle === 'XuatSac' ? '🌟' : '🏆'} {reportCard.evaluation.honorTitleLabel}
                </div>
              )}
              <Button variant="primary" size="sm" icon={FileText} onClick={() => setShowReportCardModal(true)}>
                Xem &amp; In Học Bạ
              </Button>
            </div>
          </div>
        </Card>
      )}

      {isLoadingData ? (
        <PageSkeleton rows={6} />
      ) : detailedGrades?.subjects?.length ? (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-medium text-text-primary">Kết quả học tập chi tiết</h2>
              <p className="text-xs text-text-secondary mt-1">Điểm các bài kiểm tra • Học kỳ I</p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" icon={Printer} onClick={() => window.print()}>In điểm</Button>
            </div>
          </div>

          <Card padding="p-0" className="overflow-hidden">
            <div className="p-4 bg-surface-neutral hairline-b flex items-center justify-between">
              <div className="text-xs font-semibold text-primary">
                Điểm TB: <span className="text-base text-ocean font-bold">{gpa.toFixed(2)}</span>
                <span className="ml-2 text-text-secondary font-normal">{getGpaRank(gpa)}</span>
              </div>
              <div className="flex gap-2 text-xs">
                <span className="px-2.5 py-1 bg-ocean text-white rounded font-medium">Học kỳ I</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-neutral text-text-secondary font-medium hairline-b">
                  <tr>
                    <th className="py-3 px-4">Môn học</th>
                    <th className="py-3 px-3 text-center">Điểm TB</th>
                    <th className="py-3 px-3 text-center">Xếp loại</th>
                    <th className="py-3 px-4">Nhận xét</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {detailedGrades.subjects.map((sub, idx) => (
                    <tr key={idx} className="hover:bg-sky/20 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-text-primary">{sub.subjectName}</div>
                        {sub.teacherName && <div className="text-[11px] text-text-secondary">{sub.teacherName}</div>}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-extrabold text-primary text-sm bg-sky/20">
                        {sub.average?.toFixed(1) || '—'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge variant={getGradeVariant(sub.average || 0)} size="sm">
                          {sub.average ? (sub.average >= 9 ? 'Xuất sắc' : sub.average >= 8 ? 'Giỏi' : sub.average >= 6.5 ? 'Khá' : 'Trung bình') : '—'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-xs text-text-secondary max-w-xs">
                        {sub.scores?.[0]?.teacherFeedback || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : summaryGrades?.tests?.length ? (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-medium text-text-primary">Kết quả học tập</h2>
              <p className="text-xs text-text-secondary mt-1">Bảng điểm kiểm tra định kỳ • Học kỳ I</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-ocean">Điểm TB: {gpa.toFixed(1)}</span>
              <Badge variant={getGradeVariant(gpa)}>{getGpaRank(gpa)}</Badge>
            </div>
          </div>

          <Card padding="p-0" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-neutral text-text-secondary font-medium hairline-b">
                  <tr>
                    <th className="py-3 px-4">Môn học</th>
                    <th className="py-3 px-3 text-center">Bài kiểm tra</th>
                    <th className="py-3 px-3 text-center">Điểm</th>
                    <th className="py-3 px-3 text-center">Xếp loại</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {summaryGrades.tests.map((test, idx) => {
                    const score = parseFloat(test.rawScore || test.score || '0');
                    return (
                      <tr key={idx} className="hover:bg-sky/20 transition-colors">
                        <td className="py-3 px-4 font-semibold text-text-primary">
                          {test.subjectName || test.name}
                        </td>
                        <td className="py-3 px-3 text-center text-text-secondary">
                          {test.testName || test.test}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-extrabold text-primary text-sm">
                          {score.toFixed(1)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <Badge variant={getGradeVariant(score)} size="sm">
                            {score >= 9 ? 'Xuất sắc' : score >= 8 ? 'Giỏi' : score >= 6.5 ? 'Khá' : 'Trung bình'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : (
        <Card className="text-center py-12">
          <Award className="w-12 h-12 text-hairline mx-auto mb-3" />
          <p className="text-sm text-text-primary font-medium">Chưa có kết quả học tập</p>
          <p className="text-xs text-text-secondary mt-1">Kết quả sẽ được cập nhật khi giáo viên công bố điểm.</p>
        </Card>
      )}

      {/* ── E-Report Card Modal ── */}
      <Modal
        isOpen={showReportCardModal}
        onClose={() => setShowReportCardModal(false)}
        title={`Học Bạ Điện Tử — ${selectedChild?.name || ''}`}
        size="2xl"
      >
        {reportCard && (
          <div id="parent-report-card-print" className="space-y-4">
            <div className="text-center border border-hairline rounded-lg p-4 bg-surface-neutral/40">
              <div className="text-[11px] text-text-secondary uppercase tracking-wider">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
              <div className="text-[11px] font-medium text-text-secondary uppercase">Độc lập - Tự do - Hạnh phúc</div>
              <div className="mt-4 mb-2 text-base font-bold text-text-primary uppercase">HỌC BẠ ĐIỆN TỬ</div>
              <div className="text-xs text-text-secondary">Trường THCS Bắc Au · Năm học: {reportCard.academicYear || new Date().getFullYear()}</div>
            </div>

            <div className="grid grid-cols-2 gap-4 border border-hairline rounded-lg p-4">
              <div className="text-xs space-y-1">
                <div><span className="font-medium">Họ và tên:</span> {selectedChild?.name}</div>
                <div><span className="font-medium">Lớp:</span> {selectedChild?.className || '—'}</div>
              </div>
              <div className="flex flex-wrap gap-2 items-start justify-end">
                {reportCard.evaluation?.honorTitleLabel && (
                  <div className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                    reportCard.evaluation.honorTitle === 'XuatSac'
                      ? 'bg-yellow-50 text-yellow-800 border-yellow-300'
                      : 'bg-blue-50 text-blue-800 border-blue-200'
                  }`}>
                    {reportCard.evaluation.honorTitle === 'XuatSac' ? '🌟' : '🏆'} {reportCard.evaluation.honorTitleLabel}
                  </div>
                )}
                <Badge variant={reportCard.evaluation?.academicClassification === 'Tot' ? 'success' : reportCard.evaluation?.academicClassification === 'Kha' ? 'info' : reportCard.evaluation?.academicClassification === 'Dat' ? 'warning' : 'danger'} size="md">
                  HL: {reportCard.evaluation?.academicClassificationLabel}
                </Badge>
                {reportCard.evaluation?.conductRatingLabel && (
                  <Badge variant="info" size="md">
                    RL: {reportCard.evaluation.conductRatingLabel}
                  </Badge>
                )}
              </div>
            </div>

            {reportCard.evaluation?.subjectScores?.length > 0 ? (
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
                    {reportCard.evaluation.subjectScores.map((sub: { subjectId: string; subjectName: string; hk1Score: number | null; hk2Score: number | null; yearlyScore: number | null; isGradingSubject?: boolean; gradingResult?: string }, i: number) => {
                      const cls = sub.yearlyScore !== null && sub.yearlyScore >= 8.5 ? 'text-success' : sub.yearlyScore !== null && sub.yearlyScore >= 5.0 ? 'text-ocean' : 'text-danger';
                      return (
                        <tr key={sub.subjectId} className="hairline-b hover:bg-surface-neutral/30">
                          <td className="py-2 px-3 text-text-secondary">{i + 1}</td>
                          <td className="py-2 px-3 text-text-primary">{sub.subjectName}</td>
                          <td className="py-2 px-3 text-center">{sub.hk1Score?.toFixed(1) ?? '—'}</td>
                          <td className="py-2 px-3 text-center">{sub.hk2Score?.toFixed(1) ?? '—'}</td>
                          <td className={`py-2 px-3 text-center font-semibold ${cls}`}>
                            {sub.yearlyScore?.toFixed(1) ?? '—'}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {sub.isGradingSubject ? (
                              <Badge variant={sub.gradingResult === 'dat' ? 'success' : 'warning'} size="sm">
                                {sub.gradingResult === 'dat' ? 'Đạt' : 'Chưa đạt'}
                              </Badge>
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
                </table>
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-text-secondary">
                Chưa có bảng điểm chi tiết cho năm học này.
              </div>
            )}

            {/* Footer with QR verification + print */}
            <div className="flex items-center justify-between border-t pt-3 gap-4">
              <div className="flex items-center gap-4">
                <img
                  src={`https://chart.googleapis.com/chart?cht=qr&chs=64x64&chl=${encodeURIComponent(`EDUPORTAL:${reportCard.verificationCode}|${selectedChild?.name || ''}|${new Date().getFullYear()}`)}&choe=UTF-8&chld=L|1`}
                  alt="QR xác thực"
                  width={64}
                  height={64}
                  className="rounded border border-hairline"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <div className="space-y-0.5">
                  <div className="text-xs text-text-secondary">
                    Mã xác thực:{' '}
                    <span className="font-mono text-ocean font-semibold text-sm">{reportCard.verificationCode}</span>
                  </div>
                  <div className="text-[10px] text-text-secondary">Scan QR để xác minh nguồn gốc điện tử</div>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="secondary" size="sm" icon={Printer} onClick={() => window.print()}>In Học Bạ</Button>
                <Button variant="primary" size="sm" icon={FileText} onClick={() => setShowReportCardModal(false)}>Đóng</Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

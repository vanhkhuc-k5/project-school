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
import { Award, AlertCircle, Printer, Loader2 } from 'lucide-react';

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
    </div>
  );
}

/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// =============================================================================
// ParentSchedulePage — Timetable view for parent's child
// Phase 13: Extracted from ParentDashboard.jsx (Tab: schedule)
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { useChildSwitcher } from './useChildSwitcher';
import { ChildSwitcher } from './ChildSwitcher';
import { parentApi } from '../../services/api';
import { Calendar, AlertCircle, Loader2 } from 'lucide-react';

interface TimetableSlot {
  period: number;
  subject?: string;
  teacherName?: string;
}

interface TimetableDay {
  dayOfWeek: number;
  periods?: TimetableSlot[];
}

interface TimetableResponse {
  schedule?: TimetableDay[];
  [key: string]: unknown;
}

export function ParentSchedulePage() {
  const { children, selectedChild, selectedChildId, isLoading: loadingChildren, error: errorChildren, selectChild } = useChildSwitcher();

  const [timetable, setTimetable] = useState<TimetableDay[] | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [errorData, setErrorData] = useState<string | null>(null);

  const loadTimetable = useCallback(async (childId: string) => {
    setIsLoadingData(true);
    setErrorData(null);
    setTimetable(null);
    try {
      const res = await parentApi.getTimetable<TimetableResponse>(childId);
      if (res) {
        const schedule = (res as TimetableResponse).schedule;
        if (Array.isArray(schedule)) {
          setTimetable(schedule);
        } else if (Array.isArray(res)) {
          setTimetable(res as TimetableDay[]);
        }
      }
    } catch (_err) {
      setErrorData('Không thể tải thời khóa biểu.');
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (selectedChildId) {
      loadTimetable(selectedChildId);
    }
  }, [selectedChildId, loadTimetable]);

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

  const DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  const DAY_NUMS = [2, 3, 4, 5, 6, 7];
  const PERIODS = 5;

  // Build a lookup: period → day → slot
  const getSlot = (day: number, period: number) => {
    const dayObj = timetable?.find(d => Number(d.dayOfWeek) === day);
    return dayObj?.periods?.find(p => Number(p.period) === period);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="text-xs text-text-secondary mb-1">Lịch học & Thi</div>
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

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-medium text-text-primary">Thời khóa biểu</h2>
          <p className="text-xs text-text-secondary mt-1">Lịch học của {selectedChild.name} • Học kỳ 1</p>
        </div>
        <Badge variant="info">Học kỳ 1</Badge>
      </div>

      {isLoadingData ? (
        <div className="space-y-4">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-16 bg-surface-neutral rounded animate-pulse" />
          ))}
        </div>
      ) : timetable && timetable.length > 0 ? (
        <Card padding="p-0" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-neutral text-text-secondary font-medium hairline-b">
                <tr>
                  <th className="py-3 px-4 w-28">Tiết</th>
                  {DAYS.map((d, i) => (
                    <th key={i} className="py-3 px-3 text-center">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {Array.from({ length: PERIODS }, (_, pi) => {
                  const periodNum = pi + 1;
                  return (
                    <tr key={pi}>
                      <td className="py-3 px-4 font-mono bg-surface-neutral/40 text-xs text-text-primary">
                        Tiết {periodNum}
                      </td>
                      {DAY_NUMS.map((dow) => {
                        const slot = getSlot(dow, periodNum);
                        return (
                          <td key={dow} className="py-3 px-3 text-center text-xs text-text-primary">
                            {slot?.subject ? (
                              <div>
                                <div className="font-medium leading-tight">{slot.subject}</div>
                                {slot.teacherName && (
                                  <div className="text-[10px] text-text-secondary mt-0.5">{slot.teacherName}</div>
                                )}
                              </div>
                            ) : (
                              <span className="text-hairline">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="text-center py-12">
          <Calendar className="w-12 h-12 text-hairline mx-auto mb-3" />
          <p className="text-sm text-text-primary">Chưa có thời khóa biểu</p>
          <p className="text-xs text-text-secondary mt-1">Thời khóa biểu sẽ được cập nhật sớm.</p>
        </Card>
      )}
    </div>
  );
}

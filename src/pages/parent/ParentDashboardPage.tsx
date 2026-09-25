/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// =============================================================================
// ParentDashboardPage — Overview with summary cards and child switcher
// Phase 13: Extracted from ParentDashboard.jsx (Tab: home)
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { parentApi } from '../../services/api';
import { useChildSwitcher } from './useChildSwitcher';
import { ChildSwitcher } from './ChildSwitcher';
import { PageSkeleton } from './PageSkeleton';
import {
  Award,
  CheckCircle2,
  TrendingUp,
  QrCode,
  MessageSquare,
  Bell,
  Calendar,
  FileCheck,
  AlertCircle,
  Loader2,
  CreditCard,
  ChevronRight,
} from 'lucide-react';

// Grade rank helper
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

interface GradeEntry {
  subjectName?: string;
  name?: string;
  testName?: string;
  test?: string;
  rawScore?: string;
  score?: string;
}

interface Assignment {
  id: string;
  title: string;
  subject: string;
  dueDate: string;
  isOverdue: boolean;
  submissionStatus?: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  publishedAt?: string;
  authorName?: string;
}

interface InvoiceData {
  currentInvoice: {
    id: string;
    period: string;
    total: string;
    status: string;
    qrInfo?: {
      bank?: string;
      accountNumber?: string;
      accountName?: string;
      description?: string;
    };
  } | null;
}

export function ParentDashboardPage() {
  const { children, selectedChild, selectedChildId, isLoading: loadingChildren, error: errorChildren, selectChild } = useChildSwitcher();

  const [childData, setChildData] = useState<{
    grades: { tests?: Array<{ subjectName?: string; name?: string; testName?: string; test?: string; rawScore?: string; score?: string }> };
    attendance: { rate?: string; presentDays?: number; totalDays?: number; absentDays?: number; lateDays?: number; excusedDays?: number } | null;
    assignments: Assignment[];
    announcements: Announcement[];
    invoice: InvoiceData | null;
  }>({
    grades: {},
    attendance: null,
    assignments: [],
    announcements: [],
    invoice: null,
  });
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [errorData, setErrorData] = useState<string | null>(null);

  // UI state
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [_copiedBank, setCopiedBank] = useState(false);
  const [_copiedMemo, setCopiedMemo] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  // Load child data
  const loadChildData = useCallback(async (childId: string) => {
    setIsLoadingData(true);
    setErrorData(null);
    try {
      const [gradesRes, attRes, assignRes, notifRes, invRes] = await Promise.allSettled([
        parentApi.getGrades<{ tests?: Array<{ subjectName?: string; name?: string; testName?: string; test?: string; rawScore?: string; score?: string }> }>(childId, 'hk1'),
        parentApi.getAttendance<{ rate?: string; presentDays?: number; totalDays?: number; absentDays?: number; lateDays?: number; excusedDays?: number }>(childId),
        parentApi.getAssignments<{ assignments?: Assignment[] }>(childId),
        parentApi.getAnnouncements<{ announcements?: Announcement[] }>(childId),
        parentApi.getInvoices<InvoiceData>(childId),
      ]);

      setChildData({
        grades: gradesRes.status === 'fulfilled' && gradesRes.value ? gradesRes.value : {},
        attendance: attRes.status === 'fulfilled' && attRes.value ? attRes.value : null,
        assignments:
          assignRes.status === 'fulfilled' && assignRes.value
            ? ((assignRes.value as { assignments?: Assignment[] }).assignments || [])
            : [],
        announcements:
          notifRes.status === 'fulfilled' && notifRes.value
            ? ((notifRes.value as { announcements?: Announcement[] }).announcements || [])
            : [],
        invoice: invRes.status === 'fulfilled' && invRes.value ? invRes.value as InvoiceData : null,
      });
    } catch (_err) {
      setErrorData('Không thể tải dữ liệu học tập của con.');
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (selectedChildId) {
      loadChildData(selectedChildId);
    }
  }, [selectedChildId, loadChildData]);

  const handleCopyAccount = () => {
    const acc = childData.invoice?.currentInvoice?.qrInfo?.accountNumber;
    if (!acc) return;
    navigator.clipboard?.writeText?.(acc);
    setCopiedBank(true);
    setTimeout(() => setCopiedBank(false), 2000);
  };

  const handleCopyMemo = () => {
    const memo = childData.invoice?.currentInvoice?.qrInfo?.description;
    if (!memo) return;
    navigator.clipboard?.writeText?.(memo);
    setCopiedMemo(true);
    setTimeout(() => setCopiedMemo(false), 2000);
  };

  const handleConfirmPayment = async () => {
    const invId = childData.invoice?.currentInvoice?.id;
    if (!invId) return;
    await parentApi.payTuition(invId);
    setPaymentSuccess(true);
    showToast('Đã xác nhận thanh toán học phí thành công!');
    setTimeout(() => { setIsQrModalOpen(false); setPaymentSuccess(false); }, 1200);
  };

  // Loading state
  if (loadingChildren) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <span className="text-sm text-text-secondary">Đang tải thông tin con cái...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (errorChildren && children.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="max-w-sm text-center p-6">
          <AlertCircle className="w-10 h-10 text-danger mx-auto mb-3" />
          <p className="text-sm text-text-primary font-medium mb-1">{errorChildren}</p>
          <p className="text-xs text-text-secondary mb-4">Vui lòng đăng nhập lại hoặc liên hệ bộ phận hỗ trợ.</p>
        </Card>
      </div>
    );
  }

  if (!selectedChild) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="max-w-sm text-center p-6">
          <p className="text-sm text-text-primary">Chưa có hồ sơ học sinh nào được liên kết.</p>
        </Card>
      </div>
    );
  }

  const gpa = selectedChild.gpa || 0;
  const attendanceRate = childData.attendance?.rate || selectedChild.attendanceRate || '—';
  const recentGrades: GradeEntry[] = childData.grades?.tests?.slice(0, 5) || selectedChild.recentSubjects as GradeEntry[] || [];

  return (
    <div className="space-y-6">
      {/* Toast */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-primary text-white px-5 py-3 rounded-card shadow-whisper flex items-center gap-3 border border-ocean/30 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
          <span className="text-xs font-medium">{feedbackToast}</span>
        </div>
      )}

      {/* Header + Child Switcher */}
      <div>
        <div className="text-xs text-text-secondary mb-2">Theo dõi học tập của con</div>
        <ChildSwitcher
          children={children}
          selectedChild={selectedChild}
          onSelect={selectChild}
        />
      </div>

      {/* Child Profile + KPI Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card padding="p-5" className="lg:col-span-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={selectedChild.avatar} alt={selectedChild.name}
              className="w-12 h-12 rounded-full object-cover border border-hairline" />
            <div>
              <div className="text-sm font-semibold text-text-primary">{selectedChild.name}</div>
              <div className="text-xs text-ocean font-medium mt-0.5">{selectedChild.class}</div>
              <div className="text-[11px] text-text-secondary mt-1">
                Mã HS: <strong>{selectedChild.code}</strong>
              </div>
            </div>
          </div>
          <Badge variant="info" size="sm">Học kỳ 1</Badge>
        </Card>

        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card padding="p-5">
            <div className="text-xs text-text-secondary">Điểm TB kỳ</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-semibold text-primary">{gpa > 0 ? gpa.toFixed(1) : '—'}</span>
              <Badge variant={getGradeVariant(gpa)} size="sm">{getGpaRank(gpa)}</Badge>
            </div>
            <div className="text-xs text-success mt-2 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Kết quả học tập kỳ này</span>
            </div>
          </Card>

          <Card padding="p-5">
            <div className="text-xs text-text-secondary">Xếp hạng lớp</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-semibold text-primary">{selectedChild.classRank || '—'}</span>
              <span className="text-xs text-text-secondary">/ {selectedChild.totalStudents || '—'} HS</span>
            </div>
            <div className="text-xs text-ocean mt-2 flex items-center gap-1 font-medium">
              <Award className="w-3.5 h-3.5" />
              <span>{getGpaRank(gpa)}</span>
            </div>
          </Card>

          <Card padding="p-5">
            <div className="text-xs text-text-secondary">Tỷ lệ chuyên cần</div>
            <div className="text-3xl font-semibold text-primary mt-1">{attendanceRate}</div>
            <div className="text-xs text-text-secondary mt-2 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
              <span>{childData.attendance?.presentDays
                ? `${childData.attendance.presentDays}/${childData.attendance.totalDays} buổi có mặt`
                : selectedChild.attendanceNote || 'Đi học chuyên cần'}
              </span>
            </div>
          </Card>
        </div>
      </div>

      {/* Error Banner */}
      {errorData && (
        <div className="p-4 bg-danger/10 border border-danger/30 rounded-card flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-danger shrink-0" />
          <span className="text-sm text-danger">{errorData}</span>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => window.location.href = '/parent/leave'}
          className="p-3.5 bg-white border border-hairline hover:border-ocean rounded-card flex items-center gap-3 transition-colors text-left shadow-whisper"
        >
          <div className="w-9 h-9 rounded-card bg-sky text-primary flex items-center justify-center shrink-0">
            <FileCheck className="w-5 h-5 stroke-[1.75]" />
          </div>
          <div>
            <div className="text-xs font-semibold text-text-primary">Đơn xin nghỉ học</div>
            <div className="text-[11px] text-text-secondary">Gửi phép tới GVCN</div>
          </div>
        </button>

        <button
          onClick={() => setIsQrModalOpen(true)}
          className="p-3.5 bg-white border border-hairline hover:border-ocean rounded-card flex items-center gap-3 transition-colors text-left shadow-whisper"
        >
          <div className="w-9 h-9 rounded-card bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <QrCode className="w-5 h-5 stroke-[1.75]" />
          </div>
          <div>
            <div className="text-xs font-semibold text-text-primary">Đóng học phí VietQR</div>
            <div className="text-[11px] text-text-secondary">Napas 24/7 tức thì</div>
          </div>
        </button>

        <button
          onClick={() => window.location.href = '/parent/messages'}
          className="p-3.5 bg-white border border-hairline hover:border-ocean rounded-card flex items-center gap-3 transition-colors text-left shadow-whisper"
        >
          <div className="w-9 h-9 rounded-card bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5 stroke-[1.75]" />
          </div>
          <div>
            <div className="text-xs font-semibold text-text-primary">Nhắn tin GVCN</div>
            <div className="text-[11px] text-text-secondary">Trao đổi trực tiếp</div>
          </div>
        </button>

        <button
          onClick={() => window.location.href = '/parent/grades'}
          className="p-3.5 bg-white border border-hairline hover:border-ocean rounded-card flex items-center gap-3 transition-colors text-left shadow-whisper"
        >
          <div className="w-9 h-9 rounded-card bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5 stroke-[1.75]" />
          </div>
          <div>
            <div className="text-xs font-semibold text-text-primary">Sổ điểm chi tiết</div>
            <div className="text-[11px] text-text-secondary">Xem bảng điểm</div>
          </div>
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-7 space-y-6">
          {/* Recent Grades */}
          <Card padding="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-medium text-text-primary">Kết quả học tập gần nhất</h2>
                <p className="text-xs text-text-secondary">Bảng điểm kiểm tra định kỳ được phê chuẩn</p>
              </div>
              <a href="/parent/grades" className="text-xs font-medium text-ocean hover:underline flex items-center gap-1">
                <span>Xem bảng điểm chi tiết</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>

            {isLoadingData ? (
              <PageSkeleton rows={3} />
            ) : recentGrades.length > 0 ? (
              <div className="space-y-3">
                {recentGrades.map((sub, idx) => {
                  const score = parseFloat(sub.rawScore || sub.score || '0');
                  return (
                    <div key={idx} className="p-3.5 bg-surface-neutral/60 hover:bg-surface-neutral rounded border border-hairline flex items-center justify-between transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-card bg-primary text-white flex items-center justify-center font-semibold text-sm">
                          {(sub.subjectName || sub.name || 'M').charAt(0)}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-text-primary">{sub.subjectName || sub.name}</div>
                          <div className="text-[11px] text-text-secondary">{sub.testName || sub.test || 'Bài kiểm tra'}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-primary">{score.toFixed(1)}</span>
                        <Badge variant={getGradeVariant(score)} size="sm">{score.toFixed(1)}/10</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-text-secondary">
                Chưa có kết quả học tập nào được công bố cho kỳ này.
              </div>
            )}
          </Card>

          {/* Upcoming Assignments */}
          <Card padding="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary stroke-[1.75]" />
                <div>
                  <h2 className="text-base font-medium text-text-primary">Bài tập & Lịch kiểm tra</h2>
                  <p className="text-xs text-text-secondary">Các bài tập và kỳ thi sắp tới</p>
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={() => window.location.href = '/parent/schedule'}>
                Xem thêm
              </Button>
            </div>

            {childData.assignments.length > 0 ? (
              <div className="space-y-3">
                {childData.assignments.slice(0, 4).map((a) => (
                  <div key={a.id} className="p-3 bg-surface-neutral rounded border border-hairline flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-text-primary truncate">{a.title}</div>
                      <div className="text-[11px] text-text-secondary">{a.subject} • Hạn: {a.dueDate || '—'}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {a.isOverdue && <Badge variant="danger" size="sm">Quá hạn</Badge>}
                      {a.submissionStatus === 'submitted' && <Badge variant="success" size="sm">Đã nộp</Badge>}
                      {!a.submissionStatus && !a.isOverdue && <Badge variant="warning" size="sm">Chưa nộp</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-text-secondary">
                Không có bài tập nào trong thời gian gần đây.
              </div>
            )}
          </Card>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-5 space-y-6">
          {/* Announcements */}
          <Card padding="p-6" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary stroke-[1.75]" />
                <h2 className="text-base font-medium text-text-primary">Thông báo</h2>
              </div>
              <a href="/parent/notices" className="text-xs text-ocean hover:underline font-medium">
                Xem tất cả ({childData.announcements.length})
              </a>
            </div>
            <div className="space-y-3">
              {childData.announcements.slice(0, 3).map((n) => (
                <div key={n.id} className="p-4 rounded border border-hairline bg-surface-neutral/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant={n.priority === 'urgent' ? 'danger' : n.priority === 'important' ? 'warning' : 'info'}
                      size="sm"
                    >
                      {n.priority || 'Thông báo'}
                    </Badge>
                    <span className="text-[11px] text-text-secondary">
                      {n.publishedAt ? new Date(n.publishedAt).toLocaleDateString('vi-VN') : 'Gần đây'}
                    </span>
                  </div>
                  <h3 className="text-xs font-semibold text-text-primary leading-snug">{n.title}</h3>
                  <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">{n.content}</p>
                </div>
              ))}
              {childData.announcements.length === 0 && (
                <p className="text-xs text-text-secondary text-center py-4">Không có thông báo nào.</p>
              )}
            </div>
          </Card>

          {/* Tuition */}
          <Card padding="p-6" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary stroke-[1.75]" />
                <h2 className="text-base font-medium text-text-primary">Học phí</h2>
              </div>
              <Badge variant={childData.invoice?.currentInvoice?.status === 'paid' ? 'success' : 'warning'}>
                {childData.invoice?.currentInvoice?.status === 'paid' ? 'Đã hoàn tất' : 'Chưa thanh toán'}
              </Badge>
            </div>

            {childData.invoice?.currentInvoice ? (
              <>
                <div className="p-5 bg-surface-neutral rounded-card border border-hairline space-y-2">
                  <div className="text-xs text-text-secondary">{childData.invoice.currentInvoice.period}</div>
                  <div className="text-3xl font-bold text-primary tracking-tight">
                    {childData.invoice.currentInvoice.total} <span className="text-lg font-normal text-text-secondary">đ</span>
                  </div>
                </div>
                {childData.invoice.currentInvoice.status !== 'paid' && (
                  <Button variant="primary" size="lg" className="w-full justify-center" icon={QrCode}
                    onClick={() => setIsQrModalOpen(true)}>
                    Thanh toán VietQR
                  </Button>
                )}
              </>
            ) : (
              <p className="text-xs text-text-secondary text-center py-4">Không có hóa đơn học phí.</p>
            )}
          </Card>
        </div>
      </div>

      {/* VietQR Modal */}
      <Modal isOpen={isQrModalOpen} onClose={() => setIsQrModalOpen(false)} title="Thanh toán học phí VietQR">
        <div className="space-y-4 text-center">
          <p className="text-xs text-text-secondary">Quét mã QR bằng ứng dụng ngân hàng bất kỳ (Vietcombank, MB, Techcombank...):</p>
          <div className="p-4 bg-white border-2 border-hairline rounded-card inline-block mx-auto shadow-whisper">
            <div className="w-56 h-56 bg-surface-neutral border border-hairline flex flex-col items-center justify-between p-2">
              <div className="flex items-center justify-between w-full px-2 text-[10px] font-bold text-blue-900 border-b pb-1">
                <span>VIETQR</span><span>NAPAS 247</span>
              </div>
              <svg className="w-36 h-36" viewBox="0 0 100 100">
                <rect width="100" height="100" fill="#ffffff" />
                <rect x="5" y="5" width="25" height="25" fill="#0F3D5C" />
                <rect x="9" y="9" width="17" height="17" fill="#ffffff" />
                <rect x="13" y="13" width="9" height="9" fill="#0F3D5C" />
                <rect x="70" y="5" width="25" height="25" fill="#0F3D5C" />
                <rect x="74" y="9" width="17" height="17" fill="#ffffff" />
                <rect x="78" y="13" width="9" height="9" fill="#0F3D5C" />
                <rect x="5" y="70" width="25" height="25" fill="#0F3D5C" />
                <rect x="9" y="74" width="17" height="17" fill="#ffffff" />
                <rect x="13" y="78" width="9" height="9" fill="#0F3D5C" />
                <rect x="35" y="35" width="30" height="30" fill="#0F3D5C" />
                <rect x="42" y="42" width="16" height="16" fill="#ffffff" />
                <circle cx="50" cy="50" r="4" fill="#0F3D5C" />
              </svg>
              <span className="text-[10px] font-mono font-semibold">
                {childData.invoice?.currentInvoice?.total} VNĐ
              </span>
            </div>
          </div>
          <div className="p-3.5 bg-surface-neutral rounded text-left text-xs space-y-2">
            <div className="flex justify-between"><span className="text-text-secondary">Ngân hàng:</span><span className="font-semibold text-text-primary">{childData.invoice?.currentInvoice?.qrInfo?.bank || 'Vietcombank'}</span></div>
            <div className="flex justify-between items-center">
              <span className="text-text-secondary">Số TK:</span>
              <span className="font-mono font-bold text-primary flex items-center gap-1">
                <span>{childData.invoice?.currentInvoice?.qrInfo?.accountNumber || '—'}</span>
                <button onClick={handleCopyAccount} className="p-1 hover:bg-hairline rounded text-ocean"><QrCode className="w-3.5 h-3.5" /></button>
              </span>
            </div>
            <div className="flex justify-between"><span className="text-text-secondary">Tên TK:</span><span className="font-semibold text-text-primary">{childData.invoice?.currentInvoice?.qrInfo?.accountName || '—'}</span></div>
            <div className="flex justify-between items-center">
              <span className="text-text-secondary">Nội dung:</span>
              <span className="font-mono font-medium text-ocean flex items-center gap-1">
                <span>{childData.invoice?.currentInvoice?.qrInfo?.description || '—'}</span>
                <button onClick={handleCopyMemo} className="p-1 hover:bg-hairline rounded text-ocean"><QrCode className="w-3.5 h-3.5" /></button>
              </span>
            </div>
          </div>
          <div className="flex justify-center pt-2">
            <Button variant="primary" size="md" className="w-full justify-center" onClick={handleConfirmPayment}>
              {paymentSuccess ? '✓ Đã ghi nhận!' : 'Tôi đã thanh toán'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

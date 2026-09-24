import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { parentApi } from '../../services/api';
import { useSync } from '../../context/SyncContext';
import {
  Award,
  CreditCard,
  Calendar,
  CheckCircle2,
  TrendingUp,
  Clock,
  QrCode,
  Copy,
  Bell,
  MessageSquare,
  Send,
  Plus,
  Phone,
  Printer,
  Download,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  ChevronRight,
  FileCheck,
  Loader2,
} from 'lucide-react';

// Map parent URL paths to internal tab IDs
const PARENT_PATH_TO_TAB = {
  '/parent/dashboard': 'home',
  '/parent/grades': 'grades',
  '/parent/schedule': 'schedule',
  '/parent/leave': 'leave',
  '/parent/tuition': 'tuition',
  '/parent/notices': 'notices',
  '/parent/messages': 'messages',
};

export function ParentDashboard({
  activeTab: propActiveTab,
  onTabChange,
  selectedChildId,
  onSelectChild,
  onChildrenLoaded,
}) {
  // Derive tab from URL when accessed directly (for deep-link/refresh support)
  const { pathname } = useLocation();
  const urlTab = PARENT_PATH_TO_TAB[pathname] || 'home';
  // propActiveTab takes precedence when coming from parent layout wrapper
  const activeTab = propActiveTab ?? urlTab;
  const { lastSync, triggerSync } = useSync();

  // --- State ---
  const [children, setChildren] = useState([]);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [errorChildren, setErrorChildren] = useState(null);
  const [internalChildId, setInternalChildId] = useState(selectedChildId || null);

  // Child-specific data
  const [childGrades, setChildGrades] = useState(null);
  const [childAttendance, setChildAttendance] = useState(null);
  const [childAssignments, setChildAssignments] = useState([]);
  const [childAnnouncements, setChildAnnouncements] = useState([]);
  const [childTimetable, setChildTimetable] = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const [errorData, setErrorData] = useState(null);

  // Leave requests & messages
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [messages, setMessages] = useState([]);

  // Tuition
  const [invoicesData, setInvoicesData] = useState(null);

  // UI state
  const [feedbackToast, setFeedbackToast] = useState(null);
  const [copiedBank, setCopiedBank] = useState(false);
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [noticeFilter, setNoticeFilter] = useState('all');

  // Leave modal
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [leaveReasonType, setLeaveReasonType] = useState('Bệnh/Sức khỏe');
  const [leaveDetail, setLeaveDetail] = useState('');
  const [leavePhone, setLeavePhone] = useState('');
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);

  // Messages
  const [chatInput, setChatInput] = useState('');
  const [isSendingMsg, setIsSendingMsg] = useState(false);

  // Detailed grades modal
  const [detailedGrades, setDetailedGrades] = useState(null);

  // --- Derived ---
  const activeId = selectedChildId || internalChildId || children[0]?.id;
  const currentChild = children.find((c) => c.id === activeId) || children[0] || null;

  const showToast = (msg) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  // --- Load children list ---
  const loadChildren = useCallback(async () => {
    setLoadingChildren(true);
    setErrorChildren(null);
    try {
      const res = await parentApi.getChildrenData();
      if (res && res.children) {
        const list = res.children;
        setChildren(list);
        onChildrenLoaded?.(list);
        // Auto-select primary contact child if none selected (checked inside useEffect)
        if (list.length > 0) {
          return list; // return for selection logic
        }
      } else {
        setChildren([]);
        setErrorChildren('Không có thông tin con cái.');
      }
      return null;
    } catch (err) {
      setErrorChildren('Không thể tải danh sách con cái.');
      console.error('[ParentDashboard] loadChildren error:', err);
      return null;
    } finally {
      setLoadingChildren(false);
    }
  }, []);

  useEffect(() => {
    loadChildren().then((list) => {
      if (list && list.length > 0) {
        const primary = list.find(c => c.isPrimaryContact) || list[0];
        if (!selectedChildId && !internalChildId) {
          setInternalChildId(primary.id);
          onSelectChild?.(primary.id);
        }
      }
    });
  }, []);

  // --- Load child-specific data when child changes ---
  const loadChildData = useCallback(async (childId) => {
    if (!childId) return;
    setLoadingData(true);
    setErrorData(null);
    setChildGrades(null);
    setChildAttendance(null);
    setChildAssignments([]);
    setDetailedGrades(null);

    try {
      // Load grades
      const [gradesRes, attRes, assignRes, notifRes] = await Promise.allSettled([
        parentApi.getGrades(childId, 'hk1'),
        parentApi.getAttendance(childId),
        parentApi.getAssignments(childId),
        parentApi.getAnnouncements(childId),
      ]);

      if (gradesRes.status === 'fulfilled' && gradesRes.value) {
        setChildGrades(gradesRes.value);
        // Also load detailed grades
        const detailRes = await parentApi.getDetailedGrades(childId, 'hk1');
        if (detailRes) setDetailedGrades(detailRes);
      }
      if (attRes.status === 'fulfilled' && attRes.value) {
        setChildAttendance(attRes.value);
      }
      if (assignRes.status === 'fulfilled' && assignRes.value) {
        const val = assignRes.value;
        setChildAssignments(Array.isArray(val.assignments) ? val.assignments : (Array.isArray(val) ? val : []));
      }
      if (notifRes.status === 'fulfilled' && notifRes.value) {
        const val = notifRes.value;
        setChildAnnouncements(Array.isArray(val.announcements) ? val.announcements : (Array.isArray(val) ? val : []));
      }

      // Load timetable
      const timetableRes = await parentApi.getTimetable(childId);
      if (timetableRes && timetableRes.schedule) {
        setChildTimetable(timetableRes.schedule);
      }

      // Load leave requests
      const lrRes = await parentApi.getLeaveRequests(childId);
      if (Array.isArray(lrRes)) setLeaveRequests(lrRes);

      // Load messages
      const msgRes = await parentApi.getTeacherMessages(childId);
      if (Array.isArray(msgRes)) setMessages(msgRes);

      // Load invoices
      const invRes = await parentApi.getInvoices(childId);
      if (invRes) setInvoicesData(invRes);

    } catch (err) {
      setErrorData('Không thể tải dữ liệu học tập của con.');
      console.error('[ParentDashboard] loadChildData error:', err);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (activeId) loadChildData(activeId);
  }, [activeId, lastSync, activeTab]);

  // --- Handlers ---
  const handleChildChange = (id) => {
    setInternalChildId(id);
    onSelectChild?.(id);
  };

  const handleCopyAccount = () => {
    const acc = invoicesData?.currentInvoice?.qrInfo?.accountNumber;
    if (!acc) return;
    navigator.clipboard?.writeText?.(acc);
    setCopiedBank(true);
    setTimeout(() => setCopiedBank(false), 2000);
  };

  const handleCopyMemo = () => {
    const memo = invoicesData?.currentInvoice?.qrInfo?.description;
    if (!memo) return;
    navigator.clipboard?.writeText?.(memo);
    setCopiedMemo(true);
    setTimeout(() => setCopiedMemo(false), 2000);
  };

  const handleConfirmPayment = async () => {
    try {
      const invId = invoicesData?.currentInvoice?.id;
      if (!invId) return;
      await parentApi.payTuition(invId);
      await triggerSync();
      setPaymentSuccess(true);
      showToast('Đã xác nhận thanh toán học phí thành công!');
      await loadChildData(activeId);
    } finally {
      setTimeout(() => { setIsQrModalOpen(false); setPaymentSuccess(false); }, 1200);
    }
  };

  const handleSubmitLeave = async (e) => {
    e.preventDefault();
    if (!leaveStartDate || !leaveEndDate || !leaveDetail.trim()) {
      alert('Vui lòng nhập đầy đủ thông tin đơn nghỉ học.');
      return;
    }
    setIsSubmittingLeave(true);
    try {
      const res = await parentApi.submitLeaveRequest({
        studentId: activeId,
        startDate: leaveStartDate,
        endDate: leaveEndDate,
        reasonType: leaveReasonType,
        reasonDetail: leaveDetail,
        emergencyPhone: leavePhone,
      });
      if (res?.success) {
        showToast('Đơn xin nghỉ học đã được gửi tới Giáo viên Chủ nhiệm!');
        setIsLeaveModalOpen(false);
        setLeaveDetail(''); setLeaveStartDate(''); setLeaveEndDate('');
        await triggerSync();
        const updated = await parentApi.getLeaveRequests(activeId);
        if (Array.isArray(updated)) setLeaveRequests(updated);
      }
    } catch (err) {
      showToast('Gửi đơn thất bại. Vui lòng thử lại.');
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || chatInput;
    if (!text.trim()) return;
    setIsSendingMsg(true);
    try {
      const res = await parentApi.sendTeacherMessage({
        studentId: activeId,
        content: text.trim(),
        senderName: 'Phụ huynh',
      });
      if (res?.success) {
        setChatInput('');
        const updated = await parentApi.getTeacherMessages(activeId);
        if (Array.isArray(updated)) setMessages(updated);
      }
    } finally {
      setIsSendingMsg(false);
    }
  };

  const handleToggleNoticeConfirm = async (noticeId) => {
    await parentApi.confirmNotice(noticeId);
    showToast('Đã cập nhật phản hồi!');
    await triggerSync();
  };

  // --- Helpers ---
  const getGradeVariant = (score) => {
    if (score >= 9) return 'success';
    if (score >= 8) return 'info';
    if (score >= 6.5) return 'warning';
    return 'neutral';
  };

  const getGpaRank = (gpa) => {
    if (gpa >= 9.0) return 'Học lực Xuất sắc';
    if (gpa >= 8.0) return 'Học lực Giỏi';
    if (gpa >= 6.5) return 'Học lực Khá';
    return 'Học lực Trung bình';
  };

  const recentGrades = childGrades?.tests?.slice(0, 5) || currentChild?.recentSubjects || [];
  const gpa = childGrades?.overallGpa || currentChild?.gpa || 0;

  // --- Render ---
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

  if (errorChildren && children.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="max-w-sm text-center p-6">
          <AlertCircle className="w-10 h-10 text-danger mx-auto mb-3" />
          <p className="text-sm text-text-primary font-medium mb-1">{errorChildren}</p>
          <p className="text-xs text-text-secondary mb-4">Vui lòng đăng nhập lại hoặc liên hệ bộ phận hỗ trợ.</p>
          <Button variant="primary" size="sm" onClick={loadChildren}>Thử lại</Button>
        </Card>
      </div>
    );
  }

  if (!currentChild) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="max-w-sm text-center p-6">
          <p className="text-sm text-text-primary">Chưa có hồ sơ học sinh nào được liên kết.</p>
        </Card>
      </div>
    );
  }

  const attendanceRate = childAttendance?.rate || currentChild?.attendanceRate || '—';

  return (
    <div className="space-y-6">
      {/* Global Toast */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-primary text-white px-5 py-3 rounded-card shadow-whisper flex items-center gap-3 border border-ocean/30 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
          <span className="text-xs font-medium">{feedbackToast}</span>
        </div>
      )}

      {/* Header: Multi-child Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 hairline-b pb-4">
        <div>
          <div className="text-xs text-text-secondary flex items-center gap-2">
            <span>Học kỳ I • 2024 - 2025</span>
            {currentChild?.class && <><span>•</span><span className="text-text-primary font-medium">{currentChild.class}</span></>}
          </div>
          <h1 className="text-2xl font-medium text-text-primary mt-1">
            {activeTab === 'home' && 'Theo dõi học tập của con'}
            {activeTab === 'grades' && 'Kết quả học tập'}
            {activeTab === 'schedule' && 'Lịch học & Thi'}
            {activeTab === 'leave' && 'Đơn xin nghỉ học'}
            {activeTab === 'tuition' && 'Học phí & Dịch vụ'}
            {activeTab === 'notices' && 'Thông báo nhà trường'}
            {activeTab === 'messages' && 'Tin nhắn giáo viên'}
          </h1>
        </div>

        {/* Child Switcher */}
        {children.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {children.map((child) => {
              const isSelected = child.id === currentChild.id;
              return (
                <button
                  key={child.id}
                  onClick={() => handleChildChange(child.id)}
                  className={`flex items-center gap-2 p-2 px-3 rounded-card border transition-all text-left ${
                    isSelected
                      ? 'bg-white border-ocean ring-2 ring-ocean/15 shadow-whisper'
                      : 'bg-surface-neutral border-hairline opacity-75 hover:opacity-100'
                  }`}
                >
                  <img
                    src={child.avatar}
                    alt={child.name}
                    className="w-8 h-8 rounded-full object-cover border border-hairline"
                  />
                  <div>
                    <div className="text-xs font-semibold text-text-primary">{child.name}</div>
                    <div className="text-[11px] text-text-secondary">{child.class}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Child Profile + KPI Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card padding="p-5" className="lg:col-span-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={currentChild.avatar}
              alt={currentChild.name}
              className="w-12 h-12 rounded-full object-cover border border-hairline"
            />
            <div>
              <div className="text-sm font-semibold text-text-primary">{currentChild.name}</div>
              <div className="text-xs text-ocean font-medium mt-0.5">{currentChild.class}</div>
              <div className="text-[11px] text-text-secondary mt-1">
                Mã HS: <strong>{currentChild.code}</strong>
              </div>
            </div>
          </div>
          <Badge variant="info" size="sm">Học kỳ 1</Badge>
        </Card>

        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card
            padding="p-5"
            className="cursor-pointer hover:border-ocean transition-colors"
            onClick={() => onTabChange?.('grades')}
          >
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

          <Card
            padding="p-5"
            className="cursor-pointer hover:border-ocean transition-colors"
            onClick={() => onTabChange?.('grades')}
          >
            <div className="text-xs text-text-secondary">Xếp hạng lớp</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-semibold text-primary">{currentChild.classRank || '—'}</span>
              <span className="text-xs text-text-secondary">/ {currentChild.totalStudents || '—'} HS</span>
            </div>
            <div className="text-xs text-ocean mt-2 flex items-center gap-1 font-medium">
              <Award className="w-3.5 h-3.5" />
              <span>{getGpaRank(gpa)}</span>
            </div>
          </Card>

          <Card
            padding="p-5"
            className="cursor-pointer hover:border-ocean transition-colors"
            onClick={() => onTabChange?.('leave')}
          >
            <div className="text-xs text-text-secondary">Tỷ lệ chuyên cần</div>
            <div className="text-3xl font-semibold text-primary mt-1">{attendanceRate}</div>
            <div className="text-xs text-text-secondary mt-2 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
              <span>{childAttendance?.presentDays
                ? `${childAttendance.presentDays}/${childAttendance.totalDays} buổi có mặt`
                : currentChild.attendanceNote || 'Đi học chuyên cần'}
              </span>
            </div>
            {childAttendance && (
              <div className="text-xs text-text-secondary mt-1">
                Vắng: {childAttendance.absentDays} • Muộn: {childAttendance.lateDays} • Có phép: {childAttendance.excusedDays}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: HOME OVERVIEW                                                       */}
      {/* ========================================================================= */}
      {activeTab === 'home' && (
        <div className="space-y-6">
          {errorData && (
            <div className="p-4 bg-danger/10 border border-danger/30 rounded-card flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-danger shrink-0" />
              <span className="text-sm text-danger">{errorData}</span>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button onClick={() => setIsLeaveModalOpen(true)} className="p-3.5 bg-white border border-hairline hover:border-ocean rounded-card flex items-center gap-3 transition-colors text-left shadow-whisper">
              <div className="w-9 h-9 rounded-card bg-sky text-primary flex items-center justify-center shrink-0">
                <FileCheck className="w-5 h-5 stroke-[1.75]" />
              </div>
              <div>
                <div className="text-xs font-semibold text-text-primary">Đơn xin nghỉ học</div>
                <div className="text-[11px] text-text-secondary">Gửi phép tới GVCN</div>
              </div>
            </button>

            <button onClick={() => setIsQrModalOpen(true)} className="p-3.5 bg-white border border-hairline hover:border-ocean rounded-card flex items-center gap-3 transition-colors text-left shadow-whisper">
              <div className="w-9 h-9 rounded-card bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <QrCode className="w-5 h-5 stroke-[1.75]" />
              </div>
              <div>
                <div className="text-xs font-semibold text-text-primary">Đóng học phí VietQR</div>
                <div className="text-[11px] text-text-secondary">Napas 24/7 tức thì</div>
              </div>
            </button>

            <button onClick={() => onTabChange?.('messages')} className="p-3.5 bg-white border border-hairline hover:border-ocean rounded-card flex items-center gap-3 transition-colors text-left shadow-whisper">
              <div className="w-9 h-9 rounded-card bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                <MessageSquare className="w-5 h-5 stroke-[1.75]" />
              </div>
              <div>
                <div className="text-xs font-semibold text-text-primary">Nhắn tin GVCN</div>
                <div className="text-[11px] text-text-secondary">Trao đổi trực tiếp</div>
              </div>
            </button>

            <button onClick={() => onTabChange?.('grades')} className="p-3.5 bg-white border border-hairline hover:border-ocean rounded-card flex items-center gap-3 transition-colors text-left shadow-whisper">
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
            {/* Recent Grades */}
            <div className="lg:col-span-7 space-y-6">
              <Card padding="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-medium text-text-primary">Kết quả học tập gần nhất</h2>
                    <p className="text-xs text-text-secondary">Bảng điểm kiểm tra định kỳ được phê chuẩn</p>
                  </div>
                  <button onClick={() => onTabChange?.('grades')} className="text-xs font-medium text-ocean hover:underline flex items-center gap-1">
                    <span>Xem bảng điểm chi tiết</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {loadingData ? (
                  <div className="space-y-3">
                    {[1,2,3].map(i => <div key={i} className="h-14 bg-surface-neutral rounded animate-pulse" />)}
                  </div>
                ) : recentGrades.length > 0 ? (
                  <div className="space-y-3">
                    {recentGrades.map((sub, idx) => (
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
                          <span className="text-lg font-bold text-primary">{parseFloat(sub.rawScore || sub.score || 0).toFixed(1)}</span>
                          <Badge variant={getGradeVariant(parseFloat(sub.rawScore || sub.score || 0))} size="sm">
                            {sub.normalizedScore ? sub.normalizedScore.toFixed(1) : parseFloat(sub.rawScore || sub.score || 0).toFixed(1)}/10
                          </Badge>
                        </div>
                      </div>
                    ))}
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
                  <Button variant="secondary" size="sm" onClick={() => onTabChange?.('schedule')}>
                    Xem thêm
                  </Button>
                </div>

                {childAssignments.length > 0 ? (
                  <div className="space-y-3">
                    {childAssignments.slice(0, 4).map((a) => (
                      <div key={a.id} className="p-3 bg-surface-neutral rounded border border-hairline flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-text-primary truncate">{a.title}</div>
                          <div className="text-[11px] text-text-secondary">{a.subject} • Hạn: {a.dueDate || '—'}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {a.isOverdue && <Badge variant="danger" size="sm">Quá hạn</Badge>}
                          {a.submissionStatus === 'submitted' && <Badge variant="success" size="sm">Đã nộp</Badge>}
                          {a.submissionStatus === 'graded' && <Badge variant="info" size="sm">Đã chấm</Badge>}
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
                  <button onClick={() => onTabChange?.('notices')} className="text-xs text-ocean hover:underline font-medium">
                    Xem tất cả ({childAnnouncements.length})
                  </button>
                </div>
                <div className="space-y-3">
                  {childAnnouncements.slice(0, 3).map((n) => (
                    <div key={n.id} className="p-4 rounded border border-hairline bg-surface-neutral/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge
                          variant={n.priority === 'urgent' ? 'danger' : n.priority === 'important' ? 'warning' : 'info'}
                          size="sm"
                        >
                          {n.priority || 'Thông báo'}
                        </Badge>
                        <span className="text-[11px] text-text-secondary">{n.publishedAt ? new Date(n.publishedAt).toLocaleDateString('vi-VN') : 'Gần đây'}</span>
                      </div>
                      <h3 className="text-xs font-semibold text-text-primary leading-snug">{n.title}</h3>
                      <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">{n.content}</p>
                    </div>
                  ))}
                  {childAnnouncements.length === 0 && (
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
                  <Badge variant={invoicesData?.currentInvoice?.status === 'paid' ? 'success' : 'warning'}>
                    {invoicesData?.currentInvoice?.status === 'paid' ? 'Đã hoàn tất' : 'Chưa thanh toán'}
                  </Badge>
                </div>

                {invoicesData?.currentInvoice ? (
                  <>
                    <div className="p-5 bg-surface-neutral rounded-card border border-hairline space-y-2">
                      <div className="text-xs text-text-secondary">{invoicesData.currentInvoice.period}</div>
                      <div className="text-3xl font-bold text-primary tracking-tight">
                        {invoicesData.currentInvoice.total} <span className="text-lg font-normal text-text-secondary">đ</span>
                      </div>
                    </div>
                    {invoicesData.currentInvoice.status !== 'paid' && (
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: GRADES                                                              */}
      {/* ========================================================================= */}
      {activeTab === 'grades' && (
        <div className="space-y-6">
          {loadingData ? (
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-surface-neutral rounded animate-pulse" />)}
            </div>
          ) : detailedGrades?.subjects?.length > 0 ? (
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
                    Điểm TB: <span className="text-base text-ocean font-bold">{detailedGrades.overallGpa?.toFixed(2) || gpa.toFixed(1)}</span>
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
                            <div className="text-[11px] text-text-secondary">{sub.teacherName}</div>
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-extrabold text-primary text-sm bg-sky/20">
                            {sub.average?.toFixed(1) || '—'}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <Badge variant={getGradeVariant(sub.average || 0)} size="sm">
                              {sub.average >= 9 ? 'Xuất sắc' : sub.average >= 8 ? 'Giỏi' : sub.average >= 6.5 ? 'Khá' : 'Trung bình'}
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
          ) : (
            <Card className="text-center py-12">
              <Award className="w-12 h-12 text-hairline mx-auto mb-3" />
              <p className="text-sm text-text-primary font-medium">Chưa có kết quả học tập</p>
              <p className="text-xs text-text-secondary mt-1">Kết quả sẽ được cập nhật khi giáo viên công bố điểm.</p>
            </Card>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SCHEDULE / TIMETABLE                                               */}
      {/* ========================================================================= */}
      {activeTab === 'schedule' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-medium text-text-primary">Thời khóa biểu</h2>
              <p className="text-xs text-text-secondary mt-1">Lịch học và lịch thi của {currentChild.name}</p>
            </div>
            <Badge variant="info">Học kỳ 1</Badge>
          </div>

          {childTimetable ? (
            <Card padding="p-0" className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-neutral text-text-secondary font-medium hairline-b">
                    <tr>
                      <th className="py-3 px-4 w-28">Tiết</th>
                      {['Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7'].map(d => (
                        <th key={d} className="py-3 px-3 text-center">{d}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {Array.from({length: 5}, (_, pi) => {
                      const periodNum = pi + 1;
                      return (
                        <tr key={pi}>
                          <td className="py-3 px-4 font-mono bg-surface-neutral/40 text-xs text-text-primary">
                            Tiết {periodNum}
                          </td>
                          {[2,3,4,5,6,7].map(dow => {
                            const dayObj = childTimetable.find(d => Number(d.dayOfWeek) === dow);
                            const slot = dayObj?.periods?.find(p => Number(p.period) === periodNum);
                            return (
                              <td key={dow} className="py-3 px-3 text-center text-xs text-text-primary">
                                {slot ? (
                                  <div className="font-medium">{slot.subject}</div>
                                ) : '—'}
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
      )}

      {/* ========================================================================= */}
      {/* TAB 4: LEAVE REQUESTS                                                      */}
      {/* ========================================================================= */}
      {activeTab === 'leave' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-medium text-text-primary">Đơn xin nghỉ học</h2>
              <p className="text-xs text-text-secondary mt-1">Quản lý đơn xin nghỉ phép của {currentChild.name}</p>
            </div>
            <Button variant="primary" size="md" icon={Plus} onClick={() => setIsLeaveModalOpen(true)}>
              Tạo đơn mới
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card padding="p-5">
              <div className="text-xs text-text-secondary">Tỷ lệ chuyên cần</div>
              <div className="text-3xl font-semibold text-primary mt-1">{attendanceRate}</div>
              <div className="text-xs text-success mt-2 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{childAttendance ? `${childAttendance.presentDays}/${childAttendance.totalDays} buổi` : '—'}</span>
              </div>
            </Card>
            <Card padding="p-5">
              <div className="text-xs text-text-secondary">Nghỉ có phép</div>
              <div className="text-3xl font-semibold text-ocean mt-1">{childAttendance?.excusedDays ?? 0} buổi</div>
              <div className="text-xs text-text-secondary mt-2">Đã được GVCN duyệt</div>
            </Card>
            <Card padding="p-5">
              <div className="text-xs text-text-secondary">Vắng không phép</div>
              <div className={`text-3xl font-semibold mt-1 ${(childAttendance?.absentDays ?? 0) > 0 ? 'text-danger' : 'text-success'}`}>
                {childAttendance?.absentDays ?? 0} buổi
              </div>
              <div className="text-xs text-text-secondary mt-2">{(childAttendance?.absentDays ?? 0) > 0 ? 'Cần giải trình' : 'Không vi phạm'}</div>
            </Card>
          </div>

          <Card padding="p-0" className="overflow-hidden">
            <div className="p-4 bg-surface-neutral hairline-b">
              <h3 className="text-sm font-semibold text-text-primary">Lịch sử đơn xin nghỉ</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-neutral text-text-secondary font-medium hairline-b">
                  <tr>
                    <th className="py-3 px-4">Thời gian</th>
                    <th className="py-3 px-4">Lý do</th>
                    <th className="py-3 px-3 text-center">Trạng thái</th>
                    <th className="py-3 px-4">Phản hồi GVCN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {leaveRequests.length > 0 ? leaveRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-sky/20 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-medium text-text-primary">
                        {req.start_date === req.end_date ? req.start_date : `${req.start_date} → ${req.end_date}`}
                      </td>
                      <td className="py-3.5 px-4 text-text-secondary">{req.reason_type}: {req.reason_detail}</td>
                      <td className="py-3.5 px-3 text-center">
                        <Badge
                          variant={req.status === 'approved' ? 'success' : req.status === 'rejected' ? 'danger' : 'warning'}
                        >
                          {req.status === 'approved' ? 'Đã duyệt' : req.status === 'rejected' ? 'Từ chối' : 'Chờ duyệt'}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-text-secondary">{req.teacher_note || '—'}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-sm text-text-secondary">
                        Chưa có đơn xin nghỉ học nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: TUITION                                                            */}
      {/* ========================================================================= */}
      {activeTab === 'tuition' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-medium text-text-primary">Học phí & Thanh toán</h2>
              <p className="text-xs text-text-secondary mt-1">Thông tin học phí của {currentChild.name}</p>
            </div>
            <Button variant="primary" size="md" icon={QrCode} onClick={() => setIsQrModalOpen(true)}>
              Mở VietQR
            </Button>
          </div>

          {invoicesData?.currentInvoice ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <Card padding="p-6" className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-text-primary">{invoicesData.currentInvoice.period}</h3>
                  <Badge variant={invoicesData.currentInvoice.status === 'paid' ? 'success' : 'warning'}>
                    {invoicesData.currentInvoice.status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                  </Badge>
                </div>
                <div className="p-5 bg-surface-neutral rounded-card border border-hairline flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-secondary">Tổng số tiền:</span>
                  <span className="text-2xl font-bold text-primary">{invoicesData.currentInvoice.total} đ</span>
                </div>
                {invoicesData.currentInvoice.status !== 'paid' && (
                  <Button variant="primary" size="lg" className="w-full justify-center bg-primary hover:bg-ocean"
                    icon={QrCode} onClick={() => setIsQrModalOpen(true)}>
                    Thanh toán VietQR Napas 24/7
                  </Button>
                )}
              </Card>
              <Card padding="p-6" className="lg:col-span-5 space-y-4">
                <h3 className="text-base font-semibold text-text-primary">Thông tin tài khoản</h3>
                <div className="p-4 bg-surface-neutral rounded-card border border-hairline space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Ngân hàng:</span>
                    <span className="font-semibold text-text-primary">{invoicesData.currentInvoice.qrInfo?.bank || 'Vietcombank'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary">Số TK:</span>
                    <span className="font-mono font-bold text-primary flex items-center gap-1">
                      <span>{invoicesData.currentInvoice.qrInfo?.accountNumber || '—'}</span>
                      <button onClick={handleCopyAccount} className="p-1 hover:bg-hairline rounded text-ocean">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Tên TK:</span>
                    <span className="font-semibold text-text-primary">{invoicesData.currentInvoice.qrInfo?.accountName || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary">Nội dung:</span>
                    <span className="font-mono font-medium text-ocean flex items-center gap-1">
                      <span>{invoicesData.currentInvoice.qrInfo?.description || '—'}</span>
                      <button onClick={handleCopyMemo} className="p-1 hover:bg-hairline rounded text-ocean">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  </div>
                </div>
                {copiedBank && <p className="text-xs text-success font-medium">✓ Đã sao chép số TK!</p>}
                {copiedMemo && <p className="text-xs text-success font-medium">✓ Đã sao chép nội dung!</p>}
              </Card>
            </div>
          ) : (
            <Card className="text-center py-12">
              <CreditCard className="w-12 h-12 text-hairline mx-auto mb-3" />
              <p className="text-sm text-text-primary">Không có hóa đơn học phí</p>
            </Card>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: NOTICES                                                            */}
      {/* ========================================================================= */}
      {activeTab === 'notices' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-medium text-text-primary">Thông báo nhà trường</h2>
              <p className="text-xs text-text-secondary mt-1">Tin tức và thông báo dành cho phụ huynh</p>
            </div>
          </div>
          <div className="space-y-4">
            {childAnnouncements.length > 0 ? childAnnouncements.map((n) => (
              <Card key={n.id} padding="p-6" className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={n.priority === 'urgent' ? 'danger' : n.priority === 'important' ? 'warning' : 'info'} size="sm">
                      {n.priority || 'Thông báo'}
                    </Badge>
                    <span className="text-xs text-text-secondary">• {n.publishedAt ? new Date(n.publishedAt).toLocaleDateString('vi-VN') : ''}</span>
                  </div>
                  <span className="text-xs font-semibold text-ocean">{n.authorName || 'Nhà trường'}</span>
                </div>
                <h3 className="text-base font-semibold text-text-primary">{n.title}</h3>
                <p className="text-xs text-text-secondary leading-relaxed">{n.content}</p>
              </Card>
            )) : (
              <Card className="text-center py-12">
                <Bell className="w-12 h-12 text-hairline mx-auto mb-3" />
                <p className="text-sm text-text-primary">Không có thông báo nào</p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: MESSAGES                                                           */}
      {/* ========================================================================= */}
      {activeTab === 'messages' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-medium text-text-primary">Tin nhắn giáo viên</h2>
              <p className="text-xs text-text-secondary mt-1">Kênh trao đổi với Giáo viên Chủ nhiệm</p>
            </div>
          </div>
          <Card padding="p-0" className="flex flex-col h-[520px] overflow-hidden">
            <div className="p-4 bg-surface-neutral hairline-b flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center font-semibold text-sm">👩‍🏫</div>
              <div>
                <div className="text-xs font-semibold text-text-primary">Giáo viên Chủ nhiệm</div>
                <div className="text-[11px] text-text-secondary">{currentChild.class}</div>
              </div>
              <Badge variant="success" size="sm" className="ml-auto">Trực tuyến</Badge>
            </div>
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#F9FAFC]">
              {messages.map((msg) => {
                const isMe = msg.sender_role === 'parent';
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="text-[10px] text-text-secondary mb-1">{msg.sender_name}</div>
                    <div className={`p-3 rounded-card text-xs max-w-md leading-relaxed ${
                      isMe
                        ? 'bg-primary text-white rounded-br-none'
                        : 'bg-white border border-hairline text-text-primary rounded-bl-none shadow-whisper'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                );
              })}
              {messages.length === 0 && (
                <div className="text-center text-xs text-text-secondary py-8">Chưa có tin nhắn nào. Bắt đầu cuộc trò chuyện!</div>
              )}
            </div>
            <div className="p-2.5 bg-white hairline-t flex gap-3">
              <input
                type="text" value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                placeholder="Nhập tin nhắn..."
                className="flex-1 px-3.5 py-2.5 text-xs bg-surface-neutral border border-hairline rounded focus:outline-none focus:border-ocean text-text-primary"
              />
              <Button variant="primary" size="md" icon={Send} disabled={isSendingMsg || !chatInput.trim()}
                onClick={() => handleSendMessage()}>
                Gửi
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VIETQR PAYMENT                                                     */}
      {/* ========================================================================= */}
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
              <span className="text-[10px] font-mono font-semibold">{invoicesData?.currentInvoice?.total} VNĐ</span>
            </div>
          </div>
          <div className="p-3.5 bg-surface-neutral rounded text-left text-xs space-y-2">
            <div className="flex justify-between"><span className="text-text-secondary">Ngân hàng:</span><span className="font-semibold text-text-primary">{invoicesData?.currentInvoice?.qrInfo?.bank || 'Vietcombank'}</span></div>
            <div className="flex justify-between items-center">
              <span className="text-text-secondary">Số TK:</span>
              <span className="font-mono font-bold text-primary flex items-center gap-1">
                <span>{invoicesData?.currentInvoice?.qrInfo?.accountNumber || '—'}</span>
                <button onClick={handleCopyAccount} className="p-1 hover:bg-hairline rounded text-ocean"><Copy className="w-3.5 h-3.5" /></button>
              </span>
            </div>
            <div className="flex justify-between"><span className="text-text-secondary">Tên TK:</span><span className="font-semibold text-text-primary">{invoicesData?.currentInvoice?.qrInfo?.accountName || '—'}</span></div>
            <div className="flex justify-between items-center">
              <span className="text-text-secondary">Nội dung:</span>
              <span className="font-mono font-medium text-ocean flex items-center gap-1">
                <span>{invoicesData?.currentInvoice?.qrInfo?.description || '—'}</span>
                <button onClick={handleCopyMemo} className="p-1 hover:bg-hairline rounded text-ocean"><Copy className="w-3.5 h-3.5" /></button>
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

      {/* ========================================================================= */}
      {/* MODAL: LEAVE REQUEST                                                       */}
      {/* ========================================================================= */}
      <Modal isOpen={isLeaveModalOpen} onClose={() => setIsLeaveModalOpen(false)} title="Tạo đơn xin nghỉ học">
        <form onSubmit={handleSubmitLeave} className="space-y-4 text-xs">
          <div className="p-3 bg-surface-neutral rounded border border-hairline">
            <div className="text-text-secondary">Học sinh:</div>
            <div className="font-semibold text-text-primary text-sm mt-0.5">{currentChild?.name} • {currentChild?.class}</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-secondary mb-1 font-medium">Từ ngày (*)</label>
              <input type="date" required value={leaveStartDate} onChange={(e) => setLeaveStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean" />
            </div>
            <div>
              <label className="block text-text-secondary mb-1 font-medium">Đến ngày (*)</label>
              <input type="date" required value={leaveEndDate} onChange={(e) => setLeaveEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean" />
            </div>
          </div>
          <div>
            <label className="block text-text-secondary mb-1 font-medium">Lý do (*)</label>
            <select value={leaveReasonType} onChange={(e) => setLeaveReasonType(e.target.value)}
              className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean">
              <option value="Bệnh/Sức khỏe">Bệnh / Sức khỏe</option>
              <option value="Việc gia đình">Việc bận gia đình</option>
              <option value="Hoạt động năng khiếu">Tham gia sự kiện / Thi năng khiếu</option>
              <option value="Lý do khác">Lý do đặc biệt khác</option>
            </select>
          </div>
          <div>
            <label className="block text-text-secondary mb-1 font-medium">Chi tiết (*)</label>
            <textarea rows={3} required value={leaveDetail} onChange={(e) => setLeaveDetail(e.target.value)}
              placeholder="Ghi rõ lý do để GVCN nắm thông tin..."
              className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean" />
          </div>
          <div>
            <label className="block text-text-secondary mb-1 font-medium">SĐT liên hệ khẩn</label>
            <input type="text" value={leavePhone} onChange={(e) => setLeavePhone(e.target.value)}
              className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean font-mono" />
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" size="md" onClick={() => setIsLeaveModalOpen(false)}>Hủy</Button>
            <Button type="submit" variant="primary" size="md" disabled={isSubmittingLeave}>
              {isSubmittingLeave ? 'Đang gửi...' : 'Gửi đơn tới GVCN'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

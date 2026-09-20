import React, { useState, useEffect } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { PARENT_DASHBOARD_DATA } from '../../mock/parentData';
import { parentApi } from '../../services/api';
import { useSync } from '../../context/SyncContext';
import {
  Users,
  Award,
  CreditCard,
  Calendar,
  AlertCircle,
  FileCheck,
  CheckCircle2,
  TrendingUp,
  Clock,
  Download,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Check,
  QrCode,
  Copy,
  Bell,
  MessageSquare,
  Send,
  Plus,
  Search,
  Filter,
  Printer,
  FileText,
  Phone,
  X,
  Sparkles,
} from 'lucide-react';

export function ParentDashboard({
  activeTab = 'home',
  onTabChange,
  selectedChildId,
  onSelectChild,
  onChildrenLoaded,
}) {
  const { lastSync, triggerSync } = useSync();
  const [data, setData] = useState(PARENT_DASHBOARD_DATA);
  const [internalChildId, setInternalChildId] = useState(selectedChildId || 'std_khoi');

  // Modals state
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Leave request form
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [leaveReasonType, setLeaveReasonType] = useState('Bệnh/Sức khỏe');
  const [leaveDetail, setLeaveDetail] = useState('');
  const [leavePhone, setLeavePhone] = useState('0912 345 678');
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);

  // Chat message state
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isSendingMsg, setIsSendingMsg] = useState(false);

  // Leave requests list
  const [leaveRequests, setLeaveRequests] = useState([]);

  // Detailed grades & Invoices
  const [detailedGrades, setDetailedGrades] = useState(null);
  const [invoicesData, setInvoicesData] = useState(null);

  // UI helpers
  const [copiedBank, setCopiedBank] = useState(false);
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState(null);
  const [noticeFilter, setNoticeFilter] = useState('all');

  const activeId = selectedChildId || internalChildId;
  const currentChild = data.children.find((c) => c.id === activeId) || data.children[0];

  const showToast = (msg) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  // Load parent children data
  const loadData = async () => {
    const res = await parentApi.getChildrenData();
    if (res) {
      setData(res);
      onChildrenLoaded?.(res.children);
    }
  };

  useEffect(() => {
    loadData();
  }, [lastSync]);

  // Load secondary data depending on child or tab
  useEffect(() => {
    if (!currentChild) return;
    const cid = currentChild.id;

    // Load leave requests
    parentApi.getLeaveRequests(cid).then((res) => {
      if (res) setLeaveRequests(res);
    });

    // Load messages
    parentApi.getTeacherMessages(cid).then((res) => {
      if (res) setMessages(res);
    });

    // Load detailed grades
    parentApi.getDetailedGrades(cid).then((res) => {
      if (res) setDetailedGrades(res);
    });

    // Load invoices
    parentApi.getInvoices(cid).then((res) => {
      if (res) setInvoicesData(res);
    });
  }, [currentChild?.id, lastSync, activeTab]);

  const handleChildChange = (id) => {
    setInternalChildId(id);
    onSelectChild?.(id);
  };

  const handleCopyAccount = () => {
    if (!currentChild?.tuition?.qrInfo?.accountNumber) return;
    navigator.clipboard?.writeText?.(currentChild.tuition.qrInfo.accountNumber);
    setCopiedBank(true);
    setTimeout(() => setCopiedBank(false), 2000);
  };

  const handleCopyMemo = () => {
    if (!currentChild?.tuition?.qrInfo?.description) return;
    navigator.clipboard?.writeText?.(currentChild.tuition.qrInfo.description);
    setCopiedMemo(true);
    setTimeout(() => setCopiedMemo(false), 2000);
  };

  const handleConfirmPayment = async () => {
    try {
      const invId = currentChild.tuition?.id || `inv_${currentChild.id}_t11`;
      await parentApi.payTuition(invId);
      await triggerSync();
      setPaymentSuccess(true);
      showToast('Đã xác nhận thanh toán học phí thành công!');
      await loadData();
      const updatedInv = await parentApi.getInvoices(currentChild.id);
      if (updatedInv) setInvoicesData(updatedInv);
    } finally {
      setTimeout(() => {
        setIsQrModalOpen(false);
        setPaymentSuccess(false);
      }, 1200);
    }
  };

  const handleToggleMeetingConfirm = async (noticeId) => {
    await parentApi.confirmNotice(noticeId);
    await triggerSync();
    showToast('Đã cập nhật phản hồi tham dự của phụ huynh!');
    await loadData();
  };

  // Submit leave request
  const handleSubmitLeave = async (e) => {
    e.preventDefault();
    if (!leaveStartDate || !leaveEndDate || !leaveDetail.trim()) {
      alert('Vui lòng nhập đầy đủ ngày và lý do xin nghỉ');
      return;
    }
    setIsSubmittingLeave(true);
    try {
      const res = await parentApi.submitLeaveRequest({
        studentId: currentChild.id,
        startDate: leaveStartDate,
        endDate: leaveEndDate,
        reasonType: leaveReasonType,
        reasonDetail: leaveDetail,
        emergencyPhone: leavePhone,
      });
      if (res?.success) {
        showToast('Đơn xin nghỉ học đã được chuyển tới Giáo viên Chủ nhiệm thành công!');
        setIsLeaveModalOpen(false);
        setLeaveDetail('');
        setLeaveStartDate('');
        setLeaveEndDate('');
        await triggerSync();
        const updatedReqs = await parentApi.getLeaveRequests(currentChild.id);
        if (updatedReqs) setLeaveRequests(updatedReqs);
      }
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  // Send message to teacher
  const handleSendMessage = async (textToSend) => {
    const text = textToSend || chatInput;
    if (!text.trim()) return;
    setIsSendingMsg(true);
    try {
      const res = await parentApi.sendTeacherMessage({
        studentId: currentChild.id,
        content: text.trim(),
        senderName: 'Bác Nguyễn Văn Thành (Phụ huynh)',
      });
      if (res?.success) {
        setChatInput('');
        const updated = await parentApi.getTeacherMessages(currentChild.id);
        if (updated) setMessages(updated);
      }
    } finally {
      setIsSendingMsg(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Global Toast Notification */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-primary text-white px-5 py-3 rounded-card shadow-whisper flex items-center gap-3 border border-ocean/30 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
          <span className="text-xs font-medium">{feedbackToast}</span>
        </div>
      )}

      {/* Top Banner: Academic Term & Multi-child Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 hairline-b pb-4">
        <div>
          <div className="text-xs text-text-secondary flex items-center gap-2">
            <span>Học kỳ I • 2024 - 2025</span>
            <span>•</span>
            <span className="text-text-primary font-medium">Trường THCS & THPT Khởi Hoàn</span>
          </div>
          <h1 className="text-2xl font-medium text-text-primary mt-1">
            {activeTab === 'home' && 'Theo dõi học tập của con'}
            {activeTab === 'grades' && 'Sổ điểm & Đánh giá năng lực'}
            {activeTab === 'schedule' && 'Thời khóa biểu & Lịch kiểm tra'}
            {activeTab === 'leave' && 'Sổ chuyên cần & Đơn xin nghỉ học trực tuyến'}
            {activeTab === 'tuition' && 'Cổng thanh toán học phí & Dịch vụ số'}
            {activeTab === 'notices' && 'Bảng tin & Thông báo từ nhà trường'}
            {activeTab === 'messages' && 'Kênh trao đổi trực tiếp với Giáo viên Chủ nhiệm'}
          </h1>
        </div>

        {/* Multi-child selector card buttons */}
        <div className="flex items-center gap-2">
          {data.children.map((child) => {
            const isSelected = child.id === currentChild.id;
            return (
              <button
                key={child.id}
                onClick={() => handleChildChange(child.id)}
                className={`flex items-center gap-2.5 p-2 px-3 rounded-card border transition-all text-left ${
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
                  <div className="text-[11px] text-text-secondary">{child.class.split('•')[0]}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Child Summary Profile & 3 Academic Stat Cards (Visible across all tabs) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Profile Card (4 cols) */}
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
                Mã HS: <strong>{currentChild.code}</strong> • GVCN: {currentChild.gvcn}
              </div>
            </div>
          </div>
          <Badge variant="info" size="sm">Học kỳ 1</Badge>
        </Card>

        {/* 3 KPI Stats (8 cols) */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card
            padding="p-5"
            className="cursor-pointer hover:border-ocean transition-colors"
            onClick={() => onTabChange?.('grades')}
          >
            <div className="text-xs text-text-secondary">Điểm trung bình kỳ</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-semibold text-primary">{currentChild.gpa}</span>
              <Badge variant="success" size="sm">{currentChild.gpaRank}</Badge>
            </div>
            <div className="text-xs text-text-secondary mt-2 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-success" />
              <span>Tiến bộ so với đầu năm</span>
            </div>
          </Card>

          <Card
            padding="p-5"
            className="cursor-pointer hover:border-ocean transition-colors"
            onClick={() => onTabChange?.('grades')}
          >
            <div className="text-xs text-text-secondary">Xếp hạng lớp</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-semibold text-primary">{currentChild.classRank}</span>
              <span className="text-xs text-text-secondary">/ {currentChild.totalStudents} học sinh</span>
            </div>
            <div className="text-xs text-ocean mt-2 flex items-center gap-1 font-medium">
              <Award className="w-3.5 h-3.5" />
              <span>Top 10% học sinh xuất sắc</span>
            </div>
          </Card>

          <Card
            padding="p-5"
            className="cursor-pointer hover:border-ocean transition-colors"
            onClick={() => onTabChange?.('leave')}
          >
            <div className="text-xs text-text-secondary">Tỷ lệ chuyên cần</div>
            <div className="text-3xl font-semibold text-primary mt-1">
              {currentChild.attendanceRate}
            </div>
            <div className="text-xs text-text-secondary mt-2 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
              <span>{currentChild.attendanceNote}</span>
            </div>
          </Card>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: HOME OVERVIEW                                                      */}
      {/* ========================================================================= */}
      {activeTab === 'home' && (
        <div className="space-y-6">
          {/* Quick Action Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => setIsLeaveModalOpen(true)}
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
              onClick={() => onTabChange?.('messages')}
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
              onClick={() => onTabChange?.('grades')}
              className="p-3.5 bg-white border border-hairline hover:border-ocean rounded-card flex items-center gap-3 transition-colors text-left shadow-whisper"
            >
              <div className="w-9 h-9 rounded-card bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                <Award className="w-5 h-5 stroke-[1.75]" />
              </div>
              <div>
                <div className="text-xs font-semibold text-text-primary">Sổ điểm chi tiết</div>
                <div className="text-[11px] text-text-secondary">Xem bảng điểm 10 môn</div>
              </div>
            </button>
          </div>

          {/* Main Grid: Left Scores (7 cols), Right Tuition & Fees (5 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Recent Scores & Progress Sparkline */}
            <div className="lg:col-span-7 space-y-6">
              <Card padding="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-medium text-text-primary">Kết quả học tập gần nhất</h2>
                    <p className="text-xs text-text-secondary">Bảng điểm kiểm tra định kỳ được phê chuẩn</p>
                  </div>
                  <button
                    onClick={() => onTabChange?.('grades')}
                    className="text-xs font-medium text-ocean hover:underline flex items-center gap-1"
                  >
                    <span>Xem bảng điểm chi tiết</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Sparkline trend banner */}
                <div className="p-3.5 bg-sky/40 rounded border border-ocean/20 flex items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-ocean text-white flex items-center justify-center">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-text-primary">
                        Xu hướng tiến bộ ổn định
                      </div>
                      <div className="text-[11px] text-text-secondary">
                        Điểm số 4 bài gần nhất tăng trung bình +0.4 điểm
                      </div>
                    </div>
                  </div>

                  {/* Mini Sparkline SVG */}
                  <div className="flex items-center gap-2">
                    <svg className="w-24 h-8" viewBox="0 0 100 30">
                      <polyline
                        fill="none"
                        stroke="#1C6FA8"
                        strokeWidth="2.5"
                        points="0,22 25,18 50,15 75,17 100,5"
                      />
                      <circle cx="100" cy="5" r="3" fill="#2E8B57" />
                    </svg>
                    <span className="text-xs font-semibold text-success bg-white px-2 py-0.5 rounded border border-success/30">
                      9.5 Max
                    </span>
                  </div>
                </div>

                {/* Subject score items */}
                <div className="space-y-3">
                  {currentChild.recentSubjects.map((sub, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-surface-neutral/60 hover:bg-surface-neutral rounded border border-hairline flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-card bg-primary text-white flex items-center justify-center font-semibold text-sm">
                          {sub.initial}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-text-primary">{sub.name}</div>
                          <div className="text-[11px] text-text-secondary">{sub.test}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-primary">{sub.score}</span>
                        <Badge variant={sub.rankType} size="sm">
                          {sub.rank}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Timetable & Upcoming Exams */}
              <Card padding="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary stroke-[1.75]" />
                    <div>
                      <h2 className="text-base font-medium text-text-primary">Thời khóa biểu & Lịch kiểm tra</h2>
                      <p className="text-xs text-text-secondary">Lịch học hôm nay và kỳ thi sắp diễn ra</p>
                    </div>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => onTabChange?.('schedule')}>
                    Xem cả tuần
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  {currentChild.schedule.map((item, idx) => (
                    <div key={idx} className="p-3 bg-surface-neutral rounded border border-hairline space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="font-semibold text-ocean">{item.period}</span>
                        <span className="text-text-secondary">{item.time}</span>
                      </div>
                      <div className="text-xs font-medium text-text-primary">{item.subject}</div>
                      <div className="text-[10px] text-text-secondary truncate">{item.room}</div>
                    </div>
                  ))}
                </div>

                {/* Exam Alert Card */}
                <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-900">
                      <Clock className="w-4 h-4 text-warning-dark" />
                      <span>{currentChild.examAlert.title}</span>
                    </div>
                    <div className="text-xs text-text-secondary">
                      {currentChild.examAlert.time} • {currentChild.examAlert.duration}
                    </div>
                  </div>
                  <button
                    onClick={() => onTabChange?.('schedule')}
                    className="text-xs font-semibold text-ocean hover:underline whitespace-nowrap"
                  >
                    {currentChild.examAlert.linkText}
                  </button>
                </div>
              </Card>
            </div>

            {/* Right: Tuition Billing Card with VietQR payment */}
            <div className="lg:col-span-5 space-y-6">
              <Card padding="p-6" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary stroke-[1.75]" />
                    <h2 className="text-base font-medium text-text-primary">Học phí & Dịch vụ</h2>
                  </div>
                  <Badge variant={currentChild.tuition.status === 'paid' ? 'success' : 'warning'}>
                    {currentChild.tuition.status === 'paid' ? 'Đã hoàn tất' : currentChild.tuition.countdown}
                  </Badge>
                </div>

                <div className="p-5 bg-surface-neutral rounded-card border border-hairline space-y-2">
                  <div className="flex justify-between text-xs text-text-secondary">
                    <span>{currentChild.tuition.period}</span>
                    <span>{currentChild.tuition.dueDate}</span>
                  </div>
                  <div className="text-3xl font-bold text-primary tracking-tight">
                    {currentChild.tuition.total} <span className="text-lg font-normal text-text-secondary">đ</span>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="space-y-2.5 text-xs text-text-secondary">
                  {currentChild.tuition.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between py-1 hairline-b last:border-b-0">
                      <span>{item.label}</span>
                      <span className="font-medium text-text-primary">{item.amount}</span>
                    </div>
                  ))}
                </div>

                {/* Payment Button */}
                {currentChild.tuition.status === 'paid' ? (
                  <div className="p-3 bg-emerald-50 text-emerald-800 rounded border border-emerald-200 text-xs text-center font-medium flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    <span>Học phí tháng này đã được thanh toán đầy đủ</span>
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full justify-center bg-primary hover:bg-ocean text-white"
                    icon={QrCode}
                    onClick={() => setIsQrModalOpen(true)}
                  >
                    Thanh toán ngay bằng VietQR / Napas
                  </Button>
                )}

                <div className="flex items-center justify-between text-[11px] text-text-secondary pt-1">
                  <div className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-success" />
                    <span>Bảo mật qua Napas 24/7</span>
                  </div>
                  <button
                    onClick={() => onTabChange?.('tuition')}
                    className="text-ocean hover:underline flex items-center gap-1"
                  >
                    <span>Lịch sử biên lai điện tử</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </Card>

              {/* School Notifications */}
              <Card padding="p-6" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-primary stroke-[1.75]" />
                    <h2 className="text-base font-medium text-text-primary">Thông báo từ nhà trường</h2>
                  </div>
                  <button
                    onClick={() => onTabChange?.('notices')}
                    className="text-xs text-ocean hover:underline font-medium"
                  >
                    Xem tất cả ({data.notifications.length})
                  </button>
                </div>

                <div className="space-y-3">
                  {data.notifications.slice(0, 3).map((notif) => (
                    <div
                      key={notif.id}
                      className="p-4 rounded border border-hairline bg-surface-neutral/50 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <Badge variant={notif.tagType} size="sm">
                          {notif.tag}
                        </Badge>
                        <span className="text-[11px] text-text-secondary">{notif.time}</span>
                      </div>

                      <h3 className="text-xs font-semibold text-text-primary leading-snug">
                        {notif.title}
                      </h3>

                      <p className="text-xs text-text-secondary leading-relaxed">
                        {notif.content}
                      </p>

                      <div className="flex items-center justify-between pt-2 hairline-t text-[11px]">
                        <span className="text-text-secondary font-medium">{notif.sender}</span>
                        {notif.canConfirm ? (
                          <button
                            onClick={() => handleToggleMeetingConfirm(notif.id)}
                            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                              notif.confirmed
                                ? 'bg-success text-white'
                                : 'bg-primary text-white hover:bg-ocean'
                            }`}
                          >
                            {notif.confirmed ? '✓ Đã xác nhận tham dự' : 'Xác nhận tham dự'}
                          </button>
                        ) : (
                          <span className="text-ocean hover:underline cursor-pointer">
                            {notif.linkText || 'Xem chi tiết →'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DETAILED GRADES                                                    */}
      {/* ========================================================================= */}
      {activeTab === 'grades' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-medium text-text-primary">Bảng tổng hợp kết quả học tập chi tiết</h2>
              <p className="text-xs text-text-secondary mt-1">
                Bảng điểm 10 môn học chính khóa được ban giám hiệu phê chuẩn kèm nhận xét của từng giáo viên bộ môn.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="md"
                icon={Printer}
                onClick={() => window.print()}
              >
                In bảng điểm
              </Button>
              <Button
                variant="primary"
                size="md"
                icon={Download}
                onClick={() => showToast('Đang tạo file PDF bảng điểm có chữ ký số điện tử...')}
              >
                Xuất PDF có dấu xác thực
              </Button>
            </div>
          </div>

          {/* Detailed Subjects Table */}
          <Card padding="p-0" className="overflow-hidden">
            <div className="p-4 bg-surface-neutral hairline-b flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs">
                <span className="font-semibold text-text-primary">Học kỳ:</span>
                <span className="px-2.5 py-1 bg-white rounded border border-ocean font-medium text-ocean">
                  Học kỳ I (2024-2025)
                </span>
                <span className="px-2.5 py-1 bg-surface-neutral rounded border border-hairline text-text-secondary cursor-pointer hover:bg-white">
                  Học kỳ II
                </span>
                <span className="px-2.5 py-1 bg-surface-neutral rounded border border-hairline text-text-secondary cursor-pointer hover:bg-white">
                  Cả năm
                </span>
              </div>
              <div className="text-xs font-semibold text-primary">
                Điểm TB học kỳ: <span className="text-base text-ocean font-bold">{detailedGrades?.gpa || currentChild.gpa}</span> ({detailedGrades?.academicRank || currentChild.gpaRank})
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-neutral text-text-secondary font-medium hairline-b">
                  <tr>
                    <th className="py-3 px-4">Môn học & Giáo viên</th>
                    <th className="py-3 px-3 text-center">Miệng</th>
                    <th className="py-3 px-3 text-center">15 Phút</th>
                    <th className="py-3 px-3 text-center">1 Tiết</th>
                    <th className="py-3 px-3 text-center">Giữa kỳ</th>
                    <th className="py-3 px-3 text-center">Cuối kỳ</th>
                    <th className="py-3 px-3 text-center font-semibold text-text-primary">ĐTB Môn</th>
                    <th className="py-3 px-3 text-center">Xếp loại</th>
                    <th className="py-3 px-4">Nhận xét sư phạm của giáo viên</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {detailedGrades?.subjects?.map((sub, idx) => (
                    <tr key={idx} className="hover:bg-sky/20 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-text-primary">{sub.name}</div>
                        <div className="text-[11px] text-text-secondary">{sub.teacher}</div>
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-medium text-text-primary">
                        {sub.oral?.join(', ') || '-'}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-text-primary">
                        {sub.m15?.join(', ') || '-'}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-text-primary">
                        {sub.m45?.join(', ') || '-'}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-ocean">
                        {sub.midterm}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-primary">
                        {sub.final}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-extrabold text-sm text-primary bg-sky/30">
                        {sub.avg}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge
                          variant={sub.avg >= 9.0 ? 'success' : sub.avg >= 8.0 ? 'info' : 'neutral'}
                          size="sm"
                        >
                          {sub.rank}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-xs text-text-secondary max-w-xs">
                        {sub.remarks}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Competency & Soft Skills Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card padding="p-6" className="space-y-4">
              <h3 className="text-sm font-semibold text-text-primary">Đánh giá các năng lực cốt lõi</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-text-secondary">Tư duy logic & Giải quyết vấn đề</span>
                    <span className="font-bold text-primary">94% (Xuất sắc)</span>
                  </div>
                  <div className="w-full h-2 bg-surface-neutral rounded-full overflow-hidden">
                    <div style={{ width: '94%' }} className="bg-primary h-full rounded-full"></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-text-secondary">Năng lực tự chủ & Tự học</span>
                    <span className="font-bold text-ocean">88% (Tốt)</span>
                  </div>
                  <div className="w-full h-2 bg-surface-neutral rounded-full overflow-hidden">
                    <div style={{ width: '88%' }} className="bg-ocean h-full rounded-full"></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-text-secondary">Giao tiếp & Hợp tác nhóm</span>
                    <span className="font-bold text-ocean">90% (Tốt)</span>
                  </div>
                  <div className="w-full h-2 bg-surface-neutral rounded-full overflow-hidden">
                    <div style={{ width: '90%' }} className="bg-ocean h-full rounded-full"></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-text-secondary">Năng lực tin học & Công nghệ số</span>
                    <span className="font-bold text-success">98% (Vượt trội)</span>
                  </div>
                  <div className="w-full h-2 bg-surface-neutral rounded-full overflow-hidden">
                    <div style={{ width: '98%' }} className="bg-success h-full rounded-full"></div>
                  </div>
                </div>
              </div>
            </Card>

            <Card padding="p-6" className="space-y-3">
              <h3 className="text-sm font-semibold text-text-primary">Nhận xét chung của Giáo viên Chủ nhiệm</h3>
              <div className="p-4 bg-surface-neutral rounded border border-hairline text-xs leading-relaxed text-text-secondary">
                <p>
                  "Em {currentChild.name} là một học sinh gương mẫu, luôn chấp hành tốt nội quy lớp học và tích cực tham gia các phong trào thi đua. Khả năng tư duy toán học và công nghệ thông tin nổi bật. Cần tiếp tục duy trì thói quen đọc sách mở rộng vốn từ cho môn Ngữ văn."
                </p>
                <div className="mt-3 pt-3 hairline-t flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-text-primary">{currentChild.gvcn}</span>
                  <span className="text-text-secondary">GVCN Lớp {currentChild.class.split('•')[0]}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TIMETABLE & SCHEDULE                                               */}
      {/* ========================================================================= */}
      {activeTab === 'schedule' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-medium text-text-primary">Thời khóa biểu & Lịch thi tuần này</h2>
              <p className="text-xs text-text-secondary mt-1">
                Áp dụng từ ngày 21/10/2024 đến 26/10/2024 (Tuần học thứ 10).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="neutral">Tuần 10</Badge>
              <Badge variant="info">Học kỳ 1</Badge>
            </div>
          </div>

          {/* Weekly Timetable Table */}
          <Card padding="p-0" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-neutral text-text-secondary font-medium hairline-b">
                  <tr>
                    <th className="py-3 px-4 w-28">Tiết học / Giờ</th>
                    <th className="py-3 px-3 text-center">Thứ Hai</th>
                    <th className="py-3 px-3 text-center">Thứ Ba</th>
                    <th className="py-3 px-3 text-center">Thứ Tư</th>
                    <th className="py-3 px-3 text-center">Thứ Năm</th>
                    <th className="py-3 px-3 text-center">Thứ Sáu</th>
                    <th className="py-3 px-3 text-center">Thứ Bảy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {[
                    { period: 'Tiết 1 (07:30 - 08:15)', d2: 'Chào cờ', d3: 'Toán học', d4: 'Vật lý', d5: 'Toán học', d6: 'Tiếng Anh', d7: 'Tin học' },
                    { period: 'Tiết 2 (08:20 - 09:05)', d2: 'Sinh hoạt lớp', d3: 'Toán học', d4: 'Vật lý', d5: 'Toán học', d6: 'Tiếng Anh', d7: 'Tin học' },
                    { period: 'Tiết 3 (09:20 - 10:05)', d2: 'Ngữ văn', d3: 'Hóa học', d4: 'Ngữ văn', d5: 'Lịch sử', d6: 'Sinh học', d7: 'GDCD' },
                    { period: 'Tiết 4 (10:10 - 10:55)', d2: 'Ngữ văn', d3: 'Hóa học', d4: 'Ngữ văn', d5: 'Địa lý', d6: 'Sinh học', d7: 'Thể dục' },
                    { period: 'Tiết 5 (11:00 - 11:45)', d2: 'Tiếng Anh', d3: 'Kỹ năng số', d4: 'Tiếng Anh', d5: 'Công nghệ', d6: 'GDQP-AN', d7: 'Thể dục' },
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-sky/20 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-text-primary bg-surface-neutral/40">
                        {row.period}
                      </td>
                      <td className="py-3 px-3 text-center font-medium text-text-primary">{row.d2}</td>
                      <td className="py-3 px-3 text-center font-medium text-text-primary">{row.d3}</td>
                      <td className="py-3 px-3 text-center font-medium text-text-primary">{row.d4}</td>
                      <td className="py-3 px-3 text-center font-medium text-text-primary">{row.d5}</td>
                      <td className="py-3 px-3 text-center font-medium text-text-primary">{row.d6}</td>
                      <td className="py-3 px-3 text-center font-medium text-text-primary">{row.d7}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Upcoming Examinations Calendar */}
          <Card padding="p-6" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary stroke-[1.75]" />
                <h3 className="text-base font-medium text-text-primary">Lịch thi định kỳ & Giữa học kỳ I</h3>
              </div>
              <Badge variant="warning">Đợt 1 bắt đầu 05/11</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 bg-surface-neutral rounded-card border border-hairline space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="danger" size="sm">Thi Giữa Kỳ</Badge>
                  <span className="text-[11px] text-text-secondary">05/11/2024 • 08:00</span>
                </div>
                <div className="text-sm font-semibold text-text-primary">Vật Lý 10</div>
                <div className="text-xs text-text-secondary">Thời lượng: 60 phút • Phòng thi: 12</div>
                <div className="text-[11px] text-ocean hover:underline cursor-pointer pt-1 font-medium">
                  Xem đề cương & phạm vi kiến thức →
                </div>
              </div>

              <div className="p-4 bg-surface-neutral rounded-card border border-hairline space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="danger" size="sm">Thi Giữa Kỳ</Badge>
                  <span className="text-[11px] text-text-secondary">06/11/2024 • 08:00</span>
                </div>
                <div className="text-sm font-semibold text-text-primary">Toán Đại Số 10</div>
                <div className="text-xs text-text-secondary">Thời lượng: 90 phút • Phòng thi: 12</div>
                <div className="text-[11px] text-ocean hover:underline cursor-pointer pt-1 font-medium">
                  Xem đề cương & phạm vi kiến thức →
                </div>
              </div>

              <div className="p-4 bg-surface-neutral rounded-card border border-hairline space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="danger" size="sm">Thi Giữa Kỳ</Badge>
                  <span className="text-[11px] text-text-secondary">08/11/2024 • 14:00</span>
                </div>
                <div className="text-sm font-semibold text-text-primary">Tiếng Anh Học Thuật</div>
                <div className="text-xs text-text-secondary">Thời lượng: 60 phút • Phòng Lab 2</div>
                <div className="text-[11px] text-ocean hover:underline cursor-pointer pt-1 font-medium">
                  Xem đề cương & phạm vi kiến thức →
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: LEAVE REQUESTS (e-Leave)                                           */}
      {/* ========================================================================= */}
      {activeTab === 'leave' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-medium text-text-primary">Đơn xin nghỉ học trực tuyến (e-Leave)</h2>
              <p className="text-xs text-text-secondary mt-1">
                Gửi đơn phép trực tiếp tới Giáo viên Chủ nhiệm. Trạng thái duyệt sẽ được đồng bộ tức thì vào hệ thống điểm danh.
              </p>
            </div>
            <Button
              variant="primary"
              size="md"
              icon={Plus}
              onClick={() => setIsLeaveModalOpen(true)}
            >
              Tạo đơn xin nghỉ học
            </Button>
          </div>

          {/* 3 Absence Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card padding="p-5">
              <div className="text-xs text-text-secondary">Tỷ lệ chuyên cần kỳ này</div>
              <div className="text-3xl font-semibold text-primary mt-1">{currentChild.attendanceRate}</div>
              <div className="text-xs text-success mt-2 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Đạt chuẩn chuyên cần nhà trường</span>
              </div>
            </Card>

            <Card padding="p-5">
              <div className="text-xs text-text-secondary">Số buổi nghỉ có phép</div>
              <div className="text-3xl font-semibold text-ocean mt-1">01 buổi</div>
              <div className="text-xs text-text-secondary mt-2">Đã được GVCN phê duyệt</div>
            </Card>

            <Card padding="p-5">
              <div className="text-xs text-text-secondary">Số buổi vắng không phép</div>
              <div className="text-3xl font-semibold text-success mt-1">0 buổi</div>
              <div className="text-xs text-text-secondary mt-2">Không có vi phạm kỷ luật</div>
            </Card>
          </div>

          {/* Leave Requests Table */}
          <Card padding="p-0" className="overflow-hidden">
            <div className="p-4 bg-surface-neutral hairline-b flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary">Lịch sử đơn xin nghỉ học đã gửi</h3>
              <span className="text-xs text-text-secondary">Tổng cộng {leaveRequests.length} đơn</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-neutral text-text-secondary font-medium hairline-b">
                  <tr>
                    <th className="py-3 px-4">Thời gian xin nghỉ</th>
                    <th className="py-3 px-4">Phân loại lý do</th>
                    <th className="py-3 px-4">Chi tiết lý do & Lời nhắn</th>
                    <th className="py-3 px-3 text-center">Trạng thái</th>
                    <th className="py-3 px-4">Phản hồi của GVCN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {leaveRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-sky/20 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-medium text-text-primary">
                        {req.start_date === req.end_date
                          ? req.start_date
                          : `${req.start_date} → ${req.end_date}`}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 bg-surface-neutral rounded border border-hairline text-text-primary font-medium">
                          {req.reason_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-text-secondary max-w-sm">
                        {req.reason_detail}
                        {req.emergency_phone && (
                          <div className="text-[11px] text-ocean mt-0.5">SĐT liên hệ: {req.emergency_phone}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <Badge
                          variant={
                            req.status === 'approved'
                              ? 'success'
                              : req.status === 'rejected'
                              ? 'danger'
                              : 'warning'
                          }
                        >
                          {req.status === 'approved'
                            ? 'Đã duyệt'
                            : req.status === 'rejected'
                            ? 'Từ chối'
                            : 'Chờ duyệt'}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-text-secondary">
                        {req.teacher_note || 'Đang đợi giáo viên chủ nhiệm xem xét...'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: TUITION & VIETQR PAYMENTS                                          */}
      {/* ========================================================================= */}
      {activeTab === 'tuition' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-medium text-text-primary">Học phí & Cổng thanh toán trực tuyến VietQR</h2>
              <p className="text-xs text-text-secondary mt-1">
                Thanh toán học phí minh bạch chuẩn Napas 24/7. Hóa đơn và biên lai điện tử có giá trị pháp lý.
              </p>
            </div>
            <Button
              variant="primary"
              size="md"
              icon={QrCode}
              onClick={() => setIsQrModalOpen(true)}
            >
              Mở mã VietQR chuyển khoản
            </Button>
          </div>

          {/* Current Period Bill */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Card padding="p-6" className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-text-primary">
                    Hóa đơn kỳ thu: {currentChild.tuition.period}
                  </h3>
                  <p className="text-xs text-text-secondary mt-0.5">{currentChild.tuition.dueDate}</p>
                </div>
                <Badge variant={currentChild.tuition.status === 'paid' ? 'success' : 'warning'}>
                  {currentChild.tuition.status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                </Badge>
              </div>

              {/* Items Breakdown */}
              <div className="divide-y divide-hairline">
                {currentChild.tuition.items.map((it, idx) => (
                  <div key={idx} className="py-3 flex justify-between text-xs">
                    <span className="text-text-secondary">{it.label}</span>
                    <span className="font-semibold text-text-primary">{it.amount}</span>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-surface-neutral rounded-card border border-hairline flex items-center justify-between">
                <span className="text-xs font-semibold text-text-secondary">Tổng số tiền cần nộp:</span>
                <span className="text-2xl font-bold text-primary">{currentChild.tuition.total} đ</span>
              </div>

              {currentChild.tuition.status === 'paid' ? (
                <div className="p-3.5 bg-emerald-50 text-emerald-800 rounded border border-emerald-200 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    <span>Giao dịch đã được hệ thống kế toán ghi nhận thành công!</span>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      setSelectedReceipt({
                        receiptNo: `BL-2024-11-${currentChild.id === 'std_chau' ? '0812' : '0421'}`,
                        period: currentChild.tuition.period,
                        studentName: currentChild.name,
                        studentCode: currentChild.code,
                        className: currentChild.class,
                        total: currentChild.tuition.total,
                        paidAt: 'Vừa hoàn tất',
                        method: 'VietQR Napas 24/7 (Vietcombank)',
                        items: currentChild.tuition.items,
                      })
                    }
                  >
                    Xem biên lai
                  </Button>
                </div>
              ) : (
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full justify-center bg-primary hover:bg-ocean text-white"
                  icon={QrCode}
                  onClick={() => setIsQrModalOpen(true)}
                >
                  Thanh toán ngay bằng VietQR Napas 24/7
                </Button>
              )}
            </Card>

            {/* Quick Banking Guide */}
            <Card padding="p-6" className="lg:col-span-5 space-y-4">
              <h3 className="text-base font-semibold text-text-primary">Thông tin tài khoản nhà trường</h3>
              <div className="p-4 bg-surface-neutral rounded-card border border-hairline space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Ngân hàng:</span>
                  <span className="font-semibold text-text-primary">Vietcombank</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Số tài khoản:</span>
                  <span className="font-mono font-bold text-primary flex items-center gap-1">
                    <span>{currentChild.tuition.qrInfo.accountNumber}</span>
                    <button onClick={handleCopyAccount} className="p-1 hover:bg-hairline rounded text-ocean">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Tên tài khoản:</span>
                  <span className="font-semibold text-text-primary">{currentChild.tuition.qrInfo.accountName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Cú pháp chuyển:</span>
                  <span className="font-mono font-medium text-ocean flex items-center gap-1">
                    <span>{currentChild.tuition.qrInfo.description}</span>
                    <button onClick={handleCopyMemo} className="p-1 hover:bg-hairline rounded text-ocean">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </span>
                </div>
              </div>
              <div className="text-[11px] text-text-secondary leading-relaxed space-y-1">
                <p>• Hệ thống tự động gạch nợ trong vòng 60 giây sau khi chuyển khoản thành công.</p>
                <p>• Phụ huynh vui lòng giữ nguyên nội dung chuyển khoản để đối soát chính xác.</p>
              </div>
            </Card>
          </div>

          {/* Past Invoices Archive */}
          <Card padding="p-0" className="overflow-hidden">
            <div className="p-4 bg-surface-neutral hairline-b">
              <h3 className="text-sm font-semibold text-text-primary">Lịch sử biên lai thu học phí các tháng trước</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-neutral text-text-secondary font-medium hairline-b">
                  <tr>
                    <th className="py-3 px-4">Kỳ thu</th>
                    <th className="py-3 px-4">Số tiền</th>
                    <th className="py-3 px-4">Mã biên lai điện tử</th>
                    <th className="py-3 px-4">Ngày thanh toán</th>
                    <th className="py-3 px-4">Phương thức</th>
                    <th className="py-3 px-3 text-center">Trạng thái</th>
                    <th className="py-3 px-4 text-center">Biên lai</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {invoicesData?.pastInvoices?.map((inv) => (
                    <tr key={inv.id} className="hover:bg-sky/20 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-text-primary">{inv.period}</td>
                      <td className="py-3.5 px-4 font-bold text-primary font-mono">{inv.total} đ</td>
                      <td className="py-3.5 px-4 font-mono text-ocean">{inv.receiptNo}</td>
                      <td className="py-3.5 px-4 text-text-secondary">{inv.paidAt}</td>
                      <td className="py-3.5 px-4 text-text-secondary">{inv.paymentMethod}</td>
                      <td className="py-3.5 px-3 text-center">
                        <Badge variant="success" size="sm">Đã thanh toán</Badge>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            setSelectedReceipt({
                              receiptNo: inv.receiptNo,
                              period: inv.period,
                              studentName: currentChild.name,
                              studentCode: currentChild.code,
                              className: currentChild.class,
                              total: inv.total,
                              paidAt: inv.paidAt,
                              method: inv.paymentMethod,
                              items: inv.items,
                            })
                          }
                        >
                          Xem chi tiết
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: NOTICES                                                            */}
      {/* ========================================================================= */}
      {activeTab === 'notices' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-medium text-text-primary">Thông báo nhà trường & Sổ liên lạc</h2>
              <p className="text-xs text-text-secondary mt-1">
                Tất cả văn bản thông báo, lịch họp, kế hoạch học tập và thư ngỏ từ Ban Giám Hiệu.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {['all', 'Cần phản hồi', 'Chúc mừng', 'Kế hoạch trường'].map((tag) => (
                <button
                  key={tag}
                  onClick={() => setNoticeFilter(tag)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    noticeFilter === tag
                      ? 'bg-primary text-white'
                      : 'bg-surface-neutral text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {tag === 'all' ? 'Tất cả' : tag}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {data.notifications
              .filter((n) => noticeFilter === 'all' || n.tag === noticeFilter)
              .map((notif) => (
                <Card key={notif.id} padding="p-6" className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={notif.tagType}>{notif.tag}</Badge>
                      <span className="text-xs text-text-secondary">• {notif.time}</span>
                    </div>
                    <span className="text-xs font-semibold text-ocean">{notif.sender}</span>
                  </div>

                  <h3 className="text-base font-semibold text-text-primary">{notif.title}</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">{notif.content}</p>

                  <div className="pt-3 hairline-t flex items-center justify-between">
                    <span className="text-[11px] text-text-secondary">Kênh phát: Cổng thông tin điện tử</span>
                    {notif.canConfirm && (
                      <Button
                        variant={notif.confirmed ? 'secondary' : 'primary'}
                        size="sm"
                        onClick={() => handleToggleMeetingConfirm(notif.id)}
                      >
                        {notif.confirmed ? '✓ Đã xác nhận tham dự họp' : 'Xác nhận tham dự'}
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: MESSAGES WITH TEACHER                                              */}
      {/* ========================================================================= */}
      {activeTab === 'messages' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-medium text-text-primary">Trao đổi với Giáo viên Chủ nhiệm</h2>
              <p className="text-xs text-text-secondary mt-1">
                Kênh liên lạc trực tiếp hai chiều giữa gia đình và cô {currentChild.gvcn}.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <Phone className="w-4 h-4 text-ocean" />
              <span>Hotline GVCN: <strong className="text-text-primary">0987 654 321</strong></span>
            </div>
          </div>

          {/* Chat Window */}
          <Card padding="p-0" className="flex flex-col h-[520px] overflow-hidden">
            {/* Chat header */}
            <div className="p-4 bg-surface-neutral hairline-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center font-semibold text-sm">
                  👩‍🏫
                </div>
                <div>
                  <div className="text-xs font-semibold text-text-primary">{currentChild.gvcn}</div>
                  <div className="text-[11px] text-text-secondary">
                    Giáo viên Chủ nhiệm • Lớp {currentChild.class.split('•')[0]}
                  </div>
                </div>
              </div>
              <Badge variant="success" size="sm">Đang trực tuyến</Badge>
            </div>

            {/* Messages Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#F9FAFC]">
              {messages.map((msg) => {
                const isMe = msg.sender_role === 'parent';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div className="text-[10px] text-text-secondary mb-1">
                      {msg.sender_name}
                    </div>
                    <div
                      className={`p-3 rounded-card text-xs max-w-md leading-relaxed ${
                        isMe
                          ? 'bg-primary text-white rounded-br-none'
                          : 'bg-white border border-hairline text-text-primary rounded-bl-none shadow-whisper'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick action chips */}
            <div className="p-2.5 bg-white hairline-t flex items-center gap-2 overflow-x-auto">
              {[
                'Xin phép đón con muộn 15 phút hôm nay ạ.',
                'Gia đình đã gửi đơn xin nghỉ học, nhờ cô duyệt giúp ạ.',
                'Nhờ cô nhắc cháu uống thuốc sau giờ ăn trưa giúp gia đình.',
              ].map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(chip)}
                  className="px-2.5 py-1 bg-surface-neutral hover:bg-sky text-text-secondary hover:text-primary rounded text-[11px] whitespace-nowrap transition-colors border border-hairline"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Input composer */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-3 bg-white hairline-t flex items-center gap-3"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Nhập lời nhắn gửi tới Giáo viên Chủ nhiệm..."
                className="flex-1 px-3.5 py-2.5 text-xs bg-surface-neutral border border-hairline rounded focus:outline-none focus:border-ocean text-text-primary"
              />
              <Button
                variant="primary"
                size="md"
                icon={Send}
                disabled={isSendingMsg || !chatInput.trim()}
              >
                Gửi
              </Button>
            </form>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: VIETQR NAPAS PAYMENT MODAL                                       */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        title="Thanh toán học phí qua chuẩn VietQR Napas 24/7"
      >
        <div className="space-y-4 text-center">
          <p className="text-xs text-text-secondary">
            Mở ứng dụng ngân hàng bất kỳ (Vietcombank, MB, Techcombank, BIDV...) và quét mã QR bên dưới:
          </p>

          {/* QR Code Graphic */}
          <div className="p-4 bg-white border-2 border-hairline rounded-card inline-block mx-auto shadow-whisper">
            <div className="w-56 h-56 bg-surface-neutral border border-hairline flex flex-col items-center justify-between p-2">
              <div className="flex items-center justify-between w-full px-2 text-[10px] font-bold text-blue-900 border-b pb-1">
                <span>VIETQR</span>
                <span>NAPAS 247</span>
              </div>
              {/* Crisp Scalable Vector QR */}
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
                <rect x="35" y="10" width="8" height="8" fill="#0F3D5C" />
                <rect x="50" y="15" width="8" height="8" fill="#0F3D5C" />
                <rect x="35" y="35" width="30" height="30" fill="#0F3D5C" />
                <rect x="42" y="42" width="16" height="16" fill="#ffffff" />
                <circle cx="50" cy="50" r="4" fill="#0F3D5C" />
                <rect x="10" y="40" width="8" height="8" fill="#0F3D5C" />
                <rect x="75" y="40" width="15" height="8" fill="#0F3D5C" />
                <rect x="40" y="75" width="18" height="8" fill="#0F3D5C" />
                <rect x="65" y="70" width="25" height="20" fill="#0F3D5C" />
              </svg>
              <span className="text-[10px] text-text-secondary font-mono font-semibold">
                {currentChild.tuition.total} VNĐ
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-surface-neutral rounded text-left text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-text-secondary">Ngân hàng thụ hưởng:</span>
              <span className="font-semibold text-text-primary">Vietcombank</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-secondary">Số tài khoản:</span>
              <span className="font-mono font-bold text-primary flex items-center gap-1">
                <span>{currentChild.tuition.qrInfo.accountNumber}</span>
                <button onClick={handleCopyAccount} className="p-1 hover:bg-hairline rounded text-ocean">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Tên chủ tài khoản:</span>
              <span className="font-semibold text-text-primary">{currentChild.tuition.qrInfo.accountName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-secondary">Nội dung chuyển khoản:</span>
              <span className="font-mono font-medium text-ocean flex items-center gap-1">
                <span>{currentChild.tuition.qrInfo.description}</span>
                <button onClick={handleCopyMemo} className="p-1 hover:bg-hairline rounded text-ocean">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </span>
            </div>
          </div>

          {copiedBank && (
            <p className="text-xs text-success font-medium">✓ Đã sao chép số tài khoản vào clipboard!</p>
          )}
          {copiedMemo && (
            <p className="text-xs text-success font-medium">✓ Đã sao chép nội dung chuyển khoản!</p>
          )}

          <div className="flex justify-center pt-2">
            <Button
              variant="primary"
              size="md"
              className="w-full justify-center"
              onClick={handleConfirmPayment}
            >
              {paymentSuccess ? '✓ Đã ghi nhận giao dịch thành công!' : 'Tôi đã thanh toán chuyển khoản'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: CREATE LEAVE REQUEST MODAL                                       */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        title="Tạo đơn xin nghỉ học trực tuyến (e-Leave)"
      >
        <form onSubmit={handleSubmitLeave} className="space-y-4 text-xs">
          <div className="p-3 bg-surface-neutral rounded border border-hairline">
            <div className="text-text-secondary">Học sinh xin phép:</div>
            <div className="font-semibold text-text-primary text-sm mt-0.5">
              {currentChild.name} • {currentChild.class}
            </div>
            <div className="text-[11px] text-text-secondary">GVCN tiếp nhận: {currentChild.gvcn}</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-secondary mb-1 font-medium">Từ ngày (*)</label>
              <input
                type="date"
                required
                value={leaveStartDate}
                onChange={(e) => {
                  setLeaveStartDate(e.target.value);
                  if (!leaveEndDate) setLeaveEndDate(e.target.value);
                }}
                className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean"
              />
            </div>
            <div>
              <label className="block text-text-secondary mb-1 font-medium">Đến ngày (*)</label>
              <input
                type="date"
                required
                value={leaveEndDate}
                onChange={(e) => setLeaveEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean"
              />
            </div>
          </div>

          <div>
            <label className="block text-text-secondary mb-1 font-medium">Lý do xin nghỉ (*)</label>
            <select
              value={leaveReasonType}
              onChange={(e) => setLeaveReasonType(e.target.value)}
              className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean"
            >
              <option value="Bệnh/Sức khỏe">Bệnh / Sức khỏe không đảm bảo</option>
              <option value="Việc gia đình">Việc bận gia đình đột xuất</option>
              <option value="Hoạt động năng khiếu ngoài trường">Tham gia sự kiện / Thi năng khiếu</option>
              <option value="Lý do khác">Lý do đặc biệt khác</option>
            </select>
          </div>

          <div>
            <label className="block text-text-secondary mb-1 font-medium">Chi tiết lý do & Lời nhắn gửi thầy/cô (*)</label>
            <textarea
              rows={3}
              required
              value={leaveDetail}
              onChange={(e) => setLeaveDetail(e.target.value)}
              placeholder="Ghi rõ triệu chứng sốt/ốm hoặc lý do để thầy cô nắm thông tin và phối hợp hỗ trợ bài vở cho học sinh..."
              className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean"
            />
          </div>

          <div>
            <label className="block text-text-secondary mb-1 font-medium">Số điện thoại liên hệ khẩn cấp của phụ huynh</label>
            <input
              type="text"
              value={leavePhone}
              onChange={(e) => setLeavePhone(e.target.value)}
              className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean font-mono"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setIsLeaveModalOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSubmittingLeave}
            >
              {isSubmittingLeave ? 'Đang gửi...' : 'Gửi đơn tới GVCN'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: ELECTRONIC RECEIPT PREVIEW MODAL                                 */}
      {/* ========================================================================= */}
      {selectedReceipt && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedReceipt(null)}
          title="Biên lai thu tiền học phí điện tử"
        >
          <div className="space-y-4 text-xs">
            <div className="text-center hairline-b pb-3 space-y-1">
              <div className="font-bold text-base text-primary">TRƯỜNG THCS & THPT KHỞI HOÀN</div>
              <div className="text-[11px] text-text-secondary">Hệ thống quản trị tài chính số & Kế toán học đường</div>
              <div className="font-mono text-ocean font-semibold mt-1">Số: {selectedReceipt.receiptNo}</div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-text-secondary">Học sinh:</span>
                <span className="font-semibold text-text-primary">{selectedReceipt.studentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Mã định danh / Lớp:</span>
                <span className="font-mono text-text-primary">{selectedReceipt.studentCode} • {selectedReceipt.className}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Kỳ thu:</span>
                <span className="font-medium text-text-primary">{selectedReceipt.period}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Phương thức:</span>
                <span className="text-text-primary">{selectedReceipt.method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Thời gian xác thực:</span>
                <span className="text-text-primary">{selectedReceipt.paidAt}</span>
              </div>
            </div>

            <div className="divide-y divide-hairline bg-surface-neutral/40 p-3 rounded border border-hairline">
              {selectedReceipt.items?.map((it, idx) => (
                <div key={idx} className="py-1.5 flex justify-between">
                  <span className="text-text-secondary">{it.label}</span>
                  <span className="font-semibold text-text-primary">{it.amount}</span>
                </div>
              ))}
              <div className="pt-2 flex justify-between font-bold text-sm text-primary">
                <span>Tổng cộng:</span>
                <span>{selectedReceipt.total} đ</span>
              </div>
            </div>

            {/* Electronic Stamp Badge */}
            <div className="p-3 bg-emerald-50 rounded border border-emerald-200 text-center space-y-0.5">
              <div className="text-emerald-800 font-bold flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-success" />
                <span>CHỨNG TỪ ĐÃ KÝ SỐ XÁC THỰC</span>
              </div>
              <div className="text-[10px] text-emerald-700">Mã tra cứu biên lai thuế điện tử: VN-NAPAS-{Date.now().toString().slice(-8)}</div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="md" icon={Printer} onClick={() => window.print()}>
                In biên lai
              </Button>
              <Button variant="primary" size="md" onClick={() => setSelectedReceipt(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

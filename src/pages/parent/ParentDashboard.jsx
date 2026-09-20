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
} from 'lucide-react';

export function ParentDashboard({ activeTab = 'home', onTabChange }) {
  const { lastSync, triggerSync } = useSync();
  const [data, setData] = useState(PARENT_DASHBOARD_DATA);
  const [selectedChildId, setSelectedChildId] = useState(data.currentChildId);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [hasConfirmedMeeting, setHasConfirmedMeeting] = useState(false);
  const [copiedBank, setCopiedBank] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;
    parentApi.getChildrenData().then((res) => {
      if (mounted && res) {
        setData(res);
      }
    });
    return () => {
      mounted = false;
    };
  }, [lastSync]);

  const currentChild = data.children.find((c) => c.id === selectedChildId) || data.children[0];

  const handleCopyAccount = () => {
    navigator.clipboard?.writeText?.(currentChild.tuition.qrInfo.accountNumber);
    setCopiedBank(true);
    setTimeout(() => setCopiedBank(false), 2000);
  };

  const handleConfirmPayment = async () => {
    try {
      await parentApi.payTuition(1);
      await triggerSync();
      setPaymentSuccess(true);
      // Reload fresh children data
      const updated = await parentApi.getChildrenData();
      if (updated) setData(updated);
    } finally {
      setTimeout(() => {
        setIsQrModalOpen(false);
        setPaymentSuccess(false);
      }, 1000);
    }
  };

  const handleToggleMeetingConfirm = async () => {
    const nextState = !hasConfirmedMeeting;
    setHasConfirmedMeeting(nextState);
    if (nextState) {
      await parentApi.confirmNotice(1);
      await triggerSync();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Academic Term & Multi-child Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 hairline-b pb-4">
        <div>
          <div className="text-xs text-text-secondary flex items-center gap-2">
            <span>Học kỳ I • 2024 - 2025</span>
            <span>•</span>
            <span className="text-text-primary font-medium">Trường THCS & THPT Khởi Hoàn</span>
          </div>
          <h1 className="text-2xl font-medium text-text-primary mt-1">
            Theo dõi học tập của con
          </h1>
        </div>

        {/* Multi-child selector card buttons */}
        <div className="flex items-center gap-2">
          {data.children.map((child) => {
            const isSelected = child.id === selectedChildId;
            return (
              <button
                key={child.id}
                onClick={() => setSelectedChildId(child.id)}
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

      {/* Child Summary Profile & 3 Academic Stat Cards */}
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
          <Card padding="p-5">
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

          <Card padding="p-5">
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

          <Card padding="p-5">
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
              <button className="text-xs font-medium text-ocean hover:underline flex items-center gap-1">
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
              <Badge variant="neutral">Hôm nay & Ngày mai</Badge>
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
              <a
                href="#exam"
                onClick={(e) => e.preventDefault()}
                className="text-xs font-semibold text-ocean hover:underline whitespace-nowrap"
              >
                {currentChild.examAlert.linkText}
              </a>
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
              <Badge variant="warning">{currentChild.tuition.countdown}</Badge>
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
            <Button
              variant="primary"
              size="lg"
              className="w-full justify-center bg-primary hover:bg-ocean text-white"
              icon={QrCode}
              onClick={() => setIsQrModalOpen(true)}
            >
              Thanh toán ngay bằng VietQR / Napas
            </Button>

            <div className="flex items-center justify-between text-[11px] text-text-secondary pt-1">
              <div className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-success" />
                <span>Bảo mật qua cổng ngân hàng</span>
              </div>
              <a href="#history" onClick={(e) => e.preventDefault()} className="text-ocean hover:underline flex items-center gap-1">
                <span>Lịch sử biên lai điện tử</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </Card>

          {/* School Notifications */}
          <Card padding="p-6" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary stroke-[1.75]" />
                <h2 className="text-base font-medium text-text-primary">Thông báo từ nhà trường</h2>
              </div>
              <Badge variant="info">3 mới</Badge>
            </div>

            <div className="space-y-3">
              {data.notifications.map((notif) => (
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
                        onClick={handleToggleMeetingConfirm}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                          hasConfirmedMeeting
                            ? 'bg-success text-white'
                            : 'bg-primary text-white hover:bg-ocean'
                        }`}
                      >
                        {hasConfirmedMeeting ? '✓ Đã xác nhận tham dự' : 'Xác nhận tham dự'}
                      </button>
                    ) : (
                      <span className="text-ocean hover:underline cursor-pointer">
                        {notif.linkText}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* VietQR Payment Modal */}
      <Modal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        title="Thanh toán học phí qua chuẩn VietQR Napas"
      >
        <div className="space-y-4 text-center">
          <p className="text-xs text-text-secondary">
            Mở ứng dụng ngân hàng bất kỳ (Vietcombank, MB, Techcombank, BIDV...) và quét mã QR bên dưới:
          </p>

          {/* QR Code Graphic */}
          <div className="p-4 bg-white border-2 border-hairline rounded-card inline-block mx-auto shadow-whisper">
            <div className="w-56 h-56 bg-surface-neutral border border-hairline flex flex-col items-center justify-center p-2 relative">
              {/* Simulated crisp QR code with VietQR Napas branding */}
              <div className="w-full h-full bg-white p-2 border border-hairline flex flex-col items-center justify-between">
                <div className="flex items-center justify-between w-full px-2 text-[10px] font-bold text-blue-900 border-b pb-1">
                  <span>VIETQR</span>
                  <span>NAPAS 247</span>
                </div>
                {/* SVG pattern representing realistic QR */}
                <svg className="w-36 h-36" viewBox="0 0 100 100">
                  <rect width="100" height="100" fill="#ffffff" />
                  {/* Corners */}
                  <rect x="5" y="5" width="25" height="25" fill="#0F3D5C" />
                  <rect x="9" y="9" width="17" height="17" fill="#ffffff" />
                  <rect x="13" y="13" width="9" height="9" fill="#0F3D5C" />

                  <rect x="70" y="5" width="25" height="25" fill="#0F3D5C" />
                  <rect x="74" y="9" width="17" height="17" fill="#ffffff" />
                  <rect x="78" y="13" width="9" height="9" fill="#0F3D5C" />

                  <rect x="5" y="70" width="25" height="25" fill="#0F3D5C" />
                  <rect x="9" y="74" width="17" height="17" fill="#ffffff" />
                  <rect x="13" y="78" width="9" height="9" fill="#0F3D5C" />

                  {/* Body dots */}
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
                <span className="text-[10px] text-text-secondary font-mono">
                  {currentChild.tuition.total} VNĐ
                </span>
              </div>
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
                <button
                  onClick={handleCopyAccount}
                  className="p-1 hover:bg-hairline rounded text-ocean"
                  title="Sao chép"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Tên chủ tài khoản:</span>
              <span className="font-semibold text-text-primary">{currentChild.tuition.qrInfo.accountName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Nội dung chuyển khoản:</span>
              <span className="font-mono font-medium text-ocean">{currentChild.tuition.qrInfo.description}</span>
            </div>
          </div>

          {copiedBank && (
            <p className="text-xs text-success font-medium">✓ Đã sao chép số tài khoản vào clipboard!</p>
          )}

          <div className="flex justify-center pt-2">
            <Button
              variant="primary"
              size="md"
              className="w-full justify-center"
              onClick={handleConfirmPayment}
            >
              {paymentSuccess ? '✓ Đã ghi nhận giao dịch!' : 'Tôi đã thanh toán chuyển khoản'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

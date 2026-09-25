/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// =============================================================================
// ParentLeaveRequestPage — Leave request form and history
// Phase 13: Extracted from ParentDashboard.jsx (Tab: leave)
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { useChildSwitcher } from './useChildSwitcher';
import { ChildSwitcher } from './ChildSwitcher';
import { parentApi } from '../../services/api';
import { CheckCircle2, AlertCircle, Loader2, Plus, FileCheck } from 'lucide-react';

interface LeaveRequest {
  id: string;
  start_date: string;
  end_date: string;
  reason_type?: string;
  reason_detail?: string;
  status: string;
  teacher_note?: string;
  created_at?: string;
}

interface AttendanceData {
  rate?: string;
  presentDays?: number;
  totalDays?: number;
  absentDays?: number;
  excusedDays?: number;
  lateDays?: number;
}

export function ParentLeaveRequestPage() {
  const { children, selectedChild, selectedChildId, isLoading: loadingChildren, error: errorChildren, selectChild } = useChildSwitcher();

  const [attendance, setAttendance] = useState<AttendanceData | null>(null);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [errorData, setErrorData] = useState<string | null>(null);

  // Leave form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [leaveReasonType, setLeaveReasonType] = useState('Bệnh/Sức khỏe');
  const [leaveDetail, setLeaveDetail] = useState('');
  const [leavePhone, setLeavePhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  const loadData = useCallback(async (childId: string) => {
    setIsLoadingData(true);
    setErrorData(null);
    try {
      const [attRes, lrRes] = await Promise.allSettled([
        parentApi.getAttendance<AttendanceData>(childId),
        parentApi.getLeaveRequests(childId),
      ]);

      if (attRes.status === 'fulfilled' && attRes.value) {
        setAttendance(attRes.value as AttendanceData);
      }
      if (lrRes.status === 'fulfilled') {
        setLeaveRequests(lrRes.value as LeaveRequest[]);
      }
    } catch (_err) {
      setErrorData('Không thể tải dữ liệu.');
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (selectedChildId) {
      loadData(selectedChildId);
    }
  }, [selectedChildId, loadData]);

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveStartDate || !leaveEndDate || !leaveDetail.trim()) {
      showToast('Vui lòng nhập đầy đủ thông tin đơn nghỉ học.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await parentApi.submitLeaveRequest({
        studentId: selectedChildId,
        startDate: leaveStartDate,
        endDate: leaveEndDate,
        reasonType: leaveReasonType,
        reasonDetail: leaveDetail,
        emergencyPhone: leavePhone,
      });
      if (res?.success) {
        showToast('Đơn xin nghỉ học đã được gửi tới Giáo viên Chủ nhiệm!');
        setIsModalOpen(false);
        setLeaveDetail(''); setLeaveStartDate(''); setLeaveEndDate('');
        // Reload list
        const updated = await parentApi.getLeaveRequests(selectedChildId!);
        setLeaveRequests(updated);
      }
    } catch (_err) {
      showToast('Gửi đơn thất bại. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const attendanceRate = attendance?.rate || '—';

  return (
    <div className="space-y-6">
      {/* Toast */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-primary text-white px-5 py-3 rounded-card shadow-whisper flex items-center gap-3 border border-ocean/30 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
          <span className="text-xs font-medium">{feedbackToast}</span>
        </div>
      )}

      {errorData && (
        <div className="p-4 bg-danger/10 border border-danger/30 rounded-card flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-danger shrink-0" />
          <span className="text-sm text-danger">{errorData}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <div className="text-xs text-text-secondary mb-1">Đơn xin nghỉ học</div>
        <ChildSwitcher
          children={children}
          selectedChild={selectedChild}
          onSelect={selectChild}
        />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-medium text-text-primary">Đơn xin nghỉ học</h2>
          <p className="text-xs text-text-secondary mt-1">Quản lý đơn xin nghỉ phép của {selectedChild.name}</p>
        </div>
        <Button variant="primary" size="md" icon={Plus} onClick={() => setIsModalOpen(true)}>
          Tạo đơn mới
        </Button>
      </div>

      {/* Attendance Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card padding="p-5">
          <div className="text-xs text-text-secondary">Tỷ lệ chuyên cần</div>
          <div className="text-3xl font-semibold text-primary mt-1">{attendanceRate}</div>
          <div className="text-xs text-success mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{attendance ? `${attendance.presentDays}/${attendance.totalDays} buổi` : '—'}</span>
          </div>
        </Card>
        <Card padding="p-5">
          <div className="text-xs text-text-secondary">Nghỉ có phép</div>
          <div className="text-3xl font-semibold text-ocean mt-1">{attendance?.excusedDays ?? 0} buổi</div>
          <div className="text-xs text-text-secondary mt-2">Đã được GVCN duyệt</div>
        </Card>
        <Card padding="p-5">
          <div className="text-xs text-text-secondary">Vắng không phép</div>
          <div className={`text-3xl font-semibold mt-1 ${(attendance?.absentDays ?? 0) > 0 ? 'text-danger' : 'text-success'}`}>
            {attendance?.absentDays ?? 0} buổi
          </div>
          <div className="text-xs text-text-secondary mt-2">{(attendance?.absentDays ?? 0) > 0 ? 'Cần giải trình' : 'Không vi phạm'}</div>
        </Card>
      </div>

      {/* Leave Requests Table */}
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
              {isLoadingData ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center">
                    <div className="flex justify-center"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
                  </td>
                </tr>
              ) : leaveRequests.length > 0 ? leaveRequests.map((req) => (
                <tr key={req.id} className="hover:bg-sky/20 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-medium text-text-primary">
                    {req.start_date === req.end_date
                      ? req.start_date
                      : `${req.start_date} → ${req.end_date}`}
                  </td>
                  <td className="py-3.5 px-4 text-text-secondary">
                    {req.reason_type}: {req.reason_detail}
                  </td>
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
                    <FileCheck className="w-8 h-8 text-hairline mx-auto mb-2" />
                    Chưa có đơn xin nghỉ học nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Leave Request Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Tạo đơn xin nghỉ học">
        <form onSubmit={handleSubmitLeave} className="space-y-4 text-xs">
          <div className="p-3 bg-surface-neutral rounded border border-hairline">
            <div className="text-text-secondary">Học sinh:</div>
            <div className="font-semibold text-text-primary text-sm mt-0.5">{selectedChild.name} • {selectedChild.class}</div>
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
            <Button type="button" variant="secondary" size="md" onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button type="submit" variant="primary" size="md" disabled={isSubmitting}>
              {isSubmitting ? 'Đang gửi...' : 'Gửi đơn tới GVCN'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

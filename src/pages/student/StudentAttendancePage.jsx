import React, { useState, useEffect } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { studentApi } from '../../services/api';
import {
  UserCheck,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ShieldCheck,
  TrendingUp,
  Download,
  Filter,
  Info,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export function StudentAttendancePage() {
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    studentApi.getAttendance().then((res) => {
      if (mounted) {
        setAttendance(
          res || {
            rate: '98.5%',
            totalDays: 90,
            presentDays: 89,
            absentDays: 1,
            lateDays: 0,
            status: 'Xuất sắc',
            records: [
              { date: '2026-09-20', day: 'Thứ Sáu', time: '07:15', status: 'present', gate: 'Cổng chính A', note: 'Đúng giờ' },
              { date: '2026-09-19', day: 'Thứ Năm', time: '07:18', status: 'present', gate: 'Cổng chính A', note: 'Đúng giờ' },
              { date: '2026-09-18', day: 'Thứ Tư', time: '07:22', status: 'present', gate: 'Cổng chính A', note: 'Đúng giờ' },
              { date: '2026-09-17', day: 'Thứ Ba', time: '07:12', status: 'present', gate: 'Cổng phụ B', note: 'Đúng giờ' },
              { date: '2026-09-16', day: 'Thứ Hai', time: '07:20', status: 'present', gate: 'Cổng chính A', note: 'Đúng giờ' },
              { date: '2026-09-13', day: 'Thứ Sáu', time: '07:10', status: 'present', gate: 'Cổng chính A', note: 'Đúng giờ' },
              { date: '2026-09-12', day: 'Thứ Năm', time: '07:25', status: 'present', gate: 'Cổng chính A', note: 'Đúng giờ' },
              { date: '2026-09-11', day: 'Thứ Tư', time: '--:--', status: 'excused', gate: 'Sổ phép online', note: 'Nghỉ ốm có phép (PH đã gửi đơn)' },
              { date: '2026-09-10', day: 'Thứ Ba', time: '07:14', status: 'present', gate: 'Cổng chính A', note: 'Đúng giờ' },
              { date: '2026-09-09', day: 'Thứ Hai', time: '07:35', status: 'late', gate: 'Cổng chính A', note: 'Đi muộn 5 phút do kẹt xe' },
            ],
          }
        );
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const records = attendance?.records || [
    { date: '2026-09-20', day: 'Thứ Sáu', time: '07:15', status: 'present', gate: 'Cổng chính A', note: 'Đúng giờ' },
    { date: '2026-09-19', day: 'Thứ Năm', time: '07:18', status: 'present', gate: 'Cổng chính A', note: 'Đúng giờ' },
    { date: '2026-09-18', day: 'Thứ Tư', time: '07:22', status: 'present', gate: 'Cổng chính A', note: 'Đúng giờ' },
    { date: '2026-09-17', day: 'Thứ Ba', time: '07:12', status: 'present', gate: 'Cổng phụ B', note: 'Đúng giờ' },
    { date: '2026-09-16', day: 'Thứ Hai', time: '07:20', status: 'present', gate: 'Cổng chính A', note: 'Đúng giờ' },
    { date: '2026-09-13', day: 'Thứ Sáu', time: '07:10', status: 'present', gate: 'Cổng chính A', note: 'Đúng giờ' },
    { date: '2026-09-12', day: 'Thứ Năm', time: '07:25', status: 'present', gate: 'Cổng chính A', note: 'Đúng giờ' },
    { date: '2026-09-11', day: 'Thứ Tư', time: '--:--', status: 'excused', gate: 'Sổ phép online', note: 'Nghỉ ốm có phép (PH đã gửi đơn)' },
    { date: '2026-09-10', day: 'Thứ Ba', time: '07:14', status: 'present', gate: 'Cổng chính A', note: 'Đúng giờ' },
    { date: '2026-09-09', day: 'Thứ Hai', time: '07:35', status: 'late', gate: 'Cổng chính A', note: 'Đi muộn 5 phút do kẹt xe' },
  ];

  const filteredRecords = records.filter((r) => {
    if (filterStatus === 'present') return r.status === 'present';
    if (filterStatus === 'late') return r.status === 'late';
    if (filterStatus === 'excused') return r.status === 'excused';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-medium text-text-primary">Sổ theo dõi chuyên cần & Điểm danh</h1>
            <Badge variant="success">Chuyên cần Xuất sắc</Badge>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Ghi nhận tự động từ cổng thẻ từ RFID thông minh & xác thực Giáo viên Chủ nhiệm
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="secondary" size="sm" icon={Download} onClick={() => window.print()}>
            Xuất báo cáo PDF
          </Button>
          <Button variant="primary" size="sm" icon={FileText} onClick={() => setIsLeaveModalOpen(true)}>
            Quy định nghỉ phép
          </Button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="p-5" className="flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase">Tỷ lệ chuyên cần</span>
            <Badge variant="success">98.5%</Badge>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-primary">98.5%</div>
            <div className="text-xs text-text-secondary mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span>Cao hơn 4.2% so với mặt bằng toàn khối</span>
            </div>
          </div>
        </Card>

        <Card padding="p-5" className="flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase">Buổi học thực tế</span>
            <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-text-primary">
              88 <span className="text-sm font-normal text-text-secondary">/ 90 buổi</span>
            </div>
            <div className="text-xs text-emerald-700 mt-1">Đúng giờ 88 buổi (97.7%)</div>
          </div>
        </Card>

        <Card padding="p-5" className="flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase">Đi muộn</span>
            <Badge variant="warning">01 buổi</Badge>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-amber-700">01 <span className="text-sm font-normal text-text-secondary">buổi</span></div>
            <div className="text-xs text-text-secondary mt-1">Đã có biên bản giải trình kẹt xe</div>
          </div>
        </Card>

        <Card padding="p-5" className="flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase">Nghỉ phép</span>
            <Badge variant="info">01 buổi có phép</Badge>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-ocean">01 <span className="text-sm font-normal text-text-secondary">buổi</span></div>
            <div className="text-xs text-emerald-700 mt-1">0 buổi không phép (Tuân thủ tốt)</div>
          </div>
        </Card>
      </div>

      {/* Attendance History Table Card */}
      <Card padding="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-hairline mb-5">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Nhật ký điểm danh tháng 09/2026</h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Dữ liệu được cập nhật tức thì mỗi khi học sinh quét thẻ từ tại cổng trường
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-text-secondary" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs border border-hairline rounded px-3 py-1.5 bg-white text-text-primary focus:outline-none focus:border-ocean"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="present">Chỉ xem đúng giờ</option>
              <option value="late">Chỉ xem đi muộn</option>
              <option value="excused">Chỉ xem nghỉ có phép</option>
            </select>
          </div>
        </div>

        {/* Records Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-hairline bg-surface-neutral/60 text-text-secondary font-medium uppercase tracking-wider">
                <th className="py-3 px-4">Ngày ghi nhận</th>
                <th className="py-3 px-4">Thứ</th>
                <th className="py-3 px-4">Giờ check-in</th>
                <th className="py-3 px-4">Điểm quét</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4">Ghi chú xác nhận</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {filteredRecords.map((item, idx) => {
                let badgeVariant = 'success';
                let badgeLabel = 'Đúng giờ';
                if (item.status === 'late') {
                  badgeVariant = 'warning';
                  badgeLabel = 'Đi muộn';
                } else if (item.status === 'excused') {
                  badgeVariant = 'info';
                  badgeLabel = 'Nghỉ có phép';
                }

                return (
                  <tr key={idx} className="hover:bg-sky/5 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-text-primary">{item.date}</td>
                    <td className="py-3.5 px-4 text-text-secondary">{item.day}</td>
                    <td className="py-3.5 px-4 font-mono text-text-primary flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-text-secondary" />
                      <span>{item.time}</span>
                    </td>
                    <td className="py-3.5 px-4 text-text-secondary">{item.gate}</td>
                    <td className="py-3.5 px-4">
                      <Badge variant={badgeVariant}>{badgeLabel}</Badge>
                    </td>
                    <td className="py-3.5 px-4 text-text-secondary max-w-xs truncate">{item.note}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Policy Modal */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-card max-w-md w-full p-6 shadow-xl border border-hairline space-y-4">
            <div className="flex items-start justify-between border-b border-hairline pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-ocean" />
                <h3 className="text-lg font-bold text-text-primary">Quy định Chuyên cần & Điểm danh</h3>
              </div>
              <button
                onClick={() => setIsLeaveModalOpen(false)}
                className="text-text-secondary hover:text-text-primary p-1 rounded hover:bg-surface-neutral"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-text-secondary leading-relaxed">
              <div className="p-3 bg-sky/20 rounded border border-ocean/20 text-primary">
                <strong>Quy định giờ giấc:</strong> Học sinh phải có mặt tại cổng trường trước <strong>07:15</strong> sáng và hoàn tất quẹt thẻ RFID trước khi chuông vào lớp reo lúc <strong>07:30</strong>.
              </div>
              <p>
                1. Điểm danh đi muộn được ghi nhận khi học sinh quẹt thẻ sau 07:30. Quá 3 lần đi muộn trong tháng sẽ bị hạ một bậc xếp loại thi đua tháng.
              </p>
              <p>
                2. Học sinh nghỉ ốm hoặc có việc gia đình đột xuất cần thông báo phụ huynh nộp đơn xin nghỉ học trực tuyến qua <strong>Cổng Phụ Huynh (EduPortal Parent)</strong> trước 07:00 sáng ngày nghỉ.
              </p>
              <p>
                3. Nghỉ không phép quá 3 ngày trong học kỳ sẽ bị xử lý kỷ luật theo thông tư của Bộ GD&ĐT.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-hairline">
              <Button variant="primary" size="sm" onClick={() => setIsLeaveModalOpen(false)}>
                Tôi đã hiểu quy định
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

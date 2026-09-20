import React, { useState, useEffect } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { ADMIN_DASHBOARD_DATA } from '../../mock/adminData';
import { adminApi } from '../../services/api';
import { useSync } from '../../context/SyncContext';
import {
  Users,
  Briefcase,
  Layers,
  Award,
  TrendingUp,
  Download,
  Bell,
  AlertTriangle,
  Clock,
  ShieldCheck,
  RefreshCw,
  FileText,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';

export function AdminDashboard() {
  const { lastSync, triggerSync } = useSync();
  const [data, setData] = useState(ADMIN_DASHBOARD_DATA);
  const [selectedYear, setSelectedYear] = useState('Năm học 2024 - 2025');
  const [selectedTerm, setSelectedTerm] = useState('Học kỳ II (Hiện tại)');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastSent, setBroadcastSent] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastContent, setBroadcastContent] = useState('');

  useEffect(() => {
    let mounted = true;
    adminApi.getOverview().then((res) => {
      if (mounted && res) {
        setData(res);
      }
    });
    return () => {
      mounted = false;
    };
  }, [lastSync]);

  const handleSyncMoet = async () => {
    setIsSyncing(true);
    try {
      await adminApi.syncMoet();
      await triggerSync();
      setSyncSuccess(true);
      const res = await adminApi.getOverview();
      if (res) setData(res);
      setTimeout(() => setSyncSuccess(false), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    setBroadcastSent(true);
    try {
      await adminApi.broadcastNotice(broadcastTitle || 'Thông báo từ Ban Giám Hiệu', broadcastContent);
      await triggerSync();
      const res = await adminApi.getOverview();
      if (res) setData(res);
      setTimeout(() => {
        setBroadcastSent(false);
        setIsBroadcastModalOpen(false);
        setBroadcastTitle('');
        setBroadcastContent('');
      }, 1500);
    } catch {
      setBroadcastSent(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Executive Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-text-secondary mb-1">
            <span>Ban Giám Hiệu</span>
            <span>/</span>
            <span className="text-text-primary font-medium">Tổng quan toàn trường</span>
            <span className="text-[11px] text-text-secondary">• {data.lastSync}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-medium text-text-primary">
              Tổng quan tình hình trường học
            </h1>
            <Badge variant="success" size="sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Trực tuyến</span>
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="h-10 px-3 bg-white border border-hairline rounded text-xs font-medium text-text-primary focus:border-ocean outline-none"
          >
            <option>Năm học 2024 - 2025</option>
            <option>Năm học 2023 - 2024</option>
          </select>

          <select
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            className="h-10 px-3 bg-white border border-hairline rounded text-xs font-medium text-text-primary focus:border-ocean outline-none"
          >
            <option>Học kỳ II (Hiện tại)</option>
            <option>Học kỳ I</option>
          </select>

          <Button variant="secondary" size="md" icon={Download}>
            Xuất báo cáo PDF/Excel
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={Bell}
            onClick={() => setIsBroadcastModalOpen(true)}
          >
            Thông báo toàn trường
          </Button>
        </div>
      </div>

      {/* 4 Large Institutional KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <Card padding="p-5">
          <div className="flex items-start justify-between">
            <div className="text-[11px] font-medium text-text-secondary uppercase tracking-wider">
              Tổng học sinh
            </div>
            <div className="w-8 h-8 rounded bg-surface-neutral flex items-center justify-center text-primary">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-semibold text-primary">{data.kpis.students.total}</span>
            <Badge variant="success" size="sm">{data.kpis.students.diff}</Badge>
          </div>
          <div className="text-xs text-text-secondary mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-success" />
            <span>{data.kpis.students.subStatus}</span>
          </div>
        </Card>

        {/* KPI 2 */}
        <Card padding="p-5">
          <div className="flex items-start justify-between">
            <div className="text-[11px] font-medium text-text-secondary uppercase tracking-wider">
              Tổng giáo viên
            </div>
            <div className="w-8 h-8 rounded bg-surface-neutral flex items-center justify-center text-primary">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-semibold text-primary">{data.kpis.teachers.total}</span>
            <Badge variant="info" size="sm">{data.kpis.teachers.active} trực tiếp</Badge>
          </div>
          <div className="text-xs text-text-secondary mt-2">
            Tỷ lệ HS/GV: <strong>{data.kpis.teachers.ratio}</strong>
          </div>
        </Card>

        {/* KPI 3 */}
        <Card padding="p-5">
          <div className="flex items-start justify-between">
            <div className="text-[11px] font-medium text-text-secondary uppercase tracking-wider">
              Quy mô lớp học
            </div>
            <div className="w-8 h-8 rounded bg-surface-neutral flex items-center justify-center text-primary">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-semibold text-primary">{data.kpis.classes.total}</span>
            <span className="text-sm font-normal text-text-secondary">lớp</span>
          </div>
          <div className="text-xs text-text-secondary mt-2">
            {data.kpis.classes.breakdown} • {data.kpis.classes.occupancy}
          </div>
        </Card>

        {/* KPI 4 */}
        <Card padding="p-5">
          <div className="flex items-start justify-between">
            <div className="text-[11px] font-medium text-text-secondary uppercase tracking-wider">
              Điểm TB toàn trường
            </div>
            <div className="w-8 h-8 rounded bg-surface-neutral flex items-center justify-center text-primary">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-semibold text-primary">{data.kpis.averageGpa.score}</span>
            <span className="text-sm font-normal text-text-secondary">{data.kpis.averageGpa.scale}</span>
            <Badge variant="success" size="sm">{data.kpis.averageGpa.diff}</Badge>
          </div>
          <div className="text-xs text-text-secondary mt-2">
            {data.kpis.averageGpa.note}
          </div>
        </Card>
      </div>

      {/* Main Analysis Section: Left Charts (7 cols), Right Alerts & Timeline (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Grade Comparison Chart & Performance Distribution */}
        <div className="lg:col-span-7 space-y-6">
          {/* Chart 1: Grouped Bar Chart */}
          <Card padding="p-6" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-medium text-text-primary">
                  Điểm trung bình theo khối lớp & Môn trọng điểm
                </h2>
                <p className="text-xs text-text-secondary">
                  So sánh điểm số học kỳ II giữa ba khối 10, 11 và 12
                </p>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-3 text-xs text-text-secondary">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-[#0F3D5C] rounded-sm"></span> Khối 10
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-[#1C6FA8] rounded-sm"></span> Khối 11
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-[#81A8CC] rounded-sm"></span> Khối 12
                </span>
              </div>
            </div>

            {/* Custom SVG Grouped Bar Chart */}
            <div className="py-4">
              <svg className="w-full h-56" viewBox="0 0 500 220">
                {/* Horizontal reference lines */}
                <line x1="40" y1="20" x2="480" y2="20" stroke="#E1E6EB" strokeWidth="1" />
                <text x="25" y="24" fontSize="10" fill="#5B6B7A" textAnchor="end">10</text>

                <line x1="40" y1="65" x2="480" y2="65" stroke="#E1E6EB" strokeWidth="1" />
                <text x="25" y="69" fontSize="10" fill="#5B6B7A" textAnchor="end">7.5</text>

                <line x1="40" y1="110" x2="480" y2="110" stroke="#E1E6EB" strokeWidth="1" />
                <text x="25" y="114" fontSize="10" fill="#5B6B7A" textAnchor="end">5.0</text>

                <line x1="40" y1="155" x2="480" y2="155" stroke="#E1E6EB" strokeWidth="1" />
                <text x="25" y="159" fontSize="10" fill="#5B6B7A" textAnchor="end">2.5</text>

                <line x1="40" y1="180" x2="480" y2="180" stroke="#CBD5E1" strokeWidth="1" />
                <text x="25" y="184" fontSize="10" fill="#5B6B7A" textAnchor="end">0</text>

                {/* Benchmark standard line at 7.5 */}
                <line
                  x1="40"
                  y1="65"
                  x2="480"
                  y2="65"
                  stroke="#1C6FA8"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                <text x="440" y="60" fontSize="9" fill="#1C6FA8" fontWeight="500">
                  Chuẩn mục tiêu GD (7.5)
                </text>

                {/* Bars for 5 subjects */}
                {data.gradeSubjectComparison.map((sub, i) => {
                  const groupX = 65 + i * 85;
                  const h10 = (sub.k10 / 10) * 160;
                  const h11 = (sub.k11 / 10) * 160;
                  const h12 = (sub.k12 / 10) * 160;

                  return (
                    <g key={i}>
                      {/* Bar K10 */}
                      <rect
                        x={groupX}
                        y={180 - h10}
                        width="14"
                        height={h10}
                        fill="#0F3D5C"
                        rx="2"
                      />
                      {/* Bar K11 */}
                      <rect
                        x={groupX + 16}
                        y={180 - h11}
                        width="14"
                        height={h11}
                        fill="#1C6FA8"
                        rx="2"
                      />
                      {/* Bar K12 */}
                      <rect
                        x={groupX + 32}
                        y={180 - h12}
                        width="14"
                        height={h12}
                        fill="#81A8CC"
                        rx="2"
                      />

                      {/* Subject Label */}
                      <text
                        x={groupX + 23}
                        y="198"
                        textAnchor="middle"
                        fontSize="11"
                        fill="#1B2B3A"
                        fontWeight="500"
                      >
                        {sub.subject}
                      </text>
                      <text
                        x={groupX + 23}
                        y="210"
                        textAnchor="middle"
                        fontSize="9"
                        fill="#5B6B7A"
                      >
                        TB: {sub.avg}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="p-3 bg-sky/30 border border-ocean/20 rounded flex items-center justify-between text-xs">
              <span className="text-text-primary">
                ℹ️ Môn <strong>Tiếng Anh khối 12</strong> có bước tiến cao nhất toàn khóa (+0.4 điểm).
              </span>
              <a href="#details" onClick={(e) => e.preventDefault()} className="text-ocean hover:underline font-medium">
                Xem phân tích chi tiết môn học →
              </a>
            </div>
          </Card>

          {/* Academic Performance Distribution */}
          <Card padding="p-6" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-medium text-text-primary">
                  Phân bổ xếp loại học lực toàn trường
                </h2>
                <p className="text-xs text-text-secondary">
                  Thống kê kết quả đánh giá năng lực học sinh quý gần nhất
                </p>
              </div>
              <span className="text-xs text-text-secondary">Tổng: 2,450 học sinh</span>
            </div>

            {/* Segmented Bar */}
            <div className="w-full h-5 rounded-full overflow-hidden flex shadow-inner">
              <div style={{ width: '24%' }} className="bg-[#0F3D5C] h-full" title="Xuất sắc: 24%"></div>
              <div style={{ width: '42%' }} className="bg-[#1C6FA8] h-full" title="Giỏi: 42%"></div>
              <div style={{ width: '26%' }} className="bg-[#81A8CC] h-full" title="Khá: 26%"></div>
              <div style={{ width: '8%' }} className="bg-[#E8A33D] h-full" title="Cần cố gắng: 8%"></div>
            </div>

            {/* Legend Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 bg-surface-neutral rounded border border-hairline space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-text-primary font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0F3D5C]"></span>
                  <span>Xuất sắc</span>
                </div>
                <div className="text-lg font-bold text-primary">24%</div>
                <div className="text-[11px] text-text-secondary">588 HS</div>
              </div>

              <div className="p-3 bg-surface-neutral rounded border border-hairline space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-text-primary font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#1C6FA8]"></span>
                  <span>Giỏi</span>
                </div>
                <div className="text-lg font-bold text-ocean">42%</div>
                <div className="text-[11px] text-text-secondary">1,029 HS</div>
              </div>

              <div className="p-3 bg-surface-neutral rounded border border-hairline space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-text-primary font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#81A8CC]"></span>
                  <span>Khá</span>
                </div>
                <div className="text-lg font-bold text-text-primary">26%</div>
                <div className="text-[11px] text-text-secondary">637 HS</div>
              </div>

              <div className="p-3 bg-surface-neutral rounded border border-hairline space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-text-primary font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#E8A33D]"></span>
                  <span>Cần cố gắng</span>
                </div>
                <div className="text-lg font-bold text-warning-dark">8%</div>
                <div className="text-[11px] text-text-secondary">196 HS</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right: Departmental Warnings & Real-time Activity Timeline */}
        <div className="lg:col-span-5 space-y-6">
          {/* Departmental Warnings */}
          <Card padding="p-6" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-medium text-warning-dark">
                <AlertTriangle className="w-4 h-4 text-warning-dark" />
                <h2 className="text-sm font-semibold text-text-primary">Cảnh báo chuyên môn</h2>
              </div>
              <Badge variant="warning" size="sm">2 cảnh báo mới</Badge>
            </div>
            <p className="text-xs text-text-secondary">
              BGH và Tổ trưởng chuyên môn cần lưu ý kiểm tra đôn đốc theo định kỳ.
            </p>

            <div className="space-y-3">
              {data.academicAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-3.5 bg-red-50/50 border border-red-200 rounded space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-text-primary">{alert.class}</span>
                    <span className="text-xs font-semibold text-danger">{alert.drop}</span>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {alert.content}
                  </p>
                  <div className="flex items-center justify-between pt-1 hairline-t text-[11px]">
                    <span className="text-text-secondary">{alert.teacher}</span>
                    <a href="#alert" onClick={(e) => e.preventDefault()} className="text-ocean hover:underline font-medium">
                      Chi tiết biên bản →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Activity Log / Timeline */}
          <Card padding="p-6" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-text-primary">Hoạt động & Nhật ký gần đây</h2>
              </div>
              <button className="text-xs text-ocean hover:underline">Xem tất cả</button>
            </div>
            <p className="text-xs text-text-secondary">Ghi nhận theo thời gian thực từ các phân hệ</p>

            <div className="space-y-3.5">
              {data.recentActivities.map((act) => (
                <div key={act.id} className="flex items-start gap-3 text-xs">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0"></div>
                  <div className="space-y-1 flex-1">
                    <p className="text-text-primary leading-relaxed">{act.text}</p>
                    <div className="flex items-center gap-2 text-[11px] text-text-secondary">
                      <span>{act.time}</span>
                      <span>•</span>
                      <Badge variant={act.badgeType} size="sm">{act.badge}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button variant="secondary" size="sm" className="w-full justify-center mt-2">
              Tải thêm lịch sử hoạt động
            </Button>
          </Card>
        </div>
      </div>

      {/* Bottom MOET Sync Status Banner */}
      <Card padding="p-5" className="bg-white border border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-card bg-surface-neutral flex items-center justify-center text-primary shrink-0 border border-hairline">
            <ShieldCheck className="w-5 h-5 text-ocean" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-text-primary">
                Hệ thống lưu trữ & Đồng bộ dữ liệu Sở GD&ĐT
              </h3>
              <Badge variant="success" size="sm">Đã kết nối</Badge>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              {data.moetSync.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="secondary" size="sm">
            Xem log đồng bộ
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={RefreshCw}
            onClick={handleSyncMoet}
            disabled={isSyncing}
          >
            {isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ ngay'}
          </Button>
        </div>
      </Card>

      {syncSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-success rounded text-xs text-success flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-success" />
          <span>Đã đồng bộ thành công 2,450 hồ sơ học sinh và học bạ số lên cơ sở dữ liệu Bộ GD&ĐT!</span>
        </div>
      )}

      {/* Modal: Thông báo toàn trường */}
      <Modal
        isOpen={isBroadcastModalOpen}
        onClose={() => setIsBroadcastModalOpen(false)}
        title="Phát thông báo toàn trường (BGH)"
      >
        <form onSubmit={handleSendBroadcast} className="space-y-4 text-xs text-text-secondary">
          <div>
            <label className="block text-xs font-medium text-text-primary mb-1">
              Đối tượng nhận thông báo
            </label>
            <select className="w-full h-10 px-3 bg-white border border-hairline rounded text-xs text-text-primary outline-none">
              <option>Toàn thể Giáo viên, Học sinh & Phụ huynh (Tất cả phân hệ)</option>
              <option>Chỉ khối Giáo viên & Cán bộ nhân viên</option>
              <option>Chỉ khối Học sinh & Phụ huynh</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-primary mb-1">
              Tiêu đề thông báo
            </label>
            <input
              type="text"
              value={broadcastTitle}
              onChange={(e) => setBroadcastTitle(e.target.value)}
              placeholder="Thông báo về Lịch thi Học kỳ II & Kế hoạch ngoại khóa..."
              className="w-full h-10 px-3 bg-white border border-hairline rounded text-xs text-text-primary outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-primary mb-1">
              Nội dung thông báo
            </label>
            <textarea
              rows={4}
              value={broadcastContent}
              onChange={(e) => setBroadcastContent(e.target.value)}
              placeholder="Ban Giám Hiệu nhà trường xin trân trọng thông báo đến toàn thể giáo viên, học sinh và quý phụ huynh..."
              className="w-full p-3 bg-white border border-hairline rounded text-xs text-text-primary outline-none resize-none"
              required
            />
          </div>

          {broadcastSent && (
            <div className="p-3 bg-emerald-50 text-success rounded border border-emerald-200 flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              <span>Đã phát thông báo thành công đến 2,450 tài khoản trường!</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 hairline-t">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsBroadcastModalOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={broadcastSent}
            >
              Phát thông báo ngay
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

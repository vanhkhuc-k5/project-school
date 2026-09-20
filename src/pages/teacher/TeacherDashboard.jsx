import React from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { useSync } from '../../context/SyncContext';
import {
  Users,
  BookOpen,
  ClipboardCheck,
  BarChart2,
  Calendar,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Plus,
} from 'lucide-react';

export function TeacherDashboard({
  onNavigateAnalytics,
  onNavigateCreateAssignment,
  onNavigateClasses,
  onNavigateAssignments,
}) {
  const { syncStatus } = useSync();
  const pendingGrading = syncStatus?.pendingGradingCount ?? 15;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium text-text-primary">
            Chào mừng trở lại, Cô Mai Lan 👋
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Tổ Toán học • Bạn có <strong className="text-primary">2 lớp giảng dạy hôm nay</strong> và <strong className="text-danger">{pendingGrading} bài kiểm tra chờ chấm điểm</strong>.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="md"
            icon={BarChart2}
            onClick={onNavigateAnalytics}
          >
            Xem phân tích năng lực
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={Plus}
            onClick={onNavigateCreateAssignment}
          >
            Tạo bài tập mới
          </Button>
        </div>
      </div>

      {/* 4 KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="p-5" className="cursor-pointer hover:border-ocean transition-colors" onClick={onNavigateClasses}>
          <div className="text-xs text-text-secondary">Tổng học sinh phụ trách</div>
          <div className="text-3xl font-semibold text-primary mt-2">79 em</div>
          <div className="text-xs text-text-secondary mt-2">Lớp 10A1 (39) & 10A2 (40)</div>
        </Card>

        <Card padding="p-5" className="cursor-pointer hover:border-danger transition-colors" onClick={onNavigateAssignments}>
          <div className="flex justify-between items-start">
            <span className="text-xs text-text-secondary">Bài cần chấm điểm</span>
            <Badge variant="danger">Gấp</Badge>
          </div>
          <div className="text-3xl font-semibold text-danger mt-2">{pendingGrading} bài</div>
          <div className="text-xs text-text-secondary mt-2">Hạn chót chấm: Hôm nay 18:00</div>
        </Card>

        <Card padding="p-5" className="cursor-pointer hover:border-primary transition-colors" onClick={onNavigateAnalytics}>
          <div className="flex justify-between items-start">
            <span className="text-xs text-text-secondary">Đạt chuẩn năng lực</span>
            <Badge variant="success">+3.2%</Badge>
          </div>
          <div className="text-3xl font-semibold text-primary mt-2">76.4%</div>
          <div className="text-xs text-text-secondary mt-2">34/42 em lớp 10A1 đạt chỉ tiêu</div>
        </Card>

        <Card padding="p-5" className="cursor-pointer hover:border-warning transition-colors" onClick={onNavigateAnalytics}>
          <div className="flex justify-between items-start">
            <span className="text-xs text-text-secondary">Cảnh báo can thiệp</span>
            <Badge variant="warning">3 học sinh</Badge>
          </div>
          <div className="text-3xl font-semibold text-warning-dark mt-2">03 em</div>
          <div className="text-xs text-text-secondary mt-2">Hổng kiến thức Hình không gian</div>
        </Card>
      </div>

      {/* Teaching Schedule & Pending Classes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding="p-6" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary stroke-[1.75]" />
              <h2 className="text-base font-medium text-text-primary">Lịch giảng dạy hôm nay</h2>
            </div>
            <Badge variant="neutral">Thứ Năm, 24/10</Badge>
          </div>

          <div className="space-y-3">
            <div className="p-4 bg-surface-neutral rounded border border-hairline flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-primary">Tiết 1 - 2 (07:30 - 09:05)</span>
                  <Badge variant="success" size="sm">Đã xong</Badge>
                </div>
                <div className="text-sm font-medium text-text-primary">Đại số 10: Dấu của tam thức bậc hai</div>
                <div className="text-xs text-text-secondary">Lớp 10A1 • Phòng 302</div>
              </div>
              <Button variant="secondary" size="sm" onClick={onNavigateClasses}>Sổ điểm danh</Button>
            </div>

            <div className="p-4 bg-sky/30 rounded border border-ocean/20 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-ocean">Tiết 4 - 5 (10:05 - 11:40)</span>
                  <Badge variant="info" size="sm">Sắp bắt đầu</Badge>
                </div>
                <div className="text-sm font-medium text-text-primary">Hình học 10: Tích vô hướng của 2 vectơ</div>
                <div className="text-xs text-text-secondary">Lớp 10A2 • Phòng 304</div>
              </div>
              <Button variant="primary" size="sm" onClick={onNavigateClasses}>Vào lớp</Button>
            </div>
          </div>
        </Card>

        <Card padding="p-6" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-primary stroke-[1.75]" />
              <h2 className="text-base font-medium text-text-primary">Bài tập & Đánh giá gần nhất</h2>
            </div>
            <button
              onClick={onNavigateCreateAssignment}
              className="text-xs font-medium text-ocean hover:underline"
            >
              + Tạo bài mới
            </button>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 bg-white border border-hairline rounded space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-text-primary">
                  Kiểm tra 15 phút: Đại số chương 2
                </span>
                <Badge variant="info">Đang làm</Badge>
              </div>
              <div className="flex justify-between text-xs text-text-secondary">
                <span>Lớp 10A1 • 39 học sinh</span>
                <span>32/39 đã nộp (82%)</span>
              </div>
              <div className="w-full h-1.5 bg-surface-neutral rounded-full overflow-hidden">
                <div style={{ width: '82%' }} className="bg-primary h-full"></div>
              </div>
            </div>

            <div className="p-3.5 bg-white border border-hairline rounded space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-text-primary">
                  Bài tập về nhà: Phương trình bậc hai & Vi-ét
                </span>
                <Badge variant="warning">Cần chấm 15 bài</Badge>
              </div>
              <div className="flex justify-between text-xs text-text-secondary">
                <span>Lớp 10A2 • 40 học sinh</span>
                <span>40/40 đã nộp (100%)</span>
              </div>
              <div className="w-full h-1.5 bg-surface-neutral rounded-full overflow-hidden">
                <div style={{ width: '100%' }} className="bg-success h-full"></div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

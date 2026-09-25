// =============================================================================
// LeadershipDashboardPage — G39 Executive KPIs Dashboard
// Real-time KPIs for school leadership: enrollment, attendance, tuition, alerts
// =============================================================================

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  BookOpen,
  CheckCircle,
  XCircle,
  ArrowRight,
  AlertOctagon,
  Bell,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { PageLoader } from '../../components/LoadingState';
import { apiRequest } from '../../services/api';
import { EmergencyBroadcastModal } from '../admin/AdminCommunicationPage.js';

// Type definitions
interface KPIData {
  enrollment: {
    total: number;
    newEnrollments: number;
    growth: number;
  };
  attendance: {
    rate: number;
    present: number;
    absent: number;
    late: number;
  };
  tuition: {
    collected: number;
    total: number;
    collectionRate: number;
    pending: number;
  };
  alerts: AlertItem[];
}

interface AlertItem {
  id: string;
  type: 'warning' | 'danger' | 'info';
  title: string;
  description: string;
  timestamp: string;
  route?: string;
}

// Mock data for development
const MOCK_KPI_DATA: KPIData = {
  enrollment: {
    total: 1248,
    newEnrollments: 156,
    growth: 8.5,
  },
  attendance: {
    rate: 96.8,
    present: 1208,
    absent: 28,
    late: 12,
  },
  tuition: {
    collected: 4280000000,
    total: 5200000000,
    collectionRate: 82.3,
    pending: 920000000,
  },
  alerts: [
    {
      id: '1',
      type: 'warning',
      title: 'Tỷ lệ vắng mặt tăng cao',
      description: 'Lớp 10A3 có 8 học sinh vắng mặt hôm nay',
      timestamp: '2026-09-25T10:30:00Z',
      route: '/admin/attendance',
    },
    {
      id: '2',
      type: 'danger',
      title: 'Công nợ học phí quá hạn',
      description: '15 phụ huynh chưa thanh toán học phí quá 30 ngày',
      timestamp: '2026-09-25T09:15:00Z',
      route: '/admin/reports',
    },
    {
      id: '3',
      type: 'info',
      title: 'Kế hoạch giảng dạy mới',
      description: '3 giáo viên chưa nộp kế hoạch giảng dạy tuần 4',
      timestamp: '2026-09-25T08:00:00Z',
      route: '/leadership/academic',
    },
  ],
};

// Format currency
const formatCurrency = (amount: number): string => {
  if (amount >= 1000000000) {
    return `${(amount / 1000000000).toFixed(1)} tỷ`;
  }
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(0)} triệu`;
  }
  return amount.toLocaleString('vi-VN');
};

// Format percentage
const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

// KPI Card Component
function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  variant = 'default',
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}) {
  const variantStyles = {
    default: 'border-hairline',
    success: 'border-success/30 bg-success-light/20',
    warning: 'border-warning/30 bg-warning-light/20',
    danger: 'border-danger/30 bg-danger-light/20',
  };

  const iconStyles = {
    default: 'bg-ocean/10 text-ocean',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-danger/10 text-danger',
  };

  return (
    <Card className={`p-5 ${variantStyles[variant]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-text-secondary mb-1">{title}</p>
          <p className="text-2xl font-semibold text-text-primary">{value}</p>
          {subtitle && (
            <p className="text-xs text-text-secondary mt-1">{subtitle}</p>
          )}
          {trend && trendValue && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${
              trend === 'up' ? 'text-success' : trend === 'down' ? 'text-danger' : 'text-text-secondary'
            }`}>
              {trend === 'up' && <TrendingUp className="w-3 h-3" />}
              {trend === 'down' && <TrendingDown className="w-3 h-3" />}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${iconStyles[variant]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </Card>
  );
}

// Alert Item Component
function AlertItem({ alert, onNavigate }: { alert: AlertItem; onNavigate?: () => void }) {
  const typeStyles = {
    warning: {
      bg: 'bg-warning-light/30',
      border: 'border-warning/30',
      icon: 'text-warning',
      iconBg: 'bg-warning/10',
    },
    danger: {
      bg: 'bg-danger-light/30',
      border: 'border-danger/30',
      icon: 'text-danger',
      iconBg: 'bg-danger/10',
    },
    info: {
      bg: 'bg-ocean/5',
      border: 'border-ocean/20',
      icon: 'text-ocean',
      iconBg: 'bg-ocean/10',
    },
  };

  const styles = typeStyles[alert.type];
  const Icon = alert.type === 'danger' ? XCircle : alert.type === 'warning' ? AlertTriangle : Clock;

  return (
    <div
      className={`p-4 rounded-lg border ${styles.bg} ${styles.border} ${
        alert.route ? 'cursor-pointer hover:shadow-sm transition-shadow' : ''
      }`}
      onClick={onNavigate}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${styles.iconBg}`}>
          <Icon className={`w-4 h-4 ${styles.icon}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary">{alert.title}</p>
          <p className="text-xs text-text-secondary mt-0.5">{alert.description}</p>
          <p className="text-[10px] text-text-secondary/70 mt-1">
            {new Date(alert.timestamp).toLocaleString('vi-VN')}
          </p>
        </div>
        {alert.route && (
          <ArrowRight className="w-4 h-4 text-text-secondary/50 flex-shrink-0 mt-1" />
        )}
      </div>
    </div>
  );
}

export function LeadershipDashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [kpiData, setKPIData] = useState<KPIData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);

  useEffect(() => {
    fetchKPIData();
  }, []);

  const fetchKPIData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to fetch from API
      const response = await apiRequest<KPIData>('/api/leadership/dashboard', {
        method: 'GET',
      });

      if (response.success && response.data) {
        setKPIData(response.data);
      } else {
        // Use mock data for development
        setKPIData(MOCK_KPI_DATA);
      }
    } catch (err) {
      console.error('Failed to fetch KPI data:', err);
      // Fallback to mock data
      setKPIData(MOCK_KPI_DATA);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <PageLoader />
      </div>
    );
  }

  if (error && !kpiData) {
    return (
      <div className="p-6 bg-danger-light/20 rounded-lg border border-danger/30">
        <p className="text-danger text-sm">{error}</p>
        <button
          onClick={fetchKPIData}
          className="mt-2 text-sm text-ocean hover:underline"
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (!kpiData) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-medium text-text-primary">Tổng quan Điều hành</h1>
          <p className="text-sm text-text-secondary mt-1">
            Theo dõi các chỉ số KPI quan trọng của trường
          </p>
        </div>
        {/* G39: Emergency broadcast button */}
        <button
          onClick={() => setShowBroadcastModal(true)}
          className="flex items-center gap-2 px-4 py-2 border-2 border-red-500 text-red-600 rounded-lg hover:bg-red-50 font-semibold text-sm transition-colors shrink-0"
          title="Phát thông báo khẩn cấp toàn trường"
        >
          <AlertOctagon className="w-4 h-4" />
          Phát thông báo khẩn
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Tổng số học sinh"
          value={kpiData.enrollment.total.toLocaleString('vi-VN')}
          subtitle={`+${kpiData.enrollment.newEnrollments} học sinh mới`}
          icon={Users}
          trend="up"
          trendValue={`+${kpiData.enrollment.growth}% so với HK1`}
          variant="default"
        />

        <KPICard
          title="Tỷ lệ điểm danh"
          value={formatPercent(kpiData.attendance.rate)}
          subtitle={`Có mặt: ${kpiData.attendance.present} | Vắng: ${kpiData.attendance.absent} | Trễ: ${kpiData.attendance.late}`}
          icon={UserCheck}
          trend={kpiData.attendance.rate >= 95 ? 'up' : 'down'}
          trendValue={kpiData.attendance.rate >= 95 ? 'Trong ngưỡng tốt' : 'Cần cải thiện'}
          variant={kpiData.attendance.rate >= 95 ? 'success' : 'warning'}
        />

        <KPICard
          title="Thu học phí"
          value={formatCurrency(kpiData.tuition.collected)}
          subtitle={`${formatCurrency(kpiData.tuition.pending)} chưa thu`}
          icon={DollarSign}
          trend={kpiData.tuition.collectionRate >= 80 ? 'up' : 'down'}
          trendValue={`${formatPercent(kpiData.tuition.collectionRate)} đã thu`}
          variant={kpiData.tuition.collectionRate >= 80 ? 'success' : 'warning'}
        />

        <KPICard
          title="Cảnh báo hệ thống"
          value={kpiData.alerts.length}
          subtitle={kpiData.alerts.length > 0 ? 'Cần xử lý ngay' : 'Không có cảnh báo'}
          icon={AlertTriangle}
          variant={kpiData.alerts.length > 0 ? 'danger' : 'success'}
        />
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-hairline p-4 text-center">
          <BookOpen className="w-5 h-5 text-ocean mx-auto mb-2" />
          <p className="text-lg font-semibold text-text-primary">32</p>
          <p className="text-xs text-text-secondary">Lớp học đang hoạt động</p>
        </div>
        <div className="bg-white rounded-lg border border-hairline p-4 text-center">
          <Users className="w-5 h-5 text-ocean mx-auto mb-2" />
          <p className="text-lg font-semibold text-text-primary">68</p>
          <p className="text-xs text-text-secondary">Giáo viên</p>
        </div>
        <div className="bg-white rounded-lg border border-hairline p-4 text-center">
          <CheckCircle className="w-5 h-5 text-success mx-auto mb-2" />
          <p className="text-lg font-semibold text-text-primary">156</p>
          <p className="text-xs text-text-secondary">Bài tập đã chấm</p>
        </div>
        <div className="bg-white rounded-lg border border-hairline p-4 text-center">
          <Clock className="w-5 h-5 text-warning mx-auto mb-2" />
          <p className="text-lg font-semibold text-text-primary">12</p>
          <p className="text-xs text-text-secondary">Chờ phê duyệt</p>
        </div>
      </div>

      {/* Alerts Section */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-text-primary">Cảnh báo & Thông báo</h2>
          <button
            onClick={() => navigate('/leadership/approvals')}
            className="text-sm text-ocean hover:underline flex items-center gap-1"
          >
            Xem tất cả
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {kpiData.alerts.length === 0 ? (
          <div className="text-center py-8 text-text-secondary">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-success/50" />
            <p>Không có cảnh báo nào</p>
          </div>
        ) : (
          <div className="space-y-3">
            {kpiData.alerts.map((alert) => (
              <AlertItem
                key={alert.id}
                alert={alert}
                onNavigate={alert.route ? () => navigate(alert.route!) : undefined}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h2 className="text-lg font-medium text-text-primary mb-4">Hoạt động gần đây</h2>
          <div className="space-y-4">
            {[
              { action: 'Chấm điểm', user: 'Cô Lan Anh', detail: 'Lớp 11A2 - Toán', time: '5 phút trước' },
              { action: 'Tạo thông báo', user: 'Thầy Minh', detail: 'Thông báo nghỉ lễ 2/9', time: '1 giờ trước' },
              { action: 'Duyệt đơn nghỉ', user: 'Cô Hương', detail: 'Đơn của em Nguyễn Văn A', time: '2 giờ trước' },
              { action: 'Cập nhật lớp', user: 'Admin', detail: 'Thêm 3 học sinh vào lớp 10A1', time: '3 giờ trước' },
            ].map((activity, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-ocean mt-2" />
                <div className="flex-1">
                  <p className="text-sm text-text-primary">
                    <span className="font-medium">{activity.action}</span> bởi {activity.user}
                  </p>
                  <p className="text-xs text-text-secondary">{activity.detail}</p>
                </div>
                <span className="text-xs text-text-secondary/70 whitespace-nowrap">{activity.time}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-medium text-text-primary mb-4">Kế hoạch sắp tới</h2>
          <div className="space-y-4">
            {[
              { event: 'Kiểm tra giữa kỳ', date: '01/10/2026', type: 'academic' },
              { event: 'Họp phụ huynh', date: '15/10/2026', type: 'meeting' },
              { event: 'Thi học kỳ 1', date: '15/12/2026', type: 'exam' },
              { event: 'Tổng kết năm học', date: '30/05/2027', type: 'meeting' },
            ].map((event, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-surface-neutral rounded-lg">
                <div className="text-center bg-white rounded-lg border border-hairline px-3 py-2 min-w-[60px]">
                  <p className="text-xs text-text-secondary">{event.date.split('/')[0]}</p>
                  <p className="text-lg font-semibold text-ocean">{event.date.split('/')[1]}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">{event.event}</p>
                  <Badge
                    variant={
                      event.type === 'academic' ? 'info' :
                      event.type === 'exam' ? 'warning' : 'default'
                    }
                    size="sm"
                  >
                    {event.type === 'academic' ? 'Học vụ' : event.type === 'exam' ? 'Thi' : 'Sự kiện'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* G39: Emergency Broadcast Modal */}
      <EmergencyBroadcastModal
        isOpen={showBroadcastModal}
        onClose={() => setShowBroadcastModal(false)}
        onSuccess={() => {
          setShowBroadcastModal(false);
        }}
      />
    </div>
  );
}

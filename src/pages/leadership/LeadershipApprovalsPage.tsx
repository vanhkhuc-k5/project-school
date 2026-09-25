// =============================================================================
// LeadershipApprovalsPage — G39 Approval Center
// Approval queue: academic plans, grade disputes, fee waivers
// =============================================================================

import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  DollarSign,
  GraduationCap,
  User,
  ChevronDown,
  Eye,
  MessageSquare,
  Filter,
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { PageLoader } from '../../components/LoadingState';
import { EmptyState } from '../../components/EmptyState';
import { Modal } from '../../components/Modal';
import { apiRequest } from '../../services/api';

// Type definitions
type ApprovalType = 'academic_plan' | 'grade_dispute' | 'fee_waiver' | 'leave_request' | 'curriculum';
type ApprovalStatus = 'pending' | 'approved' | 'rejected';

interface ApprovalItem {
  id: string;
  type: ApprovalType;
  title: string;
  description: string;
  requester: {
    id: string;
    name: string;
    avatar: string;
    role: string;
  };
  target: {
    name: string;
    class?: string;
  };
  status: ApprovalStatus;
  submittedAt: string;
  priority: 'high' | 'normal' | 'low';
  comments?: string;
  attachments?: string[];
}

interface ApprovalFilters {
  type: ApprovalType | 'all';
  status: ApprovalStatus | 'all';
  priority: 'high' | 'normal' | 'low' | 'all';
  search: string;
}

// Mock data for development
const MOCK_APPROVALS: ApprovalItem[] = [
  {
    id: '1',
    type: 'academic_plan',
    title: 'Kế hoạch giảng dạy HK1 - Môn Toán',
    description: 'Kế hoạch giảng dạy học kỳ 1 năm học 2026-2027 cho môn Toán lớp 10, 11, 12. Đã được Trưởng bộ môn duyệt.',
    requester: {
      id: '1',
      name: 'Nguyễn Thị Lan Anh',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120&h=120',
      role: 'Giáo viên Toán',
    },
    target: { name: 'Nguyễn Thị Lan Anh', class: '10A1, 11A2, 12A1' },
    status: 'pending',
    submittedAt: '2026-09-25T08:30:00Z',
    priority: 'high',
    attachments: ['kehoach-giangday-toan-hk1.pdf', 'bieu-mau.xlsx'],
  },
  {
    id: '2',
    type: 'grade_dispute',
    title: 'Khiếu nại điểm thi - Học sinh Trần Văn B',
    description: 'Phụ huynh khiếu nại điểm thi môn Vật lý của con em mình. Điểm chấm: 6.5, phụ huynh yêu cầu phúc tra.',
    requester: {
      id: '2',
      name: 'Trần Minh Tuấn',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120&h=120',
      role: 'Phụ huynh',
    },
    target: { name: 'Trần Văn B', class: '11A2' },
    status: 'pending',
    submittedAt: '2026-09-24T14:20:00Z',
    priority: 'high',
    comments: 'Đã liên hệ giáo viên chấm thi, chờ phúc tra từ bộ môn.',
  },
  {
    id: '3',
    type: 'fee_waiver',
    title: 'Miễn giảm học phí - Gia đình khó khăn',
    description: 'Gia đình học sinh thuộc diện hộ nghèo, đề nghị miễn giảm 50% học phí năm học 2026-2027.',
    requester: {
      id: '3',
      name: 'Lê Thị Hồng',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=120&h=120',
      role: 'Phụ huynh',
    },
    target: { name: 'Lê Thị Mai', class: '10A3' },
    status: 'pending',
    submittedAt: '2026-09-23T10:00:00Z',
    priority: 'normal',
    attachments: ['giay-xac-nhan-ho-ngheo.pdf', 'don-xin-mien-giam.docx'],
  },
  {
    id: '4',
    type: 'leave_request',
    title: 'Đơn xin nghỉ phép - Cô Đỗ Thị Mai',
    description: 'Giáo viên xin nghỉ phép 5 ngày (25/09 - 29/09/2026) để chăm sóc con ốm.',
    requester: {
      id: '4',
      name: 'Đỗ Thị Mai',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=120&h=120',
      role: 'Giáo viên Tiếng Anh',
    },
    target: { name: 'Đỗ Thị Mai' },
    status: 'pending',
    submittedAt: '2026-09-22T16:45:00Z',
    priority: 'normal',
  },
  {
    id: '5',
    type: 'curriculum',
    title: 'Cập nhật chương trình giảng dạy',
    description: 'Bộ Giáo dục có thông tư mới về chương trình giảng dạy. Cần phê duyệt để triển khai.',
    requester: {
      id: '5',
      name: 'Phòng Đào tạo',
      avatar: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&q=80&w=120&h=120',
      role: 'Phòng ban',
    },
    target: { name: 'Toàn trường' },
    status: 'pending',
    submittedAt: '2026-09-20T09:00:00Z',
    priority: 'high',
  },
  {
    id: '6',
    type: 'academic_plan',
    title: 'Kế hoạch kiểm tra giữa kỳ',
    description: 'Phê duyệt lịch kiểm tra giữa kỳ và ma trận đề thi các môn học.',
    requester: {
      id: '6',
      name: 'Tổ trưởng CM Toán',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=120&h=120',
      role: 'Trưởng bộ môn',
    },
    target: { name: 'Khối 10, 11, 12' },
    status: 'approved',
    submittedAt: '2026-09-15T11:00:00Z',
    priority: 'normal',
  },
  {
    id: '7',
    type: 'fee_waiver',
    title: 'Miễn giảm học phí - Học sinh mồ côi',
    description: 'Học sinh mồ côi, đề nghị miễn 100% học phí.',
    requester: {
      id: '7',
      name: 'Nguyễn Văn C',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120&h=120',
      role: 'Phụ huynh',
    },
    target: { name: 'Nguyễn Thị D', class: '12A1' },
    status: 'rejected',
    submittedAt: '2026-09-10T08:00:00Z',
    priority: 'low',
    comments: 'Hồ sơ chưa đầy đủ, cần bổ sung giấy tờ chứng minh.',
  },
];

// Type icon mapping
const TYPE_CONFIG = {
  academic_plan: { icon: FileText, label: 'Kế hoạch học vụ', color: 'text-ocean', bg: 'bg-ocean/10' },
  grade_dispute: { icon: GraduationCap, label: 'Khiếu nại điểm', color: 'text-warning', bg: 'bg-warning/10' },
  fee_waiver: { icon: DollarSign, label: 'Miễn giảm học phí', color: 'text-success', bg: 'bg-success/10' },
  leave_request: { icon: User, label: 'Đơn nghỉ phép', color: 'text-purple', bg: 'bg-purple/10' },
  curriculum: { icon: CheckSquare, label: 'Chương trình', color: 'text-primary', bg: 'bg-primary/10' },
};

// Priority Badge
function PriorityBadge({ priority }: { priority: 'high' | 'normal' | 'low' }) {
  const config = {
    high: { variant: 'danger' as const, label: 'Cao', dot: 'bg-danger' },
    normal: { variant: 'info' as const, label: 'Bình thường', dot: 'bg-ocean' },
    low: { variant: 'default' as const, label: 'Thấp', dot: 'bg-text-secondary' },
  };
  const { variant, label, dot } = config[priority];
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${dot}`} />
      <Badge variant={variant} size="sm">{label}</Badge>
    </div>
  );
}

// Status Badge
function StatusBadge({ status }: { status: ApprovalStatus }) {
  const config = {
    pending: { variant: 'warning' as const, label: 'Chờ duyệt', icon: Clock },
    approved: { variant: 'success' as const, label: 'Đã duyệt', icon: CheckCircle },
    rejected: { variant: 'danger' as const, label: 'Từ chối', icon: XCircle },
  };
  const { variant, label, icon: Icon } = config[status];
  return (
    <Badge variant={variant} size="sm" className="flex items-center gap-1">
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  );
}

// Approval Card
function ApprovalCard({
  item,
  onApprove,
  onReject,
  onView,
}: {
  item: ApprovalItem;
  onApprove: () => void;
  onReject: () => void;
  onView: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const typeConfig = TYPE_CONFIG[item.type];
  const TypeIcon = typeConfig.icon;

  return (
    <Card className={`p-4 ${item.priority === 'high' ? 'border-l-4 border-l-danger' : ''}`}>
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-lg ${typeConfig.bg}`}>
          <TypeIcon className={`w-6 h-6 ${typeConfig.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-text-secondary">{typeConfig.label}</span>
                <PriorityBadge priority={item.priority} />
                <StatusBadge status={item.status} />
              </div>
              <h3 className="font-medium text-text-primary">{item.title}</h3>
              <p className="text-sm text-text-secondary mt-1 line-clamp-2">{item.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-3">
            <img
              src={item.requester.avatar}
              alt={item.requester.name}
              className="w-6 h-6 rounded-full object-cover"
            />
            <span className="text-xs text-text-secondary">
              {item.requester.name} • {item.requester.role}
            </span>
            <span className="text-xs text-text-secondary/70 ml-auto">
              {new Date(item.submittedAt).toLocaleString('vi-VN')}
            </span>
          </div>

          {/* Actions */}
          {item.status === 'pending' && (
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-hairline">
              <Button variant="primary" size="sm" onClick={onApprove}>
                <CheckCircle className="w-4 h-4 mr-1" />
                Duyệt
              </Button>
              <Button variant="secondary" size="sm" onClick={onReject}>
                <XCircle className="w-4 h-4 mr-1" />
                Từ chối
              </Button>
              <Button variant="ghost" size="sm" onClick={onView}>
                <Eye className="w-4 h-4 mr-1" />
                Chi tiết
              </Button>
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-ocean hover:underline ml-auto"
              >
                {expanded ? 'Thu gọn' : 'Mở rộng'}
              </button>
            </div>
          )}

          {/* Comments */}
          {expanded && item.comments && (
            <div className="mt-4 p-3 bg-surface-neutral rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-text-secondary" />
                <span className="text-xs font-medium text-text-secondary">Ghi chú</span>
              </div>
              <p className="text-sm text-text-primary">{item.comments}</p>
            </div>
          )}

          {/* Attachments */}
          {expanded && item.attachments && item.attachments.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-text-secondary mb-2">Tài liệu đính kèm:</p>
              <div className="flex flex-wrap gap-2">
                {item.attachments.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-3 py-1.5 bg-surface-neutral rounded-lg text-xs"
                  >
                    <FileText className="w-3.5 h-3.5 text-text-secondary" />
                    <span className="text-text-primary">{file}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export function LeadershipApprovalsPage() {
  const [loading, setLoading] = useState(true);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [filters, setFilters] = useState<ApprovalFilters>({
    type: 'all',
    status: 'all',
    priority: 'all',
    search: '',
  });
  const [selectedItem, setSelectedItem] = useState<ApprovalItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const response = await apiRequest<{ data: ApprovalItem[] }>('/api/v1/leadership/approvals', {
        method: 'GET',
      });

      if (response.success && response.data) {
        setApprovals(response.data);
      } else {
        setApprovals(MOCK_APPROVALS);
      }
    } catch {
      setApprovals(MOCK_APPROVALS);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    // Optimistic update
    setApprovals((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'approved' as ApprovalStatus } : item
      )
    );
    // API call would go here
  };

  const handleReject = async (id: string) => {
    setApprovals((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'rejected' as ApprovalStatus } : item
      )
    );
    // API call would go here
  };

  const handleViewDetail = (item: ApprovalItem) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  // Filter approvals
  const filteredApprovals = approvals.filter((item) => {
    if (filters.type !== 'all' && item.type !== filters.type) return false;
    if (filters.status !== 'all' && item.status !== filters.status) return false;
    if (filters.priority !== 'all' && item.priority !== filters.priority) return false;
    if (filters.search && !item.title.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Stats
  const stats = {
    pending: approvals.filter((a) => a.status === 'pending').length,
    approved: approvals.filter((a) => a.status === 'approved').length,
    rejected: approvals.filter((a) => a.status === 'rejected').length,
    highPriority: approvals.filter((a) => a.priority === 'high' && a.status === 'pending').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <PageLoader />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium text-text-primary">Trung tâm Phê duyệt</h1>
          <p className="text-sm text-text-secondary mt-1">
            Quản lý và xử lý các yêu cầu cần phê duyệt
          </p>
        </div>
        <Button variant="secondary">
          <Filter className="w-4 h-4 mr-2" />
          Lọc nâng cao
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className={`p-4 text-center ${stats.highPriority > 0 ? 'border-l-4 border-l-danger' : ''}`}>
          <Clock className="w-6 h-6 text-warning mx-auto mb-2" />
          <p className="text-2xl font-semibold text-text-primary">{stats.pending}</p>
          <p className="text-xs text-text-secondary">Chờ duyệt</p>
        </Card>
        <Card className="p-4 text-center">
          <AlertCircle className="w-6 h-6 text-danger mx-auto mb-2" />
          <p className="text-2xl font-semibold text-danger">{stats.highPriority}</p>
          <p className="text-xs text-text-secondary">Ưu tiên cao</p>
        </Card>
        <Card className="p-4 text-center">
          <CheckCircle className="w-6 h-6 text-success mx-auto mb-2" />
          <p className="text-2xl font-semibold text-text-primary">{stats.approved}</p>
          <p className="text-xs text-text-secondary">Đã duyệt</p>
        </Card>
        <Card className="p-4 text-center">
          <XCircle className="w-6 h-6 text-text-secondary mx-auto mb-2" />
          <p className="text-2xl font-semibold text-text-primary">{stats.rejected}</p>
          <p className="text-xs text-text-secondary">Từ chối</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value as ApprovalFilters['type'] })}
            className="px-3 py-2 border border-hairline rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30"
          >
            <option value="all">Tất cả loại</option>
            <option value="academic_plan">Kế hoạch học vụ</option>
            <option value="grade_dispute">Khiếu nại điểm</option>
            <option value="fee_waiver">Miễn giảm học phí</option>
            <option value="leave_request">Đơn nghỉ phép</option>
            <option value="curriculum">Chương trình</option>
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value as ApprovalFilters['status'] })}
            className="px-3 py-2 border border-hairline rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="pending">Chờ duyệt</option>
            <option value="approved">Đã duyệt</option>
            <option value="rejected">Từ chối</option>
          </select>
          <select
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value as ApprovalFilters['priority'] })}
            className="px-3 py-2 border border-hairline rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30"
          >
            <option value="all">Tất cả ưu tiên</option>
            <option value="high">Cao</option>
            <option value="normal">Bình thường</option>
            <option value="low">Thấp</option>
          </select>
        </div>
      </Card>

      {/* Approval List */}
      {filteredApprovals.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="Không có yêu cầu nào"
          description="Tất cả các yêu cầu đã được xử lý hoặc không có yêu cầu phù hợp"
        />
      ) : (
        <div className="space-y-4">
          {filteredApprovals.map((item) => (
            <ApprovalCard
              key={item.id}
              item={item}
              onApprove={() => handleApprove(item.id)}
              onReject={() => handleReject(item.id)}
              onView={() => handleViewDetail(item)}
            />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedItem && (
        <Modal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          title="Chi tiết yêu cầu"
          size="lg"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {React.createElement(TYPE_CONFIG[selectedItem.type].icon, {
                className: `w-5 h-5 ${TYPE_CONFIG[selectedItem.type].color}`,
              })}
              <Badge variant="default">{TYPE_CONFIG[selectedItem.type].label}</Badge>
              <PriorityBadge priority={selectedItem.priority} />
              <StatusBadge status={selectedItem.status} />
            </div>

            <div>
              <h3 className="font-medium text-text-primary text-lg">{selectedItem.title}</h3>
              <p className="text-sm text-text-secondary mt-1">{selectedItem.description}</p>
            </div>

            <div className="p-4 bg-surface-neutral rounded-lg">
              <div className="flex items-center gap-3">
                <img
                  src={selectedItem.requester.avatar}
                  alt={selectedItem.requester.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <p className="font-medium text-text-primary">{selectedItem.requester.name}</p>
                  <p className="text-xs text-text-secondary">{selectedItem.requester.role}</p>
                </div>
              </div>
            </div>

            {selectedItem.comments && (
              <div className="p-4 bg-surface-neutral rounded-lg">
                <p className="text-xs font-medium text-text-secondary mb-2">Ghi chú:</p>
                <p className="text-sm text-text-primary">{selectedItem.comments}</p>
              </div>
            )}

            {selectedItem.status === 'pending' && (
              <div className="flex gap-3 pt-4">
                <Button variant="primary" className="flex-1">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Duyệt yêu cầu
                </Button>
                <Button variant="secondary" className="flex-1">
                  <XCircle className="w-4 h-4 mr-2" />
                  Từ chối
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

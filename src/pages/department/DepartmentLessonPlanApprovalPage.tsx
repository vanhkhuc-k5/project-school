// =============================================================================
// DepartmentLessonPlanApprovalPage — G39 Lesson Plan Review Queue
// Lesson plan review queue with approve/reject actions
// =============================================================================

import React, { useState } from 'react';
import {
  ClipboardCheck,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  FileText,
  MessageSquare,
  Download,
  Filter,
  Calendar,
  User,
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { EmptyState } from '../../components/EmptyState';

interface LessonPlan {
  id: string;
  title: string;
  subject: string;
  grade: number;
  className: string;
  submitter: {
    name: string;
    avatar: string;
    email: string;
  };
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  priority: 'high' | 'normal' | 'low';
  topics: string[];
  hours: number;
  objectives: string;
  materials: string[];
  comments?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

const MOCK_LESSON_PLANS: LessonPlan[] = [
  {
    id: '1',
    title: 'Hàm số bậc hai - Lý thuyết và bài tập',
    subject: 'Toán',
    grade: 10,
    className: '10A1',
    submitter: {
      name: 'Nguyễn Thị Lan Anh',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120&h=120',
      email: 'lananh@truonghoc.edu.vn',
    },
    submittedAt: '2026-09-25T08:00:00Z',
    status: 'pending',
    priority: 'high',
    topics: ['Hàm số bậc hai', 'Đồ thị', 'Phương trình'],
    hours: 4,
    objectives: 'Học sinh hiểu và vẽ được đồ thị hàm số bậc hai, áp dụng vào giải bài tập.',
    materials: ['SGK Toán 10', 'Bài tập bổ sung', 'Máy chiếu'],
    comments: 'Kế hoạch chi tiết, có đầy đủ hoạt động dạy và học.',
  },
  {
    id: '2',
    title: 'Hình học không gian - Quan hệ song song',
    subject: 'Toán',
    grade: 11,
    className: '11A1',
    submitter: {
      name: 'Phạm Quốc Hùng',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=120&h=120',
      email: 'hungpham@truonghoc.edu.vn',
    },
    submittedAt: '2026-09-24T16:30:00Z',
    status: 'pending',
    priority: 'normal',
    topics: ['Đường thẳng song song', 'Mặt phẳng song song'],
    hours: 6,
    objectives: 'HS nhận biết và chứng minh được quan hệ song song trong không gian.',
    materials: ['Mô hình 3D', 'SGK Toán 11'],
  },
  {
    id: '3',
    title: 'Ứng dụng tích phân - Diện tích hình phẳng',
    subject: 'Toán',
    grade: 12,
    className: '12A1',
    submitter: {
      name: 'Trần Văn Minh',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120&h=120',
      email: 'minhtran@truonghoc.edu.vn',
    },
    submittedAt: '2026-09-24T10:00:00Z',
    status: 'pending',
    priority: 'high',
    topics: ['Tích phân xác định', 'Ứng dụng tính diện tích'],
    hours: 5,
    objectives: 'HS tính được diện tích hình phẳng bằng tích phân.',
    materials: ['SGK Toán 12', 'Bài tập trắc nghiệm'],
  },
  {
    id: '4',
    title: 'Cấp số cộng - Cấp số nhân',
    subject: 'Toán',
    grade: 11,
    className: '11A2',
    submitter: {
      name: 'Nguyễn Thị Lan Anh',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120&h=120',
      email: 'lananh@truonghoc.edu.vn',
    },
    submittedAt: '2026-09-20T14:00:00Z',
    status: 'approved',
    priority: 'normal',
    topics: ['Cấp số cộng', 'Cấp số nhân'],
    hours: 8,
    objectives: 'HS hiểu và áp dụng được công thức cấp số cộng, cấp số nhân.',
    materials: ['SGK Toán 11'],
    reviewedBy: 'TS. Nguyễn Văn A',
    reviewedAt: '2026-09-21T09:00:00Z',
    comments: 'Đã duyệt. Kế hoạch phù hợp với chuẩn kiến thức.',
  },
];

export function DepartmentLessonPlanApprovalPage() {
  const [plans, setPlans] = useState<LessonPlan[]>(MOCK_LESSON_PLANS);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedPlan, setSelectedPlan] = useState<LessonPlan | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [reviewComment, setReviewComment] = useState('');

  const filteredPlans = plans.filter((plan) => {
    if (filterStatus === 'all') return true;
    return plan.status === filterStatus;
  });

  const stats = {
    pending: plans.filter((p) => p.status === 'pending').length,
    approved: plans.filter((p) => p.status === 'approved').length,
    rejected: plans.filter((p) => p.status === 'rejected').length,
    highPriority: plans.filter((p) => p.priority === 'high' && p.status === 'pending').length,
  };

  const handleApprove = (id: string) => {
    setPlans((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              status: 'approved' as const,
              reviewedBy: 'TS. Nguyễn Văn A',
              reviewedAt: new Date().toISOString(),
              comments: reviewComment || p.comments,
            }
          : p
      )
    );
    setShowDetailModal(false);
    setSelectedPlan(null);
    setReviewComment('');
  };

  const handleReject = (id: string) => {
    setPlans((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              status: 'rejected' as const,
              reviewedBy: 'TS. Nguyễn Văn A',
              reviewedAt: new Date().toISOString(),
              comments: reviewComment || 'Kế hoạch chưa đạt yêu cầu.',
            }
          : p
      )
    );
    setShowDetailModal(false);
    setSelectedPlan(null);
    setReviewComment('');
  };

  const viewDetail = (plan: LessonPlan) => {
    setSelectedPlan(plan);
    setShowDetailModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-medium text-text-primary">Duyệt Kế Hoạch Giảng Dạy</h1>
        <p className="text-sm text-text-secondary mt-1">
          Xem xét và phê duyệt kế hoạch giảng dạy của giáo viên trong bộ môn
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className={`p-4 text-center ${stats.highPriority > 0 ? 'border-l-4 border-l-danger' : ''}`}>
          <Clock className="w-6 h-6 text-warning mx-auto mb-2" />
          <p className="text-2xl font-semibold text-text-primary">{stats.pending}</p>
          <p className="text-xs text-text-secondary">Chờ duyệt</p>
        </Card>
        <Card className="p-4 text-center">
          <Badge variant="danger" size="sm" className="mb-1">{stats.highPriority}</Badge>
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
        <div className="flex flex-wrap gap-2">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
            <Button
              key={status}
              variant={filterStatus === status ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFilterStatus(status)}
            >
              {status === 'all' ? 'Tất cả' : status === 'pending' ? 'Chờ duyệt' : status === 'approved' ? 'Đã duyệt' : 'Từ chối'}
            </Button>
          ))}
        </div>
      </Card>

      {/* Plans List */}
      {filteredPlans.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="Không có kế hoạch nào"
          description={filterStatus === 'all' ? 'Chưa có kế hoạch giảng dạy nào được gửi' : 'Không có kế hoạch nào ở trạng thái này'}
        />
      ) : (
        <div className="space-y-4">
          {filteredPlans.map((plan) => (
            <Card
              key={plan.id}
              className={`p-4 ${plan.priority === 'high' && plan.status === 'pending' ? 'border-l-4 border-l-danger' : ''}`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${
                  plan.status === 'pending' ? 'bg-warning/10' :
                  plan.status === 'approved' ? 'bg-success/10' : 'bg-danger/10'
                }`}>
                  <ClipboardCheck className={`w-6 h-6 ${
                    plan.status === 'pending' ? 'text-warning' :
                    plan.status === 'approved' ? 'text-success' : 'text-danger'
                  }`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="info" size="sm">{plan.subject}</Badge>
                        <Badge variant="default" size="sm">Khối {plan.grade}</Badge>
                        <Badge variant="default" size="sm">{plan.className}</Badge>
                        {plan.priority === 'high' && <Badge variant="danger" size="sm">Cao</Badge>}
                      </div>
                      <h3 className="font-medium text-text-primary">{plan.title}</h3>
                    </div>
                    <Badge
                      variant={
                        plan.status === 'pending' ? 'warning' :
                        plan.status === 'approved' ? 'success' : 'danger'
                      }
                      size="sm"
                    >
                      {plan.status === 'pending' ? 'Chờ duyệt' : plan.status === 'approved' ? 'Đã duyệt' : 'Từ chối'}
                    </Badge>
                  </div>

                  <div className="mt-3 flex items-center gap-4 text-sm text-text-secondary">
                    <div className="flex items-center gap-1">
                      <img
                        src={plan.submitter.avatar}
                        alt={plan.submitter.name}
                        className="w-5 h-5 rounded-full"
                      />
                      <span>{plan.submitter.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(plan.submittedAt).toLocaleDateString('vi-VN')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{plan.hours} tiết</span>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1">
                    {plan.topics.map((topic) => (
                      <Badge key={topic} variant="default" size="sm">{topic}</Badge>
                    ))}
                  </div>

                  {plan.comments && (
                    <div className="mt-3 p-3 bg-surface-neutral rounded-lg">
                      <div className="flex items-center gap-1 text-xs text-text-secondary mb-1">
                        <MessageSquare className="w-3 h-3" />
                        <span>Ghi chú:</span>
                      </div>
                      <p className="text-sm text-text-primary">{plan.comments}</p>
                    </div>
                  )}

                  <div className="mt-4 flex gap-2">
                    {plan.status === 'pending' ? (
                      <>
                        <Button variant="primary" size="sm" onClick={() => viewDetail(plan)}>
                          <Eye className="w-4 h-4 mr-1" />
                          Xem chi tiết
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => { setSelectedPlan(plan); setShowDetailModal(true); }}>
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Duyệt
                        </Button>
                      </>
                    ) : (
                      <Button variant="secondary" size="sm" onClick={() => viewDetail(plan)}>
                        <Eye className="w-4 h-4 mr-1" />
                        Xem chi tiết
                      </Button>
                    )}
                    <Button variant="ghost" size="sm">
                      <Download className="w-4 h-4 mr-1" />
                      Tải về
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedPlan && (
        <Modal
          isOpen={showDetailModal}
          onClose={() => { setShowDetailModal(false); setSelectedPlan(null); setReviewComment(''); }}
          title="Chi tiết Kế hoạch giảng dạy"
          size="lg"
        >
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2">
              <Badge variant="info">{selectedPlan.subject}</Badge>
              <Badge variant="default">Khối {selectedPlan.grade}</Badge>
              <Badge variant="default">{selectedPlan.className}</Badge>
              <Badge
                variant={
                  selectedPlan.status === 'pending' ? 'warning' :
                  selectedPlan.status === 'approved' ? 'success' : 'danger'
                }
              >
                {selectedPlan.status === 'pending' ? 'Chờ duyệt' : selectedPlan.status === 'approved' ? 'Đã duyệt' : 'Từ chối'}
              </Badge>
            </div>

            <div>
              <h3 className="text-lg font-medium text-text-primary">{selectedPlan.title}</h3>
              <p className="text-sm text-text-secondary mt-1">{selectedPlan.hours} tiết</p>
            </div>

            {/* Submitter */}
            <div className="p-4 bg-surface-neutral rounded-lg">
              <div className="flex items-center gap-3">
                <img
                  src={selectedPlan.submitter.avatar}
                  alt={selectedPlan.submitter.name}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <p className="font-medium text-text-primary">{selectedPlan.submitter.name}</p>
                  <p className="text-xs text-text-secondary">{selectedPlan.submitter.email}</p>
                </div>
              </div>
            </div>

            {/* Objectives */}
            <div>
              <h4 className="text-sm font-medium text-text-primary mb-2">Mục tiêu bài học</h4>
              <p className="text-sm text-text-secondary">{selectedPlan.objectives}</p>
            </div>

            {/* Topics */}
            <div>
              <h4 className="text-sm font-medium text-text-primary mb-2">Nội dung chính</h4>
              <div className="flex flex-wrap gap-2">
                {selectedPlan.topics.map((topic) => (
                  <Badge key={topic} variant="default">{topic}</Badge>
                ))}
              </div>
            </div>

            {/* Materials */}
            <div>
              <h4 className="text-sm font-medium text-text-primary mb-2">Phương tiện giảng dạy</h4>
              <ul className="list-disc list-inside text-sm text-text-secondary">
                {selectedPlan.materials.map((material) => (
                  <li key={material}>{material}</li>
                ))}
              </ul>
            </div>

            {/* Previous Comments */}
            {selectedPlan.comments && (
              <div className="p-4 bg-surface-neutral rounded-lg">
                <p className="text-xs font-medium text-text-secondary mb-1">Ghi chú phê duyệt:</p>
                <p className="text-sm text-text-primary">{selectedPlan.comments}</p>
                {selectedPlan.reviewedBy && (
                  <p className="text-xs text-text-secondary mt-2">
                    Người duyệt: {selectedPlan.reviewedBy} • {selectedPlan.reviewedAt && new Date(selectedPlan.reviewedAt).toLocaleString('vi-VN')}
                  </p>
                )}
              </div>
            )}

            {/* Review Comment */}
            {selectedPlan.status === 'pending' && (
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Nhận xét (tùy chọn)
                </label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Nhập nhận xét của bạn..."
                  className="w-full px-3 py-2 border border-hairline rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean/30"
                  rows={3}
                />
              </div>
            )}

            {/* Actions */}
            {selectedPlan.status === 'pending' && (
              <div className="flex gap-3 pt-4">
                <Button variant="primary" className="flex-1" onClick={() => handleApprove(selectedPlan.id)}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Duyệt kế hoạch
                </Button>
                <Button variant="secondary" className="flex-1" onClick={() => handleReject(selectedPlan.id)}>
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

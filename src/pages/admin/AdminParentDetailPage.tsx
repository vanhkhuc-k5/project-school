/**
 * Admin Parent Detail Page
 * Phase 08 - Parent & Guardian Management
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Users, ChevronRight, ArrowLeft, UserPlus, UserMinus, Star, StarOff,
  Edit2, Phone, Mail, Check, X, Shield, MessageSquare, FileText, RefreshCw
} from 'lucide-react';
import { api } from '../../services/api';

// ============================================================================
// Types
// ============================================================================

interface Child {
  link_id: string;
  relationship: string;
  is_primary_contact: number;
  is_verified: number;
  is_active: number;
  notes?: string;
  student_id: string;
  student_name: string;
  student_code: string;
  class_id: string;
  class_name: string;
  grade_level: number;
  gpa: number;
  class_rank?: string;
}

interface Parent {
  user_id: string;
  name: string;
  email: string;
  phone: string;
  code: string;
  is_active: number;
  created_at: string;
  avatar?: string;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

// ============================================================================
// Toast Component
// ============================================================================

function Toast({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const colors = {
    success: 'bg-green-50 border-green-500 text-green-800',
    error: 'bg-red-50 border-red-500 text-red-800',
    warning: 'bg-yellow-50 border-yellow-500 text-yellow-800',
    info: 'bg-blue-50 border-blue-500 text-blue-800',
  };

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg ${colors[toast.type]}`}>
      <span className="flex-1 text-sm font-medium">{toast.message}</span>
      <button onClick={() => onDismiss(toast.id)} className="hover:opacity-70">✕</button>
    </div>
  );
}

// ============================================================================
// Loading State
// ============================================================================

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-10 h-10 border-4 border-[#1C6FA8]/30 border-t-[#1C6FA8] rounded-full animate-spin mb-4" />
      <span className="text-sm text-[#6B7280]">Đang tải dữ liệu...</span>
    </div>
  );
}

// ============================================================================
// Relationship Badge
// ============================================================================

function RelationshipBadge({ relationship }: { relationship: string }) {
  const styles: Record<string, string> = {
    father: 'bg-blue-100 text-blue-700',
    mother: 'bg-pink-100 text-pink-700',
    guardian: 'bg-purple-100 text-purple-700',
    grandparent: 'bg-orange-100 text-orange-700',
    other: 'bg-gray-100 text-gray-700',
  };

  const labels: Record<string, string> = {
    father: 'Cha',
    mother: 'Mẹ',
    guardian: 'Người giám hộ',
    grandparent: 'Ông/Bà',
    other: 'Khác',
  };

  return (
    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${styles[relationship] || styles.other}`}>
      {labels[relationship] || relationship}
    </span>
  );
}

// ============================================================================
// Link Child Modal
// ============================================================================

function LinkChildModal({ isOpen, onClose, onLink, parentId, parentName }: {
  isOpen: boolean;
  onClose: () => void;
  onLink: (studentId: string, relationship: string, isPrimary: boolean) => Promise<void>;
  parentId: string;
  parentName: string;
}) {
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [relationship, setRelationship] = useState('father');
  const [isPrimary, setIsPrimary] = useState(false);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<Array<{
    student_id: string;
    student_name: string;
    student_code: string;
    class_name: string;
    grade_level: number;
  }>>([]);

  useEffect(() => {
    if (isOpen) {
      api.getAvailableStudentsForParent(parentId, { search }).then(setStudents);
    }
  }, [isOpen, search, parentId]);

  const handleLink = async () => {
    if (!selectedStudent) return;
    setLoading(true);
    try {
      await onLink(selectedStudent, relationship, isPrimary);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <div>
            <h3 className="text-lg font-bold text-[#0F3D5C]">Liên kết con cái</h3>
            <p className="text-sm text-[#6B7280]">{parentName}</p>
          </div>
          <button onClick={onClose} className="hover:opacity-70"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1">Tìm học sinh</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nhập tên hoặc mã học sinh..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8]"
            />
          </div>

          {/* Student List */}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {students.map((student) => (
              <div
                key={student.student_id}
                onClick={() => setSelectedStudent(student.student_id)}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedStudent === student.student_id
                    ? 'border-[#1C6FA8] bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="font-medium text-[#0F3D5C]">{student.student_name}</div>
                <div className="text-xs text-[#6B7280]">
                  {student.student_code} • {student.class_name} - Khối {student.grade_level}
                </div>
              </div>
            ))}
            {students.length === 0 && (
              <p className="text-center text-sm text-[#6B7280] py-4">Không tìm thấy học sinh</p>
            )}
          </div>

          {/* Relationship */}
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1">Quan hệ</label>
            <select
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8]"
            >
              <option value="father">Cha</option>
              <option value="mother">Mẹ</option>
              <option value="guardian">Người giám hộ</option>
              <option value="grandparent">Ông/Bà</option>
              <option value="other">Khác</option>
            </select>
          </div>

          {/* Primary Contact */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPrimary"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <label htmlFor="isPrimary" className="text-sm text-[#374151]">
              Đặt làm liên hệ chính
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-[#6B7280] border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              onClick={handleLink}
              disabled={!selectedStudent || loading}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[#1C6FA8] rounded-lg hover:bg-[#0F3D5C] disabled:opacity-50"
            >
              {loading ? 'Đang liên kết...' : 'Liên kết'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export function AdminParentDetailPage() {
  const { parentId } = useParams<{ parentId: string }>();
  const navigate = useNavigate();

  const [parent, setParent] = useState<Parent | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [stats, setStats] = useState({ linkedChildren: 0, messageCount: 0, leaveRequestCount: 0 });
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Modal states
  const [showLinkModal, setShowLinkModal] = useState(false);

  const showToast = useCallback((type: Toast['type'], message: string) => {
    const id = `toast_${Date.now()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const fetchData = useCallback(async () => {
    if (!parentId) return;
    setLoading(true);
    try {
      const data = await api.getParentDetail(parentId);
      if (data) {
        setParent(data.parent);
        setChildren(data.children);
        setStats(data.stats);
      }
    } catch {
      showToast('error', 'Không thể tải thông tin phụ huynh');
    } finally {
      setLoading(false);
    }
  }, [parentId, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLinkChild = async (studentId: string, relationship: string, isPrimary: boolean) => {
    if (!parentId) return;
    const res = await api.linkChildToParent(parentId, {
      studentId,
      relationship,
      isPrimaryContact: isPrimary,
    });
    if (res.success) {
      showToast('success', 'Đã liên kết học sinh');
      fetchData();
    } else {
      showToast('error', res.message || 'Không thể liên kết');
    }
  };

  const handleUnlinkChild = async (studentId: string) => {
    if (!parentId || !confirm('Bạn có chắc muốn hủy liên kết?')) return;
    const res = await api.unlinkChildFromParent(parentId, studentId);
    if (res.success) {
      showToast('success', 'Đã hủy liên kết');
      fetchData();
    } else {
      showToast('error', res.message || 'Không thể hủy liên kết');
    }
  };

  const handleSetPrimaryContact = async (studentId: string) => {
    if (!parentId) return;
    const res = await api.updateParentChildLink(parentId, studentId, { isPrimaryContact: true });
    if (res.success) {
      showToast('success', 'Đã đặt làm liên hệ chính');
      fetchData();
    } else {
      showToast('error', res.message || 'Không thể đặt liên hệ chính');
    }
  };

  const handleToggleStatus = async () => {
    if (!parentId || !parent) return;
    const newStatus = !parent.is_active;
    const res = await api.setParentAccountStatus(parentId, newStatus);
    if (res.success) {
      showToast('success', newStatus ? 'Đã kích hoạt tài khoản' : 'Đã vô hiệu hóa tài khoản');
      setParent({ ...parent, is_active: newStatus ? 1 : 0 });
    } else {
      showToast('error', res.message || 'Không thể thay đổi trạng thái');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center">
        <LoadingState />
      </div>
    );
  }

  if (!parent) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center">
        <div className="text-center">
          <Users className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#0F3D5C] mb-2">Không tìm thấy phụ huynh</h2>
          <button
            onClick={() => navigate('/admin/parents')}
            className="px-4 py-2 bg-[#1C6FA8] text-white rounded-lg hover:bg-[#0F3D5C]"
          >
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  const activeChildren = children.filter(c => c.is_active);

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate('/admin/parents')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5 text-[#6B7280]" />
            </button>
            <div className="flex items-center gap-2 text-sm text-[#6B7280]">
              <span>Quản trị</span>
              <ChevronRight className="w-4 h-4" />
              <button onClick={() => navigate('/admin/parents')} className="hover:text-[#1C6FA8]">Phụ huynh</button>
              <ChevronRight className="w-4 h-4" />
              <span className="text-[#0F3D5C]">{parent.name}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#E8F2FA] flex items-center justify-center">
                <span className="text-2xl font-bold text-[#1C6FA8]">
                  {(parent.name || 'PH').charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#0F3D5C]">{parent.name}</h1>
                <div className="flex items-center gap-3 mt-1">
                  {parent.phone && (
                    <span className="flex items-center gap-1 text-sm text-[#6B7280]">
                      <Phone className="w-4 h-4" /> {parent.phone}
                    </span>
                  )}
                  {parent.email && (
                    <span className="flex items-center gap-1 text-sm text-[#6B7280]">
                      <Mail className="w-4 h-4" /> {parent.email}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleStatus}
                className={`px-4 py-2 rounded-lg font-medium ${
                  parent.is_active
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                {parent.is_active ? 'Vô hiệu hóa' : 'Kích hoạt'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Info & Stats */}
          <div className="lg:col-span-1 space-y-6">
            {/* Account Status */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-[#374151] mb-3">Trạng thái tài khoản</h3>
              <div className="flex items-center gap-2">
                {parent.is_active ? (
                  <span className="inline-flex items-center px-3 py-1 text-sm font-medium bg-green-100 text-green-700 rounded-full">
                    <Check className="w-4 h-4 mr-1" /> Hoạt động
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 text-sm font-medium bg-red-100 text-red-700 rounded-full">
                    <X className="w-4 h-4 mr-1" /> Vô hiệu
                  </span>
                )}
              </div>
            </div>

            {/* Communication Stats */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-[#374151] mb-3">Hoạt động</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#6B7280]">Tin nhắn</span>
                  <span className="font-medium text-[#374151]">{stats.messageCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#6B7280]">Đơn nghỉ phép</span>
                  <span className="font-medium text-[#374151]">{stats.leaveRequestCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#6B7280]">Ngày tạo tài khoản</span>
                  <span className="font-medium text-[#374151]">
                    {new Date(parent.created_at).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Children */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-semibold text-[#0F3D5C]">
                  Con cái ({activeChildren.length})
                </h3>
                <button
                  onClick={() => setShowLinkModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#1C6FA8] text-white rounded-lg hover:bg-[#0F3D5C]"
                >
                  <UserPlus className="w-4 h-4" />
                  Liên kết con
                </button>
              </div>

              {activeChildren.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-[#6B7280]">Chưa có con nào được liên kết</p>
                  <button
                    onClick={() => setShowLinkModal(true)}
                    className="mt-3 px-4 py-2 bg-[#1C6FA8] text-white rounded-lg hover:bg-[#0F3D5C]"
                  >
                    Liên kết con đầu tiên
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {activeChildren.map((child) => (
                    <div key={child.link_id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-full bg-[#E8F2FA] flex items-center justify-center">
                            <span className="text-lg font-bold text-[#1C6FA8]">
                              {(child.student_name || 'HS').charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-[#0F3D5C]">{child.student_name}</span>
                              <RelationshipBadge relationship={child.relationship} />
                              {child.is_primary_contact ? (
                                <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">
                                  <Star className="w-3 h-3 mr-1" /> Liên hệ chính
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleSetPrimaryContact(child.student_id)}
                                  className="inline-flex items-center px-2 py-1 text-xs font-medium text-[#6B7280] hover:text-yellow-600"
                                  title="Đặt làm liên hệ chính"
                                >
                                  <StarOff className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                            <div className="text-sm text-[#6B7280] mt-1">
                              {child.student_code} • {child.class_name} - Khối {child.grade_level}
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-sm">
                              <span className="text-[#374151]">
                                GPA: <strong>{child.gpa?.toFixed(2) || '—'}</strong>
                              </span>
                              {child.class_rank && (
                                <span className="text-[#374151]">
                                  Xếp hạng: <strong>{child.class_rank}</strong>
                                </span>
                              )}
                            </div>
                            {child.notes && (
                              <div className="text-xs text-[#6B7280] mt-2 italic">{child.notes}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleUnlinkChild(child.student_id)}
                            className="p-2 text-[#6B7280] hover:bg-red-50 hover:text-red-600 rounded-lg"
                            title="Hủy liên kết"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Link Child Modal */}
      <LinkChildModal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        onLink={handleLinkChild}
        parentId={parentId || ''}
        parentName={parent.name}
      />

      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </div>
    </div>
  );
}

export default AdminParentDetailPage;

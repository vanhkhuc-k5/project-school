/**
 * Admin Class Structure Page
 * Phase 05 - Class Structure & Student Leadership
 * 
 * Features:
 * - View class structure with groups and positions
 * - Create/edit/archive groups
 * - Add/remove group members
 * - Assign class monitor and group leaders
 * - View position history
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Users, ChevronRight, ChevronLeft, ArrowLeft, Plus, Edit2, Trash2,
  UserCheck, Crown, X, Check, AlertTriangle, Building, RefreshCw,
  UserPlus, UserMinus, Shield
} from 'lucide-react';
import { api } from '../../services/api';
import type { ClassStructure, ClassGroup } from '../../types';

// ============================================================================
// Types
// ============================================================================

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

type ViewMode = 'class' | 'group';

interface GroupFormData {
  name: string;
  description: string;
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
      <button onClick={() => onDismiss(toast.id)} className="hover:opacity-70">
        <X className="w-4 h-4" />
      </button>
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
      <span className="text-sm text-[#6B7280]">Đang tải cấu trúc lớp...</span>
    </div>
  );
}

// ============================================================================
// Badge Component
// ============================================================================

function StatusBadge({ status, type }: { status: string; type: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }) {
  const styles = {
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
    neutral: 'bg-gray-100 text-gray-700',
  };
  return (
    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${styles[type]}`}>
      {status}
    </span>
  );
}

// ============================================================================
// Create/Edit Group Modal
// ============================================================================

function GroupModal({ isOpen, onClose, onSave, group }: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: GroupFormData) => Promise<void>;
  group?: ClassGroup | null;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (group) {
      setName(group.name);
      setDescription(group.description || '');
    } else {
      setName('');
      setDescription('');
    }
    setErrors({});
  }, [group, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Tên nhóm không được để trống';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      await onSave({ name: name.trim(), description: description.trim() });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-bold text-[#0F3D5C]">
            {group ? 'Cập nhật nhóm' : 'Tạo nhóm mới'}
          </h3>
          <button onClick={onClose} className="hover:opacity-70"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1">
              Tên nhóm <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Nhóm 1, Nhóm A"
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8] ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1">Mô tả</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả nhóm (tùy chọn)"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8]"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-[#6B7280] border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[#1C6FA8] rounded-lg hover:bg-[#0F3D5C] disabled:opacity-50"
            >
              {loading ? 'Đang lưu...' : group ? 'Cập nhật' : 'Tạo mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// Add Member Modal
// ============================================================================

function AddMemberModal({ isOpen, onClose, onAdd, classId }: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (studentId: string) => Promise<void>;
  classId: string;
}) {
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // In real implementation, fetch class members from API
  // For now, use mock data
  const availableStudents = [
    { id: '1', name: 'Nguyễn Văn A', code: 'HS001' },
    { id: '2', name: 'Trần Thị B', code: 'HS002' },
    { id: '3', name: 'Lê Văn C', code: 'HS003' },
  ];

  const filteredStudents = availableStudents.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async () => {
    if (!selectedStudent) return;
    setLoading(true);
    try {
      await onAdd(selectedStudent);
      onClose();
      setSelectedStudent(null);
      setSearch('');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-bold text-[#0F3D5C]">Thêm thành viên</h3>
          <button onClick={onClose} className="hover:opacity-70"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm học sinh..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8]"
            />
          </div>
          <div className="max-h-48 overflow-y-auto space-y-2">
            {filteredStudents.map((student) => (
              <div
                key={student.id}
                onClick={() => setSelectedStudent(student.id)}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedStudent === student.id
                    ? 'border-[#1C6FA8] bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="font-medium text-[#0F3D5C]">{student.name}</div>
                <div className="text-xs text-[#6B7280]">{student.code}</div>
              </div>
            ))}
            {filteredStudents.length === 0 && (
              <p className="text-center text-sm text-[#6B7280] py-4">Không tìm thấy học sinh</p>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-[#6B7280] border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              onClick={handleAdd}
              disabled={!selectedStudent || loading}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[#1C6FA8] rounded-lg hover:bg-[#0F3D5C] disabled:opacity-50"
            >
              {loading ? 'Đang thêm...' : 'Thêm'}
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

export function AdminClassStructurePage() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();

  const [structure, setStructure] = useState<ClassStructure | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Modal states
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ClassGroup | null>(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<ClassGroup | null>(null);

  const showToast = useCallback((type: Toast['type'], message: string) => {
    const id = `toast_${Date.now()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const fetchStructure = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getClassStructure(classId);
      if (data) {
        setStructure(data as ClassStructure);
      } else {
        setError('Không tìm thấy cấu trúc lớp');
      }
    } catch {
      setError('Lỗi khi tải cấu trúc lớp');
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    fetchStructure();
  }, [fetchStructure]);

  const handleCreateGroup = async (data: GroupFormData) => {
    if (!classId) return;
    const res = await api.createGroup(classId, data);
    if (res.success) {
      showToast('success', 'Đã tạo nhóm mới');
      fetchStructure();
    } else {
      showToast('error', res.message || 'Không thể tạo nhóm');
    }
  };

  const handleUpdateGroup = async (data: GroupFormData) => {
    if (!editingGroup) return;
    const res = await api.updateGroup(editingGroup.id, data);
    if (res.success) {
      showToast('success', 'Đã cập nhật nhóm');
      setEditingGroup(null);
      fetchStructure();
    } else {
      showToast('error', res.message || 'Không thể cập nhật nhóm');
    }
  };

  const handleArchiveGroup = async (groupId: string) => {
    if (!confirm('Bạn có chắc muốn lưu trữ nhóm này?')) return;
    const res = await api.archiveGroup(groupId);
    if (res.success) {
      showToast('success', 'Đã lưu trữ nhóm');
      fetchStructure();
    } else {
      showToast('error', res.message || 'Không thể lưu trữ nhóm');
    }
  };

  const handleAddMember = async (studentId: string) => {
    if (!selectedGroup) return;
    const res = await api.addGroupMember(selectedGroup.id, { studentId });
    if (res.success) {
      showToast('success', 'Đã thêm thành viên');
      setShowAddMemberModal(false);
      fetchStructure();
    } else {
      showToast('error', res.message || 'Không thể thêm thành viên');
    }
  };

  const handleRemoveMember = async (groupId: string, studentId: string) => {
    if (!confirm('Bạn có chắc muốn xóa thành viên này khỏi nhóm?')) return;
    const res = await api.removeGroupMember(groupId, studentId);
    if (res.success) {
      showToast('success', 'Đã xóa thành viên');
      fetchStructure();
    } else {
      showToast('error', res.message || 'Không thể xóa thành viên');
    }
  };

  const handleAssignLeader = async (groupId: string, studentId: string) => {
    const res = await api.assignGroupLeader(groupId, { 
      studentId, 
      academicYear: structure?.academicYear 
    });
    if (res.success) {
      showToast('success', 'Đã назначить nhóm trưởng');
      fetchStructure();
    } else {
      showToast('error', res.message || 'Không thể назначить nhóm trưởng');
    }
  };

  const handleAssignMonitor = async (studentId: string) => {
    if (!classId) return;
    const res = await api.assignClassMonitor(classId, { 
      studentId, 
      academicYear: structure?.academicYear 
    });
    if (res.success) {
      showToast('success', 'Đã назначить lớp trưởng');
      fetchStructure();
    } else {
      showToast('error', res.message || 'Không thể назначить lớp trưởng');
    }
  };

  const handleRemoveMonitor = async () => {
    if (!classId || !confirm('Bạn có chắc muốn xóa lớp trưởng?')) return;
    const res = await api.removeClassMonitor(classId, structure?.academicYear);
    if (res.success) {
      showToast('success', 'Đã xóa lớp trưởng');
      fetchStructure();
    } else {
      showToast('error', res.message || 'Không thể xóa lớp trưởng');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center">
        <LoadingState />
      </div>
    );
  }

  if (error || !structure) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#0F3D5C] mb-2">{error || 'Không tìm thấy cấu trúc lớp'}</h2>
          <button
            onClick={() => navigate('/admin/academic')}
            className="px-4 py-2 bg-[#1C6FA8] text-white rounded-lg hover:bg-[#0F3D5C]"
          >
            Quay lại thiết lập học vụ
          </button>
        </div>
      </div>
    );
  }

  const { class: classData, groups, classMonitor, members } = structure;

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate('/admin/academic')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5 text-[#6B7280]" />
            </button>
            <div className="flex items-center gap-2 text-sm text-[#6B7280]">
              <span>Quản trị</span>
              <ChevronRight className="w-4 h-4" />
              <button onClick={() => navigate('/admin/academic')} className="hover:text-[#1C6FA8]">Thiết lập Học vụ</button>
              <ChevronRight className="w-4 h-4" />
              <span className="text-[#0F3D5C]">Cấu trúc lớp</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#0F3D5C]">{classData.name}</h1>
              <p className="text-sm text-[#6B7280] mt-1">
                Khối {classData.grade_level} • {classData.academic_year}
                {classData.homeroom_teacher_name && ` • GVCN: ${classData.homeroom_teacher_name}`}
              </p>
            </div>
            <button
              onClick={() => { setEditingGroup(null); setShowGroupModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-[#1C6FA8] text-white rounded-lg hover:bg-[#0F3D5C]"
            >
              <Plus className="w-4 h-4" />
              Thêm nhóm
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Class Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Class Monitor */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[#374151]">Lớp trưởng</h3>
                <Shield className="w-5 h-5 text-[#1C6FA8]" />
              </div>
              {classMonitor ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#E8F2FA] flex items-center justify-center">
                      <Crown className="w-6 h-6 text-yellow-500" />
                    </div>
                    <div>
                      <div className="font-medium text-[#0F3D5C]">
                        {classMonitor.student_name || 'Chưa có tên'}
                      </div>
                      <div className="text-xs text-[#6B7280]">{classMonitor.student_code}</div>
                    </div>
                  </div>
                  <button
                    onClick={handleRemoveMonitor}
                    className="w-full px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                  >
                    Xóa lớp trưởng
                  </button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <UserCheck className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-[#6B7280] mb-3">Chưa có lớp trưởng</p>
                  <button
                    onClick={() => {/* Open assign monitor modal */}}
                    className="px-4 py-2 text-sm bg-[#1C6FA8] text-white rounded-lg hover:bg-[#0F3D5C]"
                  >
                    Chỉ định lớp trưởng
                  </button>
                </div>
              )}
            </div>

            {/* Class Members */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-[#374151] mb-4">
                Thành viên lớp ({members.length})
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {members.map((member) => (
                  <div key={member.user_id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-[#E8F2FA] flex items-center justify-center">
                      <span className="text-xs font-bold text-[#1C6FA8]">
                        {(member.name || 'HS').charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#0F3D5C] truncate">{member.name}</div>
                      <div className="text-xs text-[#6B7280]">{member.code}</div>
                    </div>
                  </div>
                ))}
                {members.length === 0 && (
                  <p className="text-sm text-[#6B7280] text-center py-4">Chưa có thành viên</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Groups */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-gray-200 rounded-xl">
              <div className="p-4 border-b">
                <h3 className="text-sm font-semibold text-[#374151]">
                  Nhóm học tập ({groups.length})
                </h3>
              </div>
              <div className="p-4 space-y-4">
                {groups.map((group) => (
                  <div key={group.id} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Building className="w-5 h-5 text-[#1C6FA8]" />
                        <h4 className="font-semibold text-[#0F3D5C]">{group.name}</h4>
                        {!group.is_active && <StatusBadge status="Đã lưu trữ" type="neutral" />}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setSelectedGroup(group); setShowAddMemberModal(true); }}
                          className="p-2 text-[#6B7280] hover:bg-blue-50 hover:text-[#1C6FA8] rounded-lg"
                          title="Thêm thành viên"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setEditingGroup(group); setShowGroupModal(true); }}
                          className="p-2 text-[#6B7280] hover:bg-gray-100 rounded-lg"
                          title="Sửa nhóm"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleArchiveGroup(group.id)}
                          className="p-2 text-[#6B7280] hover:bg-red-50 hover:text-red-600 rounded-lg"
                          title="Lưu trữ nhóm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {group.description && (
                      <p className="text-sm text-[#6B7280] mb-3">{group.description}</p>
                    )}
                    <div className="text-sm text-[#6B7280] mb-3">
                      {group.member_count || 0} thành viên
                    </div>
                    {group.leader_name && (
                      <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded-lg mb-3">
                        <Crown className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm font-medium text-yellow-800">
                          Nhóm trưởng: {group.leader_name}
                        </span>
                      </div>
                    )}
                    <button
                      onClick={() => handleAssignLeader(group.id, 'temp-student-id')}
                      className="text-sm text-[#1C6FA8] hover:underline"
                    >
                      {group.leader_name ? 'Thay đổi nhóm trưởng' : 'Chỉ định nhóm trưởng'}
                    </button>
                  </div>
                ))}
                {groups.length === 0 && (
                  <div className="text-center py-12">
                    <Building className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-600 mb-2">Chưa có nhóm</h3>
                    <p className="text-sm text-gray-500 mb-4">Tạo nhóm học tập để quản lý</p>
                    <button
                      onClick={() => { setEditingGroup(null); setShowGroupModal(true); }}
                      className="px-4 py-2 bg-[#1C6FA8] text-white rounded-lg hover:bg-[#0F3D5C]"
                    >
                      Tạo nhóm đầu tiên
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <GroupModal
        isOpen={showGroupModal}
        onClose={() => { setShowGroupModal(false); setEditingGroup(null); }}
        onSave={editingGroup ? handleUpdateGroup : handleCreateGroup}
        group={editingGroup}
      />
      <AddMemberModal
        isOpen={showAddMemberModal}
        onClose={() => { setShowAddMemberModal(false); setSelectedGroup(null); }}
        onAdd={handleAddMember}
        classId={classId || ''}
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

export default AdminClassStructurePage;

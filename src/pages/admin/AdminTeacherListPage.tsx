/**
 * Admin Teacher List Page
 * Phase 04 - Teacher Management
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Search, Filter, ChevronRight, Edit2, Eye, RefreshCw,
  X, Check, AlertTriangle, ChevronDown, ChevronUp, GraduationCap,
  BookOpen, Clock, UserCheck, UserX, Building
} from 'lucide-react';
import { api } from '../../services/api';
import type { Teacher } from '../../types';

// ============================================================================
// Types
// ============================================================================

type FilterStatus = 'all' | 'active' | 'inactive';

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
      <button onClick={() => onDismiss(toast.id)} className="hover:opacity-70">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ============================================================================
// Empty State Component
// ============================================================================

function EmptyState({ icon: Icon, title, description }: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-full bg-[#E8F2FA] flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-[#1C6FA8]" />
      </div>
      <h3 className="text-lg font-semibold text-[#0F3D5C] mb-2">{title}</h3>
      <p className="text-sm text-[#6B7280] text-center max-w-md">{description}</p>
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
// Teacher Edit Modal
// ============================================================================

function TeacherEditModal({ isOpen, onClose, onSave, teacher }: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name?: string; phone?: string; isActive?: boolean }) => Promise<void>;
  teacher: Teacher | null;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (teacher) {
      setName(teacher.name || '');
      setPhone(teacher.phone || '');
      setIsActive(teacher.is_active !== false);
    }
  }, [teacher, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await onSave({ name: name.trim(), phone: phone.trim() || undefined, isActive });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h3 className="text-lg font-bold text-[#0F3D5C]">Cập nhật giáo viên</h3>
          <button onClick={onClose} className="hover:opacity-70"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1">Họ và tên</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8]"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1">Số điện thoại</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="VD: 0901234567"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8]"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-[#1C6FA8] border-gray-300 rounded focus:ring-[#1C6FA8]"
            />
            <span className="text-sm text-[#374151]">Đang giảng dạy (hoạt động)</span>
          </label>
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
              {loading ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export function AdminTeacherListPage() {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Edit modal
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const showToast = useCallback((type: Toast['type'], message: string) => {
    const id = `toast_${Date.now()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Parameters<typeof api.getTeachers>[0] = {
        page: pagination.page,
        limit: 20,
      };
      if (search) params.search = search;
      if (departmentFilter) params.department = departmentFilter;
      if (statusFilter === 'active') params.status = 'active';
      if (statusFilter === 'inactive') params.status = 'inactive';

      const result = await api.getTeachers(params);
      setTeachers(result.teachers as Teacher[]);
      setPagination((prev) => ({ ...prev, total: result.pagination.total, totalPages: result.pagination.totalPages }));
    } catch {
      showToast('error', 'Không thể tải danh sách giáo viên');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, search, departmentFilter, statusFilter, showToast]);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const handleEditTeacher = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setShowEditModal(true);
  };

  const handleSaveTeacher = async (data: { name?: string; phone?: string; isActive?: boolean }) => {
    if (!editingTeacher?.id) return;
    const res = await api.updateTeacher(editingTeacher.id, data);
    if (res.success) {
      showToast('success', 'Đã cập nhật thông tin giáo viên');
      fetchTeachers();
    } else {
      showToast('error', res.message || 'Không thể cập nhật giáo viên');
    }
  };

  const handleViewTeacher = (teacher: Teacher) => {
    if (teacher.id) {
      navigate(`/admin/teachers/${teacher.id}`);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchTeachers();
  };

  // Calculate stats
  const activeTeachers = teachers.filter((t) => t.is_active !== false).length;
  const homeroomTeachers = teachers.filter((t) => t.workload?.isHomeroom).length;

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-[#6B7280] mb-1">
            <span>Quản trị</span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-[#0F3D5C]">Quản lý Giáo viên</span>
          </div>
          <h1 className="text-2xl font-bold text-[#0F3D5C]">Quản lý Giáo viên</h1>
          <p className="text-sm text-[#6B7280] mt-1">
            {pagination.total} giáo viên • {activeTeachers} đang giảng dạy • {homeroomTeachers} chủ nhiệm
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Search and Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <form onSubmit={handleSearchSubmit} className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo tên, mã giáo viên..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8]"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-[#1C6FA8] text-white rounded-lg font-medium hover:bg-[#0F3D5C] transition-colors"
            >
              Tìm kiếm
            </button>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 border rounded-lg font-medium transition-colors ${
                showFilters ? 'bg-[#E8F2FA] text-[#1C6FA8] border-[#1C6FA8]' : 'text-[#6B7280] border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
            </button>
          </form>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">Bộ môn</label>
                <select
                  value={departmentFilter ?? ''}
                  onChange={(e) => { setDepartmentFilter(e.target.value || null); setPagination((p) => ({ ...p, page: 1 })); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8]"
                >
                  <option value="">Tất cả bộ môn</option>
                  <option value="Tổ Toán - Tin học">Tổ Toán - Tin học</option>
                  <option value="Tổ Khoa học Tự nhiên">Tổ Khoa học Tự nhiên</option>
                  <option value="Tổ Khoa học Xã hội">Tổ Khoa học Xã hội</option>
                  <option value="Tổ Ngoại ngữ">Tổ Ngoại ngữ</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">Trạng thái</label>
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value as FilterStatus); setPagination((p) => ({ ...p, page: 1 })); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8]"
                >
                  <option value="all">Tất cả</option>
                  <option value="active">Đang giảng dạy</option>
                  <option value="inactive">Đã nghỉ</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSearch('');
                    setDepartmentFilter(null);
                    setStatusFilter('all');
                    setPagination((p) => ({ ...p, page: 1 }));
                  }}
                  className="w-full px-4 py-2 text-sm text-[#6B7280] border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Xóa bộ lọc
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Teacher List */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <LoadingState />
          ) : teachers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Không tìm thấy giáo viên"
              description="Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc."
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#374151] uppercase tracking-wider">Giáo viên</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#374151] uppercase tracking-wider">Bộ môn</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#374151] uppercase tracking-wider">Lớp chủ nhiệm</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#374151] uppercase tracking-wider">Phân công</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#374151] uppercase tracking-wider">Trạng thái</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-[#374151] uppercase tracking-wider">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {teachers.map((teacher) => {
                      const isActive = teacher.is_active !== false;
                      return (
                        <tr key={teacher.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleViewTeacher(teacher)}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-[#E8F2FA] flex items-center justify-center overflow-hidden">
                                {teacher.avatar ? (
                                  <img src={teacher.avatar} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-sm font-bold text-[#1C6FA8]">
                                    {(teacher.name || 'GV').charAt(0).toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <div>
                                <div className="font-medium text-[#0F3D5C]">{teacher.name || 'Chưa có tên'}</div>
                                <div className="text-xs text-[#6B7280]">{teacher.code || teacher.id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 text-sm text-[#374151]">
                              <Building className="w-4 h-4 text-[#6B7280]" />
                              {teacher.department || '-'}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-[#374151]">
                              {teacher.homeroomClassName || '-'}
                            </div>
                            {teacher.homeroomGradeLevel && (
                              <div className="text-xs text-[#6B7280]">Khối {teacher.homeroomGradeLevel}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3 text-xs text-[#6B7280]">
                              {teacher.workload && (
                                <>
                                  <span className="flex items-center gap-1">
                                    <BookOpen className="w-3 h-3" />
                                    {teacher.workload.classes} lớp
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {teacher.workload.periods} tiết
                                  </span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {isActive ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                                <UserCheck className="w-3 h-3" />
                                Đang giảng dạy
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                                <UserX className="w-3 h-3" />
                                Đã nghỉ
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleViewTeacher(teacher)}
                                className="p-2 text-[#6B7280] hover:bg-blue-50 hover:text-[#1C6FA8] rounded-lg transition-colors"
                                title="Xem chi tiết"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleEditTeacher(teacher)}
                                className="p-2 text-[#6B7280] hover:bg-gray-100 rounded-lg transition-colors"
                                title="Sửa"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <div className="text-sm text-[#6B7280]">
                    Trang {pagination.page} / {pagination.totalPages} • {pagination.total} kết quả
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Trước
                    </button>
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page >= pagination.totalPages}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Sau
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <TeacherEditModal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setEditingTeacher(null); }}
        onSave={handleSaveTeacher}
        teacher={editingTeacher}
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

export default AdminTeacherListPage;

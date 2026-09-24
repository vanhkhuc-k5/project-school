/**
 * Admin Parent List Page
 * Phase 08 - Parent & Guardian Management
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Search, ChevronRight, ChevronLeft, UserPlus, Phone, Mail,
  UserCheck, UserX, Eye, Filter, RefreshCw
} from 'lucide-react';
import { api } from '../../services/api';

// ============================================================================
// Types
// ============================================================================

interface Parent {
  user_id: string;
  name: string;
  email: string;
  phone: string;
  code: string;
  is_active: number;
  created_at: string;
  child_count: number;
  has_primary: number;
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
// Parent Row Component
// ============================================================================

function ParentRow({ parent, onView }: { parent: Parent; onView: (id: string) => void }) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#E8F2FA] flex items-center justify-center">
            <span className="text-sm font-bold text-[#1C6FA8]">
              {(parent.name || 'PH').charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <div className="font-medium text-[#0F3D5C]">{parent.name}</div>
            <div className="text-xs text-[#6B7280]">{parent.code}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-[#374151]">
        {parent.phone || '-'}
      </td>
      <td className="px-4 py-3 text-sm text-[#374151]">
        {parent.email || '-'}
      </td>
      <td className="px-4 py-3 text-center">
        <div className="flex items-center justify-center gap-1">
          <Users className="w-4 h-4 text-[#6B7280]" />
          <span className="text-sm text-[#374151]">{parent.child_count}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-center">
        {parent.has_primary ? (
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
            Có
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
            Không
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-center">
        {parent.is_active ? (
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
            Hoạt động
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
            Vô hiệu
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={() => onView(parent.user_id)}
          className="p-2 text-[#6B7280] hover:bg-blue-50 hover:text-[#1C6FA8] rounded-lg"
          title="Xem chi tiết"
        >
          <Eye className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export function AdminParentListPage() {
  const navigate = useNavigate();
  const [parents, setParents] = useState<Parent[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const showToast = useCallback((type: Toast['type'], message: string) => {
    const id = `toast_${Date.now()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const fetchParents = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const data = await api.getParents({
        page,
        limit: 20,
        search: search || undefined,
        status: statusFilter || undefined,
      });
      if (data) {
        setParents(data.parents);
        setPagination(data.pagination);
      }
    } catch {
      showToast('error', 'Không thể tải danh sách phụ huynh');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, showToast]);

  useEffect(() => {
    fetchParents();
  }, [fetchParents]);

  const handleSearch = () => {
    fetchParents(1);
  };

  const handleView = (parentId: string) => {
    navigate(`/admin/parents/${parentId}`);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchParents(newPage);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-[#6B7280] mb-1">
            <span>Quản trị</span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-[#0F3D5C]">Quản lý Phụ huynh</span>
          </div>
          <h1 className="text-2xl font-bold text-[#0F3D5C]">Danh sách Phụ huynh</h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Quản lý tài khoản và liên kết phụ huynh - học sinh
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Search & Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Tìm theo tên, số điện thoại, email..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8]"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); fetchParents(1); }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8]"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="active">Hoạt động</option>
              <option value="inactive">Vô hiệu</option>
            </select>
            <button
              onClick={() => fetchParents(1)}
              className="px-4 py-2 bg-[#1C6FA8] text-white rounded-lg font-medium hover:bg-[#0F3D5C] transition-colors"
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Parent Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold text-[#0F3D5C]">
              Tổng cộng: {pagination.total} phụ huynh
            </h3>
            <button
              onClick={() => {/* Open add parent modal */}}
              className="flex items-center gap-2 px-4 py-2 bg-[#1C6FA8] text-white rounded-lg hover:bg-[#0F3D5C]"
            >
              <UserPlus className="w-4 h-4" />
              Thêm phụ huynh
            </button>
          </div>

          {loading ? (
            <LoadingState />
          ) : parents.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-[#6B7280]">Không tìm thấy phụ huynh nào</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#374151] uppercase">Phụ huynh</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#374151] uppercase">Điện thoại</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#374151] uppercase">Email</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-[#374151] uppercase">Số con</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-[#374151] uppercase">Liên hệ chính</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-[#374151] uppercase">Trạng thái</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {parents.map((parent) => (
                      <ParentRow key={parent.user_id} parent={parent} onView={handleView} />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="p-4 border-t flex items-center justify-between">
                  <div className="text-sm text-[#6B7280]">
                    Trang {pagination.page} / {pagination.totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.totalPages}
                      className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </div>
    </div>
  );
}

export default AdminParentListPage;

/**
 * Admin System Administration Page
 * Phase 12 - System Administration
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronRight, ChevronLeft, Users, Shield, Settings, Activity, Lock, Unlock,
  Search, Filter, RefreshCw, CheckCircle, XCircle, AlertTriangle, Clock,
  Eye, Download, Server, Database, ShieldCheck
} from 'lucide-react';
import { api } from '../../services/api';

// ============================================================================
// Types
// ============================================================================

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  code?: string;
  role: string;
  is_active: number;
  last_login?: string;
  created_at: string;
}

interface AuditLog {
  id: string;
  actor_id: string;
  actor_name: string;
  role: string;
  action: string;
  entity_type: string;
  entity_id: string;
  description: string;
  ip_address?: string;
  created_at: string;
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
// Users Tab Component
// ============================================================================

function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (type: Toast['type'], message: string) => {
    const id = `toast_${Date.now()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const data = await api.getSystemUsers({
        search: search || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        page,
        limit: 50,
      });
      setUsers(data.users);
      setPagination(data.pagination);
    } catch {
      showToast('error', 'Không thể tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggleStatus = async (user: User) => {
    const newStatus = !user.is_active;
    const res = await api.adminUpdateUserStatus(user.id, Boolean(newStatus));
    if (res.success) {
      showToast('success', newStatus ? 'Đã mở khóa tài khoản' : 'Đã khóa tài khoản');
      fetchUsers(pagination.page);
    } else {
      showToast('error', res.message || 'Không thể cập nhật');
    }
  };

  const roleLabels: Record<string, string> = {
    admin: 'Quản trị',
    school_admin: 'QTV Trường',
    super_admin: 'Super Admin',
    principal: 'Hiệu trưởng',
    vice_principal: 'Hiệu phó',
    department_head: 'Trưởng bộ môn',
    teacher: 'Giáo viên',
    student: 'Học sinh',
    parent: 'Phụ huynh',
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8]"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">Tất cả vai trò</option>
          {Object.entries(roleLabels).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="active">Hoạt động</option>
          <option value="inactive">Bị khóa</option>
        </select>
        <button
          onClick={() => fetchUsers(1)}
          className="px-4 py-2 bg-[#1C6FA8] text-white rounded-lg hover:bg-[#0F3D5C]"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-3 border-b flex items-center justify-between">
          <span className="text-sm font-medium text-[#374151]">{pagination.total} người dùng</span>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-8 h-8 text-[#1C6FA8] mx-auto animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#374151] uppercase">Người dùng</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#374151] uppercase">Vai trò</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#374151] uppercase">Trạng thái</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#374151] uppercase">Đăng nhập cuối</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#374151] uppercase">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#0F3D5C]">{user.name}</div>
                      <div className="text-xs text-[#6B7280]">{user.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                        {roleLabels[user.role] || user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {user.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded">
                          <CheckCircle className="w-3 h-3" /> Hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded">
                          <XCircle className="w-3 h-3" /> Bị khóa
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#6B7280]">
                      {user.last_login ? new Date(user.last_login).toLocaleDateString('vi-VN') : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleStatus(user)}
                        className={`p-2 rounded-lg ${
                          user.is_active
                            ? 'text-red-600 hover:bg-red-50'
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                        title={user.is_active ? 'Khóa tài khoản' : 'Mở khóa'}
                      >
                        {user.is_active ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-3 border-t flex items-center justify-between">
            <span className="text-sm text-[#6B7280]">Trang {pagination.page} / {pagination.totalPages}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchUsers(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => fetchUsers(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Toasts */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={() => {}} />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Audit Tab Component
// ============================================================================

function AuditTab() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const data = await api.adminGetAuditLogs({
        search: search || undefined,
        page,
        limit: 50,
      });
      setLogs(data.logs);
      setPagination(data.pagination);
    } catch {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const roleLabels: Record<string, string> = {
    admin: 'Admin',
    school_admin: 'QTV',
    super_admin: 'Super',
    principal: 'HT',
    vice_principal: 'HP',
    teacher: 'GV',
    student: 'HS',
    parent: 'PH',
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm audit log..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8]"
          />
        </div>
        <button
          onClick={() => fetchLogs(1)}
          className="px-4 py-2 bg-[#1C6FA8] text-white rounded-lg hover:bg-[#0F3D5C]"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Logs */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-3 border-b">
          <span className="text-sm font-medium text-[#374151]">{pagination.total} logs</span>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-8 h-8 text-[#1C6FA8] mx-auto animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-[#6B7280]">Không có audit log</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {logs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    log.role === 'admin' || log.role === 'school_admin' || log.role === 'super_admin'
                      ? 'bg-red-100 text-red-700'
                      : log.role === 'teacher'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {roleLabels[log.role]?.[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[#0F3D5C]">{log.description}</div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-[#6B7280]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(log.created_at).toLocaleString('vi-VN')}
                      </span>
                      <span className="px-1.5 py-0.5 bg-gray-100 rounded">{log.entity_type}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-3 border-t flex items-center justify-between">
            <span className="text-sm text-[#6B7280]">Trang {pagination.page} / {pagination.totalPages}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchLogs(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => fetchLogs(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Health Tab Component (Enhanced)
// ============================================================================

interface SystemHealth {
  status: string;
  service?: string;
  environment: string;
  version: string;
  timestamp: string;
  uptime?: {
    seconds: number;
    human: string;
  };
  memory?: {
    heapUsed: number;
    heapTotal: number;
    percentage: number;
  };
  database?: {
    status: string;
    latencyMs: number;
  };
  checkDuration?: number;
}

function HealthTab() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [detailedHealth, setDetailedHealth] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  const fetchHealth = async () => {
    setChecking(true);
    setLoading(true);
    try {
      // Fetch basic health
      const data = await api.getSystemHealth();
      setHealth(data);
      
      // Fetch detailed health
      try {
        const detailed = await fetch('/api/health/detailed');
        if (detailed.ok) {
          const detailedData = await detailed.json();
          setDetailedHealth(detailedData);
        }
      } catch {
        // Detailed health is optional
      }
    } catch {
      setHealth(null);
    } finally {
      setLoading(false);
      setChecking(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ok':
      case 'healthy':
        return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: CheckCircle };
        break;
      case 'degraded':
        return { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', icon: AlertTriangle };
        break;
      default:
        return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: XCircle };
    }
  };

  const statusColors = getStatusColor(health?.status || 'error');

  return (
    <div className="space-y-4">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[#0F3D5C]">Giám sát hệ thống</h3>
        <button
          onClick={fetchHealth}
          disabled={checking}
          className="px-4 py-2 bg-[#1C6FA8] text-white rounded-lg hover:bg-[#0F3D5C] flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
          Kiểm tra kết nối
        </button>
      </div>

      {health ? (
        <>
          {/* Main Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Overall Status */}
            <div className={`p-6 rounded-xl border ${statusColors.bg} ${statusColors.border}`}>
              <div className="flex items-center gap-3">
                {React.createElement(statusColors.icon, { className: `w-8 h-8 ${statusColors.text}` })}
                <div>
                  <div className="text-lg font-bold text-[#0F3D5C]">
                    {health.status === 'ok' ? 'Hoạt động tốt' : health.status === 'degraded' ? 'Giảm hiệu suất' : 'Có lỗi'}
                  </div>
                  <div className="text-xs text-[#6B7280]">
                    {new Date(health.timestamp).toLocaleString('vi-VN')}
                  </div>
                </div>
              </div>
            </div>

            {/* Uptime */}
            <div className="p-4 bg-white border border-gray-200 rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <Clock className="w-6 h-6 text-blue-600" />
                <span className="font-medium text-[#0F3D5C]">Uptime</span>
              </div>
              <div className="text-2xl font-bold text-[#374151]">
                {health.uptime?.human || 'N/A'}
              </div>
              <div className="text-xs text-[#6B7280]">
                Phiên bản {health.version}
              </div>
            </div>

            {/* Database */}
            <div className="p-4 bg-white border border-gray-200 rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <Database className="w-6 h-6 text-purple-600" />
                <span className="font-medium text-[#0F3D5C]">Database</span>
              </div>
              <div className="flex items-center gap-2">
                {health.database?.status === 'healthy' ? (
                  <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> OK
                  </span>
                ) : (
                  <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded flex items-center gap-1">
                    <XCircle className="w-3 h-3" /> Lỗi
                  </span>
                )}
                <span className="text-xs text-[#6B7280]">
                  {health.database?.latencyMs || 0}ms
                </span>
              </div>
            </div>

            {/* Memory */}
            <div className="p-4 bg-white border border-gray-200 rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <Activity className="w-6 h-6 text-orange-600" />
                <span className="font-medium text-[#0F3D5C]">Bộ nhớ</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        (health.memory?.percentage || 0) > 80 ? 'bg-red-500' :
                        (health.memory?.percentage || 0) > 60 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${health.memory?.percentage || 0}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs font-medium text-[#374151]">
                  {health.memory?.percentage || 0}%
                </span>
              </div>
              <div className="text-xs text-[#6B7280] mt-1">
                {formatBytes((health.memory?.heapUsed || 0) * 1024 * 1024)} / {formatBytes((health.memory?.heapTotal || 0) * 1024 * 1024)}
              </div>
            </div>
          </div>

          {/* Environment Details */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h4 className="font-medium text-[#0F3D5C] mb-3">Chi tiết môi trường</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-[#6B7280]">Môi trường:</span>
                <span className="ml-2 font-medium text-[#374151]">{health.environment}</span>
              </div>
              <div>
                <span className="text-[#6B7280]">Service:</span>
                <span className="ml-2 font-medium text-[#374151]">{health.service}</span>
              </div>
              <div>
                <span className="text-[#6B7280]">Phiên bản:</span>
                <span className="ml-2 font-medium text-[#374151]">{health.version}</span>
              </div>
              <div>
                <span className="text-[#6B7280]">Ping:</span>
                <span className="ml-2 font-medium text-[#374151]">{health.checkDuration}ms</span>
              </div>
            </div>
          </div>

          {/* Security Features */}
          {detailedHealth && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h4 className="font-medium text-[#0F3D5C] mb-3">Bảo mật (OWASP Top 10)</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-[#374151]">Helmet CSP</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-[#374151]">Rate Limiting</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-[#374151]">PII Masking</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-[#374151]">CORS Config</span>
                </div>
              </div>
            </div>
          )}
        </>
      ) : loading ? (
        <div className="p-8 text-center">
          <RefreshCw className="w-8 h-8 text-[#1C6FA8] mx-auto animate-spin" />
          <p className="mt-2 text-sm text-[#6B7280]">Đang kiểm tra hệ thống...</p>
        </div>
      ) : (
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
          <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
          <div>
            <p className="text-red-800 font-medium">Không thể kết nối đến máy chủ</p>
            <p className="text-sm text-red-600">Vui lòng kiểm tra server đang chạy</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Roles & Permissions Tab Component
// ============================================================================

function RolesTab() {
  const [roles, setRoles] = useState<Array<{ id: string; name: string; description: string; color: string }>>([]);
  const [permissions, setPermissions] = useState<Array<{ id: string; name: string; category: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const data = await api.getSystemRoles();
        if (data) {
          setRoles(data.roles);
          setPermissions(data.permissions);
        }
      } catch {
        // Handle silently
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const groupedPermissions = permissions.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {} as Record<string, typeof permissions>);

  if (loading) {
    return (
      <div className="p-8 text-center">
        <RefreshCw className="w-8 h-8 text-[#1C6FA8] mx-auto animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Roles */}
      <div>
        <h3 className="font-semibold text-[#0F3D5C] mb-3">Vai trò hệ thống</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {roles.map((role) => (
            <div key={role.id} className="p-4 border border-gray-200 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: role.color }}
                />
                <span className="font-medium text-[#0F3D5C]">{role.name}</span>
              </div>
              <p className="text-xs text-[#6B7280]">{role.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Permissions */}
      <div>
        <h3 className="font-semibold text-[#0F3D5C] mb-3">Quyền hệ thống</h3>
        <div className="space-y-4">
          {Object.entries(groupedPermissions).map(([category, perms]) => (
            <div key={category} className="border border-gray-200 rounded-xl p-4">
              <h4 className="font-medium text-[#374151] mb-2">{category}</h4>
              <div className="flex flex-wrap gap-2">
                {perms.map((p) => (
                  <span key={p.id} className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                    {p.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Settings Tab Component
// ============================================================================

function SettingsTab() {
  const [categories, setCategories] = useState<Array<{ id: string; name: string; icon: string; description: string }>>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [settings, setSettings] = useState<Array<{ key: string; label: string; value: string; type: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (type: Toast['type'], message: string) => {
    const id = `toast_${Date.now()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const cats = await api.getSystemSettingsCategories();
        setCategories(cats);
      } catch {
        // Handle silently
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      const fetchSettings = async () => {
        try {
          const data = await api.getSystemSettings(selectedCategory);
          setSettings(data);
        } catch {
          // Handle silently
        }
      };
      fetchSettings();
    }
  }, [selectedCategory]);

  const handleUpdate = async (key: string, value: string) => {
    if (!selectedCategory) return;
    const res = await api.updateSystemSetting(selectedCategory, key, value);
    if (res.success) {
      showToast('success', 'Đã cập nhật cài đặt');
    } else {
      showToast('error', res.message || 'Không thể cập nhật');
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <RefreshCw className="w-8 h-8 text-[#1C6FA8] mx-auto animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!selectedCategory ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className="p-4 border border-gray-200 rounded-xl text-left hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Settings className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium text-[#0F3D5C]">{cat.name}</div>
                  <div className="text-xs text-[#6B7280]">{cat.description}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <button
            onClick={() => setSelectedCategory(null)}
            className="flex items-center gap-2 text-[#6B7280] hover:text-[#1C6FA8]"
          >
            ← Quay lại
          </button>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="font-semibold text-[#0F3D5C]">
                {categories.find((c) => c.id === selectedCategory)?.name}
              </h3>
            </div>
            <div className="divide-y">
              {settings.map((setting) => (
                <div key={setting.key} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-[#374151]">{setting.label}</div>
                    <div className="text-xs text-[#6B7280]">{setting.key}</div>
                  </div>
                  <div>
                    {setting.type === 'boolean' ? (
                      <button
                        onClick={() => handleUpdate(setting.key, setting.value === 'true' ? 'false' : 'true')}
                        className={`w-12 h-6 rounded-full transition-colors ${
                          setting.value === 'true' ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          setting.value === 'true' ? 'translate-x-6' : 'translate-x-0.5'
                        }`} />
                      </button>
                    ) : setting.type === 'select' ? (
                      <select
                        value={setting.value}
                        onChange={(e) => handleUpdate(setting.key, e.target.value)}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value={setting.value}>{setting.value}</option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={setting.value}
                        onChange={(e) => {}}
                        onBlur={(e) => handleUpdate(setting.key, e.target.value)}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm w-32"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={() => {}} />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export function AdminSystemPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'audit' | 'health' | 'roles' | 'settings'>('users');

  const tabs = [
    { id: 'users', label: 'Người dùng', icon: Users },
    { id: 'audit', label: 'Audit Log', icon: Shield },
    { id: 'roles', label: 'Vai trò & Quyền', icon: ShieldCheck },
    { id: 'health', label: 'Trạng thái', icon: Activity },
    { id: 'settings', label: 'Cài đặt', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-[#6B7280] mb-1">
            <span>Quản trị</span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-[#0F3D5C]">Hệ thống</span>
          </div>
          <h1 className="text-2xl font-bold text-[#0F3D5C]">Quản trị Hệ thống</h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Quản lý người dùng, vai trò, audit log và cài đặt hệ thống
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-1 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-[#1C6FA8] text-[#1C6FA8]'
                      : 'border-transparent text-[#6B7280] hover:text-[#374151]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'audit' && <AuditTab />}
        {activeTab === 'roles' && <RolesTab />}
        {activeTab === 'health' && <HealthTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
}

export default AdminSystemPage;

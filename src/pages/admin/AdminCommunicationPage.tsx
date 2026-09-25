/**
 * Admin Communication Center Page
 * Phase 09 - Communication Center
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Megaphone, Plus, Search, Filter, ChevronRight, ChevronLeft, Eye, Edit2,
  Archive, Trash2, Send, FileText, Users, Clock, Check, X, AlertTriangle,
  RefreshCw, BookOpen, Calendar, AlertOctagon, Bell,
} from 'lucide-react';
import { api } from '../../services/api';

// ============================================================================
// Types
// ============================================================================

interface Announcement {
  id: string;
  title: string;
  content: string;
  summary?: string;
  status: string;
  priority: string;
  scope: string;
  author_id: string;
  author_name: string;
  category_id?: string;
  category_name?: string;
  category_color?: string;
  created_at: string;
  published_at?: string;
  scheduled_publish_at?: string;
  archived_at?: string;
  total_recipients: number;
  read_count: number;
  unread_count: number;
}

interface Category {
  id: string;
  name: string;
  color: string;
  icon?: string;
  sort_order: number;
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
// Status Badge
// ============================================================================

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'draft':
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
          <FileText className="w-3 h-3 mr-1" /> Bản nháp
        </span>
      );
    case 'published':
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
          <Send className="w-3 h-3 mr-1" /> Đã xuất bản
        </span>
      );
    case 'archived':
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">
          <Archive className="w-3 h-3 mr-1" /> Đã lưu trữ
        </span>
      );
    default:
      return <span className="text-xs text-[#6B7280]">{status}</span>;
  }
}

// ============================================================================
// Priority Badge
// ============================================================================

function PriorityBadge({ priority }: { priority: string }) {
  switch (priority) {
    case 'urgent':
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
          Khẩn cấp
        </span>
      );
    case 'high':
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">
          Cao
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
          Thường
        </span>
      );
  }
}

// ============================================================================
// Scope Badge
// ============================================================================

function ScopeBadge({ scope }: { scope: string }) {
  const labels: Record<string, string> = {
    all: 'Toàn trường',
    teachers: 'Giáo viên',
    students: 'Học sinh',
    parents: 'Phụ huynh',
    grade: 'Theo khối',
    class: 'Theo lớp',
  };

  const icons: Record<string, React.ReactNode> = {
    all: <Users className="w-3 h-3" />,
    teachers: <BookOpen className="w-3 h-3" />,
    students: <Users className="w-3 h-3" />,
    parents: <Users className="w-3 h-3" />,
    grade: <Calendar className="w-3 h-3" />,
    class: <Calendar className="w-3 h-3" />,
  };

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">
      {icons[scope] || <Users className="w-3 h-3" />}
      {labels[scope] || scope}
    </span>
  );
}

// ============================================================================
// Create/Edit Modal
// ============================================================================

function CreateAnnouncementModal({ isOpen, onClose, onSave, categories }: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { title: string; content: string; priority: string; scope: string; categoryId?: string; status: string }) => Promise<void>;
  categories: Category[];
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState('normal');
  const [scope, setScope] = useState('all');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('draft');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setLoading(true);
    try {
      await onSave({ title: title.trim(), content: content.trim(), priority, scope, categoryId: categoryId || undefined, status });
      setTitle('');
      setContent('');
      setPriority('normal');
      setScope('all');
      setCategoryId('');
      setStatus('draft');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h3 className="text-lg font-bold text-[#0F3D5C]">Tạo thông báo mới</h3>
          <button onClick={onClose} className="hover:opacity-70"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-80px)]">
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1">Tiêu đề *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8]"
              placeholder="Nhập tiêu đề thông báo..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1">Nội dung *</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8]"
              placeholder="Nhập nội dung thông báo..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1">Độ ưu tiên</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8]"
              >
                <option value="normal">Thường</option>
                <option value="high">Cao</option>
                <option value="urgent">Khẩn cấp</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1">Phạm vi</label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8]"
              >
                <option value="all">Toàn trường</option>
                <option value="teachers">Giáo viên</option>
                <option value="students">Học sinh</option>
                <option value="parents">Phụ huynh</option>
                <option value="grade">Theo khối</option>
                <option value="class">Theo lớp</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1">Danh mục</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8]"
            >
              <option value="">Chọn danh mục...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1">Trạng thái ban đầu</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8]"
            >
              <option value="draft">Bản nháp</option>
              <option value="published">Xuất bản ngay</option>
            </select>
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
              disabled={loading || !title.trim() || !content.trim()}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[#1C6FA8] rounded-lg hover:bg-[#0F3D5C] disabled:opacity-50"
            >
              {loading ? 'Đang lưu...' : 'Tạo thông báo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// Announcement Row
// ============================================================================

function AnnouncementRow({ announcement, onView, onEdit, onPublish, onArchive, onDelete }: {
  announcement: Announcement;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onPublish: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="p-4 border-b border-gray-100 hover:bg-gray-50">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {announcement.category_name && (
              <span
                className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded"
                style={{ backgroundColor: `${announcement.category_color}20`, color: announcement.category_color }}
              >
                {announcement.category_name}
              </span>
            )}
            <PriorityBadge priority={announcement.priority} />
            <ScopeBadge scope={announcement.scope} />
          </div>
          <h4 className="font-semibold text-[#0F3D5C] truncate">{announcement.title}</h4>
          <p className="text-sm text-[#6B7280] line-clamp-2 mt-1">{announcement.content}</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-[#6B7280]">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {announcement.author_name}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(announcement.created_at).toLocaleDateString('vi-VN')}
            </span>
            {announcement.status === 'published' && announcement.read_count > 0 && (
              <span className="flex items-center gap-1">
                <Check className="w-3 h-3 text-green-500" />
                {announcement.read_count}/{announcement.total_recipients} đã đọc
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <StatusBadge status={announcement.status} />
          <div className="flex items-center gap-1">
            <button
              onClick={() => onView(announcement.id)}
              className="p-2 text-[#6B7280] hover:bg-blue-50 hover:text-[#1C6FA8] rounded-lg"
              title="Xem chi tiết"
            >
              <Eye className="w-4 h-4" />
            </button>
            {announcement.status === 'draft' && (
              <button
                onClick={() => onPublish(announcement.id)}
                className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                title="Xuất bản"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
            {announcement.status === 'published' && (
              <button
                onClick={() => onArchive(announcement.id)}
                className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg"
                title="Lưu trữ"
              >
                <Archive className="w-4 h-4" />
              </button>
            )}
            {announcement.status === 'draft' && (
              <>
                <button
                  onClick={() => onEdit(announcement.id)}
                  className="p-2 text-[#6B7280] hover:bg-gray-100 rounded-lg"
                  title="Sửa"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(announcement.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  title="Xóa"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Emergency Broadcast Modal (G39)
// ============================================================================

export function EmergencyBroadcastModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<'EMERGENCY' | 'CRITICAL' | 'WARNING'>('WARNING');
  const [requiresAcknowledgment, setRequiresAcknowledgment] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setError('Tiêu đề và nội dung là bắt buộc.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/announcements/emergency-broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: title.trim(), message: message.trim(), severity, requiresAcknowledgment }),
      });
      const data = await res.json();
      if (data.success) {
        setTitle('');
        setMessage('');
        setSeverity('WARNING');
        setRequiresAcknowledgment(true);
        onSuccess();
      } else {
        setError(data.error || 'Gửi thất bại. Vui lòng thử lại.');
      }
    } catch {
      setError('Không thể kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const severityConfig = {
    EMERGENCY: { label: 'Khẩn cấp', color: 'text-red-600', border: 'border-red-500', bg: 'bg-red-50' },
    CRITICAL: { label: 'Nguy hiểm', color: 'text-orange-600', border: 'border-orange-500', bg: 'bg-orange-50' },
    WARNING: { label: 'Cảnh báo', color: 'text-yellow-700', border: 'border-yellow-500', bg: 'bg-yellow-50' },
  };
  const sc = severityConfig[severity];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border-t-4 border-red-500 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-red-50 border-b border-red-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-200 flex items-center justify-center">
            <AlertOctagon className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-red-700">Phát thông báo khẩn cấp</h2>
            <p className="text-xs text-red-500">Thông báo sẽ được gửi tới 100% người dùng đang trực tuyến</p>
          </div>
          <button onClick={onClose} className="ml-auto text-red-400 hover:text-red-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-300 rounded-lg flex items-center gap-2 text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Severity */}
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-2">Mức độ nghiêm trọng</label>
            <div className="grid grid-cols-3 gap-2">
              {(['WARNING', 'CRITICAL', 'EMERGENCY'] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setSeverity(level)}
                  className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                    severity === level
                      ? `${severityConfig[level].border} ${severityConfig[level].bg} ${severityConfig[level].color} border-2`
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {severityConfig[level].label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1">Tiêu đề thông báo <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: THÔNG BÁO NGỪNG HỌC KHẨN CẤP"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              maxLength={120}
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1">Nội dung <span className="text-red-500">*</span></label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Mô tả chi tiết tình huống và hướng dẫn hành động..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              maxLength={500}
            />
            <div className="text-right text-xs text-gray-400 mt-1">{message.length}/500</div>
          </div>

          {/* Acknowledge checkbox */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={requiresAcknowledgment}
              onChange={(e) => setRequiresAcknowledgment(e.target.checked)}
              className="w-4 h-4 accent-red-600"
            />
            <span className="text-sm text-[#374151]">
              Yêu cầu người nhận bấm <strong>"Đã hiểu"</strong> để xác nhận
            </span>
          </label>

          {/* Preview */}
          {title && message && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="text-xs font-semibold text-gray-500 mb-1.5">Xem trước:</div>
              <div className={`text-xs font-bold ${sc.color} uppercase`}>{severityConfig[severity].label}</div>
              <div className="text-sm font-semibold text-gray-800">{title}</div>
              <p className="text-xs text-gray-600 mt-1 line-clamp-2">{message}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-[#6B7280] hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim() || !message.trim()}
              className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg font-semibold text-sm transition-colors"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Đang phát...
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4" />
                  Phát ngay lập tức
                </>
              )}
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

export function AdminCommunicationPage() {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [scopeFilter, setScopeFilter] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);

  const showToast = useCallback((type: Toast['type'], message: string) => {
    const id = `toast_${Date.now()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const [announcementsData, categoriesData] = await Promise.all([
        api.getAdminAnnouncements({
          page,
          limit: 20,
          search: search || undefined,
          status: statusFilter || undefined,
          scope: scopeFilter || undefined,
        }),
        api.getAdminAnnouncementCategories(),
      ]);
      setAnnouncements(announcementsData.announcements);
      setPagination(announcementsData.pagination);
      setCategories(categoriesData);
    } catch {
      showToast('error', 'Không thể tải danh sách thông báo');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, scopeFilter, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async (data: { title: string; content: string; priority: string; scope: string; categoryId?: string; status: string }) => {
    const res = await api.adminCreateAnnouncement(data);
    if (res.success) {
      showToast('success', 'Đã tạo thông báo');
      fetchData(1);
    } else {
      showToast('error', res.message || 'Không thể tạo thông báo');
    }
  };

  const handlePublish = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xuất bản thông báo này?')) return;
    const res = await api.adminPublishAnnouncement(id);
    if (res.success) {
      showToast('success', 'Đã xuất bản thông báo');
      fetchData(pagination.page);
    } else {
      showToast('error', res.message || 'Không thể xuất bản');
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm('Bạn có chắc muốn lưu trữ thông báo này?')) return;
    const res = await api.adminArchiveAnnouncement(id);
    if (res.success) {
      showToast('success', 'Đã lưu trữ thông báo');
      fetchData(pagination.page);
    } else {
      showToast('error', res.message || 'Không thể lưu trữ');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa thông báo này? Hành động này không thể hoàn tác.')) return;
    const res = await api.adminDeleteAnnouncement(id);
    if (res.success) {
      showToast('success', 'Đã xóa thông báo');
      fetchData(pagination.page);
    } else {
      showToast('error', res.message || 'Không thể xóa');
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
            <span className="text-[#0F3D5C]">Trung tâm Thông báo</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#0F3D5C]">Trung tâm Thông báo</h1>
              <p className="text-sm text-[#6B7280] mt-1">
                Quản lý thông báo và giao tiếp với phụ huynh
              </p>
            </div>
            <button
              onClick={() => setShowBroadcastModal(true)}
              className="flex items-center gap-2 px-4 py-2 border-2 border-red-500 text-red-600 rounded-lg hover:bg-red-50 font-semibold text-sm transition-colors"
              title="Phát thông báo khẩn cấp toàn trường"
            >
              <AlertOctagon className="w-4 h-4" />
              Phát thông báo khẩn
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#1C6FA8] text-white rounded-lg hover:bg-[#0F3D5C]"
            >
              <Plus className="w-4 h-4" />
              Tạo thông báo
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm thông báo..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8]"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); fetchData(1); }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8]"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="draft">Bản nháp</option>
              <option value="published">Đã xuất bản</option>
              <option value="archived">Đã lưu trữ</option>
            </select>
            <select
              value={scopeFilter}
              onChange={(e) => { setScopeFilter(e.target.value); fetchData(1); }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8]"
            >
              <option value="">Tất cả phạm vi</option>
              <option value="all">Toàn trường</option>
              <option value="teachers">Giáo viên</option>
              <option value="students">Học sinh</option>
              <option value="parents">Phụ huynh</option>
            </select>
            <button
              onClick={() => fetchData(1)}
              className="px-4 py-2 bg-[#1C6FA8] text-white rounded-lg font-medium hover:bg-[#0F3D5C] transition-colors"
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Announcements List */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold text-[#0F3D5C]">
              Danh sách thông báo ({pagination.total})
            </h3>
          </div>

          {loading ? (
            <LoadingState />
          ) : announcements.length === 0 ? (
            <div className="p-8 text-center">
              <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-[#6B7280]">Không có thông báo nào</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-3 px-4 py-2 bg-[#1C6FA8] text-white rounded-lg hover:bg-[#0F3D5C]"
              >
                Tạo thông báo đầu tiên
              </button>
            </div>
          ) : (
            <>
              {announcements.map((ann) => (
                <AnnouncementRow
                  key={ann.id}
                  announcement={ann}
                  onView={(id) => navigate(`/admin/communication/${id}`)}
                  onEdit={(id) => navigate(`/admin/communication/${id}/edit`)}
                  onPublish={handlePublish}
                  onArchive={handleArchive}
                  onDelete={handleDelete}
                />
              ))}

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="p-4 border-t flex items-center justify-between">
                  <div className="text-sm text-[#6B7280]">
                    Trang {pagination.page} / {pagination.totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fetchData(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => fetchData(pagination.page + 1)}
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

      {/* Broadcast Emergency Modal */}
      <EmergencyBroadcastModal
        isOpen={showBroadcastModal}
        onClose={() => setShowBroadcastModal(false)}
        onSuccess={() => {
          showToast('success', 'Thông báo khẩn cấp đã được phát tới toàn trường!');
          setShowBroadcastModal(false);
        }}
      />

      {/* Create Modal */}
      <CreateAnnouncementModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCreate}
        categories={categories}
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

export default AdminCommunicationPage;

// =============================================================================
// Admin Announcements Management Page — G25 Production Announcements (TypeScript)
// =============================================================================
import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { adminApi } from '../../services/api';
import { Announcement, AnnouncementCategory, AnnouncementStatus, AnnouncementPriority, AnnouncementScope } from '../../types/domain';
import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  Plus,
  Search,
  Edit2,
  Trash2,
  Send,
  Archive,
  AlertTriangle,
  Info,
  Megaphone,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
  BookOpen,
  Users,
  Shield,
  Eye,
} from 'lucide-react';

// ── Type Definitions ───────────────────────────────────────────────────────────

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type PriorityKey = AnnouncementPriority;
type StatusKey = AnnouncementStatus;
type ScopeKey = AnnouncementScope;

interface PriorityConfig {
  label: string;
  variant: 'danger' | 'warning' | 'info';
  icon: LucideIcon;
}

interface StatusConfig {
  label: string;
  variant: 'neutral' | 'success' | 'warning';
}

interface ScopeConfig {
  label: string;
  icon: LucideIcon;
}

interface AnnouncementFormState {
  title: string;
  content: string;
  summary: string;
  scope: ScopeKey;
  priority: PriorityKey;
  categoryId: string;
  scheduledPublishAt: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<PriorityKey, PriorityConfig> = {
  urgent: { label: 'Khẩn cấp', variant: 'danger', icon: AlertTriangle },
  important: { label: 'Quan trọng', variant: 'warning', icon: Info },
  normal: { label: 'Thông thường', variant: 'info', icon: Bell },
};

const STATUS_CONFIG: Record<StatusKey, StatusConfig> = {
  draft: { label: 'Bản nháp', variant: 'neutral' },
  published: { label: 'Đã đăng', variant: 'success' },
  archived: { label: 'Lưu trữ', variant: 'warning' },
};

const SCOPE_CONFIG: Record<ScopeKey, ScopeConfig> = {
  all: { label: 'Toàn trường', icon: Megaphone },
  student: { label: 'Học sinh', icon: BookOpen },
  teacher: { label: 'Giáo viên', icon: Users },
  parent: { label: 'Phụ huynh', icon: Shield },
  admin: { label: 'Quản trị', icon: Shield },
  class: { label: 'Lớp học', icon: Users },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatRelative(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  if (days < 7) return `${days} ngày trước`;
  return formatDate(dateStr);
}

// ── Announcement Form ──────────────────────────────────────────────────────────

function AnnouncementForm({
  announcement,
  categories,
  onSubmit,
  onCancel,
  loading,
}: {
  announcement?: Announcement | null;
  categories: AnnouncementCategory[];
  onSubmit: (data: Record<string, unknown>) => void;
  onCancel: () => void;
  loading: boolean;
}): React.ReactElement {
  const isEdit = Boolean(announcement?.id);
  const [form, setForm] = useState<AnnouncementFormState>({
    title: announcement?.title ?? '',
    content: announcement?.content ?? '',
    summary: announcement?.summary ?? '',
    scope: (announcement?.scope ?? 'all') as ScopeKey,
    priority: (announcement?.priority ?? 'normal') as PriorityKey,
    categoryId: announcement?.categoryId ?? '',
    scheduledPublishAt: announcement?.scheduledPublishAt
      ? announcement.scheduledPublishAt.slice(0, 16)
      : '',
  });

  const handleChange = (field: keyof AnnouncementFormState, value: string): void => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSubmit({
      ...form,
      scheduledPublishAt: form.scheduledPublishAt ? new Date(form.scheduledPublishAt).toISOString() : null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề *</label>
        <input
          type="text"
          value={form.title}
          onChange={e => handleChange('title', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          placeholder="Nhập tiêu đề thông báo..."
          maxLength={255}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phạm vi</label>
          <select
            value={form.scope}
            onChange={e => handleChange('scope', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          >
            {Object.entries(SCOPE_CONFIG).map(([val, cfg]) => (
              <option key={val} value={val}>{cfg.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mức độ ưu tiên</label>
          <select
            value={form.priority}
            onChange={e => handleChange('priority', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          >
            {Object.entries(PRIORITY_CONFIG).map(([val, cfg]) => (
              <option key={val} value={val}>{cfg.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục</label>
        <select
          value={form.categoryId}
          onChange={e => handleChange('categoryId', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
        >
          <option value="">— Chọn danh mục —</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tóm tắt</label>
        <input
          type="text"
          value={form.summary}
          onChange={e => handleChange('summary', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          placeholder="Tóm tắt ngắn gọn (hiển thị trong danh sách)..."
          maxLength={500}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung *</label>
        <textarea
          value={form.content}
          onChange={e => handleChange('content', e.target.value)}
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none"
          placeholder="Nhập nội dung thông báo..."
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Hẹn giờ đăng</label>
        <input
          type="datetime-local"
          value={form.scheduledPublishAt}
          onChange={e => handleChange('scheduledPublishAt', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          min={new Date().toISOString().slice(0, 16)}
        />
        <p className="text-xs text-gray-500 mt-1">Để trống nếu muốn đăng ngay lập tức</p>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          Hủy
        </Button>
        <Button type="submit" disabled={loading || !form.title.trim() || !form.content.trim()}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? 'Lưu thay đổi' : 'Tạo bản nháp'}
        </Button>
      </div>
    </form>
  );
}

// ── Announcement Item Row ───────────────────────────────────────────────────

function AnnouncementRow({
  ann,
  onEdit,
  onPublish,
  onArchive,
  onDelete,
}: {
  ann: Announcement;
  onEdit: (ann: Announcement) => void;
  onPublish: (ann: Announcement) => void;
  onArchive: (ann: Announcement) => void;
  onDelete: (ann: Announcement) => void;
}): React.ReactElement {
  const priorityCfg = PRIORITY_CONFIG[ann.priority] || PRIORITY_CONFIG.normal;
  const scopeCfg = SCOPE_CONFIG[ann.scope] || SCOPE_CONFIG.all;
  const PriorityIcon = priorityCfg.icon;
  const ScopeIcon = scopeCfg.icon || Bell;
  const statusCfg = STATUS_CONFIG[ann.status] || STATUS_CONFIG.draft;

  return (
    <div className="p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
      <div className="flex items-start gap-3">
        <div className="mt-1 text-gray-400">
          <PriorityIcon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 truncate">{ann.title}</h3>
            <Badge variant={priorityCfg.variant} size="sm">{priorityCfg.label}</Badge>
            <Badge variant={statusCfg.variant} size="sm">{statusCfg.label}</Badge>
          </div>
          {ann.summary && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-1">{ann.summary}</p>
          )}
          <p className="text-xs text-gray-400 mt-1 line-clamp-1">{ann.content?.substring(0, 100)}{ann.content && ann.content.length > 100 ? '…' : ''}</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 flex-wrap">
            <span className="flex items-center gap-1">
              <ScopeIcon className="w-3 h-3" />
              {scopeCfg.label}
            </span>
            {ann.authorName && <span>Tạo bởi: {ann.authorName}</span>}
            <span>{ann.publishedAt ? `Đăng: ${formatRelative(ann.publishedAt)}` : ann.scheduledPublishAt ? `Hẹn: ${formatDate(ann.scheduledPublishAt)}` : `Tạo: ${formatRelative(ann.createdAt)}`}</span>
            {ann.readCount !== undefined && ann.readCount > 0 && <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{ann.readCount} lượt đọc</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {ann.status === 'draft' && (
            <button
              onClick={() => onPublish(ann)}
              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              title="Đăng ngay"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onEdit(ann)}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Chỉnh sửa"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          {ann.status === 'published' && (
            <button
              onClick={() => onArchive(ann)}
              className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
              title="Lưu trữ"
            >
              <Archive className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onDelete(ann)}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Xóa"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export function AdminAnnouncementsPage(): React.ReactElement {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<AnnouncementCategory[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [scopeFilter, setScopeFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingAnn, setEditingAnn] = useState<Announcement | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const loadAnnouncements = useCallback(async (page = 1): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.getAnnouncements({
        page,
        limit: 20,
        search: search || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        scope: scopeFilter || undefined,
      });
      setAnnouncements(result.announcements);
      setPagination(result.pagination);
    } catch (err) {
      setError('Không thể tải danh sách thông báo.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, priorityFilter, scopeFilter]);

  const loadCategories = useCallback(async (): Promise<void> => {
    try {
      const cats = await adminApi.getAnnouncementCategories();
      setCategories(cats);
    } catch (err) {
      console.warn('Could not load categories:', (err as Error).message);
    }
  }, []);

  useEffect(() => {
    void loadAnnouncements(1);
    void loadCategories();
  }, [loadAnnouncements, loadCategories]);

  const handleSearch = (e: React.FormEvent): void => {
    e.preventDefault();
    void loadAnnouncements(1);
  };

  const handleFormSubmit = async (data: Record<string, unknown>): Promise<void> => {
    setFormLoading(true);
    try {
      if (editingAnn?.id) {
        await adminApi.updateAnnouncement(editingAnn.id, data);
      } else {
        await adminApi.createAnnouncement(data);
      }
      setShowForm(false);
      setEditingAnn(null);
      void loadAnnouncements(pagination.page);
    } catch (err) {
      window.alert('Lỗi khi lưu thông báo: ' + ((err as Error).message || 'Vui lòng thử lại.'));
    } finally {
      setFormLoading(false);
    }
  };

  const handlePublish = async (ann: Announcement): Promise<void> => {
    setActionLoading(ann.id);
    try {
      await adminApi.publishAnnouncement(ann.id);
      void loadAnnouncements(pagination.page);
    } catch (err) {
      window.alert('Lỗi khi đăng thông báo: ' + ((err as Error).message || 'Vui lòng thử lại.'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleArchive = async (ann: Announcement): Promise<void> => {
    if (!window.confirm('Lưu trữ thông báo này?')) return;
    setActionLoading(ann.id);
    try {
      await adminApi.archiveAnnouncement(ann.id);
      void loadAnnouncements(pagination.page);
    } catch (err) {
      window.alert('Lỗi khi lưu trữ: ' + ((err as Error).message || 'Vui lòng thử lại.'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (ann: Announcement): Promise<void> => {
    if (!window.confirm(`Xóa thông báo "${ann.title}"? Hành động này không thể hoàn tác.`)) return;
    setActionLoading(ann.id);
    try {
      await adminApi.deleteAnnouncement(ann.id);
      void loadAnnouncements(pagination.page);
    } catch (err) {
      window.alert('Lỗi khi xóa: ' + ((err as Error).message || 'Vui lòng thử lại.'));
    } finally {
      setActionLoading(null);
    }
  };

  const openEdit = (ann: Announcement): void => {
    setEditingAnn(ann);
    setShowForm(true);
  };

  const openCreate = (): void => {
    setEditingAnn(null);
    setShowForm(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Bell className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Quản lý Thông báo</h1>
              <p className="text-sm text-gray-500">{pagination.total} thông báo</p>
            </div>
          </div>
          <Button onClick={openCreate} icon={Plus} iconPosition="left">
            Tạo thông báo
          </Button>
        </div>
      </div>

      <div className="p-6 max-w-6xl mx-auto">
        {/* Filters */}
        <Card className="mb-4">
          <div className="space-y-3">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Tìm kiếm tiêu đề, nội dung..."
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                />
              </div>
              <Button type="submit" variant="secondary" icon={Search}>
                Tìm
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowFilters(!showFilters)}
                icon={Filter}
              >
                Lọc
              </Button>
            </form>

            {showFilters && (
              <div className="grid grid-cols-3 gap-3 pt-2 border-t">
                <select
                  value={statusFilter}
                  onChange={e => { setStatusFilter(e.target.value); }}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
                >
                  <option value="">Tất cả trạng thái</option>
                  {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                    <option key={val} value={val}>{cfg.label}</option>
                  ))}
                </select>
                <select
                  value={priorityFilter}
                  onChange={e => setPriorityFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
                >
                  <option value="">Tất cả mức ưu tiên</option>
                  {Object.entries(PRIORITY_CONFIG).map(([val, cfg]) => (
                    <option key={val} value={val}>{cfg.label}</option>
                  ))}
                </select>
                <select
                  value={scopeFilter}
                  onChange={e => setScopeFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
                >
                  <option value="">Tất cả phạm vi</option>
                  {Object.entries(SCOPE_CONFIG).map(([val, cfg]) => (
                    <option key={val} value={val}>{cfg.label}</option>
                  ))}
                </select>
                {(statusFilter || priorityFilter || scopeFilter) && (
                  <div className="col-span-3 flex justify-end">
                    <button
                      onClick={() => { setStatusFilter(''); setPriorityFilter(''); setScopeFilter(''); }}
                      className="text-sm text-primary-600 hover:underline"
                    >
                      Xóa bộ lọc
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Loading / Error */}
        {loading && (
          <Card className="py-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-3" />
            <p className="text-gray-500">Đang tải danh sách thông báo...</p>
          </Card>
        )}

        {error && !loading && (
          <Card className="py-8 text-center border-red-200 bg-red-50">
            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-3" />
            <p className="text-red-600 mb-3">{error}</p>
            <Button variant="secondary" onClick={() => void loadAnnouncements(1)} icon={RefreshCw}>
              Thử lại
            </Button>
          </Card>
        )}

        {/* Empty state */}
        {!loading && !error && announcements.length === 0 && (
          <Card className="py-12 text-center">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-700 mb-1">Chưa có thông báo nào</h3>
            <p className="text-sm text-gray-500 mb-4">
              {search || statusFilter || priorityFilter || scopeFilter
                ? 'Không có thông báo nào phù hợp với bộ lọc.'
                : 'Tạo thông báo đầu tiên để thông báo cho học sinh, giáo viên hoặc phụ huynh.'}
            </p>
            <Button onClick={openCreate} icon={Plus} iconPosition="left">Tạo thông báo</Button>
          </Card>
        )}

        {/* List */}
        {!loading && !error && announcements.length > 0 && (
          <Card className="divide-y divide-gray-100 p-0">
            {announcements.map(ann => (
              <AnnouncementRow
                key={ann.id}
                ann={ann}
                onEdit={openEdit}
                onPublish={handlePublish}
                onArchive={handleArchive}
                onDelete={handleDelete}
              />
            ))}
          </Card>
        )}

        {/* Pagination */}
        {!loading && !error && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-500">
              Trang {pagination.page} / {pagination.totalPages} — {pagination.total} kết quả
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => void loadAnnouncements(pagination.page - 1)}
                icon={ChevronLeft}
              >
                Trước
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => void loadAnnouncements(pagination.page + 1)}
                icon={ChevronRight}
              >
                Sau
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <Modal
          isOpen={true}
          onClose={() => { setShowForm(false); setEditingAnn(null); }}
          title={editingAnn ? 'Chỉnh sửa thông báo' : 'Tạo thông báo mới'}
          size="lg"
        >
          <AnnouncementForm
            announcement={editingAnn}
            categories={categories}
            onSubmit={handleFormSubmit}
            onCancel={() => { setShowForm(false); setEditingAnn(null); }}
            loading={formLoading}
          />
        </Modal>
      )}
    </div>
  );
}

// Named export (used by AppRouter), default export for backward compatibility
export { AdminAnnouncementsPage as default };

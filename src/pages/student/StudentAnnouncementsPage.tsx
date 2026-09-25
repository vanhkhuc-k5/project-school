// =============================================================================
// StudentAnnouncementsPage — TypeScript
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { studentApi } from '../../services/api';
import {
  Bell,
  AlertTriangle,
  Info,
  Clock,
  User,
  Loader2,
  RefreshCw,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// TypeScript Interfaces
// ─────────────────────────────────────────────────────────────────────────────

interface Announcement {
  id: string | number;
  title?: string;
  content?: string;
  author_name?: string;
  sender_name?: string;
  scope?: string;
  priority?: 'urgent' | 'important' | 'normal';
  published_at?: string;
  created_at?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

interface PriorityConfig {
  label: string;
  variant: 'danger' | 'warning' | 'info';
  icon: React.ElementType;
}

const PRIORITY_CONFIG: Record<string, PriorityConfig> = {
  urgent: { label: 'Khẩn cấp', variant: 'danger', icon: AlertTriangle },
  important: { label: 'Quan trọng', variant: 'warning', icon: Info },
  normal: { label: 'Thông thường', variant: 'info', icon: Bell },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function StudentAnnouncementsPage(): React.JSX.Element {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | number | null>(null);

  const fetchAnnouncements = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const list = await studentApi.getAnnouncements();
      setAnnouncements(Array.isArray(list) ? list as Announcement[] : []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Không thể tải thông báo.';
      setError(msg);
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const filtered = announcements.filter((a) => {
    if (activeFilter === 'all') return true;
    return a.priority === activeFilter;
  });

  const urgentCount = announcements.filter((a) => a.priority === 'urgent').length;
  const importantCount = announcements.filter((a) => a.priority === 'important').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-text-secondary mb-1">
            <span>Học sinh</span>
            <span>/</span>
            <span className="text-text-primary font-medium">Thông báo</span>
          </div>
          <h1 className="text-2xl font-medium text-text-primary">Thông báo & Tin tức</h1>
          <p className="text-xs text-text-secondary mt-1">
            Nhận thông tin mới nhất từ Ban Giám hiệu và Giáo viên.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Priority filter */}
          <div className="flex items-center gap-1 p-1 bg-surface-neutral rounded border border-hairline text-xs">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded transition-all ${
                activeFilter === 'all'
                  ? 'bg-white text-primary font-medium shadow-whisper border border-hairline'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Tất cả
            </button>
            {urgentCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveFilter('urgent')}
                className={`px-3 py-1.5 rounded transition-all flex items-center gap-1.5 ${
                  activeFilter === 'urgent'
                    ? 'bg-red-50 text-danger font-medium border border-red-200'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-danger" />
                Khẩn cấp
                {activeFilter !== 'urgent' && (
                  <span className="bg-danger text-white text-[10px] rounded-full px-1 py-0.5 font-bold">
                    {urgentCount}
                  </span>
                )}
              </button>
            )}
            {importantCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveFilter('important')}
                className={`px-3 py-1.5 rounded transition-all flex items-center gap-1.5 ${
                  activeFilter === 'important'
                    ? 'bg-amber-50 text-amber-800 font-medium border border-amber-200'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Quan trọng
              </button>
            )}
          </div>

          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            onClick={fetchAnnouncements}
            disabled={loading}
          >
            Làm mới
          </Button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <Card padding="p-6" className="flex flex-col items-center gap-3 text-center">
          <Bell className="w-8 h-8 text-danger" />
          <p className="text-sm text-danger font-medium">{error}</p>
          <Button variant="secondary" size="sm" onClick={fetchAnnouncements}>Thử lại</Button>
        </Card>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} padding="p-6" className="animate-pulse">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-hairline rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-hairline rounded w-3/4" />
                  <div className="h-3 bg-hairline rounded w-full" />
                  <div className="h-3 bg-hairline rounded w-2/3" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filtered.length === 0 && (
        <Card padding="p-8" className="text-center">
          <Bell className="w-10 h-10 text-hairline mx-auto mb-3" />
          <p className="text-sm text-text-secondary mb-1">
            {activeFilter !== 'all' ? 'Không có thông báo nào cho danh mục này.' : 'Chưa có thông báo nào.'}
          </p>
          <p className="text-xs text-text-secondary">
            Thông báo mới sẽ xuất hiện khi Ban Giám hiệu phát hành.
          </p>
        </Card>
      )}

      {/* Announcement Cards */}
      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((ann) => {
            const config = PRIORITY_CONFIG[ann.priority ?? 'normal'] ?? PRIORITY_CONFIG.normal;
            const Icon = config.icon;
            const isExpanded = expandedId === ann.id;

            return (
              <Card
                key={ann.id}
                padding="p-0"
                className={`overflow-hidden transition-all hover:border-hairline-darker ${
                  ann.priority === 'urgent' ? 'border-red-200 bg-red-50/30' : ''
                } ${ann.priority === 'important' ? 'border-amber-200 bg-amber-50/20' : ''}`}
              >
                <button
                  type="button"
                  className="w-full text-left p-5 flex items-start gap-4"
                  onClick={() => setExpandedId(isExpanded ? null : ann.id)}
                >
                  {/* Priority indicator */}
                  <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    ann.priority === 'urgent' ? 'bg-danger/10 text-danger' :
                    ann.priority === 'important' ? 'bg-amber-100 text-amber-700' :
                    'bg-surface-neutral text-primary'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant={config.variant} size="sm">{config.label}</Badge>
                      <span className="text-[11px] text-text-secondary flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatRelativeTime(ann.published_at || ann.created_at)}
                      </span>
                      {ann.author_name && (
                        <span className="text-[11px] text-text-secondary flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {ann.author_name}
                        </span>
                      )}
                    </div>

                    <h3 className={`font-semibold leading-snug ${
                      ann.priority === 'urgent' ? 'text-danger' :
                      ann.priority === 'important' ? 'text-amber-900' :
                      'text-text-primary'
                    }`}>
                      {ann.title}
                    </h3>

                    {!isExpanded && ann.content && (
                      <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                        {ann.content}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 text-text-secondary text-xs">
                    {isExpanded ? '▲' : '▼'}
                  </div>
                </button>

                {/* Expanded content */}
                {isExpanded && ann.content && (
                  <div className="px-5 pb-5 pl-[calc(1.25rem+2.5rem)]">
                    <div className="pt-4 border-t border-hairline space-y-3">
                      <div className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap">
                        {ann.content}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

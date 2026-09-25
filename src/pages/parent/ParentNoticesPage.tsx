/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// =============================================================================
// ParentNoticesPage — School announcements for parents
// Phase 13: Extracted from ParentDashboard.jsx (Tab: notices)
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { useChildSwitcher } from './useChildSwitcher';
import { ChildSwitcher } from './ChildSwitcher';
import { parentApi } from '../../services/api';
import { Bell, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority?: string;
  publishedAt?: string;
  authorName?: string;
  confirmed?: boolean;
}

export function ParentNoticesPage() {
  const { children, selectedChild, isLoading: loadingChildren, error: errorChildren, selectChild } = useChildSwitcher();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [errorData, setErrorData] = useState<string | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  const loadAnnouncements = useCallback(async (childId?: string) => {
    setIsLoadingData(true);
    setErrorData(null);
    try {
      const res = await parentApi.getAnnouncements<{ announcements?: Announcement[] }>(childId);
      if (res && (res as { announcements?: Announcement[] }).announcements) {
        setAnnouncements((res as { announcements: Announcement[] }).announcements);
      } else if (Array.isArray(res)) {
        setAnnouncements(res as Announcement[]);
      }
    } catch (_err) {
      setErrorData('Không thể tải thông báo.');
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    // Load all announcements (not scoped to child)
    loadAnnouncements(undefined);
  }, [loadAnnouncements]);

  const handleConfirmNotice = async (noticeId: string) => {
    try {
      await parentApi.confirmNotice(noticeId);
      showToast('Đã cập nhật phản hồi!');
      // Update local state
      setAnnouncements(prev =>
        prev.map(n => n.id === noticeId ? { ...n, confirmed: true } : n)
      );
    } catch (_err) {
      showToast('Cập nhật thất bại. Vui lòng thử lại.');
    }
  };

  if (loadingChildren) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <span className="text-sm text-text-secondary">Đang tải...</span>
        </div>
      </div>
    );
  }

  if (errorChildren && children.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="max-w-sm text-center p-6">
          <AlertCircle className="w-10 h-10 text-danger mx-auto mb-3" />
          <p className="text-sm text-text-primary font-medium mb-1">{errorChildren}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-primary text-white px-5 py-3 rounded-card shadow-whisper flex items-center gap-3 border border-ocean/30 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
          <span className="text-xs font-medium">{feedbackToast}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <div className="text-xs text-text-secondary mb-1">Thông báo nhà trường</div>
        <ChildSwitcher
          children={children}
          selectedChild={selectedChild}
          onSelect={selectChild}
        />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-medium text-text-primary">Thông báo nhà trường</h2>
          <p className="text-xs text-text-secondary mt-1">Tin tức và thông báo dành cho phụ huynh</p>
        </div>
      </div>

      {errorData && (
        <div className="p-4 bg-danger/10 border border-danger/30 rounded-card flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-danger shrink-0" />
          <span className="text-sm text-danger">{errorData}</span>
        </div>
      )}

      {isLoadingData ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-surface-neutral rounded animate-pulse" />
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <Card className="text-center py-12">
          <Bell className="w-12 h-12 text-hairline mx-auto mb-3" />
          <p className="text-sm text-text-primary">Không có thông báo nào</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map((n) => (
            <Card key={n.id} padding="p-6" className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      n.priority === 'urgent' ? 'danger' :
                      n.priority === 'important' ? 'warning' : 'info'
                    }
                    size="sm"
                  >
                    {n.priority === 'urgent' ? 'Khẩn cấp' :
                     n.priority === 'important' ? 'Quan trọng' : 'Thông báo'}
                  </Badge>
                  <span className="text-xs text-text-secondary">
                    • {n.publishedAt ? new Date(n.publishedAt).toLocaleDateString('vi-VN', {
                      day: '2-digit', month: '2-digit', year: 'numeric'
                    }) : ''}
                  </span>
                </div>
                <span className="text-xs font-semibold text-ocean">{n.authorName || 'Nhà trường'}</span>
              </div>

              <h3 className="text-base font-semibold text-text-primary">{n.title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">{n.content}</p>

              <div className="flex items-center justify-between pt-2 border-t border-hairline">
                {n.confirmed ? (
                  <div className="flex items-center gap-1.5 text-xs text-success">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Đã xác nhận đã đọc</span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleConfirmNotice(n.id)}
                    className="text-xs text-ocean hover:underline font-medium"
                  >
                    Đánh dấu đã đọc
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

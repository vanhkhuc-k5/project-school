// =============================================================================
// StudentResourcesPage — TypeScript with Enhanced Preview Modal
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { studentApi } from '../../services/api';
import {
  Download,
  FileText,
  Video,
  FileCheck,
  CheckCircle2,
  Eye,
  BookOpen,
  Bookmark,
  Star,
  AlertCircle,
  Search,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// TypeScript Interfaces
// ─────────────────────────────────────────────────────────────────────────────

type ResourceType = 'document' | 'exam' | 'video';

interface Resource {
  id: string | number;
  title?: string;
  subject?: string;
  type?: ResourceType;
  file_size?: string;
  downloads_count?: number;
  uploaded_by?: string;
  url?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function StudentResourcesPage(): React.JSX.Element {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>('Tất cả');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [previewResource, setPreviewResource] = useState<Resource | null>(null);
  const [downloadSuccessId, setDownloadSuccessId] = useState<string | number | null>(null);
  const [favorites, setFavorites] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('eduportal_resource_favorites');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [showOnlyFavorites, setShowOnlyFavorites] = useState<boolean>(false);
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([
    'Tất cả',
    'Toán học',
    'Vật lý',
    'Tiếng Anh',
    'Hóa học',
    'Ngữ văn',
    'Tin học',
  ]);

  const fetchResources = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    const filters: Record<string, string> = {};
    if (selectedSubject !== 'Tất cả') filters.subject = selectedSubject;
    if (selectedType !== 'all') filters.type = selectedType;
    if (searchQuery) filters.search = searchQuery;

    try {
      const list = await studentApi.getResources<Resource>(filters);
      setResources(Array.isArray(list) ? list : []);

      // Dynamically extract available subjects from results
      if (Array.isArray(list) && list.length > 0) {
        const subjects = [
          'Tất cả',
          ...new Set(list.map((r) => r.subject).filter(Boolean)),
        ];
        setAvailableSubjects(subjects.length > 1 ? subjects : [
          'Tất cả',
          'Toán học',
          'Vật lý',
          'Tiếng Anh',
          'Hóa học',
          'Ngữ văn',
          'Tin học',
        ]);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Không thể tải danh sách tài liệu.';
      setError(msg);
      setResources([]);
    } finally {
      setLoading(false);
    }
  }, [selectedSubject, selectedType, searchQuery]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const toggleFavorite = (id: string | number): void => {
    setFavorites((prev) => {
      const next = { ...prev, [id]: !prev[id as string] };
      try {
        localStorage.setItem('eduportal_resource_favorites', JSON.stringify(next));
      } catch {
        // localStorage may be unavailable
      }
      return next;
    });
  };

  const handleDownload = async (res: Resource): Promise<void> => {
    try {
      await studentApi.downloadResource(String(res.id));
      setDownloadSuccessId(res.id);
      setTimeout(() => setDownloadSuccessId(null), 2500);
    } catch {
      setDownloadSuccessId(null);
    }
  };

  const filteredResources = resources.filter((item) => {
    if (showOnlyFavorites && !favorites[String(item.id)]) return false;
    return true;
  });

  // Filter by selected subject (client-side for search/filter UI)
  const displayResources = filteredResources.filter((item) => {
    if (selectedSubject !== 'Tất cả' && item.subject !== selectedSubject) return false;
    if (selectedType !== 'all') {
      if (selectedType === 'document' && item.type !== 'document') return false;
      if (selectedType === 'exam' && item.type !== 'exam') return false;
      if (selectedType === 'video' && item.type !== 'video') return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        (item.title?.toLowerCase().includes(q) ?? false) ||
        (item.subject?.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-text-secondary mb-1">
            <span>Học sinh</span>
            <span>/</span>
            <span className="text-text-primary font-medium">Kho học liệu điện tử</span>
          </div>
          <h1 className="text-2xl font-medium text-text-primary">Tài liệu học tập & Đề thi thử</h1>
          <p className="text-xs text-text-secondary mt-1">
            Tổng hợp bài giảng, sơ đồ tư duy và đề cương ôn tập trọng tâm do Hội đồng Chuyên môn nhà trường phát hành.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm tài liệu, đề thi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 pl-9 pr-4 bg-white border border-hairline rounded text-xs text-text-primary focus:border-ocean outline-none w-64"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
            className={`h-10 px-3.5 rounded border text-xs flex items-center gap-1.5 transition-all ${
              showOnlyFavorites
                ? 'bg-amber-50 text-amber-900 border-amber-300 font-medium'
                : 'bg-white border-hairline text-text-secondary hover:text-text-primary'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${showOnlyFavorites ? 'fill-amber-500 text-amber-600' : ''}`} />
            <span>Đã lưu</span>
          </button>
        </div>
      </div>

      {/* Subject Filter Pills */}
      <div className="flex flex-wrap items-center gap-2 pb-1">
        {availableSubjects.map((sub) => (
          <button
            key={sub}
            onClick={() => setSelectedSubject(sub)}
            className={`px-3.5 py-1.5 rounded text-xs transition-all ${
              selectedSubject === sub
                ? 'bg-primary text-white font-medium shadow-whisper'
                : 'bg-white border border-hairline text-text-secondary hover:text-text-primary'
            }`}
          >
            {sub}
          </button>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <Card padding="p-6" className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="w-8 h-8 text-danger" />
          <p className="text-sm text-danger font-medium">{error}</p>
          <Button variant="secondary" size="sm" onClick={fetchResources}>Thử lại</Button>
        </Card>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Card key={i} padding="p-5" className="animate-pulse space-y-3">
              <div className="flex items-start justify-between">
                <div className="w-9 h-9 bg-hairline rounded" />
                <div className="w-6 h-6 bg-hairline rounded" />
              </div>
              <div className="h-4 bg-hairline rounded w-3/4" />
              <div className="h-3 bg-hairline rounded w-1/2" />
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && displayResources.length === 0 && (
        <Card padding="p-8" className="text-center">
          <BookOpen className="w-10 h-10 text-hairline mx-auto mb-3" />
          <p className="text-sm text-text-secondary mb-1">
            {searchQuery ? 'Không tìm thấy tài liệu phù hợp.' : 'Chưa có tài liệu học tập cho mục này.'}
          </p>
          <p className="text-xs text-text-secondary">
            Giáo viên sẽ phát hành tài liệu sau khi hoàn thành nội dung.
          </p>
        </Card>
      )}

      {/* Resource Grid */}
      {!loading && !error && displayResources.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {displayResources.map((item) => {
            const isExam = item.type === 'exam';
            const isVideo = item.type === 'video';
            const Icon = isVideo ? Video : isExam ? FileCheck : FileText;
            const isDownloaded = downloadSuccessId === item.id;
            const isFav = Boolean(favorites[String(item.id)]);

            return (
              <Card key={item.id} padding="p-5" className="flex flex-col justify-between hover:border-ocean/40 transition-all group">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <span
                      className={`w-9 h-9 rounded flex items-center justify-center ${
                        isVideo
                          ? 'bg-sky text-ocean'
                          : isExam
                          ? 'bg-warning-light text-warning-dark'
                          : 'bg-surface-neutral text-primary'
                      }`}
                    >
                      <Icon className="w-5 h-5 stroke-[1.75]" />
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => toggleFavorite(item.id)}
                        className="p-1 hover:bg-surface-neutral rounded text-text-secondary transition-colors"
                        title={isFav ? 'Bỏ lưu' : 'Lưu tài liệu'}
                      >
                        <Bookmark className={`w-4 h-4 ${isFav ? 'fill-amber-500 text-amber-500' : ''}`} />
                      </button>
                      <Badge variant={isVideo ? 'info' : isExam ? 'warning' : 'neutral'} size="sm">
                        {item.subject}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-medium text-text-primary group-hover:text-ocean line-clamp-2 leading-relaxed">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-text-secondary mt-2">
                      <span>{item.file_size}</span>
                      <span>•</span>
                      <span>{item.downloads_count} lượt tải</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 hairline-t flex items-center justify-between gap-2">
                  <span className="text-[11px] text-text-secondary truncate">{item.uploaded_by}</span>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setPreviewResource(item)}
                      className="p-1.5 hover:bg-surface-neutral rounded border border-hairline text-text-secondary"
                      title="Xem trước"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    <Button
                      variant={isDownloaded ? 'secondary' : 'primary'}
                      size="sm"
                      icon={isDownloaded ? CheckCircle2 : Download}
                      onClick={() => handleDownload(item)}
                    >
                      {isDownloaded ? 'Đã tải' : 'Tải về'}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : null}

      {/* ── Document Preview Modal ──────────────────────────────────────────── */}
      <Modal
        isOpen={Boolean(previewResource)}
        onClose={() => setPreviewResource(null)}
        title={previewResource?.title || 'Xem trước tài liệu'}
      >
        {previewResource && (
          <div className="space-y-4 text-xs text-text-secondary">
            {/* Resource info header */}
            <div className="p-4 bg-surface-neutral rounded border border-hairline flex justify-between items-center">
              <div>
                <div className="font-semibold text-text-primary text-sm">{previewResource.title}</div>
                <div className="text-text-secondary mt-0.5">
                  Môn: {previewResource.subject} • Dung lượng: {previewResource.file_size} • Phát hành bởi {previewResource.uploaded_by}
                </div>
              </div>
              <Badge variant="info">{String(previewResource.type || 'document').toUpperCase()}</Badge>
            </div>

            {/* ── Document Preview Viewer ─────────────────────────────────── */}
            <div className="border border-hairline rounded overflow-hidden bg-white">
              {/* PDF Viewer iframe / embed */}
              <div className="bg-surface-neutral border-b border-hairline px-4 py-2 flex items-center gap-3">
                <FileText className="w-4 h-4 text-ocean shrink-0" />
                <span className="text-xs font-medium text-text-primary">Bản xem trước tài liệu</span>
              </div>
              <div className="relative" style={{ height: '480px' }}>
                {/* 
                  Demo PDF viewer using Google Docs viewer or browser native embed.
                  In production, replace with actual document URL from previewResource.url
                */}
                <iframe
                  src={`https://docs.google.com/gview?url=${encodeURIComponent(
                    previewResource.url ||
                      'https://www.w3.org/WAI/WCAG21/Techniques/pdf/PDF1.pdf'
                  )}&embedded=true`}
                  title={`Xem trước: ${previewResource.title}`}
                  className="w-full h-full border-0"
                  loading="lazy"
                  sandbox="allow-scripts allow-same-origin allow-popups"
                />
                {/* Fallback overlay when iframe is blocked */}
                <div className="absolute inset-0 flex items-center justify-center bg-surface-neutral/80 backdrop-blur-sm pointer-events-none">
                  <div className="text-center space-y-2 p-6">
                    <FileText className="w-10 h-10 text-ocean mx-auto" />
                    <div className="text-xs font-medium text-text-primary">
                      {previewResource.title}
                    </div>
                    <div className="text-[11px] text-text-secondary">
                      Tài liệu PDF • {previewResource.file_size}
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={Download}
                      className="mt-2 pointer-events-auto"
                      onClick={() => handleDownload(previewResource)}
                    >
                      Tải về tài liệu
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Content summary */}
            <div className="p-4 bg-white border border-hairline rounded space-y-2">
              <div className="font-medium text-primary text-xs">Nội dung tóm tắt & hướng dẫn ôn tập:</div>
              <p className="text-[11px] leading-relaxed">
                1. Định nghĩa chuẩn và các công thức biến đổi cơ bản theo chương trình SGK mới.
              </p>
              <p className="text-[11px] leading-relaxed">
                2. Phương pháp phân tích đồ thị và các bài toán thực tế có gắn tham số.
              </p>
              <p className="text-[11px] leading-relaxed">
                3. 20 bài tập mẫu có lời giải chi tiết và phân tích các lỗi sai học sinh thường gặp.
              </p>
              <p className="text-[11px] leading-relaxed">
                4. Bảng tổng hợp công thức ghi nhớ nhanh chuẩn bị cho kỳ thi sắp tới.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" size="md" onClick={() => setPreviewResource(null)}>
                Đóng
              </Button>
              <Button
                variant="primary"
                size="md"
                icon={Download}
                onClick={() => {
                  handleDownload(previewResource);
                  setPreviewResource(null);
                }}
              >
                Tải về toàn bộ tài liệu ({previewResource.file_size})
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

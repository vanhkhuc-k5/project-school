import React, { useState, useEffect } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { studentApi } from '../../services/api';
import {
  Layers,
  Search,
  Download,
  FileText,
  Video,
  FileCheck,
  CheckCircle2,
  Filter,
  Eye,
  BookOpen,
} from 'lucide-react';

export function StudentResourcesPage() {
  const [resources, setResources] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('Tất cả');
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewResource, setPreviewResource] = useState(null);
  const [downloadSuccessId, setDownloadSuccessId] = useState(null);

  const subjects = ['Tất cả', 'Toán học', 'Vật lý', 'Tiếng Anh', 'Hóa học', 'Ngữ văn', 'Tin học'];

  const fetchResources = async () => {
    const filters = {};
    if (selectedSubject !== 'Tất cả') filters.subject = selectedSubject;
    if (selectedType !== 'all') filters.type = selectedType;
    if (searchQuery) filters.search = searchQuery;

    const list = await studentApi.getResources(filters);
    if (list) {
      setResources(list);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [selectedSubject, selectedType, searchQuery]);

  const handleDownload = async (res) => {
    await studentApi.downloadResource(res.id);
    setDownloadSuccessId(res.id);
    fetchResources();
    setTimeout(() => setDownloadSuccessId(null), 2500);
  };

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
        </div>
      </div>

      {/* Subject Filter Pills */}
      <div className="flex flex-wrap items-center gap-2 pb-1">
        {subjects.map((sub) => (
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

      {/* Resource Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {resources.map((item) => {
          const isExam = item.type === 'exam';
          const isVideo = item.type === 'video';
          const Icon = isVideo ? Video : isExam ? FileCheck : FileText;
          const isDownloaded = downloadSuccessId === item.id;

          return (
            <Card key={item.id} padding="p-5" className="flex flex-col justify-between hover:border-ocean/40 transition-all group">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <span
                    className={`w-9 h-9 rounded flex items-center justify-center ${
                      isVideo
                        ? 'bg-purple-50 text-purple-600'
                        : isExam
                        ? 'bg-amber-50 text-amber-600'
                        : 'bg-sky text-primary'
                    }`}
                  >
                    <Icon className="w-5 h-5 stroke-[1.75]" />
                  </span>
                  <Badge variant={isVideo ? 'info' : isExam ? 'warning' : 'neutral'} size="sm">
                    {item.subject}
                  </Badge>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-text-primary group-hover:text-ocean line-clamp-2 leading-relaxed">
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

      {/* Document Preview Modal */}
      <Modal
        isOpen={Boolean(previewResource)}
        onClose={() => setPreviewResource(null)}
        title={previewResource?.title || 'Xem trước tài liệu'}
      >
        {previewResource && (
          <div className="space-y-4 text-xs text-text-secondary">
            <div className="p-4 bg-surface-neutral rounded border border-hairline flex justify-between items-center">
              <div>
                <div className="font-semibold text-text-primary text-sm">{previewResource.title}</div>
                <div className="text-text-secondary mt-0.5">
                  Môn: {previewResource.subject} • Dung lượng: {previewResource.file_size} • Phát hành bởi {previewResource.uploaded_by}
                </div>
              </div>
              <Badge variant="info">{previewResource.type.toUpperCase()}</Badge>
            </div>

            <div className="p-6 bg-white border border-hairline rounded space-y-3 font-mono leading-relaxed text-[11px]">
              <div className="font-bold text-primary">NỘI DUNG TÓM TẮT & HƯỚNG DẪN ÔN TẬP:</div>
              <p>1. Định nghĩa chuẩn và các công thức biến đổi cơ bản theo chương trình SGK mới.</p>
              <p>2. Phương pháp phân tích đồ thị và các bài toán thực tế có gắn tham số.</p>
              <p>3. 20 bài tập mẫu có lời giải chi tiết và phân tích các lỗi sai học sinh thường gặp.</p>
              <p>4. Bảng tổng hợp công thức ghi nhớ nhanh chuẩn bị cho kỳ thi sắp tới.</p>
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

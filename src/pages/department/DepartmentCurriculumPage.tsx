// =============================================================================
// DepartmentCurriculumPage — G39 Department Curriculum Framework
// Curriculum framework, teaching materials
// =============================================================================

import React, { useState } from 'react';
import {
  BookOpen,
  Download,
  FileText,
  Video,
  Link as LinkIcon,
  Edit,
  Plus,
  ChevronRight,
  Folder,
  Search,
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';

interface CurriculumItem {
  id: string;
  grade: number;
  semester: number;
  topic: string;
  chapters: Chapter[];
}

interface Chapter {
  id: string;
  name: string;
  lessons: number;
  hours: number;
  status: 'completed' | 'in_progress' | 'pending';
  resources: Resource[];
}

interface Resource {
  id: string;
  name: string;
  type: 'pdf' | 'video' | 'link' | 'doc';
  url?: string;
}

const MOCK_CURRICULUM: CurriculumItem[] = [
  {
    id: '1',
    grade: 10,
    semester: 1,
    topic: 'Đại số & Hình học cơ bản',
    chapters: [
      {
        id: 'c1',
        name: 'Chương 1: Mệnh đề và tập hợp',
        lessons: 8,
        hours: 12,
        status: 'completed',
        resources: [
          { id: 'r1', name: 'Bài giảng Chương 1.pptx', type: 'doc' },
          { id: 'r2', name: 'Bài tập trắc nghiệm.pdf', type: 'pdf' },
        ],
      },
      {
        id: 'c2',
        name: 'Chương 2: Hàm số bậc nhất và bậc hai',
        lessons: 12,
        hours: 18,
        status: 'in_progress',
        resources: [
          { id: 'r3', name: 'Video bài giảng', type: 'video', url: '#' },
        ],
      },
      {
        id: 'c3',
        name: 'Chương 3: Phương trình',
        lessons: 10,
        hours: 15,
        status: 'pending',
        resources: [],
      },
    ],
  },
  {
    id: '2',
    grade: 11,
    semester: 1,
    topic: 'Hình học và Đại số',
    chapters: [
      {
        id: 'c4',
        name: 'Chương 1: Hình học không gian',
        lessons: 15,
        hours: 25,
        status: 'in_progress',
        resources: [
          { id: 'r4', name: 'Mô hình 3D.pptx', type: 'doc' },
        ],
      },
      {
        id: 'c5',
        name: 'Chương 2: Lượng giác',
        lessons: 12,
        hours: 18,
        status: 'pending',
        resources: [],
      },
    ],
  },
  {
    id: '3',
    grade: 12,
    semester: 1,
    topic: 'Giải tích',
    chapters: [
      {
        id: 'c6',
        name: 'Chương 1: Ứng dụng đạo hàm',
        lessons: 10,
        hours: 15,
        status: 'completed',
        resources: [
          { id: 'r5', name: 'Bài tập ứng dụng.pdf', type: 'pdf' },
        ],
      },
      {
        id: 'c7',
        name: 'Chương 2: Tích phân',
        lessons: 12,
        hours: 20,
        status: 'in_progress',
        resources: [
          { id: 'r6', name: 'Video tích phân từng phần', type: 'video', url: '#' },
        ],
      },
    ],
  },
];

const RESOURCE_ICONS = {
  pdf: FileText,
  video: Video,
  link: LinkIcon,
  doc: FileText,
};

const STATUS_CONFIG = {
  completed: { variant: 'success' as const, label: 'Đã hoàn thành' },
  in_progress: { variant: 'info' as const, label: 'Đang dạy' },
  pending: { variant: 'default' as const, label: 'Chưa dạy' },
};

export function DepartmentCurriculumPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(['1', '2', '3']));

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredCurriculum = MOCK_CURRICULUM.filter((item) => {
    if (selectedGrade && item.grade !== selectedGrade) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        item.topic.toLowerCase().includes(query) ||
        item.chapters.some((c) => c.name.toLowerCase().includes(query))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium text-text-primary">Khung Chương Trình</h1>
          <p className="text-sm text-text-secondary mt-1">
            Quản lý chương trình giảng dạy và tài liệu bộ môn
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary">
            <Download className="w-4 h-4 mr-2" />
            Xuất chương trình
          </Button>
          <Button variant="primary">
            <Plus className="w-4 h-4 mr-2" />
            Thêm chương
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Tìm kiếm chương trình..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={Search}
              className="w-full"
            />
          </div>
          <div className="flex gap-2">
            {[10, 11, 12].map((grade) => (
              <Button
                key={grade}
                variant={selectedGrade === grade ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setSelectedGrade(selectedGrade === grade ? null : grade)}
              >
                Khối {grade}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Curriculum List */}
      <div className="space-y-4">
        {filteredCurriculum.map((item) => (
          <Card key={item.id} className="overflow-hidden">
            {/* Header */}
            <button
              onClick={() => toggleExpand(item.id)}
              className="w-full p-4 flex items-center justify-between hover:bg-surface-neutral/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-ocean/10 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-ocean" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-text-primary">{item.topic}</h3>
                    <Badge variant="info" size="sm">Khối {item.grade}</Badge>
                    <Badge variant="default" size="sm">Học kỳ {item.semester}</Badge>
                  </div>
                  <p className="text-sm text-text-secondary mt-1">
                    {item.chapters.length} chương • {item.chapters.reduce((acc, c) => acc + c.lessons, 0)} bài • {item.chapters.reduce((acc, c) => acc + c.hours, 0)} tiết
                  </p>
                </div>
              </div>
              <ChevronRight
                className={`w-5 h-5 text-text-secondary transition-transform ${
                  expandedItems.has(item.id) ? 'rotate-90' : ''
                }`}
              />
            </button>

            {/* Chapters */}
            {expandedItems.has(item.id) && (
              <div className="border-t border-hairline">
                {item.chapters.map((chapter, index) => {
                  const status = STATUS_CONFIG[chapter.status];
                  const ResourceIcon = Folder;
                  return (
                    <div
                      key={chapter.id}
                      className={`p-4 ${index !== item.chapters.length - 1 ? 'border-b border-hairline' : ''}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded bg-surface-neutral flex items-center justify-center mt-0.5">
                            <span className="text-sm font-medium text-text-secondary">{index + 1}</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-text-primary">{chapter.name}</p>
                              <Badge variant={status.variant} size="sm">{status.label}</Badge>
                            </div>
                            <p className="text-xs text-text-secondary mt-1">
                              {chapter.lessons} bài • {chapter.hours} tiết
                            </p>

                            {/* Resources */}
                            {chapter.resources.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {chapter.resources.map((resource) => {
                                  const ResIcon = RESOURCE_ICONS[resource.type];
                                  return (
                                    <div
                                      key={resource.id}
                                      className="flex items-center gap-2 px-3 py-1.5 bg-surface-neutral rounded-lg text-sm"
                                    >
                                      <ResIcon className="w-4 h-4 text-text-secondary" />
                                      <span className="text-text-primary">{resource.name}</span>
                                      {resource.url && (
                                        <a
                                          href={resource.url}
                                          className="text-ocean hover:underline"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <LinkIcon className="w-3.5 h-3.5" />
                                        </a>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

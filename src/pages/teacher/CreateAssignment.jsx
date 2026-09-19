import React, { useState } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { CREATE_ASSIGNMENT_INITIAL } from '../../mock/teacherData';
import { teacherApi } from '../../services/api';
import {
  Save,
  Send,
  Plus,
  Trash2,
  Clock,
  Calendar,
  Layers,
  HelpCircle,
  Eye,
  CheckCircle2,
  Smartphone,
  Monitor,
  Check,
} from 'lucide-react';

export function CreateAssignment({ onBackToDashboard }) {
  const [formData, setFormData] = useState(CREATE_ASSIGNMENT_INITIAL);
  const [submissionType, setSubmissionType] = useState('quiz');
  const [selectedStudentPreviewTab, setSelectedStudentPreviewTab] = useState(1);
  const [selectedOptionInPreview, setSelectedOptionInPreview] = useState('A');
  const [isPublished, setIsPublished] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handlePublish = async () => {
    setIsSaving(true);
    try {
      await teacherApi.createAssignment({
        title: formData.title,
        subject: formData.subject,
        targetClass: formData.targetClass,
        dueDate: formData.dueDate,
        maxScore: formData.maxScore,
        questions: formData.questions,
      });
      setIsPublished(true);
      setTimeout(() => {
        setIsPublished(false);
        onBackToDashboard?.();
      }, 1500);
    } catch (err) {
      console.error('Failed to create assignment:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-text-secondary mb-1">
            <button onClick={onBackToDashboard} className="hover:underline">
              Quản lý bài tập
            </button>
            <span>/</span>
            <span className="text-text-primary font-medium">Tạo bài tập mới</span>
            <Badge variant="info" size="sm">Bản nháp</Badge>
          </div>
          <h1 className="text-2xl font-medium text-text-primary">Tạo bài tập mới</h1>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" size="md" onClick={onBackToDashboard}>
            Hủy bỏ
          </Button>
          <Button variant="secondary" size="md" icon={Save}>
            Lưu nháp
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={Send}
            iconPosition="right"
            onClick={handlePublish}
          >
            Giao bài ngay
          </Button>
        </div>
      </div>

      {isPublished && (
        <div className="p-4 bg-emerald-50 border border-success rounded-card text-success flex items-center gap-3 font-medium text-sm animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
          <span>Đã giao bài tập thành công cho 2 lớp (79 học sinh)! Chuyển về tổng quan...</span>
        </div>
      )}

      {/* Main Split Screen: Left Form (7 cols), Right Live Preview (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Cols: Structured Assignment Builder */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: Thông tin chung */}
          <Card padding="p-6" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary"></span>
                <span>1. Thông tin chung</span>
              </h2>
              <span className="text-xs text-ocean cursor-pointer hover:underline">Bắt buộc</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-primary mb-1">
                Tên bài tập
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full h-11 px-3.5 bg-white border border-hairline rounded text-sm text-text-primary focus:border-ocean focus:ring-2 focus:ring-ocean/15 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-primary mb-1">
                  Phân môn và khối lớp
                </label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full h-11 px-3.5 bg-white border border-hairline rounded text-sm text-text-primary focus:border-ocean outline-none"
                >
                  <option value="Toán học - Khối 10">Toán học - Khối 10</option>
                  <option value="Toán học - Khối 11">Toán học - Khối 11</option>
                  <option value="Đại số nâng cao">Đại số nâng cao</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-primary mb-1">
                  Hình thức nộp bài
                </label>
                <div className="grid grid-cols-3 gap-1 p-1 bg-surface-neutral rounded border border-hairline h-11">
                  <button
                    type="button"
                    onClick={() => setSubmissionType('quiz')}
                    className={`text-xs rounded font-medium transition-colors ${
                      submissionType === 'quiz' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary'
                    }`}
                  >
                    Trắc nghiệm
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubmissionType('essay')}
                    className={`text-xs rounded font-medium transition-colors ${
                      submissionType === 'essay' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary'
                    }`}
                  >
                    Tự luận
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubmissionType('attachment')}
                    className={`text-xs rounded font-medium transition-colors ${
                      submissionType === 'attachment' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary'
                    }`}
                  >
                    Đính kèm
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-primary mb-1">
                Mô tả & Hướng dẫn làm bài
              </label>
              <textarea
                rows={3}
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                className="w-full p-3.5 bg-white border border-hairline rounded text-sm text-text-primary focus:border-ocean focus:ring-2 focus:ring-ocean/15 outline-none resize-none"
              />
            </div>
          </Card>

          {/* Section 2: Cấu hình giao bài & Thời hạn */}
          <Card padding="p-6" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary"></span>
                <span>2. Cấu hình giao bài & Thời hạn</span>
              </h2>
              <span className="text-xs text-success flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Đã đồng bộ với niên khóa</span>
              </span>
            </div>

            {/* Target Classes */}
            <div>
              <label className="block text-xs font-medium text-text-primary mb-1.5">
                Lớp nhận bài tập <span className="text-text-secondary font-normal">(Tổng số: 79 học sinh)</span>
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1.5 rounded-pill bg-sky text-primary text-xs font-medium border border-ocean/20 flex items-center gap-1.5">
                  <span>10A1 (39 HS)</span>
                  <button className="text-primary hover:text-danger">×</button>
                </span>
                <span className="px-3 py-1.5 rounded-pill bg-sky text-primary text-xs font-medium border border-ocean/20 flex items-center gap-1.5">
                  <span>10A2 (40 HS)</span>
                  <button className="text-primary hover:text-danger">×</button>
                </span>
                <button className="px-3 py-1.5 rounded-pill bg-surface-neutral hover:bg-hairline text-text-secondary text-xs border border-hairline flex items-center gap-1">
                  <span>+ Chọn lớp khác</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-text-primary mb-1">
                  Hạn chót nộp bài
                </label>
                <div className="relative">
                  <input
                    type="text"
                    defaultValue="25/10/2024 - 23:59"
                    className="w-full h-11 pl-9 pr-3 text-xs bg-white border border-hairline rounded focus:border-ocean outline-none"
                  />
                  <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-primary mb-1">
                  Thời gian làm bài
                </label>
                <div className="relative">
                  <input
                    type="text"
                    defaultValue="45 phút"
                    className="w-full h-11 pl-9 pr-3 text-xs bg-white border border-hairline rounded focus:border-ocean outline-none"
                  />
                  <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-primary mb-1">
                  Thang điểm chuẩn
                </label>
                <select className="w-full h-11 px-3 text-xs bg-white border border-hairline rounded focus:border-ocean outline-none">
                  <option>Thang 10 (Hệ số 1)</option>
                  <option>Thang 10 (Hệ số 2)</option>
                  <option>Thang điểm 100</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-text-primary">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 text-primary rounded border-hairline"
                />
                <span>Khóa bài nộp ngay sau khi hết hạn</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-text-primary">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 text-primary rounded border-hairline"
                />
                <span>Đảo trật tự câu hỏi & đáp án</span>
              </label>
            </div>
          </Card>

          {/* Section 3: Ngân hàng câu hỏi */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary"></span>
                <span>3. Danh sách câu hỏi ({formData.questions.length} câu)</span>
              </h2>
              <span className="text-xs text-text-secondary">Tổng điểm: 2.0 / 10.0</span>
            </div>

            {/* Question 1 */}
            {formData.questions.map((q, idx) => (
              <Card key={q.id} padding="p-5" className="space-y-3">
                <div className="flex items-center justify-between hairline-b pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-primary px-2 py-0.5 rounded bg-sky">
                      Câu {idx + 1}
                    </span>
                    <span className="text-xs text-text-secondary">• {q.points} điểm</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="p-1 text-text-secondary hover:text-danger rounded">
                      <Trash2 className="w-4 h-4 stroke-[1.75]" />
                    </button>
                  </div>
                </div>

                <p className="text-xs font-medium text-text-primary leading-relaxed">
                  {q.prompt}
                </p>

                {/* SVG Graph for Question 2 if present */}
                {q.hasPlot && (
                  <div className="p-3 bg-surface-neutral rounded border border-hairline flex flex-col items-center">
                    <div className="text-[11px] text-text-secondary mb-1">
                      Đỉnh Parabol I(1; -2), đi qua (0; -1) và (2; -1)
                    </div>
                    <svg className="w-48 h-24" viewBox="0 0 200 100">
                      {/* Axes */}
                      <line x1="20" y1="50" x2="180" y2="50" stroke="#CBD5E1" strokeWidth="1" />
                      <line x1="100" y1="10" x2="100" y2="90" stroke="#CBD5E1" strokeWidth="1" />
                      {/* Parabola curve: y = (x-1)^2 - 2 -> scaled */}
                      <path
                        d="M 50 10 Q 100 85 150 10"
                        fill="none"
                        stroke="#0F3D5C"
                        strokeWidth="2"
                      />
                      <circle cx="100" cy="85" r="3" fill="#D64545" />
                      <text x="105" y="93" fontSize="9" fill="#1B2B3A">I(1;-2)</text>
                    </svg>
                  </div>
                )}

                {/* Options Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {q.options.map((opt) => (
                    <div
                      key={opt.id}
                      className={`p-2.5 rounded text-xs border flex items-center justify-between ${
                        opt.isCorrect
                          ? 'bg-emerald-50/80 border-success text-success font-medium'
                          : 'bg-white border-hairline text-text-primary'
                      }`}
                    >
                      <span>{opt.text}</span>
                      {opt.isCorrect && <Check className="w-4 h-4 text-success" />}
                    </div>
                  ))}
                </div>

                {q.explanation && (
                  <div className="p-2.5 bg-sky/30 rounded border border-ocean/20 text-[11px] text-text-secondary">
                    <strong className="text-primary">Giải thích:</strong> {q.explanation}
                  </div>
                )}
              </Card>
            ))}

            <button
              type="button"
              className="w-full py-3 border border-dashed border-hairline-darker hover:border-ocean hover:bg-sky/30 rounded-card text-xs font-medium text-ocean flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm câu hỏi trắc nghiệm mới</span>
            </button>
          </div>
        </div>

        {/* Right 5 Cols: Live Student Preview (Sticky) */}
        <div className="lg:col-span-5 sticky top-20">
          <Card padding="p-5" className="border-2 border-ocean/30 shadow-popover space-y-4">
            <div className="flex items-center justify-between hairline-b pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
                  Xem trước học sinh (Live Preview)
                </h3>
              </div>
              <div className="flex items-center gap-1 bg-surface-neutral p-1 rounded border border-hairline">
                <button className="p-1 rounded bg-white text-primary shadow-xs">
                  <Monitor className="w-3.5 h-3.5" />
                </button>
                <button className="p-1 rounded text-text-secondary hover:text-text-primary">
                  <Smartphone className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Test Header */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-ocean uppercase">Bài kiểm tra định kỳ</span>
                <span className="px-2.5 py-0.5 rounded bg-warning-light text-warning-dark font-mono text-xs font-semibold flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>44:59</span>
                </span>
              </div>
              <h4 className="text-sm font-semibold text-text-primary">{formData.title}</h4>
              <p className="text-xs text-text-secondary">
                GV: Cô Mai Lan • Môn Toán 10
              </p>
            </div>

            {/* Meta summary chips */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs py-2 bg-surface-neutral rounded border border-hairline">
              <div>
                <div className="text-[10px] text-text-secondary">Số câu hỏi</div>
                <div className="font-semibold text-primary">10 câu</div>
              </div>
              <div>
                <div className="text-[10px] text-text-secondary">Thời gian</div>
                <div className="font-semibold text-primary">45 phút</div>
              </div>
              <div>
                <div className="text-[10px] text-text-secondary">Điểm tối đa</div>
                <div className="font-semibold text-primary">10.0</div>
              </div>
            </div>

            {/* Question Palette Indicator */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] text-text-secondary">
                <span>Bảng câu hỏi [1/10]</span>
                <span className="text-success font-medium">● Đang làm</span>
              </div>
              <div className="grid grid-cols-5 gap-1 text-xs">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <button
                    key={num}
                    onClick={() => setSelectedStudentPreviewTab(num)}
                    className={`h-7 rounded border font-medium text-xs transition-all ${
                      selectedStudentPreviewTab === num
                        ? 'bg-primary text-white border-primary'
                        : num === 2
                        ? 'bg-emerald-50 border-emerald-300 text-success'
                        : 'bg-white border-hairline text-text-secondary hover:border-ocean'
                    }`}
                  >
                    {num < 10 ? `0${num}` : num}
                  </button>
                ))}
              </div>
            </div>

            {/* Current Question in Preview */}
            <div className="p-3.5 bg-white border border-hairline rounded space-y-3">
              <div className="text-xs font-semibold text-text-primary">
                Câu {selectedStudentPreviewTab} (1.0 điểm)
              </div>
              <p className="text-xs text-text-primary leading-relaxed">
                {selectedStudentPreviewTab === 1
                  ? formData.questions[0].prompt
                  : selectedStudentPreviewTab === 2
                  ? formData.questions[1].prompt
                  : 'Cho tam thức bậc hai f(x) = ax² + bx + c có biệt thức Δ < 0. Kết luận nào sau đây đúng với mọi x thuộc R?'}
              </p>

              {/* Radio options simulator */}
              <div className="space-y-1.5">
                {['A', 'B', 'C', 'D'].map((letter) => (
                  <label
                    key={letter}
                    onClick={() => setSelectedOptionInPreview(letter)}
                    className={`p-2 rounded border text-xs flex items-center gap-2.5 cursor-pointer transition-colors ${
                      selectedOptionInPreview === letter
                        ? 'bg-sky/60 border-ocean text-primary font-medium'
                        : 'bg-surface-neutral/50 border-hairline hover:bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="preview_opt"
                      checked={selectedOptionInPreview === letter}
                      onChange={() => {}}
                      className="text-primary focus:ring-ocean"
                    />
                    <span>
                      {letter}. {letter === 'A' ? 'I(-b/2a ; -Δ/4a)' : letter === 'B' ? 'I(b/2a ; -Δ/4a)' : letter === 'C' ? 'I(-b/a ; -Δ/2a)' : 'I(-b/2a ; -Δ/2a)'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <Button
              variant="primary"
              size="md"
              className="w-full justify-center bg-primary hover:bg-ocean"
            >
              Nộp bài kiểm tra
            </Button>
          </Card>
        </div>
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white hairline-t px-6 py-3 shadow-popover flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Đã tự động lưu nháp lúc 10:25 sáng nay • Phiên bản 1.4</span>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm">
            Lưu nháp
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handlePublish}
          >
            Giao bài cho 2 lớp (79 học sinh)
          </Button>
        </div>
      </div>
    </div>
  );
}

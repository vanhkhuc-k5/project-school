// CreateAssignment.tsx — TypeScript conversion with TT22 cognitive levels & exam shuffling
// Features: Bloom taxonomy tagging (NB/TH/VD/VDC), 4-exam-variant auto-shuffle (101-104), answer key matrix
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import {
  assignmentsApi,
  teacherAssignmentsApi,
  type TeacherAssignedClass,
  type AssignmentDetail,
  type AssignmentQuestion,
  type AssignmentQuestionOption,
  type AssignmentCreatePayload,
  type AssignmentUpdatePayload,
} from '../../services/api';
import { useSync } from '../../context/SyncContext';
import {
  Save,
  Send,
  Plus,
  Trash2,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Eye,
  ChevronLeft,
  Loader2,
  X,
  FileSpreadsheet,
  Shuffle,
  Download,
  Table,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────

type DifficultyLevel = 'NB' | 'TH' | 'VD' | 'VDC' | 'TB';
type QuestionType = 'multiple_choice' | 'short_answer' | 'essay';

interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  prompt: string;
  questionType: QuestionType;
  maxScore: number;
  difficulty: DifficultyLevel;
  options: QuestionOption[];
  correctAnswer: string;
  explanation: string;
  hasPlot: boolean;
  plotData: string;
}

interface ExamVariant {
  code: string; // '101' | '102' | '103' | '104'
  questions: (Question & { originalIndex: number })[];
}

interface FormState {
  title: string;
  instructions: string;
  subject: string;
  subjectId: string;
  targetClassIds: string[];
  dueDate: string;
  dueTime: string;
  durationMinutes: number;
  gradingScale: string;
  type: string;
  totalScore: number;
  lockAfterDue: boolean;
  shuffleQuestions: boolean;
  questions: Question[];
  // Legacy/optional fields from API that may be absent
  classId?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function newQuestionId(): string {
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function newOptionId(): string {
  return `opt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function emptyQuestion(type: QuestionType = 'multiple_choice'): Question {
  return {
    id: newQuestionId(),
    prompt: '',
    questionType: type,
    maxScore: 1.0,
    difficulty: 'TB',
    options:
      type === 'multiple_choice'
        ? [
            { id: newOptionId(), text: '', isCorrect: false },
            { id: newOptionId(), text: '', isCorrect: false },
          ]
        : ([] as QuestionOption[]),
    correctAnswer: '',
    explanation: '',
    hasPlot: false,
    plotData: '',
  };
}

const EMPTY_FORM: FormState = {
  title: '',
  instructions: '',
  subject: '',
  subjectId: '',
  targetClassIds: [],
  dueDate: '',
  dueTime: '23:59',
  durationMinutes: 45,
  gradingScale: 'Thang 10 (Hệ số 1)',
  type: 'quiz',
  totalScore: 10,
  lockAfterDue: true,
  shuffleQuestions: true,
  questions: [],
};

const QUESTION_TYPES: Array<{ value: QuestionType; label: string }> = [
  { value: 'multiple_choice', label: 'Trắc nghiệm' },
  { value: 'short_answer', label: 'Trả lời ngắn' },
  { value: 'essay', label: 'Tự luận' },
];

// Fisher-Yates shuffle
function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Generate 4 exam variants with shuffled questions + answers
function generateExamVariants(questions: Question[]): ExamVariant[] {
  const codes = ['101', '102', '103', '104'];
  return codes.map((code) => {
    // Shuffle questions
    const shuffledQuestions = shuffleArray(
      questions.map((q, idx) => ({ ...q, originalIndex: idx }))
    );

    // For each question, shuffle options if multiple choice
    const withShuffledOptions = shuffledQuestions.map((q) => {
      if (q.questionType !== 'multiple_choice' || !q.options || q.options.length <= 1) {
        return q;
      }
      const shuffledOpts = shuffleArray(q.options);
      // Re-assign correct answer ID
      const correctOpt = q.options.find((o) => o.isCorrect);
      const newCorrectId = correctOpt
        ? shuffledOpts.find((o) => o.text === correctOpt.text)?.id || ''
        : '';
      return {
        ...q,
        options: shuffledOpts.map((o) => ({ ...o, isCorrect: o.id === newCorrectId })),
      };
    });

    return { code, questions: withShuffledOptions };
  });
}

// Export variants to CSV
function exportVariantsToCsv(variants: ExamVariant[], title: string): void {
  const rows: string[][] = [];

  variants.forEach((variant) => {
    rows.push([`=== MÃ ĐỀ ${variant.code} ===`]);
    rows.push(['STT', 'Câu gốc', 'Mức độ', 'Điểm', 'Nội dung câu hỏi', 'Đáp án đúng']);

    variant.questions.forEach((q, idx) => {
      const correctAnswer =
        q.questionType === 'multiple_choice'
          ? q.options?.find((o) => o.isCorrect)?.text || '—'
          : q.correctAnswer || '—';

      rows.push([
        String(idx + 1),
        String(q.originalIndex + 1),
        q.difficulty || 'TB',
        String(q.maxScore),
        `"${q.prompt.replace(/"/g, '""')}"`,
        `"${correctAnswer.replace(/"/g, '""')}"`,
      ]);
    });

    // Answer key row
    rows.push([]);
    rows.push(['--- MA TRẬN ĐÁP ÁN ---']);
    const answerKey = variant.questions.map((q, idx) => {
      if (q.questionType === 'multiple_choice') {
        const correctIdx = q.options?.findIndex((o) => o.isCorrect);
        const letter = correctIdx !== undefined && correctIdx >= 0
          ? String.fromCharCode(65 + correctIdx)
          : '?';
        return `Câu ${idx + 1}: ${letter}`;
      }
      return `Câu ${idx + 1}: ${q.correctAnswer || '—'}`;
    });
    rows.push([answerKey.join(' | ')]);
    rows.push([]);
  });

  const csvContent = '\uFEFF' + rows.map((r) => r.join(',')).join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `De_Thi_${title.replace(/\s+/g, '_')}_EduPortal.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ─── Difficulty Config ────────────────────────────────────────────────────────

const DIFFICULTY_CONFIG: Array<{
  value: DifficultyLevel;
  label: string;
  desc: string;
  color: string;
  activeColor: string;
}> = [
  { value: 'NB', label: 'NB', desc: 'Nhận biết', color: 'bg-sky text-ocean hover:bg-sky/70', activeColor: 'ring-2 ring-ocean ring-offset-1' },
  { value: 'TH', label: 'TH', desc: 'Thông hiểu', color: 'bg-amber-50 text-amber-700 hover:bg-amber-100', activeColor: 'ring-2 ring-amber-500 ring-offset-1' },
  { value: 'VD', label: 'VD', desc: 'Vận dụng', color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100', activeColor: 'ring-2 ring-emerald-500 ring-offset-1' },
  { value: 'VDC', label: 'VDC', desc: 'Vận dụng cao', color: 'bg-red-50 text-red-700 hover:bg-red-100', activeColor: 'ring-2 ring-red-500 ring-offset-1' },
];

// ─── QuestionEditor Sub-component ────────────────────────────────────────────

interface QuestionEditorProps {
  question: Question;
  index: number;
  totalScore: number;
  onChange: (q: Question) => void;
  onDelete: (id: string) => void;
}

function QuestionEditor({ question, index, totalScore, onChange, onDelete }: QuestionEditorProps) {
  const [activeTab, setActiveTab] = useState<'content' | 'options' | 'settings'>('content');

  const handleTypeChange = (newType: QuestionType) => {
    onChange({
      ...emptyQuestion(newType),
      prompt: question.prompt,
      maxScore: question.maxScore,
      explanation: question.explanation,
      hasPlot: question.hasPlot,
      plotData: question.plotData,
      difficulty: question.difficulty || 'TB',
    });
  };

  const isValid = (): boolean => {
    if (!question.prompt.trim()) return false;
    if (question.maxScore <= 0) return false;
    if (question.questionType === 'multiple_choice') {
      const opts = question.options || [];
      if (opts.length < 2) return false;
      if (!opts.every((o) => o.text.trim())) return false;
      if (!opts.some((o) => o.isCorrect)) return false;
    }
    return true;
  };

  return (
    <Card padding="p-5" className={`space-y-3 ${isValid() ? '' : 'border-warning'}`}>
      {/* Header */}
      <div className="flex items-center justify-between hairline-b pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-primary px-2 py-0.5 rounded bg-sky">
            Câu {index + 1}
          </span>
          <select
            value={question.questionType}
            onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
            className="text-xs border border-hairline rounded px-2 py-0.5 text-text-secondary bg-white"
          >
            {QUESTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <span className="text-xs text-text-secondary">• {question.maxScore} điểm</span>
          {/* Difficulty badge (TT22 Bloom) */}
          {DIFFICULTY_CONFIG.map((diff) => (
            question.difficulty === diff.value ? (
              <span key={diff.value} className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${diff.color}`} title={diff.desc}>
                {diff.label}
              </span>
            ) : null
          ))}
          {!question.difficulty && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-surface-neutral text-text-secondary">TB</span>
          )}
          {!isValid() && <Badge variant="warning" size="sm">Chưa hoàn thiện</Badge>}
        </div>
        <button
          type="button"
          onClick={() => onDelete(question.id)}
          className="p-1 text-text-secondary hover:text-danger rounded"
        >
          <Trash2 className="w-4 h-4 stroke-[1.75]" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-hairline">
        {(['content', 'options', 'settings'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab === 'content' ? 'Nội dung' : tab === 'options' ? 'Đáp án' : 'Cài đặt'}
          </button>
        ))}
      </div>

      {/* Content Tab */}
      {activeTab === 'content' && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-text-primary mb-1">Nội dung câu hỏi *</label>
            <textarea
              rows={2}
              value={question.prompt}
              onChange={(e) => onChange({ ...question, prompt: e.target.value })}
              placeholder="Nhập nội dung câu hỏi..."
              className="w-full p-3 bg-white border border-hairline rounded text-xs text-text-primary focus:border-ocean focus:ring-2 focus:ring-ocean/15 outline-none resize-none"
            />
          </div>

          {question.hasPlot && (
            <div>
              <label className="block text-xs font-medium text-text-primary mb-1">Dữ liệu đồ thị (mô tả)</label>
              <input
                type="text"
                value={question.plotData}
                onChange={(e) => onChange({ ...question, plotData: e.target.value })}
                placeholder="VD: Đỉnh I(1; -2), đi qua (0; -1) và (2; -1)"
                className="w-full h-9 px-3 bg-white border border-hairline rounded text-xs text-text-primary focus:border-ocean outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-text-primary mb-1">Giải thích / Hướng dẫn</label>
            <textarea
              rows={2}
              value={question.explanation}
              onChange={(e) => onChange({ ...question, explanation: e.target.value })}
              placeholder="Giải thích đáp án đúng (hiển thị sau khi nộp bài)..."
              className="w-full p-2 bg-white border border-hairline rounded text-xs text-text-secondary focus:border-ocean outline-none resize-none"
            />
          </div>
        </div>
      )}

      {/* Options Tab */}
      {activeTab === 'options' && (
        <div className="space-y-3">
          {question.questionType === 'multiple_choice' && (
            <>
              <div className="space-y-2">
                {(question.options || []).map((opt, oi) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onChange({
                          ...question,
                          correctAnswer: opt.id,
                          options: question.options?.map((o) => ({ ...o, isCorrect: o.id === opt.id })) || [],
                        });
                      }}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        opt.isCorrect
                          ? 'bg-emerald-500 border-emerald-500'
                          : 'border-hairline hover:border-ocean'
                      }`}
                      title="Đánh dấu đáp án đúng"
                    >
                      {opt.isCorrect && <span className="w-2 h-2 rounded-full bg-white" />}
                    </button>
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => {
                        onChange({
                          ...question,
                          options: question.options?.map((o) => (o.id === opt.id ? { ...o, text: e.target.value } : o)) || [],
                        });
                      }}
                      placeholder={`Đáp án ${String.fromCharCode(65 + oi)}`}
                      className="flex-1 h-9 px-3 bg-white border border-hairline rounded text-xs text-text-primary focus:border-ocean outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        onChange({
                          ...question,
                          options: question.options?.filter((o) => o.id !== opt.id) || [],
                        });
                      }}
                      className="p-1 text-text-secondary hover:text-danger"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  onChange({
                    ...question,
                    options: [...(question.options || []), { id: newOptionId(), text: '', isCorrect: false }],
                  });
                }}
                className="text-xs text-ocean hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm đáp án
              </button>
            </>
          )}

          {question.questionType === 'short_answer' && (
            <div>
              <label className="block text-xs font-medium text-text-primary mb-1">Đáp án đúng</label>
              <input
                type="text"
                value={question.correctAnswer}
                onChange={(e) => onChange({ ...question, correctAnswer: e.target.value })}
                placeholder="Nhập đáp án chuẩn (phân cách bằng dấu phẩy nếu nhiều đáp án)"
                className="w-full h-9 px-3 bg-white border border-hairline rounded text-xs text-text-primary focus:border-ocean outline-none"
              />
            </div>
          )}

          {question.questionType === 'essay' && (
            <div className="p-3 bg-surface-neutral rounded border border-hairline text-xs text-text-secondary">
              Câu hỏi tự luận sẽ được chấm điểm thủ công bởi giáo viên.
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-4">
          {/* Bloom/TT22 difficulty tagging */}
          <div>
            <label className="block text-xs font-medium text-text-primary mb-2">
              Mức độ nhận thức (Thông tư 22 — Bloom Taxonomy)
            </label>
            <div className="flex flex-wrap gap-2">
              {DIFFICULTY_CONFIG.map((diff) => {
                const isSelected = (question.difficulty || 'TB') === diff.value;
                return (
                  <button
                    key={diff.value}
                    type="button"
                    onClick={() => onChange({ ...question, difficulty: diff.value })}
                    title={diff.desc}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${diff.color} ${
                      isSelected ? diff.activeColor : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div>{diff.label}</div>
                    <div className="text-[10px] font-normal opacity-80">{diff.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-primary mb-1">Điểm tối đa</label>
              <input
                type="number"
                min="0.1"
                max="100"
                step="0.1"
                value={question.maxScore}
                onChange={(e) => onChange({ ...question, maxScore: parseFloat(e.target.value) || 0 })}
                className="w-full h-9 px-3 bg-white border border-hairline rounded text-xs text-text-primary focus:border-ocean outline-none"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-text-primary">
                <input
                  type="checkbox"
                  checked={question.hasPlot}
                  onChange={() => onChange({ ...question, hasPlot: !question.hasPlot })}
                  className="w-4 h-4 text-primary rounded border-hairline"
                />
                <span>Có đồ thị đính kèm</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── Exam Variants Preview Modal ─────────────────────────────────────────────

interface VariantsModalProps {
  variants: ExamVariant[];
  title: string;
  onClose: () => void;
}

function ExamVariantsModal({ variants, title, onClose }: VariantsModalProps) {
  const [activeVariant, setActiveVariant] = useState('101');
  const variant = variants.find((v) => v.code === activeVariant) || variants[0];

  return (
    <Modal isOpen={true} onClose={onClose} title="Xem trước 4 mã đề thi đảo" maxWidth="max-w-4xl">
      <div className="space-y-4">
        {/* Variant selector tabs */}
        <div className="flex items-center gap-2">
          {variants.map((v) => (
            <button
              key={v.code}
              type="button"
              onClick={() => setActiveVariant(v.code)}
              className={`px-4 py-2 rounded text-xs font-bold transition-all ${
                activeVariant === v.code
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-surface-neutral text-text-secondary hover:text-text-primary border border-hairline'
              }`}
            >
              Mã đề {v.code}
            </button>
          ))}
          <div className="ml-auto">
            <Button
              variant="primary"
              size="sm"
              icon={Download}
              onClick={() => exportVariantsToCsv(variants, title)}
            >
              Xuất CSV + Ma trận đáp án
            </Button>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          {variants.map((v) => {
            const difficultyCounts: Record<string, number> = {};
            v.questions.forEach((q) => {
              difficultyCounts[q.difficulty] = (difficultyCounts[q.difficulty] || 0) + 1;
            });
            return (
              <div key={v.code} className="p-2 bg-white border border-hairline rounded space-y-1">
                <div className="font-bold text-primary">Đề {v.code}</div>
                <div className="text-[10px] text-text-secondary">{v.questions.length} câu</div>
                <div className="flex flex-wrap gap-1 justify-center">
                  {Object.entries(difficultyCounts).map(([level, count]) => {
                    const cfg = DIFFICULTY_CONFIG.find((d) => d.value === level);
                    return cfg ? (
                      <span key={level} className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${cfg.color}`}>
                        {level}={count}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Answer key matrix */}
        <div className="p-4 bg-surface-neutral rounded border border-hairline">
          <div className="text-xs font-semibold text-text-primary mb-2 flex items-center gap-2">
            <Table className="w-4 h-4" />
            Ma trận đáp án (hiển thị đáp án gốc, không xáo trộn)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
            {variant.questions.map((q, idx) => {
              let answer = '';
              if (q.questionType === 'multiple_choice') {
                const correctIdx = q.options?.findIndex((o) => o.isCorrect);
                answer = correctIdx !== undefined && correctIdx >= 0 ? String.fromCharCode(65 + correctIdx) : '—';
              } else {
                answer = q.correctAnswer || '—';
              }
              const cfg = DIFFICULTY_CONFIG.find((d) => d.value === q.difficulty);
              return (
                <div key={q.id} className="flex items-center gap-2 p-1.5 bg-white rounded border border-hairline">
                  <span className="font-bold text-primary w-6">C{idx + 1}</span>
                  {cfg && <span className={`px-1 py-0.5 rounded text-[9px] font-bold ${cfg.color}`}>{cfg.value}</span>}
                  <span className="text-text-primary flex-1 line-clamp-1">{q.prompt || '(chưa có)'}</span>
                  <span className="font-bold text-emerald-700 w-5 text-right">{answer}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Question preview for active variant */}
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {variant.questions.map((q, idx) => {
            const correctAnswer =
              q.questionType === 'multiple_choice'
                ? q.options?.map((o, oi) => (
                    <span key={o.id} className={`block ${o.isCorrect ? 'font-bold text-emerald-700' : 'text-text-secondary'}`}>
                      {String.fromCharCode(65 + oi)}. {o.text || '(trống)'}
                    </span>
                  ))
                : null;

            return (
              <div key={q.id} className="p-4 bg-white rounded border border-hairline space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-primary">
                    Câu {idx + 1} ({q.maxScore} điểm)
                  </span>
                  {(() => {
                    const cfg = DIFFICULTY_CONFIG.find((d) => d.value === q.difficulty);
                    return cfg ? (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${cfg.color}`}>
                        {cfg.label} — {cfg.desc}
                      </span>
                    ) : null;
                  })()}
                </div>
                <p className="text-sm text-text-primary font-medium">{q.prompt || '(Chưa có nội dung)'}</p>
                {correctAnswer && (
                  <div className="space-y-0.5">{correctAnswer}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end mt-4 pt-4 hairline-t">
        <Button variant="secondary" size="md" onClick={onClose}>Đóng</Button>
      </div>
    </Modal>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function CreateAssignment({ assignmentId: propAssignmentId, onBackToDashboard, initialData }: {
  assignmentId?: string;
  onBackToDashboard?: () => void;
  initialData?: Record<string, unknown>;
}) {
  const params = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const assignmentId = propAssignmentId || params.id;
  const { triggerSync } = useSync();

  const goBack = () => {
    if (onBackToDashboard) onBackToDashboard();
    else navigate('/teacher/assignments');
  };

  // Form state
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving' | 'publishing' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Class picker
  const [teacherClasses, setTeacherClasses] = useState<TeacherAssignedClass[]>([]);
  const [showClassPicker, setShowClassPicker] = useState(false);

  // Preview & variants modals
  const [showPreview, setShowPreview] = useState(false);
  const [examVariants, setExamVariants] = useState<ExamVariant[]>([]);
  const [showVariantsModal, setShowVariantsModal] = useState(false);

  // Validation errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Load classes
  useEffect(() => {
    async function load() {
      try {
        const data = await teacherAssignmentsApi.getMyClasses();
        if (data?.classes) setTeacherClasses(data.classes);
      } catch { /* non-critical */ }
    }
    load();
  }, []);

  // Load existing assignment
  useEffect(() => {
    if (!assignmentId) return;
    setStatus('loading');
    assignmentsApi.getById(assignmentId).then((asg) => {
      if (!asg) { setError('Không tìm thấy bài tập'); setStatus('error'); return; }
      const safeAsg = asg as AssignmentDetail;
      setForm({
        title: safeAsg.title || '',
        instructions: safeAsg.instructions || '',
        subject: safeAsg.subject || '',
        targetClassIds: (safeAsg.target_classes || []) as string[],
        dueDate: safeAsg.due_date || '',
        dueTime: safeAsg.due_time || '23:59',
        durationMinutes: safeAsg.duration_minutes || 45,
        gradingScale: safeAsg.grading_scale || 'Thang 10 (Hệ số 1)',
        type: (safeAsg.type || 'quiz') as 'quiz' | 'essay' | 'attachment',
        totalScore: safeAsg.total_score || 10,
        lockAfterDue: Boolean(safeAsg.lock_after_due),
        shuffleQuestions: Boolean(safeAsg.shuffle_questions),
        questions: (safeAsg.questions || []).map((q) => {
          const base = q as unknown as Question;
          return {
            ...base,
            id: base.id || newQuestionId(),
            prompt: base.prompt || '',
            questionType: (base.questionType || 'multiple_choice') as QuestionType,
            maxScore: base.maxScore || 1.0,
            difficulty: (base.difficulty || 'TB') as DifficultyLevel,
            options: (base.options || []) as QuestionOption[],
            correctAnswer: base.correctAnswer || '',
            explanation: base.explanation || '',
            hasPlot: base.hasPlot || false,
            plotData: base.plotData || '',
          };
        }),
      } as FormState);
      setStatus('idle');
    }).catch((e: Error) => {
      setError(e.message || 'Lỗi khi tải bài tập');
      setStatus('error');
    });
  }, [assignmentId]);

  const computedTotal = form.questions.reduce((s, q) => s + (parseFloat(String(q.maxScore)) || 0), 0);

  const setField = (key: keyof FormState, val: unknown) => {
    setForm((f) => ({ ...f, [key]: val }));
    setFieldErrors((e) => ({ ...e, [key]: undefined }));
  };

  const addQuestion = (type: QuestionType = 'multiple_choice') => {
    setForm((f) => ({ ...f, questions: [...f.questions, emptyQuestion(type)] }));
  };

  const updateQuestion = (id: string, updated: Question) => {
    setForm((f) => ({ ...f, questions: f.questions.map((q) => (q.id === id ? updated : q)) }));
  };

  const deleteQuestion = (id: string) => {
    setForm((f) => ({ ...f, questions: f.questions.filter((q) => q.id !== id) }));
  };

  const toggleClass = (classId: string) => {
    setForm((f) => ({
      ...f,
      targetClassIds: f.targetClassIds.includes(classId)
        ? f.targetClassIds.filter((c) => c !== classId)
        : [...f.targetClassIds, classId],
    }));
  };

  // ─── Validation ────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.title.trim()) errors.title = 'Tiêu đề không được trống';
    if (!form.subject.trim()) errors.subject = 'Môn học không được trống';
    if (!form.dueDate) errors.dueDate = 'Hạn nộp không được trống';
    if (form.targetClassIds.length === 0) errors.targetClassIds = 'Phải chọn ít nhất 1 lớp';
    if (form.dueDate) {
      const due = new Date(`${form.dueDate}T${form.dueTime}:00`);
      if (due <= new Date()) errors.dueDate = 'Hạn nộp phải là thời điểm trong tương lai';
    }
    if (form.totalScore <= 0) errors.totalScore = 'Tổng điểm phải > 0';
    const incompleteQ = form.questions.filter((q) => {
      if (!q.prompt.trim()) return true;
      if (q.maxScore <= 0) return true;
      if (q.questionType === 'multiple_choice') {
        const opts = q.options || [];
        if (opts.length < 2) return true;
        if (!opts.every((o) => o.text.trim())) return true;
        if (!opts.some((o) => o.isCorrect)) return true;
      }
      return false;
    });
    if (incompleteQ.length > 0) errors.questions = `${incompleteQ.length} câu hỏi chưa hoàn thiện`;
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ─── Save Draft ───────────────────────────────────────────────────────────
  const handleSaveDraft = async () => {
    if (!validate()) { setError('Vui lòng kiểm tra lại các trường thông tin.'); return; }
    setStatus('saving');
    setError('');
    try {
      if (assignmentId) {
        const payload = buildUpdatePayload();
        const res = await assignmentsApi.update(assignmentId, payload);
        if (!res?.success) throw new Error(res?.error?.message || 'Lỗi khi lưu bài tập');
      } else {
        const payload = buildCreatePayload();
        const res = await assignmentsApi.create(payload);
        if (!res?.success) throw new Error(res?.error?.message || 'Lỗi khi tạo bài tập');
      }
      setSuccessMsg('Đã lưu bản nháp thành công!');
      setStatus('success');
      triggerSync?.();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Lỗi khi lưu bài tập');
      setStatus('error');
    }
  };

  // ─── Publish ──────────────────────────────────────────────────────────────
  const handlePublish = async () => {
    if (!validate()) { setError('Vui lòng kiểm tra lại các trường thông tin trước khi giao bài.'); return; }
    setStatus('publishing');
    setError('');
    try {
      let asgId = assignmentId;
      if (asgId) {
        const payload = buildUpdatePayload();
        await assignmentsApi.update(asgId, payload);
        const res = await assignmentsApi.publish(asgId);
        if (!res?.success) throw new Error(res?.error?.message || 'Lỗi khi công bố bài tập');
      } else {
        const payload = buildCreatePayload();
        const res = await assignmentsApi.create(payload);
        if (!res?.success) throw new Error(res?.error?.message || 'Lỗi khi tạo và công bố bài tập');
        asgId = res.data?.id;
      }
      setSuccessMsg('Đã giao bài tập thành công!');
      setStatus('success');
      triggerSync?.();
      setTimeout(goBack, 2000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Lỗi khi giao bài tập');
      setStatus('error');
    }
  };

  function buildCreatePayload(): AssignmentCreatePayload {
    return {
      title: form.title.trim(),
      instructions: form.instructions.trim(),
      subject: form.subject.trim(),
      subjectId: form.subjectId || undefined,
      targetClassIds: form.targetClassIds,
      dueDate: form.dueDate,
      dueTime: form.dueTime || '23:59',
      durationMinutes: parseInt(String(form.durationMinutes)) || 45,
      gradingScale: form.gradingScale,
      type: form.type as 'quiz' | 'essay' | 'attachment',
      totalScore: parseFloat(String(form.totalScore)) || 10,
      lockAfterDue: form.lockAfterDue,
      shuffleQuestions: form.shuffleQuestions,
      questions: form.questions.map((q) => ({
        prompt: q.prompt.trim(),
        questionType: q.questionType,
        difficulty: q.difficulty || 'TB',
        maxScore: parseFloat(String(q.maxScore)) || 1.0,
        options: q.options?.filter((o) => o.text.trim()),
        correctAnswer: q.correctAnswer || undefined,
        explanation: q.explanation || undefined,
        hasPlot: q.hasPlot || false,
        plotData: q.plotData || undefined,
      })),
      publish: false,
    };
  }

  function buildUpdatePayload(): AssignmentUpdatePayload {
    return {
      title: form.title.trim(),
      instructions: form.instructions.trim(),
      subject: form.subject.trim(),
      subjectId: form.subjectId || undefined,
      targetClassIds: form.targetClassIds,
      dueDate: form.dueDate,
      dueTime: form.dueTime || '23:59',
      durationMinutes: parseInt(String(form.durationMinutes)) || 45,
      gradingScale: form.gradingScale,
      type: form.type as 'quiz' | 'essay' | 'attachment',
      totalScore: parseFloat(String(form.totalScore)) || 10,
      lockAfterDue: form.lockAfterDue,
      shuffleQuestions: form.shuffleQuestions,
      questions: form.questions.map((q) => ({
        prompt: q.prompt.trim(),
        questionType: q.questionType,
        difficulty: q.difficulty || 'TB',
        maxScore: parseFloat(String(q.maxScore)) || 1.0,
        options: q.options?.filter((o) => o.text.trim()),
        correctAnswer: q.correctAnswer || undefined,
        explanation: q.explanation || undefined,
        hasPlot: q.hasPlot || false,
        plotData: q.plotData || undefined,
      })),
    };
  }

  // ─── Exam Variants Handler ─────────────────────────────────────────────────
  const handleGenerateVariants = () => {
    if (form.questions.length < 4) {
      setError('Cần ít nhất 4 câu hỏi để tạo đề thi đảo.');
      setStatus('error');
      setTimeout(() => { setError(''); setStatus('idle'); }, 3000);
      return;
    }
    const variants = generateExamVariants(form.questions);
    setExamVariants(variants);
    setShowVariantsModal(true);
  };

  const isSaving = status === 'saving' || status === 'publishing';
  const isLoading = status === 'loading';

  const studentCount = teacherClasses
    .filter((c) => form.targetClassIds.includes(c.classId))
    .reduce((s, c) => s + (c.studentCount || 0), 0);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-24">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-text-secondary mb-1">
            <button onClick={goBack} className="hover:underline flex items-center gap-1">
              <ChevronLeft className="w-3 h-3" />
              Quản lý bài tập
            </button>
            <span>/</span>
            <span className="text-text-primary font-medium">
              {assignmentId ? 'Chỉnh sửa bài tập' : 'Tạo bài tập mới'}
            </span>
            <Badge variant="info" size="sm">
              {assignmentId && form.questions.length > 0 ? 'Bản nháp' : 'Mới'}
            </Badge>
          </div>
          <h1 className="text-2xl font-medium text-text-primary">
            {assignmentId ? 'Chỉnh sửa bài tập' : 'Tạo bài tập mới'}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" size="md" icon={Eye} onClick={() => setShowPreview(true)}>
            Xem trước
          </Button>
          <Button variant="secondary" size="md" icon={Save} onClick={handleSaveDraft} disabled={isSaving}>
            Lưu nháp
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={Send}
            iconPosition="right"
            onClick={handlePublish}
            disabled={isSaving}
          >
            {status === 'publishing' ? 'Đang giao...' : 'Giao bài ngay'}
          </Button>
        </div>
      </div>

      {/* Error / Success banners */}
      {status === 'error' && error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-card text-danger flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-card text-emerald-700 flex items-center gap-3 text-sm animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16 text-text-secondary text-sm gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Đang tải bài tập...</span>
        </div>
      )}

      {!isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Builder (7 cols) */}
          <div className="lg:col-span-7 space-y-6">

            {/* Section 1: Thông tin chung */}
            <Card padding="p-6" className="space-y-4">
              <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary" />
                1. Thông tin chung
              </h2>

              <div>
                <label className="block text-xs font-medium text-text-primary mb-1">Tên bài tập *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setField('title', e.target.value)}
                  placeholder="VD: Kiểm tra 15 phút chương 2 — Hàm số bậc hai"
                  className={`w-full h-11 px-3.5 bg-white border rounded text-sm text-text-primary outline-none focus:ring-2 ${
                    fieldErrors.title ? 'border-danger focus:border-danger focus:ring-danger/15' : 'border-hairline focus:border-ocean focus:ring-ocean/15'
                  }`}
                />
                {fieldErrors.title && <p className="text-xs text-danger mt-1">{fieldErrors.title}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-primary mb-1">Môn học *</label>
                  <input
                    type="text"
                    value={form.subject}
                    onChange={(e) => setField('subject', e.target.value)}
                    placeholder="VD: Toán học"
                    className={`w-full h-11 px-3.5 bg-white border rounded text-sm text-text-primary outline-none focus:ring-2 ${
                      fieldErrors.subject ? 'border-danger focus:border-danger' : 'border-hairline focus:border-ocean focus:ring-ocean/15'
                    }`}
                  />
                  {fieldErrors.subject && <p className="text-xs text-danger mt-1">{fieldErrors.subject}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-primary mb-1">Hình thức nộp bài</label>
                  <div className="grid grid-cols-3 gap-1 p-1 bg-surface-neutral rounded border border-hairline h-11">
                    {(['quiz', 'essay', 'attachment'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setField('type', t)}
                        className={`text-xs rounded font-medium transition-colors ${
                          form.type === t ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        {t === 'quiz' ? 'Trắc nghiệm' : t === 'essay' ? 'Tự luận' : 'Đính kèm'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-primary mb-1">Mô tả & Hướng dẫn</label>
                <textarea
                  rows={3}
                  value={form.instructions}
                  onChange={(e) => setField('instructions', e.target.value)}
                  placeholder="VD: Học sinh được sử dụng máy tính cầm tay. Đọc kỹ đề bài..."
                  className="w-full p-3.5 bg-white border border-hairline rounded text-sm text-text-primary focus:border-ocean focus:ring-2 focus:ring-ocean/15 outline-none resize-none"
                />
              </div>
            </Card>

            {/* Section 2: Cấu hình giao bài */}
            <Card padding="p-6" className="space-y-4">
              <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary" />
                2. Cấu hình giao bài & Thời hạn
              </h2>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-text-primary">
                    Lớp nhận bài tập *
                    {studentCount > 0 && (
                      <span className="text-text-secondary font-normal ml-1">(Tổng: {studentCount} học sinh)</span>
                    )}
                  </label>
                  <button type="button" onClick={() => setShowClassPicker(true)} className="text-xs text-ocean hover:underline">
                    + Chọn từ lớp được phân công
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {form.targetClassIds.map((cid) => {
                    const cls = teacherClasses.find((c) => c.classId === cid);
                    return (
                      <span key={cid} className="px-3 py-1.5 rounded-pill bg-sky text-primary text-xs font-medium border border-ocean/20 flex items-center gap-1.5">
                        <span>{cls?.className || cls?.name || cid}</span>
                        <button type="button" onClick={() => toggleClass(cid)} className="text-primary hover:text-danger font-bold">×</button>
                      </span>
                    );
                  })}
                  {form.targetClassIds.length === 0 && (
                    <span className="text-xs text-text-secondary italic">Chưa chọn lớp</span>
                  )}
                </div>
                {fieldErrors.targetClassIds && <p className="text-xs text-danger mt-1">{fieldErrors.targetClassIds}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-primary mb-1">Hạn nộp bài *</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={form.dueDate}
                      onChange={(e) => setField('dueDate', e.target.value)}
                      className={`w-full h-11 pl-9 pr-3 bg-white border rounded text-xs text-text-primary outline-none focus:ring-2 ${
                        fieldErrors.dueDate ? 'border-danger focus:border-danger' : 'border-hairline focus:border-ocean focus:ring-ocean/15'
                      }`}
                    />
                    <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
                  </div>
                  {fieldErrors.dueDate && <p className="text-xs text-danger mt-1">{fieldErrors.dueDate}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-primary mb-1">Giờ hạn nộp</label>
                  <input
                    type="time"
                    value={form.dueTime}
                    onChange={(e) => setField('dueTime', e.target.value)}
                    className="w-full h-11 px-3 bg-white border border-hairline rounded text-xs text-text-primary focus:border-ocean outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-primary mb-1">Thang điểm</label>
                  <input
                    type="number"
                    min="0.1"
                    max="1000"
                    step="0.1"
                    value={form.totalScore}
                    onChange={(e) => setField('totalScore', parseFloat(e.target.value))}
                    className="w-full h-11 px-3 bg-white border border-hairline rounded text-xs text-text-primary focus:border-ocean outline-none"
                  />
                  {fieldErrors.totalScore && <p className="text-xs text-danger mt-1">{fieldErrors.totalScore}</p>}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-text-primary">
                  <input type="checkbox" checked={form.lockAfterDue} onChange={(e) => setField('lockAfterDue', e.target.checked)} className="w-4 h-4 text-primary rounded border-hairline" />
                  <span>Khóa bài nộp sau hạn</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-text-primary">
                  <input type="checkbox" checked={form.shuffleQuestions} onChange={(e) => setField('shuffleQuestions', e.target.checked)} className="w-4 h-4 text-primary rounded border-hairline" />
                  <span>Đảo trật tự câu hỏi</span>
                </label>
              </div>
            </Card>

            {/* Section 3: Danh sách câu hỏi */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  3. Danh sách câu hỏi ({form.questions.length} câu)
                </h2>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-text-secondary">
                    Tổng điểm: {computedTotal.toFixed(1)} / {parseFloat(String(form.totalScore)) || 10}
                  </span>
                  {/* Trộn đề tự động button */}
                  {form.questions.length >= 4 && (
                    <button
                      type="button"
                      onClick={handleGenerateVariants}
                      className="px-3 py-1.5 border border-ocean/40 bg-sky/30 hover:bg-sky/60 rounded text-xs text-ocean font-medium flex items-center gap-1.5 transition-colors"
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                      Trộn đề tự động (101–104)
                    </button>
                  )}
                </div>
              </div>

              {form.questions.map((q, idx) => (
                <QuestionEditor
                  key={q.id}
                  question={q}
                  index={idx}
                  totalScore={parseFloat(String(form.totalScore)) || 10}
                  onChange={(updated) => updateQuestion(q.id, updated)}
                  onDelete={deleteQuestion}
                />
              ))}

              {fieldErrors.questions && (
                <div className="flex items-center gap-2 text-xs text-warning">
                  <AlertCircle className="w-4 h-4" />
                  <span>{fieldErrors.questions}</span>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {QUESTION_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => addQuestion(t.value)}
                    className="px-4 py-2 border border-dashed border-hairline-darker hover:border-ocean hover:bg-sky/30 rounded-card text-xs font-medium text-ocean flex items-center gap-2 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Thêm câu hỏi {t.label.toLowerCase()}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Live Preview (5 cols, sticky) */}
          <div className="lg:col-span-5 sticky top-20">
            <Card padding="p-5" className="border-2 border-ocean/30 shadow-popover space-y-4">
              <div className="flex items-center justify-between hairline-b pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <h3 className="text-xs font-medium text-text-primary tracking-wider">Xem trước cho học sinh</h3>
                </div>
                <button type="button" onClick={() => setShowPreview(true)} className="text-xs text-ocean hover:underline">Phóng to</button>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-ocean uppercase tracking-wide">
                    {form.type === 'quiz' ? 'Bài kiểm tra' : form.type === 'essay' ? 'Bài tự luận' : 'Bài tập'}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-sky text-primary font-mono text-xs">
                    {form.dueDate || 'Chưa đặt hạn'}
                  </span>
                </div>
                <h4 className="text-sm font-medium text-text-primary line-clamp-2">{form.title || 'Chưa có tiêu đề'}</h4>
                <p className="text-xs text-text-secondary">{form.subject || 'Chưa chọn môn'}</p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs py-2 bg-surface-neutral rounded border border-hairline">
                <div>
                  <div className="text-[10px] text-text-secondary">Câu hỏi</div>
                  <div className="font-semibold text-primary">{form.questions.length}</div>
                </div>
                <div>
                  <div className="text-[10px] text-text-secondary">Tổng điểm</div>
                  <div className="font-semibold text-primary">{computedTotal.toFixed(1)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-text-secondary">Lớp</div>
                  <div className="font-semibold text-primary">{form.targetClassIds.length}</div>
                </div>
              </div>

              {form.questions.length === 0 && (
                <div className="text-center py-4 text-xs text-text-secondary">
                  Chưa có câu hỏi nào. Thêm câu hỏi để xem trước.
                </div>
              )}

              {form.questions.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] text-text-secondary">Câu hỏi đã thêm</div>
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {form.questions.slice(0, 5).map((q, idx) => (
                      <div key={q.id} className="p-2 bg-white border border-hairline rounded text-xs">
                        <span className="font-semibold text-primary">Câu {idx + 1}.</span>{' '}
                        <span className="text-text-secondary line-clamp-2">{q.prompt || '(chưa có nội dung)'}</span>
                        <div className="text-[10px] text-text-secondary mt-0.5">
                          {q.questionType === 'multiple_choice' ? 'Trắc nghiệm' : q.questionType === 'short_answer' ? 'Trả lời ngắn' : 'Tự luận'} • {q.maxScore} điểm
                          {DIFFICULTY_CONFIG.find(d => d.value === q.difficulty) && (
                            <span className="ml-1 font-bold">• {(DIFFICULTY_CONFIG.find(d => d.value === q.difficulty) as typeof DIFFICULTY_CONFIG[0]).value}</span>
                          )}
                        </div>
                      </div>
                    ))}
                    {form.questions.length > 5 && (
                      <div className="text-[11px] text-text-secondary text-center py-1">
                        +{form.questions.length - 5} câu hỏi khác
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Class Picker Modal */}
      {showClassPicker && (
        <Modal isOpen={true} onClose={() => setShowClassPicker(false)} title="Chọn lớp được phân công giảng dạy">
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {teacherClasses.length === 0 && (
              <p className="text-xs text-text-secondary py-4 text-center">
                Không tìm thấy lớp phân công. Vui lòng liên hệ quản trị viên.
              </p>
            )}
            {teacherClasses.map((cls) => {
              const isSelected = form.targetClassIds.includes(cls.classId);
              return (
                <label
                  key={cls.classId}
                  className={`flex items-center gap-3 p-3 rounded border cursor-pointer transition-colors ${
                    isSelected ? 'bg-sky/40 border-ocean' : 'bg-white border-hairline hover:border-ocean/50'
                  }`}
                >
                  <input type="checkbox" checked={isSelected} onChange={() => toggleClass(cls.classId)} className="w-4 h-4 text-primary rounded" />
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-text-primary">{cls.className || cls.name}</div>
                    <div className="text-[11px] text-text-secondary">{cls.studentCount || 0} học sinh</div>
                  </div>
                </label>
              );
            })}
          </div>
          <div className="flex justify-end gap-3 mt-4 pt-4 hairline-t">
            <Button variant="secondary" size="md" onClick={() => setShowClassPicker(false)}>Xong</Button>
          </div>
        </Modal>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <Modal isOpen={true} onClose={() => setShowPreview(false)} title="Xem trước bài tập">
          <div className="space-y-4">
            <div className="p-4 bg-surface-neutral rounded border border-hairline">
              <div className="text-xs font-semibold text-ocean uppercase tracking-wide mb-1">
                {form.type === 'quiz' ? 'Bài kiểm tra' : form.type === 'essay' ? 'Bài tự luận' : 'Bài tập'}
              </div>
              <h3 className="text-lg font-semibold text-text-primary">{form.title || '(Chưa có tiêu đề)'}</h3>
              <p className="text-sm text-text-secondary mt-1">{form.subject} • Hạn: {form.dueDate ? `${form.dueDate} ${form.dueTime}` : 'Chưa đặt'}</p>
              {form.instructions && (
                <div className="mt-3 p-3 bg-white rounded border border-hairline text-xs text-text-secondary">
                  <strong>Hướng dẫn:</strong> {form.instructions}
                </div>
              )}
            </div>

            {form.questions.length === 0 && (
              <p className="text-sm text-text-secondary text-center py-4">Chưa có câu hỏi nào.</p>
            )}

            {form.questions.map((q, idx) => {
              const diffCfg = DIFFICULTY_CONFIG.find(d => d.value === q.difficulty);
              return (
                <div key={q.id} className="p-4 bg-white rounded border border-hairline space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-primary">Câu {idx + 1} ({q.maxScore} điểm)</span>
                    <Badge variant="info" size="sm">
                      {q.questionType === 'multiple_choice' ? 'Trắc nghiệm' : q.questionType === 'short_answer' ? 'Trả lời ngắn' : 'Tự luận'}
                      {diffCfg && ` • ${diffCfg.desc}`}
                    </Badge>
                  </div>
                  <p className="text-sm text-text-primary font-medium">{q.prompt || '(Chưa có nội dung)'}</p>
                  {q.questionType === 'multiple_choice' && q.options && (
                    <div className="space-y-1.5">
                      {q.options.map((opt, oi) => (
                        <div
                          key={opt.id}
                          className={`p-2 rounded border text-xs flex items-center gap-2 ${
                            opt.isCorrect ? 'bg-emerald-50 border-emerald-300 text-success font-medium' : 'bg-surface-neutral border-hairline'
                          }`}
                        >
                          <span className="font-semibold">{String.fromCharCode(65 + oi)}.</span>
                          <span>{opt.text || '(trống)'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {q.questionType === 'short_answer' && (
                    <div className="p-2 bg-surface-neutral rounded border border-hairline text-xs text-text-secondary">
                      Đáp án: {q.correctAnswer || '(chưa nhập)'}
                    </div>
                  )}
                  {q.questionType === 'essay' && (
                    <div className="p-2 bg-surface-neutral rounded border border-hairline text-xs text-text-secondary italic">
                      Câu hỏi tự luận — chấm điểm thủ công
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex justify-end mt-4 pt-4 hairline-t">
            <Button variant="secondary" size="md" onClick={() => setShowPreview(false)}>Đóng</Button>
          </div>
        </Modal>
      )}

      {/* Exam Variants Modal */}
      {showVariantsModal && examVariants.length > 0 && (
        <ExamVariantsModal
          variants={examVariants}
          title={form.title}
          onClose={() => setShowVariantsModal(false)}
        />
      )}

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white hairline-t px-6 py-3 shadow-popover flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <span className={`w-2 h-2 rounded-full ${isSaving ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
          <span>
            {status === 'saving' ? 'Đang lưu...' : status === 'publishing' ? 'Đang giao bài...' : 'Sẵn sàng tạo bài tập'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" icon={Save} onClick={handleSaveDraft} disabled={isSaving}>
            Lưu nháp
          </Button>
          <Button variant="primary" size="sm" icon={Send} onClick={handlePublish} disabled={isSaving}>
            Giao bài ({studentCount} học sinh)
          </Button>
        </div>
      </div>
    </div>
  );
}

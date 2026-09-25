// =============================================================================
// StudentAssignmentsPage — Complete rewrite with Thông tư 22 exam integrity
// Features: Fullscreen exam mode, violation detection, debounced auto-save,
//           Question Navigation Palette, essay upload with preview
// =============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { submissionsApi } from '../../services/api';
import { useSync } from '../../context/SyncContext';
import {
  BookOpen,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Play,
  FileCheck,
  Send,
  Flag,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  RotateCcw,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  Upload,
  FileText,
  X,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatDateTime(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
}

function isPastDue(dueDate: string, dueTime: string): boolean {
  const deadline = new Date(`${dueDate}T${dueTime || '23:59'}:00`);
  return Date.now() > deadline.getTime();
}

function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

// ─────────────────────────────────────────────────────────────────────────────
// Essay Upload Preview Component
// ─────────────────────────────────────────────────────────────────────────────

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  preview?: string;
  data?: string; // base64 data URL for images
}

function FileUploadZone({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<UploadedFile | null>(null);

  useEffect(() => {
    if (value && value.startsWith('data:')) {
      // Reconstruct preview from stored base64
      const mimeMatch = value.match(/^data:([^;]+);/);
      const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
      const name = 'Bài làm đã upload';
      setPreview({ name, size: value.length, type: mime, preview: value });
    }
  }, [value]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setPreview({
        name: file.name,
        size: file.size,
        type: file.type,
        preview: URL.createObjectURL(file),
        data: dataUrl,
      });
      onChange(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      {preview ? (
        <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded">
          <FileText className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-emerald-800 truncate">{preview.name}</div>
            <div className="text-[11px] text-emerald-600">
              {(preview.size / 1024).toFixed(1)} KB
            </div>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={() => { setPreview(null); onChange(''); }}
              className="p-1 text-emerald-600 hover:text-danger"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="w-full p-6 border-2 border-dashed border-hairline hover:border-ocean rounded-lg flex flex-col items-center gap-2 text-xs text-text-secondary hover:text-ocean transition-colors disabled:opacity-50"
        >
          <Upload className="w-6 h-6" />
          <span>Tải lên bài làm (PDF, PNG, JPG)</span>
          <span className="text-[10px]">Tối đa 10MB</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,image/png,image/jpeg,application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />
      {preview?.type.startsWith('image/') && preview.preview && (
        <div className="mt-2 rounded border border-hairline overflow-hidden">
          <img
            src={preview.preview}
            alt="Preview"
            className="max-h-48 mx-auto object-contain"
          />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Violation Warning Banner
// ─────────────────────────────────────────────────────────────────────────────

function ViolationBanner({ count, maxViolations, onAutoSubmit }: {
  count: number;
  maxViolations: number;
  onAutoSubmit: () => void;
}) {
  if (count === 0) return null;
  const remaining = maxViolations - count;
  return (
    <div className={`p-3 rounded-lg flex items-center gap-3 text-xs font-medium ${
      remaining <= 0
        ? 'bg-red-100 border border-red-400 text-red-800 animate-pulse'
        : 'bg-amber-50 border border-amber-300 text-amber-800'
    }`}>
      <AlertTriangle className="w-4 h-4 shrink-0" />
      <span>
        {remaining <= 0
          ? 'Bạn đã vi phạm quá nhiều lần. Bài thi sẽ tự động nộp.'
          : `Cảnh báo: Còn ${remaining} lần vi phạm trước khi bài thi bị nộp tự động.`}
      </span>
      {remaining <= 0 && (
        <button
          onClick={onAutoSubmit}
          className="ml-auto px-3 py-1 bg-danger text-white rounded text-xs font-bold"
        >
          Nộp bài ngay
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Fullscreen Exam Modal
// ─────────────────────────────────────────────────────────────────────────────

interface ExamModalProps {
  assignment: {
    id: string;
    title: string;
    due_date?: string;
    due_time?: string;
    subject?: string;
  };
  onClose: () => void;
  onSubmit: () => void;
  onSaveDraft: () => void;
  syncFn?: () => void;
}

function ExamModal({ assignment, onClose, onSubmit, onSaveDraft, syncFn }: ExamModalProps) {
  // ── State ──
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<{
    subject?: string;
    questions?: Array<{
      id: string;
      prompt: string;
      options?: Array<{ id: string; text: string }>;
      has_plot?: boolean;
      plot_data?: string;
      max_score?: number;
      question_type?: string;
    }>;
    submission?: { answers?: Record<string, string>; draftAnswers?: Record<string, string> };
    duration_minutes?: number;
    allow_resubmit?: boolean;
  } | null>(null);
  const [error, setError] = useState('');

  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    isLate?: boolean;
    score?: number;
    maxScore?: number;
  } | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  // ── Exam integrity ──
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  const [isBlurred, setIsBlurred] = useState(false);
  const MAX_VIOLATIONS = 3;

  // ── Load assignment detail ──
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await submissionsApi.getAssignmentDetail(assignment.id);
        if (!data) { if (!cancelled) setError('Không tải được bài tập'); return; }
        if (cancelled) return;
        setDetail(data);
        if (data.submission?.answers) {
          setAnswers(data.submission.answers);
        } else if (data.submission?.draftAnswers) {
          setAnswers(data.submission.draftAnswers);
        }
        setTimeLeft((data.duration_minutes || 45) * 60);
      } catch (e) {
        if (!cancelled) setError((e as Error).message || 'Lỗi khi tải bài tập');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [assignment.id]);

  // ── Countdown timer ──
  useEffect(() => {
    if (!detail || submitResult || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [detail, submitResult, timeLeft]);

  // ── Fullscreen & blur detection ──
  useEffect(() => {
    const handleFullscreenChange = () => {
      const nowFullscreen = !!document.fullscreenElement;
      setIsFullscreen(nowFullscreen);
      if (!nowFullscreen && !submitResult) {
        incrementViolation('Rời khỏi chế độ toàn màn hình');
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [submitResult]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !submitResult) {
        incrementViolation('Chuyển tab/cửa sổ khác');
      }
      setIsBlurred(document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [submitResult]);

  const incrementViolation = useCallback((reason: string) => {
    setViolationCount(prev => {
      const next = prev + 1;
      if (next >= MAX_VIOLATIONS) {
        setTimeout(handleAutoSubmit, 100);
      }
      return next;
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-save draft (debounce 1000ms) ──
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const autoSaveDraft = useCallback(
    debounce(async (draftAnswers: Record<string, string>) => {
      try {
        await submissionsApi.saveDraft(assignment.id, draftAnswers);
      } catch {
        // Non-critical: silently fail
      }
    }, 1000),
    [assignment.id]
  );

  const handleSelectAnswer = useCallback((questionId: string, value: string) => {
    setAnswers(prev => {
      const next = { ...prev, [questionId]: value };
      autoSaveDraft(next);
      return next;
    });
  }, [autoSaveDraft]);

  const handleAutoSubmit = useCallback(async () => {
    if (submitResult || !detail) return;
    setIsSubmitting(true);
    try {
      const res = await submissionsApi.submit(assignment.id, answers);
      if (res?.success) {
        setSubmitResult(res.data);
        syncFn?.();
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      }
    } catch (e) {
      setError((e as Error).message || 'Lỗi khi nộp bài');
    } finally {
      setIsSubmitting(false);
    }
  }, [submitResult, detail, answers, assignment.id, syncFn]);

  const handleToggleFlag = useCallback((questionId: string) => {
    setFlagged(prev => ({ ...prev, [questionId]: !prev[questionId] }));
  }, []);

  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    try {
      await submissionsApi.saveDraft(assignment.id, answers);
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSubmit = async () => {
    if (submitResult) return;
    setIsSubmitting(true);
    setError('');
    try {
      const res = await submissionsApi.submit(assignment.id, answers);
      if (res?.success) {
        setSubmitResult(res.data);
        syncFn?.();
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      } else {
        throw new Error(res?.error?.message || 'Lỗi khi nộp bài');
      }
    } catch (e) {
      setError((e as Error).message || 'Lỗi khi nộp bài');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEnterFullscreen = () => {
    const el = document.getElementById('exam-modal-root');
    if (el) {
      el.requestFullscreen?.().catch(() => {});
    } else {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
  };

  const handleExitFullscreen = () => {
    document.exitFullscreen?.().catch(() => {});
  };

  // ── Read-only logic ──
  const isLate = isPastDue(assignment.due_date || '', assignment.due_time || '');
  const isReadOnly = Boolean(submitResult) ||
    (isLate && !detail?.submission && !detail?.allow_resubmit);

  const questions = detail?.questions || [];
  const currentQ = questions[currentQIdx];

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-text-secondary text-sm gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Đang tải bài tập...</span>
      </div>
    );
  }

  // ── Error state ──
  if (error && !detail) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-8 h-8 text-danger mx-auto mb-2" />
        <p className="text-sm text-danger">{error}</p>
        <Button variant="secondary" size="sm" className="mt-4" onClick={onClose}>Đóng</Button>
      </div>
    );
  }

  return (
    <div
      id="exam-modal-root"
      className={`space-y-4 ${isBlurred && !submitResult ? 'opacity-60 blur-sm' : ''}`}
    >
      {/* ── Violation Warning ─────────────────────────────────────────────── */}
      {violationCount > 0 && !submitResult && (
        <ViolationBanner
          count={violationCount}
          maxViolations={MAX_VIOLATIONS}
          onAutoSubmit={handleAutoSubmit}
        />
      )}

      {/* ── Exam Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-surface-neutral rounded border border-hairline">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold text-primary">{detail?.subject || assignment.subject}</span>
          <span className="text-hairline-darker">|</span>
          <span className="text-xs text-text-secondary">
            Câu {currentQIdx + 1} / {questions.length}
          </span>
          {isLate && !submitResult && (
            <Badge variant="warning" size="sm">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Trễ hạn
            </Badge>
          )}
          {violationCount > 0 && (
            <Badge variant="danger" size="sm">
              {violationCount}/{MAX_VIOLATIONS} vi phạm
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Fullscreen toggle */}
          <button
            type="button"
            onClick={isFullscreen ? handleExitFullscreen : handleEnterFullscreen}
            className="p-1.5 rounded border border-hairline text-text-secondary hover:text-primary hover:border-ocean transition-colors"
            title={isFullscreen ? 'Thoát toàn màn hình' : 'Chế độ toàn màn hình'}
          >
            {isFullscreen
              ? <Minimize2 className="w-4 h-4" />
              : <Maximize2 className="w-4 h-4" />
            }
          </button>

          <div className={`flex items-center gap-1.5 text-xs font-mono font-bold px-3 py-1 rounded border ${
            timeLeft < 300 ? 'bg-red-50 border-red-300 text-danger animate-pulse'
            : timeLeft < 600 ? 'bg-amber-50 border-amber-300 text-amber-700'
            : 'bg-white border-hairline text-primary'
          }`}>
            <Clock className="w-3.5 h-3.5" />
            <span>{formatTimer(timeLeft)}</span>
          </div>

          {submitResult && (
            <div className="flex items-center gap-2 text-xs">
              <Badge variant={submitResult.isLate ? 'warning' : 'success'} size="sm">
                {submitResult.isLate ? 'Nộp trễ' : 'Đã nộp'}
              </Badge>
              {submitResult.score !== undefined && (
                <span className="font-bold text-primary">
                  {submitResult.score} / {submitResult.maxScore} điểm
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-danger flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Question Navigation Palette ────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-[11px] text-text-secondary mr-1">Câu:</span>
        {questions.map((q, idx) => {
          const isAnswered = answers[q.id] !== undefined && answers[q.id] !== '';
          const isCurrent = idx === currentQIdx;
          const isFlgged = Boolean(flagged[q.id]);
          return (
            <button
              key={q.id}
              onClick={() => setCurrentQIdx(idx)}
              className={`relative w-8 h-8 rounded text-xs font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean/50 ${
                isCurrent
                  ? 'bg-primary text-white ring-2 ring-ocean/30 font-bold'
                  : isAnswered && isFlgged
                  ? 'bg-amber-100 text-amber-900 border-2 border-amber-400'
                  : isAnswered
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : isFlgged
                  ? 'bg-amber-50 text-amber-800 border border-amber-300'
                  : 'bg-white border border-hairline text-text-secondary hover:text-text-primary hover:border-ocean/50'
              }`}
            >
              {idx + 1}
            </button>
          );
        })}

        {/* Legend */}
        <div className="flex items-center gap-3 ml-3 text-[11px] text-text-secondary">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300 inline-block" />
            Đã trả lời
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-white border border-hairline inline-block" />
            Chưa trả lời
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-amber-50 border border-amber-300 inline-block" />
            Đánh dấu
          </span>
        </div>
      </div>

      {/* ── Current Question ─────────────────────────────────────────────── */}
      {currentQ && (
        <div className="p-5 bg-white border border-hairline rounded-card space-y-5">
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-sm font-semibold text-text-primary leading-relaxed">
              <span className="text-ocean mr-1.5 font-bold">Câu {currentQIdx + 1}:</span>
              {currentQ.prompt}
            </h3>
            <div className="flex items-center gap-2 shrink-0">
              {!submitResult && (
                <button
                  type="button"
                  onClick={() => handleToggleFlag(currentQ.id)}
                  className={`px-2.5 py-1 rounded text-xs flex items-center gap-1.5 transition-colors ${
                    flagged[currentQ.id]
                      ? 'bg-amber-100 text-amber-900 border border-amber-300 font-medium'
                      : 'bg-surface-neutral text-text-secondary hover:text-text-primary border border-hairline'
                  }`}
                >
                  <Flag className={`w-3.5 h-3.5 ${flagged[currentQ.id] ? 'fill-amber-500 text-amber-600' : ''}`} />
                  <span className="hidden sm:inline">
                    {flagged[currentQ.id] ? 'Bỏ đánh dấu' : 'Đánh dấu'}
                  </span>
                </button>
              )}
              <Badge variant="neutral" size="sm">{currentQ.max_score || 1} điểm</Badge>
            </div>
          </div>

          {/* Plot */}
          {currentQ.has_plot && currentQ.plot_data && (
            <div className="p-4 bg-surface-neutral/60 border border-hairline rounded text-xs text-text-secondary">
              <div className="font-semibold text-primary flex items-center gap-1 mb-1">
                <span>Hình vẽ minh họa:</span>
              </div>
              <p className="font-mono text-text-primary">{currentQ.plot_data}</p>
            </div>
          )}

          {/* MC Options */}
          {currentQ.options && currentQ.options.length > 0 ? (
            <div className="space-y-2.5">
              {currentQ.options.map((opt) => {
                const isSelected = answers[currentQ.id] === opt.id;
                const showCorrection = Boolean(submitResult);
                let style = 'border-hairline bg-white hover:bg-surface-neutral/40';
                if (isSelected && !showCorrection) {
                  style = 'border-ocean bg-sky/30 text-primary font-medium ring-1 ring-ocean/40';
                }
                if (showCorrection) {
                  style = isSelected
                    ? 'border-red-400 bg-red-50 text-red-900 line-through'
                    : 'border-hairline bg-white';
                }
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => !isReadOnly && handleSelectAnswer(currentQ.id, opt.id)}
                    disabled={isReadOnly}
                    className={`w-full text-left p-3.5 rounded border transition-all flex items-center justify-between text-xs ${style}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] ${
                        isSelected ? 'bg-ocean text-white' : 'bg-surface-neutral text-text-secondary'
                      }`}>
                        {opt.id}
                      </span>
                      <span>{opt.text}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            /* Essay / Short answer — show file upload or text */
            <div className="space-y-2">
              {/* Check if this is an essay question (no options = essay) */}
              {currentQ.question_type === 'essay' ? (
                <FileUploadZone
                  value={answers[currentQ.id] || ''}
                  onChange={(val) => handleSelectAnswer(currentQ.id, val)}
                  disabled={isReadOnly}
                />
              ) : (
                <textarea
                  value={answers[currentQ.id] || ''}
                  onChange={(e) => !isReadOnly && handleSelectAnswer(currentQ.id, e.target.value)}
                  disabled={isReadOnly}
                  rows={5}
                  placeholder="Nhập câu trả lời của bạn..."
                  className="w-full p-3.5 bg-white border border-hairline rounded text-xs text-text-primary focus:border-ocean focus:ring-1 focus:ring-ocean outline-none resize-none transition-all"
                />
              )}
              {isReadOnly && (
                <p className="text-[11px] text-text-secondary italic">
                  Bài đã được nộp hoặc hết hạn. Không thể chỉnh sửa.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2 hairline-t">
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="md"
            icon={ChevronLeft}
            disabled={currentQIdx === 0}
            onClick={() => setCurrentQIdx(i => i - 1)}
          >
            Câu trước
          </Button>
          <Button
            variant="secondary"
            size="md"
            icon={ChevronRight}
            iconPosition="right"
            disabled={currentQIdx === questions.length - 1}
            onClick={() => setCurrentQIdx(i => i + 1)}
          >
            Câu tiếp
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {!submitResult && !isReadOnly && (
            <>
              <Button
                variant="secondary"
                size="md"
                icon={isSavingDraft ? Loader2 : undefined}
                disabled={isSavingDraft}
                onClick={handleSaveDraft}
              >
                {isSavingDraft ? 'Đang lưu...' : 'Lưu nháp'}
              </Button>
              <Button
                variant="primary"
                size="md"
                icon={Send}
                iconPosition="right"
                disabled={isSubmitting}
                onClick={handleSubmit}
              >
                {isSubmitting ? 'Đang nộp...' : 'Nộp bài'}
              </Button>
            </>
          )}
          {(submitResult || isReadOnly) && (
            <Button variant="secondary" size="md" onClick={onClose}>
              Đóng
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StudentAssignmentsPage — Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function StudentAssignmentsPage() {
  const { lastSync, triggerSync } = useSync();

  const [assignments, setAssignments] = useState<Array<{
    id: string;
    title: string;
    subject: string;
    instructions?: string;
    due_date: string;
    due_time?: string;
    duration_minutes?: number;
    submission_status?: string;
    submission_id?: string;
    submitted_at?: string;
    is_late?: boolean;
    score?: number;
    total_score?: number;
  }>>([]);
  const [total, setTotal] = useState(0);
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Exam modal
  const [examModalOpen, setExamModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<{
    id: string;
    title: string;
    due_date?: string;
    due_time?: string;
    subject?: string;
  } | null>(null);

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await submissionsApi.listAssignments();
      if (data && data.assignments) {
        setAssignments(data.assignments);
        setTotal(data.total || data.assignments.length);
      } else {
        setAssignments([]);
        setTotal(0);
      }
    } catch (e) {
      setError((e as Error).message || 'Không thể tải danh sách bài tập.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments, lastSync]);

  const handleStartExam = (asg: typeof assignments[0]) => {
    setSelectedAssignment(asg);
    setExamModalOpen(true);
  };

  const handleCloseExam = () => {
    setExamModalOpen(false);
    setSelectedAssignment(null);
    fetchAssignments();
  };

  const filteredAssignments = assignments.filter(a => {
    if (activeFilter === 'pending') return a.submission_status !== 'submitted' && a.submission_status !== 'graded';
    if (activeFilter === 'completed') return a.submission_status === 'submitted' || a.submission_status === 'graded';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-text-secondary mb-1">
            <span>Học sinh</span>
            <span>/</span>
            <span className="text-text-primary font-medium">Bài tập & Khảo thí</span>
          </div>
          <h1 className="text-2xl font-medium text-text-primary">Bài tập & Đánh giá</h1>
          <p className="text-xs text-text-secondary mt-1">
            Hoàn thành các bài tập đúng hạn. Kết quả được tự động ghi nhận vào bảng điểm.
          </p>
        </div>

        <div className="flex items-center gap-2 p-1 bg-surface-neutral rounded border border-hairline">
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'pending', label: 'Cần làm' },
            { id: 'completed', label: 'Đã nộp' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3 py-1.5 rounded text-xs transition-all ${
                activeFilter === tab.id
                  ? 'bg-white text-primary font-medium shadow-whisper border border-hairline'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Error state ── */}
      {error && (
        <Card padding="p-6" className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="w-8 h-8 text-danger" />
          <p className="text-sm text-danger font-medium">{error}</p>
          <Button variant="secondary" size="sm" onClick={fetchAssignments}>Thử lại</Button>
        </Card>
      )}

      {/* ── Loading state ── */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-text-secondary text-sm gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Đang tải bài tập...</span>
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && filteredAssignments.length === 0 && (
        <Card padding="p-8" className="text-center">
          <BookOpen className="w-10 h-10 text-hairline mx-auto mb-3" />
          <p className="text-sm text-text-secondary mb-1">
            {activeFilter === 'pending' ? 'Bạn không có bài tập nào cần làm.' : 'Chưa có bài tập nào.'}
          </p>
          <p className="text-xs text-text-secondary">
            Giáo viên sẽ giao bài tập sau khi công bố.
          </p>
        </Card>
      )}

      {/* ── Assignment Cards ── */}
      {!loading && filteredAssignments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssignments.map((asg) => {
            const isDone = asg.submission_status === 'submitted' || asg.submission_status === 'graded';
            const isLate = isPastDue(asg.due_date, asg.due_time || '');
            const isInProgress = asg.submission_status === 'in_progress';

            return (
              <Card key={asg.id} padding="p-5" className="flex flex-col justify-between hover:border-ocean/40 transition-all group">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isLate && !isDone && (
                        <Badge variant="danger" size="sm">
                          <AlertTriangle className="w-3 h-3 mr-0.5" />
                          Quá hạn
                        </Badge>
                      )}
                      {isDone && (
                        <Badge variant="success" size="sm">
                          <CheckCircle2 className="w-3 h-3 mr-0.5" />
                          {asg.submission_status === 'graded' ? 'Đã chấm' : 'Đã nộp'}
                        </Badge>
                      )}
                      {isInProgress && (
                        <Badge variant="warning" size="sm">
                          <RotateCcw className="w-3 h-3 mr-0.5" />
                          Đang làm
                        </Badge>
                      )}
                      <Badge variant="info" size="sm">{asg.subject}</Badge>
                    </div>
                    <span className="text-[11px] text-text-secondary flex items-center gap-1 shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                      {asg.duration_minutes} phút
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-text-primary group-hover:text-ocean transition-colors line-clamp-2">
                    {asg.title}
                  </h3>

                  {asg.instructions && (
                    <p className="text-xs text-text-secondary line-clamp-2">
                      {asg.instructions}
                    </p>
                  )}
                </div>

                <div className="pt-4 mt-4 hairline-t space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Hạn: {asg.due_date} {asg.due_time}</span>
                    </span>
                    {isDone && asg.score !== undefined && (
                      <span className="font-bold text-emerald-600">
                        {asg.score} / {asg.total_score} điểm
                      </span>
                    )}
                    {!isDone && !isLate && (
                      <span className="text-xs text-amber-600 font-medium">Chưa nộp</span>
                    )}
                    {!isDone && isLate && (
                      <span className="text-xs text-danger font-medium">Quá hạn</span>
                    )}
                  </div>

                  {(asg.submission_id) && (
                    <div className="text-[11px] text-text-secondary">
                      {asg.submitted_at && (
                        <span>Nộp lúc: {formatDateTime(asg.submitted_at)}</span>
                      )}
                      {asg.is_late && (
                        <span className="ml-2 text-amber-600 font-medium">• Nộp trễ</span>
                      )}
                    </div>
                  )}

                  <Button
                    variant={isDone ? 'secondary' : 'primary'}
                    size="sm"
                    className="w-full justify-center"
                    icon={isDone ? FileCheck : Play}
                    onClick={() => handleStartExam(asg)}
                  >
                    {isDone ? 'Xem kết quả' : isLate ? 'Xem bài (hết hạn)' : 'Làm bài'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Exam Modal ── */}
      <Modal
        isOpen={examModalOpen}
        onClose={handleCloseExam}
        title={selectedAssignment?.title || 'Bài tập'}
        maxWidth="max-w-4xl"
      >
        {selectedAssignment && (
          <ExamModal
            assignment={selectedAssignment}
            onClose={handleCloseExam}
            onSubmit={() => {}}
            onSaveDraft={() => {}}
            syncFn={triggerSync}
          />
        )}
      </Modal>
    </div>
  );
}

export default StudentAssignmentsPage;

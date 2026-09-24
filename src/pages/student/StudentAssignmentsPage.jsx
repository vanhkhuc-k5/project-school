import React, { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimer(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
}

function isPastDue(dueDate, dueTime) {
  const deadline = new Date(`${dueDate}T${dueTime || '23:59'}:00`);
  return Date.now() > deadline.getTime();
}

// ---------------------------------------------------------------------------
// Exam Modal Component
// ---------------------------------------------------------------------------

function ExamModal({ assignment, onClose, onSubmit, onSaveDraft, syncFn }) {
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');

  // Exam state
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);

  // Load assignment detail
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await submissionsApi.getAssignmentDetail(assignment.id);
        if (!data) { setError('Không tải được bài tập'); return; }
        setDetail(data);

        // Pre-fill answers from existing submission
        if (data.submission?.answers) {
          setAnswers(data.submission.answers);
        } else if (data.submission?.draftAnswers) {
          setAnswers(data.submission.draftAnswers);
        }

        // Restore flagged state from submission
        setTimeLeft((data.duration_minutes || 45) * 60);
      } catch (e) {
        setError(e.message || 'Lỗi khi tải bài tập');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [assignment.id]);

  // Countdown timer
  useEffect(() => {
    if (!detail || submitResult || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
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

  const handleAutoSubmit = useCallback(async () => {
    if (submitResult || !detail) return;
    setIsSubmitting(true);
    try {
      const res = await submissionsApi.submit(assignment.id, answers);
      if (res?.success) {
        setSubmitResult(res.data);
        syncFn?.();
      }
    } catch (e) {
      // If deadline passed, the server will reject with DEADLINE_PASSED
      setError(e.message || 'Lỗi khi nộp bài');
    } finally {
      setIsSubmitting(false);
    }
  }, [submitResult, detail, answers, assignment.id, syncFn]);

  const handleSelectAnswer = (questionId, value) => {
    if (submitResult) return;
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleToggleFlag = (questionId) => {
    setFlagged((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    try {
      await submissionsApi.saveDraft(assignment.id, answers);
    } catch {
      // Non-critical: draft save failure should not block the student
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
      } else {
        throw new Error(res?.error?.message || 'Lỗi khi nộp bài');
      }
    } catch (e) {
      setError(e.message || 'Lỗi khi nộp bài');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canResubmit = detail?.allow_resubmit && detail?.submission?.resubmitCount < 1;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-text-secondary text-sm gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Đang tải bài tập...</span>
      </div>
    );
  }

  if (error && !detail) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-8 h-8 text-danger mx-auto mb-2" />
        <p className="text-sm text-danger">{error}</p>
        <Button variant="secondary" size="sm" className="mt-4" onClick={onClose}>Đóng</Button>
      </div>
    );
  }

  const questions = detail?.questions || [];
  const currentQ = questions[currentQIdx];
  const isLate = isPastDue(assignment.due_date, assignment.due_time);
  // Read-only if: already submitted/graded OR deadline passed AND no resubmit allowed
  const isReadOnly = Boolean(submitResult) ||
    (isLate && !detail?.allow_resubmit && !detail?.submission);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-surface-neutral rounded border border-hairline">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-primary">{detail?.subject}</span>
          <span className="text-hairline-darker">|</span>
          <span className="text-xs text-text-secondary">
            Câu {currentQIdx + 1} / {questions.length}
          </span>
          {isLate && (
            <Badge variant="warning" size="sm">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Trễ hạn
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 text-xs font-mono font-bold px-3 py-1 rounded border ${
            timeLeft < 300 ? 'bg-red-50 border-red-300 text-danger' : 'bg-white border-hairline text-primary'
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

      {/* Error banner */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-danger flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Question palette */}
      <div className="flex flex-wrap gap-1.5">
        {questions.map((q, idx) => {
          const isAnswered = answers[q.id] !== undefined && answers[q.id] !== '';
          const isCurrent = idx === currentQIdx;
          const isFlgged = Boolean(flagged[q.id]);
          return (
            <button
              key={q.id}
              onClick={() => setCurrentQIdx(idx)}
              className={`relative w-8 h-8 rounded text-xs font-medium transition-all ${
                isCurrent
                  ? 'bg-primary text-white ring-2 ring-ocean/30 font-bold'
                  : isAnswered
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-white border border-hairline text-text-secondary hover:text-text-primary'
              }`}
            >
              {idx + 1}
              {isFlgged && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full ring-2 ring-white" />
              )}
            </button>
          );
        })}
      </div>

      {/* Current question */}
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
                  <span className="hidden sm:inline">{flagged[currentQ.id] ? 'Đã đánh dấu' : 'Xem lại'}</span>
                </button>
              )}
              <Badge variant="neutral" size="sm">{currentQ.max_score} điểm</Badge>
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
                  // correct answer is stripped server-side, but we can show which option was selected
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
            /* Short answer / Essay */
            <div className="space-y-2">
              <textarea
                value={answers[currentQ.id] || ''}
                onChange={(e) => !isReadOnly && handleSelectAnswer(currentQ.id, e.target.value)}
                disabled={isReadOnly}
                rows={5}
                placeholder="Nhập câu trả lời của bạn..."
                className="w-full p-3.5 bg-white border border-hairline rounded text-xs text-text-primary focus:border-ocean focus:ring-1 focus:ring-ocean outline-none resize-none transition-all"
              />
              {isReadOnly && (
                <p className="text-[11px] text-text-secondary italic">
                  Bài đã được nộp hoặc hết hạn. Không thể chỉnh sửa.
                </p>
              )}
            </div>
          )}

          {/* Explanation in review mode */}
          {submitResult && currentQ.explanation && (
            <div className="p-3.5 bg-sky/40 border border-ocean/20 rounded text-xs space-y-1">
              <div className="font-semibold text-ocean">Giải thích:</div>
              <p className="text-text-secondary leading-relaxed">{currentQ.explanation}</p>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2 hairline-t">
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="md"
            icon={ChevronLeft}
            disabled={currentQIdx === 0}
            onClick={() => setCurrentQIdx((i) => i - 1)}
          >
            Câu trước
          </Button>
          <Button
            variant="secondary"
            size="md"
            icon={ChevronRight}
            iconPosition="right"
            disabled={currentQIdx === questions.length - 1}
            onClick={() => setCurrentQIdx((i) => i + 1)}
          >
            Câu tiếp
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {!submitResult && !isReadOnly && (
            <Button
              variant="secondary"
              size="md"
              icon={Loader2}
              disabled={isSavingDraft}
              onClick={handleSaveDraft}
            >
              {isSavingDraft ? 'Đang lưu...' : 'Lưu nháp'}
            </Button>
          )}

          {!submitResult && !isReadOnly && (
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

// ---------------------------------------------------------------------------
// Main StudentAssignmentsPage Component
// ---------------------------------------------------------------------------

export function StudentAssignmentsPage() {
  const { lastSync, triggerSync } = useSync();

  const [assignments, setAssignments] = useState([]);
  const [total, setTotal] = useState(0);
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Exam modal
  const [examModalOpen, setExamModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);

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
      setError(e.message || 'Không thể tải danh sách bài tập.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments, lastSync]);

  const handleStartExam = (asg) => {
    setSelectedAssignment(asg);
    setExamModalOpen(true);
  };

  const handleCloseExam = () => {
    setExamModalOpen(false);
    setSelectedAssignment(null);
    fetchAssignments(); // Refresh after submission
  };

  const filteredAssignments = assignments.filter((a) => {
    if (activeFilter === 'pending') return a.submission_status !== 'submitted' && a.submission_status !== 'graded';
    if (activeFilter === 'completed') return a.submission_status === 'submitted' || a.submission_status === 'graded';
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
          ].map((tab) => (
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

      {/* Error state */}
      {error && (
        <Card padding="p-6" className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="w-8 h-8 text-danger" />
          <p className="text-sm text-danger font-medium">{error}</p>
          <Button variant="secondary" size="sm" onClick={fetchAssignments}>Thử lại</Button>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-text-secondary text-sm gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Đang tải bài tập...</span>
        </div>
      )}

      {/* Empty state */}
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

      {/* Assignment Cards */}
      {!loading && filteredAssignments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssignments.map((asg) => {
            const isDone = asg.submission_status === 'submitted' || asg.submission_status === 'graded';
            const isLate = isPastDue(asg.due_date, asg.due_time);
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

                  {/* Submission info */}
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

      {/* Exam Modal */}
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
            syncFn={triggerSync}
          />
        )}
      </Modal>
    </div>
  );
}

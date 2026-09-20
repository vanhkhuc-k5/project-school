import React, { useState, useEffect } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { studentApi } from '../../services/api';
import { useSync } from '../../context/SyncContext';
import {
  BookOpen,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Play,
  FileCheck,
  ChevronRight,
  Sparkles,
  Award,
  HelpCircle,
  Send,
  RotateCcw,
} from 'lucide-react';

export function StudentAssignmentsPage() {
  const { lastSync, triggerSync } = useSync();
  const [assignments, setAssignments] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [examDetail, setExamDetail] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [studentAnswers, setStudentAnswers] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [examResult, setExamResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(45 * 60);

  const fetchAssignments = async () => {
    const list = await studentApi.getAssignments();
    if (list && list.length > 0) {
      setAssignments(list);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [lastSync]);

  // Timer countdown
  useEffect(() => {
    let timer;
    if (isExamModalOpen && !examResult && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isExamModalOpen, examResult, timeLeft]);

  const handleStartExam = async (asg) => {
    const detail = await studentApi.getAssignmentDetail(asg.id);
    if (detail) {
      setExamDetail(detail);
      setSelectedAssignment(asg);
      setCurrentQuestionIndex(0);
      setStudentAnswers(detail.submission?.answers || {});
      setExamResult(
        detail.isSubmitted
          ? {
              score: detail.submission.score,
              maxScore: 10,
              isReview: true,
            }
          : null
      );
      setTimeLeft((detail.durationMinutes || 45) * 60);
      setIsExamModalOpen(true);
    }
  };

  const handleSelectOption = (questionId, optionId) => {
    if (examResult) return; // Prevent change after submit
    setStudentAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  const handleSubmitExam = async () => {
    if (examResult) return;
    setIsSubmitting(true);
    try {
      const res = await studentApi.submitAssignment(selectedAssignment.id, studentAnswers);
      if (res?.success) {
        setExamResult(res);
        fetchAssignments();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const filteredAssignments = assignments.filter((a) => {
    if (activeFilter === 'pending') return a.status !== 'graded' && a.status !== 'submitted';
    if (activeFilter === 'completed') return a.status === 'graded' || a.status === 'submitted';
    return true;
  });

  const currentQ = examDetail?.questions?.[currentQuestionIndex];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-text-secondary mb-1">
            <span>Học sinh</span>
            <span>/</span>
            <span className="text-text-primary font-medium">Khảo thí & Bài tập trực tuyến</span>
          </div>
          <h1 className="text-2xl font-medium text-text-primary">Bài tập & Đánh giá định kỳ</h1>
          <p className="text-xs text-text-secondary mt-1">
            Hoàn thành các bài tập trắc nghiệm và tự luận đúng hạn để hệ thống tính điểm chuyên cần và rèn luyện.
          </p>
        </div>

        <div className="flex items-center gap-2 p-1 bg-surface-neutral rounded border border-hairline">
          {[
            { id: 'all', label: 'Tất cả bài tập' },
            { id: 'pending', label: 'Cần hoàn thành' },
            { id: 'completed', label: 'Đã nộp bài' },
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

      {/* Assignment Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAssignments.map((asg) => {
          const isDone = asg.status === 'submitted' || asg.status === 'graded';
          return (
            <Card key={asg.id} padding="p-5" className="flex flex-col justify-between hover:border-ocean/40 transition-all group">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <Badge variant={isDone ? 'success' : asg.urgency === 'urgent' ? 'danger' : 'info'} size="sm">
                    {asg.subject}
                  </Badge>
                  <span className="text-[11px] text-text-secondary flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{asg.durationMinutes} phút</span>
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-text-primary group-hover:text-ocean transition-colors line-clamp-2">
                    {asg.title}
                  </h3>
                  <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                    {asg.instructions || 'Bài kiểm tra kiến thức chuyên đề định kỳ theo chuẩn chương trình.'}
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-4 hairline-t space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-text-secondary" />
                    <span>Hạn: {asg.dueDate}</span>
                  </span>
                  {isDone ? (
                    <span className="font-semibold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{asg.score !== null ? `${asg.score}/10 điểm` : 'Đã nộp'}</span>
                    </span>
                  ) : (
                    <span className="text-xs text-amber-600 font-medium">Chưa làm</span>
                  )}
                </div>

                <Button
                  variant={isDone ? 'secondary' : 'primary'}
                  size="sm"
                  className="w-full justify-center"
                  icon={isDone ? FileCheck : Play}
                  onClick={() => handleStartExam(asg)}
                >
                  {isDone ? 'Xem lại kết quả & Lời giải' : 'Làm bài thi trực tuyến'}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Interactive Exam Modal */}
      <Modal
        isOpen={isExamModalOpen}
        onClose={() => setIsExamModalOpen(false)}
        title={examDetail?.title || 'Phòng Khảo Thí Trực Tuyến'}
        maxWidth="max-w-4xl"
      >
        {examDetail && (
          <div className="space-y-6">
            {/* Header: Timer & Question navigation */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-surface-neutral rounded border border-hairline">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-primary">{examDetail.subject}</span>
                <span className="text-hairline-darker">|</span>
                <span className="text-xs text-text-secondary">
                  Câu {currentQuestionIndex + 1} / {examDetail.questions?.length || 0}
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold px-3 py-1 rounded bg-white border border-hairline text-primary">
                  <Clock className="w-3.5 h-3.5 text-ocean" />
                  <span>{formatTimer(timeLeft)}</span>
                </div>

                {examResult && (
                  <Badge variant="success" size="md">
                    Điểm số: {examResult.score}/10
                  </Badge>
                )}
              </div>
            </div>

            {/* Question Navigator Pills */}
            <div className="flex flex-wrap gap-1.5 pb-2">
              {examDetail.questions?.map((q, idx) => {
                const isAnswered = studentAnswers[q.id] !== undefined;
                const isCurrent = idx === currentQuestionIndex;
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={`w-8 h-8 rounded text-xs font-medium transition-all ${
                      isCurrent
                        ? 'bg-primary text-white ring-2 ring-ocean/30 font-bold'
                        : isAnswered
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-white border border-hairline text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Current Question View */}
            {currentQ && (
              <div className="p-5 bg-white border border-hairline rounded-card space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-sm font-semibold text-text-primary leading-relaxed">
                    <span className="text-ocean mr-1.5 font-bold">Câu {currentQuestionIndex + 1}:</span>
                    {currentQ.prompt}
                  </h3>
                  <Badge variant="neutral" size="sm">
                    {currentQ.points} điểm
                  </Badge>
                </div>

                {/* Optional Graph/Plot info */}
                {currentQ.hasPlot && (
                  <div className="p-4 bg-surface-neutral/60 border border-hairline rounded text-xs text-text-secondary space-y-1">
                    <div className="font-semibold text-primary flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-ocean" />
                      <span>Hình vẽ minh họa:</span>
                    </div>
                    <p className="font-mono text-text-primary">{currentQ.plotData}</p>
                  </div>
                )}

                {/* Radio Options */}
                <div className="space-y-2.5">
                  {currentQ.options?.map((opt) => {
                    const isSelected = studentAnswers[currentQ.id] === opt.id;
                    const showCorrection = Boolean(examResult);
                    const isCorrect = opt.isCorrect;

                    let optStyle = 'border-hairline bg-white hover:bg-surface-neutral/40';
                    if (isSelected && !showCorrection) {
                      optStyle = 'border-ocean bg-sky/30 text-primary font-medium ring-1 ring-ocean/40';
                    }
                    if (showCorrection) {
                      if (isCorrect) {
                        optStyle = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-medium';
                      } else if (isSelected && !isCorrect) {
                        optStyle = 'border-red-400 bg-red-50 text-red-900 line-through';
                      }
                    }

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSelectOption(currentQ.id, opt.id)}
                        disabled={Boolean(examResult)}
                        className={`w-full text-left p-3.5 rounded border transition-all flex items-center justify-between text-xs ${optStyle}`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] ${
                              isSelected ? 'bg-ocean text-white' : 'bg-surface-neutral text-text-secondary'
                            }`}
                          >
                            {opt.id}
                          </span>
                          <span>{opt.text}</span>
                        </div>

                        {showCorrection && isCorrect && (
                          <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Đáp án đúng</span>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation in Review Mode */}
                {examResult && currentQ.explanation && (
                  <div className="p-3.5 bg-sky/40 border border-ocean/20 rounded text-xs space-y-1">
                    <div className="font-semibold text-ocean">Giải thích sư phạm:</div>
                    <p className="text-text-secondary leading-relaxed">{currentQ.explanation}</p>
                  </div>
                )}
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2 hairline-t">
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="md"
                  disabled={currentQuestionIndex === 0}
                  onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
                >
                  Câu trước
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  disabled={currentQuestionIndex === (examDetail.questions?.length || 1) - 1}
                  onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                >
                  Câu tiếp theo
                </Button>
              </div>

              {!examResult ? (
                <Button
                  variant="primary"
                  size="md"
                  icon={Send}
                  iconPosition="right"
                  disabled={isSubmitting}
                  onClick={handleSubmitExam}
                >
                  {isSubmitting ? 'Đang chấm bài...' : 'Nộp bài thi'}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setIsExamModalOpen(false)}
                >
                  Đóng phòng thi
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

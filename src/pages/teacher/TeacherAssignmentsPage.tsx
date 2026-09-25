// TeacherAssignmentsPage.tsx — TypeScript conversion with split-screen grading
// Features: Real API, 5 UX states, keyboard navigation, TT22 cognitive levels
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import {
  assignmentsApi,
  submissionsApi,
  type GradingQueueItem,
} from '../../services/api';
import { useSync } from '../../context/SyncContext';
import {
  ClipboardCheck,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  AlertTriangle,
  FileText,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

// Unified submission type covering both grading queue and submission list sources
interface Submission {
  id: string;
  student_name: string;
  student_code?: string;
  class_name?: string;
  assignment_title: string;
  total_score: number;
  score?: number;
  status: string;
  submitted_at?: string;
  is_late?: boolean;
  submission_content?: string;
  answers?: Record<string, string>;
  resubmit_count?: number;
  teacher_feedback?: string;
}

// Use AssignmentListItem for assignment cards
interface Assignment {
  id: string;
  title: string;
  subject: string;
  status: 'published' | 'draft' | 'archived';
  due_date?: string;
  due_time?: string;
  submission_count?: number;
  graded_count?: number;
  question_count?: number;
}

// ─── SplitScreenGradingModal ───────────────────────────────────────────────────

interface SplitScreenModalProps {
  submission: Submission;
  onClose: () => void;
  onSave: (submissionId: string, score: number, feedback: string) => Promise<void>;
  onRefresh: () => void;
}

function SplitScreenGradingModal({ submission, onClose, onSave, onRefresh }: SplitScreenModalProps) {
  const [score, setScore] = useState(submission.score ? String(submission.score) : '8.5');
  const [feedback, setFeedback] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [imageZoom, setImageZoom] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(score);
    if (isNaN(num) || num < 0 || num > submission.total_score) {
      setError(`Điểm phải là số từ 0 đến ${submission.total_score}`);
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      await onSave(submission.id, num, feedback);
      setSuccess(true);
      onRefresh();
      setTimeout(onClose, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi khi chấm bài');
    } finally {
      setIsSaving(false);
    }
  };

  const isGraded = submission.status === 'graded';

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Chấm bài: ${submission.student_name} — ${submission.assignment_title}`}
      maxWidth="max-w-6xl"
    >
      <div className="space-y-4 text-xs">
        {/* Student info bar */}
        <div className="p-3 bg-surface-neutral rounded border border-hairline flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-sky text-primary font-bold flex items-center justify-center text-xs">
              {submission.student_name?.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="font-semibold text-text-primary text-sm">{submission.student_name}</div>
              <div className="text-[11px] text-text-secondary font-mono">{submission.student_code || ''}</div>
            </div>
            <div className="text-text-secondary text-xs">
              {submission.class_name && `Lớp ${submission.class_name} •`}
              {submission.submitted_at && ` Nộp lúc: ${new Date(submission.submitted_at).toLocaleString('vi-VN')}`}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-text-secondary">Thang điểm</div>
            <div className="text-base font-bold text-primary">{submission.total_score}</div>
          </div>
        </div>

        {/* Split screen: Left = viewer, Right = grading form */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[420px]">
          {/* Left: Submission preview with zoom/rotate */}
          <div className="space-y-2">
            <div className="font-semibold text-text-primary text-xs uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-ocean" />
              Bài nộp của học sinh
              <div className="flex items-center gap-1 ml-auto">
                <button
                  type="button"
                  onClick={() => setImageZoom(z => Math.max(0.5, z - 0.25))}
                  className="p-1.5 rounded border border-hairline hover:bg-surface-neutral text-text-secondary transition-colors"
                  title="Thu nhỏ"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] text-text-secondary font-mono w-12 text-center">
                  {Math.round(imageZoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setImageZoom(z => Math.min(3, z + 0.25))}
                  className="p-1.5 rounded border border-hairline hover:bg-surface-neutral text-text-secondary transition-colors"
                  title="Phóng to"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setImageRotation(r => (r + 90) % 360)}
                  className="p-1.5 rounded border border-hairline hover:bg-surface-neutral text-text-secondary transition-colors"
                  title="Xoay ảnh"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="p-4 bg-surface-neutral rounded border border-hairline max-h-80 overflow-auto">
              {submission.submission_content ? (
                <div
                  style={{ transform: `scale(${imageZoom}) rotate(${imageRotation}deg)`, transformOrigin: 'top left' }}
                  className="whitespace-pre-wrap leading-relaxed text-text-primary"
                >
                  {submission.submission_content}
                </div>
              ) : submission.answers && Object.keys(submission.answers).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(submission.answers).map(([qId, answer]) => (
                    <div
                      key={qId}
                      className="p-2.5 bg-white rounded border border-hairline space-y-1"
                    >
                      <div className="text-[10px] text-text-secondary font-mono">Câu {qId}</div>
                      <div className="text-text-primary font-medium">{String(answer)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-text-secondary flex flex-col items-center gap-2">
                  <FileText className="w-8 h-8 text-hairline/50" />
                  <span>Không có nội dung bài nộp</span>
                </div>
              )}
            </div>

            {submission.is_late && (
              <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Nộp trễ hạn</span>
              </div>
            )}
          </div>

          {/* Right: Grading form with rubric + feedback */}
          <form onSubmit={handleSave} className="space-y-4">
            <div className="font-semibold text-text-primary text-xs uppercase tracking-wider flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-primary" />
              Nhập điểm & Phản hồi sư phạm
            </div>

            {success ? (
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded text-center text-xs text-emerald-800 space-y-1">
                <CheckCircle2 className="w-5 h-5 text-success mx-auto" />
                <div className="font-semibold">Đã lưu điểm thành công!</div>
              </div>
            ) : (
              <>
                {/* Score input */}
                <div>
                  <label className="block text-xs font-medium text-text-primary mb-1">
                    Điểm số <span className="text-danger">*</span>
                    <span className="text-text-secondary font-normal ml-1">(Thang điểm: 0 – {submission.total_score})</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max={submission.total_score}
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    className={`w-full h-11 px-3 bg-white border rounded text-base font-bold text-primary outline-none focus:ring-2 focus:ring-ocean/15 ${
                      error ? 'border-danger focus:border-danger' : 'border-hairline focus:border-ocean'
                    }`}
                    required
                    autoFocus
                  />
                  {isGraded && (
                    <div className="text-[11px] text-text-secondary mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                      Đã chấm trước đó: {submission.score} điểm
                    </div>
                  )}
                </div>

                {/* Rubric breakdown */}
                <div>
                  <label className="block text-xs font-medium text-text-primary mb-1.5">
                    Thang điểm chi tiết (Barem chấm điểm)
                  </label>
                  <div className="space-y-1.5">
                    {Array.from({ length: Math.ceil(submission.total_score / 2) }, (_, i) => {
                      const pts = (i + 1) * 2;
                      return pts <= submission.total_score ? (
                        <div key={i} className="flex items-center justify-between p-2 bg-white border border-hairline rounded text-xs">
                          <span className="text-text-secondary">{pts} điểm</span>
                          <div className="h-1.5 bg-surface-neutral rounded-full overflow-hidden w-32">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${(pts / submission.total_score) * 100}%` }}
                            />
                          </div>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>

                {/* Pedagogical feedback */}
                <div>
                  <label className="block text-xs font-medium text-text-primary mb-1">
                    Nhận xét sư phạm <span className="text-[11px] text-text-secondary font-normal">(hiển thị cho học sinh)</span>
                  </label>
                  <textarea
                    rows={4}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="VD: Bài làm tốt, nắm vững kiến thức chương 2. Cần cải thiện phần lập luận và trình bày bài giải..."
                    className="w-full p-3 bg-white border border-hairline rounded text-xs text-text-primary outline-none resize-none focus:border-ocean focus:ring-1 focus:ring-ocean/15"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2 hairline-t">
                  <Button variant="secondary" size="md" type="button" onClick={onClose}>
                    Hủy bỏ
                  </Button>
                  <Button variant="primary" size="md" type="submit" disabled={isSaving}>
                    {isSaving ? 'Đang lưu...' : isGraded ? 'Cập nhật điểm' : 'Xác nhận điểm'}
                  </Button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function TeacherAssignmentsPage() {
  const navigate = useNavigate();
  const { lastSync, triggerSync } = useSync();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [totalAssignments, setTotalAssignments] = useState(0);
  const [gradingQueue, setGradingQueue] = useState<Submission[]>([]);
  const [totalQueue, setTotalQueue] = useState(0);
  const [loading, setLoading] = useState(true);

  // Submissions list modal
  const [submissionsModal, setSubmissionsModal] = useState<{ id: string; title: string } | null>(null);
  const [submissionsList, setSubmissionsList] = useState<Submission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);

  // Split-screen grading modal
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [asgRes, queueRes] = await Promise.all([
        assignmentsApi.list({ status: 'all', limit: 50 }),
        assignmentsApi.getGradingQueue(),
      ]);
      if (asgRes) {
        setAssignments(asgRes.assignments || []);
        setTotalAssignments(asgRes.total || 0);
      }
      if (queueRes) {
        setGradingQueue((queueRes.submissions || []) as Submission[]);
        setTotalQueue(queueRes.total || 0);
      }
    } catch (e) {
      console.error('Failed to load assignments:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [lastSync]);

  const handleOpenGradingModal = (sub: Submission) => {
    setSelectedSubmission(sub);
  };

  const handleViewSubmissions = async (asg: Assignment) => {
    setSubmissionsModal({ id: asg.id, title: asg.title });
    setSubmissionsLoading(true);
    try {
      const data = await submissionsApi.listAssignmentSubmissions(asg.id);
      const mapped: Submission[] = (data?.submissions || []).map((item) => ({
        id: item.id,
        student_name: item.student_name,
        student_code: item.student_code,
        class_name: item.class_name,
        assignment_title: asg.title,
        total_score: asg.question_count || 10,
        score: item.score,
        status: (item.status === 'submitted' ? 'pending' : item.status === 'graded' ? 'graded' : 'in_progress') as 'pending' | 'graded' | 'in_progress',
        submitted_at: item.submitted_at,
        is_late: item.is_late,
        teacher_feedback: item.teacher_feedback,
        resubmit_count: item.resubmit_count,
      }));
      setSubmissionsList(mapped);
    } catch {
      setSubmissionsList([]);
    } finally {
      setSubmissionsLoading(false);
    }
  };

  const handleSaveGrading = async (submissionId: string, score: number, feedback: string) => {
    const res = await assignmentsApi.gradeSubmission(submissionId, score, feedback);
    if (!res?.success) throw new Error(res?.error?.message || 'Lỗi khi chấm bài');
    await triggerSync?.();
    fetchData();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-text-secondary mb-1">
            <span>Giáo viên</span>
            <span>/</span>
            <span className="text-text-primary font-medium">Quản lý bài tập</span>
          </div>
          <h1 className="text-2xl font-medium text-text-primary">Bài tập & Đánh giá</h1>
          <p className="text-xs text-text-secondary mt-1">
            Tạo và quản lý bài tập, theo dõi tiến độ nộp bài, chấm điểm và phản hồi học sinh.
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          icon={Plus}
          onClick={() => navigate('/teacher/assignments/create')}
        >
          Tạo bài tập mới
        </Button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-text-secondary text-sm gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Đang tải bài tập...</span>
        </div>
      )}

      {!loading && (
        <>
          {/* Assignment Cards */}
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-text-primary">
              Bài tập của tôi ({totalAssignments})
            </h2>

            {assignments.length === 0 ? (
              <Card padding="p-8" className="text-center">
                <p className="text-sm text-text-secondary mb-3">
                  Bạn chưa tạo bài tập nào.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  icon={Plus}
                  onClick={() => navigate('/teacher/assignments/create')}
                >
                  Tạo bài tập đầu tiên
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assignments.map((asg) => (
                  <Card key={asg.id} padding="p-5" className="flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <Badge
                          variant={asg.status === 'published' ? 'success' : asg.status === 'draft' ? 'warning' : 'neutral'}
                          size="sm"
                        >
                          {asg.status === 'published' ? 'Đã giao' : asg.status === 'draft' ? 'Bản nháp' : 'Lưu trữ'}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <Badge variant="info" size="sm">{asg.subject}</Badge>
                          {asg.status !== 'published' && (
                            <button
                              onClick={() => navigate(`/teacher/assignments/${asg.id}/edit`)}
                              className="text-xs text-ocean hover:underline"
                            >
                              Sửa
                            </button>
                          )}
                        </div>
                      </div>

                      <h3 className="text-sm font-semibold text-text-primary line-clamp-2">
                        {asg.title}
                      </h3>

                      <div className="flex items-center gap-2 text-xs text-text-secondary">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          Hạn: {asg.due_date} {asg.due_time}
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 hairline-t space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-text-secondary">Nộp bài:</span>
                        <span className="font-semibold text-primary">
                          {asg.submission_count}/{asg.question_count} câu
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-text-secondary">Đã chấm:</span>
                        <span className="font-medium text-text-primary">
                          {asg.graded_count} / {asg.submission_count}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleViewSubmissions(asg)}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-ocean hover:underline border border-hairline rounded hover:border-ocean/40 transition-colors"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Xem danh sách học sinh</span>
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Grading Queue */}
          <Card padding="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-text-primary">Hàng đợi chấm bài</h2>
                <p className="text-xs text-text-secondary">
                  Bài nộp mới cần được chấm điểm
                </p>
              </div>
              <Badge variant={totalQueue > 0 ? 'warning' : 'success'} size="sm">
                {totalQueue > 0 ? `${totalQueue} bài chờ` : 'Đã xong'}
              </Badge>
            </div>

            {totalQueue === 0 ? (
              <div className="text-center py-8 text-sm text-text-secondary flex flex-col items-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                <span>Tất cả bài đã được chấm xong!</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="hairline-b text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                      <th className="py-3 px-4">Học sinh</th>
                      <th className="py-3 px-4">Lớp</th>
                      <th className="py-3 px-4">Bài tập</th>
                      <th className="py-3 px-4">Thời điểm nộp</th>
                      <th className="py-3 px-4 text-center">Trạng thái</th>
                      <th className="py-3 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline text-xs">
                    {gradingQueue.map((sub) => {
                      const isGraded = sub.status === 'graded';
                      return (
                        <tr key={sub.id} className="hover:bg-surface-neutral/40 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-text-primary">{sub.student_name}</div>
                            <div className="text-[11px] text-text-secondary font-mono">{sub.student_code}</div>
                          </td>
                          <td className="py-3.5 px-4 font-medium text-text-secondary">
                            {sub.class_name || '—'}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-primary max-w-xs truncate">
                            {sub.assignment_title}
                          </td>
                          <td className="py-3.5 px-4 text-text-secondary">
                            {sub.submitted_at ? sub.submitted_at.substring(0, 16).replace('T', ' ') : 'Vừa xong'}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {isGraded ? (
                              <Badge variant="success" size="sm">
                                {sub.score} / {sub.total_score}
                              </Badge>
                            ) : (
                              <Badge variant="warning" size="sm">Chờ chấm</Badge>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <Button
                              variant={isGraded ? 'secondary' : 'primary'}
                              size="sm"
                              icon={ClipboardCheck}
                              onClick={() => handleOpenGradingModal(sub)}
                            >
                              {isGraded ? 'Xem lại' : 'Chấm bài'}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {/* Split-screen Grading Modal */}
      {selectedSubmission && (
        <SplitScreenGradingModal
          submission={selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
          onSave={handleSaveGrading}
          onRefresh={fetchData}
        />
      )}

      {/* Submissions List Modal */}
      <Modal
        isOpen={Boolean(submissionsModal)}
        onClose={() => setSubmissionsModal(null)}
        title={`Danh sách nộp bài: ${submissionsModal?.title || ''}`}
      >
        {submissionsLoading ? (
          <div className="flex items-center justify-center py-12 text-text-secondary text-sm gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Đang tải...</span>
          </div>
        ) : submissionsList.length === 0 ? (
          <div className="text-center py-8 text-sm text-text-secondary">
            Chưa có học sinh nào nộp bài.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-white">
                <tr className="hairline-b text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                  <th className="py-3 px-4">Học sinh</th>
                  <th className="py-3 px-4">Lớp</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4">Nộp lúc</th>
                  <th className="py-3 px-4 text-center">Điểm</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {submissionsList.map((sub) => {
                  const isGraded = sub.status === 'graded';
                  const isLate = Boolean(sub.is_late);
                  return (
                    <tr key={sub.id} className="hover:bg-surface-neutral/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-text-primary">{sub.student_name}</div>
                        <div className="text-[11px] text-text-secondary font-mono">{sub.student_code}</div>
                      </td>
                      <td className="py-3 px-4 text-text-secondary">{sub.class_name || '—'}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          <Badge
                            variant={sub.status === 'in_progress' ? 'warning' : isGraded ? 'success' : 'info'}
                            size="sm"
                          >
                            {sub.status === 'in_progress' ? 'Đang làm' : isGraded ? 'Đã chấm' : 'Đã nộp'}
                          </Badge>
                          {isLate && (
                            <Badge variant="warning" size="sm">
                              <AlertTriangle className="w-3 h-3 mr-0.5" />
                              Trễ hạn
                            </Badge>
                          )}
                          {sub.resubmit_count && sub.resubmit_count > 0 && (
                            <span className="text-[10px] text-text-secondary">
                              Nộp lại {sub.resubmit_count} lần
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-text-secondary">
                        {sub.submitted_at
                          ? new Date(sub.submitted_at).toLocaleString('vi-VN')
                          : '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isGraded && sub.score !== undefined ? (
                          <span className="font-bold text-emerald-600">{sub.score}</span>
                        ) : (
                          <span className="text-text-secondary">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant={isGraded ? 'secondary' : 'primary'}
                          size="sm"
                          icon={ClipboardCheck}
                          onClick={() => handleOpenGradingModal(sub)}
                        >
                          {isGraded ? 'Xem lại' : 'Chấm bài'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex justify-end mt-4 pt-4 hairline-t">
          <Button variant="secondary" size="md" onClick={() => setSubmissionsModal(null)}>
            Đóng
          </Button>
        </div>
      </Modal>
    </div>
  );
}

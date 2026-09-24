import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { assignmentsApi, submissionsApi } from '../../services/api';
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
} from 'lucide-react';

export function TeacherAssignmentsPage({ onNavigateCreateAssignment, onNavigateEditAssignment }) {
  const navigate = useNavigate();
  const { lastSync, triggerSync } = useSync();

  const [assignments, setAssignments] = useState([]);
  const [totalAssignments, setTotalAssignments] = useState(0);
  const [gradingQueue, setGradingQueue] = useState([]);
  const [totalQueue, setTotalQueue] = useState(0);
  const [loading, setLoading] = useState(true);

  // Submissions list modal (per assignment)
  const [submissionsModal, setSubmissionsModal] = useState(null); // { id, title }
  const [submissionsList, setSubmissionsList] = useState([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);

  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [gradingScore, setGradingScore] = useState('8.5');
  const [gradingFeedback, setGradingFeedback] = useState('');
  const [isGrading, setIsGrading] = useState(false);
  const [gradeSuccess, setGradeSuccess] = useState(false);
  const [gradeError, setGradeError] = useState('');

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
        setGradingQueue(queueRes.submissions || []);
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

  const handleOpenGradingModal = (sub) => {
    setSelectedSubmission(sub);
    setGradingScore(sub.score ? String(sub.score) : '8.5');
    setGradingFeedback('');
    setGradeSuccess(false);
    setGradeError('');
  };

  const handleViewSubmissions = async (asg) => {
    setSubmissionsModal({ id: asg.id, title: asg.title });
    setSubmissionsLoading(true);
    try {
      const data = await submissionsApi.listAssignmentSubmissions(asg.id);
      setSubmissionsList(data?.submissions || []);
    } catch {
      setSubmissionsList([]);
    } finally {
      setSubmissionsLoading(false);
    }
  };

  const handleSaveGrading = async (e) => {
    e.preventDefault();
    if (!selectedSubmission) return;
    const score = parseFloat(gradingScore);
    if (isNaN(score) || score < 0 || score > 100) {
      setGradeError('Điểm phải là số từ 0 đến 100');
      return;
    }
    setIsGrading(true);
    setGradeError('');
    try {
      const res = await assignmentsApi.gradeSubmission(selectedSubmission.id, score, gradingFeedback);
      if (!res?.success) throw new Error(res?.error?.message || 'Lỗi khi chấm bài');
      setGradeSuccess(true);
      await triggerSync?.();
      fetchData();
      setTimeout(() => {
        setSelectedSubmission(null);
        setGradeSuccess(false);
      }, 1500);
    } catch (err) {
      setGradeError(err.message || 'Lỗi khi chấm bài');
    } finally {
      setIsGrading(false);
    }
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
                          variant={asg.status === 'published' ? 'success' : asg.status === 'draft' ? 'warning' : 'secondary'}
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

      {/* Grading Modal */}
      <Modal
        isOpen={Boolean(selectedSubmission)}
        onClose={() => setSelectedSubmission(null)}
        title={`Chấm bài: ${selectedSubmission?.student_name} — ${selectedSubmission?.assignment_title}`}
      >
        {selectedSubmission && (
          <form onSubmit={handleSaveGrading} className="space-y-4 text-xs">
            <div className="p-3 bg-surface-neutral rounded border border-hairline space-y-1">
              <div className="font-semibold text-text-primary text-sm">
                {selectedSubmission.assignment_title}
              </div>
              <div className="text-text-secondary text-xs">
                Học sinh: <strong className="text-text-primary">{selectedSubmission.student_name}</strong>
                {selectedSubmission.class_name && ` • ${selectedSubmission.class_name}`}
              </div>
              <div className="text-text-secondary text-xs">
                Thang điểm: <strong className="text-text-primary">{selectedSubmission.total_score}</strong>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-primary mb-1">
                Điểm số
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max={selectedSubmission.total_score}
                value={gradingScore}
                onChange={(e) => setGradingScore(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-hairline rounded text-sm font-bold text-primary outline-none focus:border-ocean"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-primary mb-1">
                Nhận xét & Phản hồi
              </label>
              <textarea
                rows={3}
                value={gradingFeedback}
                onChange={(e) => setGradingFeedback(e.target.value)}
                placeholder="VD: Bài làm tốt, cần cải thiện phần lập luận..."
                className="w-full p-3 bg-white border border-hairline rounded text-xs text-text-primary outline-none resize-none focus:border-ocean"
              />
            </div>

            {gradeSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Đã lưu kết quả chấm bài thành công!</span>
              </div>
            )}

            {gradeError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{gradeError}</span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2 hairline-t">
              <Button variant="secondary" size="md" onClick={() => setSelectedSubmission(null)}>
                Hủy bỏ
              </Button>
              <Button variant="primary" size="md" type="submit" disabled={isGrading}>
                {isGrading ? 'Đang lưu...' : 'Xác nhận điểm'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

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
                          {sub.resubmit_count > 0 && (
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

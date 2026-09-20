import React, { useState, useEffect } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { teacherApi } from '../../services/api';
import { useSync } from '../../context/SyncContext';
import {
  ClipboardCheck,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  Send,
  Eye,
  Check,
} from 'lucide-react';

export function TeacherAssignmentsPage({ onNavigateCreateAssignment }) {
  const { triggerSync } = useSync();
  const [data, setData] = useState(null);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [gradingScore, setGradingScore] = useState('9.0');
  const [gradingFeedback, setGradingFeedback] = useState('Bài làm tốt, trình bày khoa học.');
  const [isGrading, setIsGrading] = useState(false);
  const [gradeSuccess, setGradeSuccess] = useState(false);

  const fetchAssignments = async () => {
    const res = await teacherApi.getAssignments();
    if (res) setData(res);
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleOpenGradingModal = (sub) => {
    setSelectedSubmission(sub);
    setGradingScore(sub.score ? sub.score.toString() : '8.5');
    setGradingFeedback(sub.feedback || 'Lập luận rõ ràng, bài làm đạt yêu cầu.');
  };

  const handleSaveGrading = async (e) => {
    e.preventDefault();
    if (!selectedSubmission) return;
    setIsGrading(true);
    try {
      await teacherApi.gradeSubmission(selectedSubmission.id, gradingScore, gradingFeedback);
      await triggerSync();
      setGradeSuccess(true);
      fetchAssignments();
      setTimeout(() => {
        setGradeSuccess(false);
        setSelectedSubmission(null);
      }, 1200);
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
            <span className="text-text-primary font-medium">Khảo thí & Đánh giá</span>
          </div>
          <h1 className="text-2xl font-medium text-text-primary">Quản lý bài tập & Hàng đợi chấm bài</h1>
          <p className="text-xs text-text-secondary mt-1">
            Theo dõi tiến độ làm bài của học sinh, chấm điểm bài nộp và phản hồi nhận xét sư phạm trực tiếp.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          icon={Plus}
          onClick={onNavigateCreateAssignment}
        >
          Tạo bài tập mới
        </Button>
      </div>

      {/* Top Cards: Assignments overview */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-text-primary">Bài tập đang diễn ra</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.assignments?.map((asg) => (
            <Card key={asg.id} padding="p-5" className="flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <Badge variant="info" size="sm">
                    {asg.subject}
                  </Badge>
                  <span className="text-[11px] text-text-secondary">
                    {asg.targetClasses?.join(', ')}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-text-primary line-clamp-2">
                    {asg.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-text-secondary mt-2">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Hạn nộp: {asg.dueDate} {asg.dueTime}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 hairline-t">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-text-secondary">Tiến độ nộp bài:</span>
                  <span className="font-semibold text-primary">
                    {asg.submittedCount} bài nộp ({asg.gradedCount} đã chấm)
                  </span>
                </div>

                {asg.avgScore && (
                  <div className="flex items-center justify-between text-xs text-text-secondary">
                    <span>Điểm trung bình:</span>
                    <span className="font-bold text-emerald-600">{asg.avgScore}/10</span>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Grading Queue Table */}
      <Card padding="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-text-primary">Hàng đợi chấm bài của học sinh</h2>
            <p className="text-xs text-text-secondary">Bài làm trực tuyến vừa được gửi từ học sinh các lớp</p>
          </div>
          <Badge variant="warning">{data?.gradingQueue?.length || 0} bài trong hàng đợi</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="hairline-b text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                <th className="py-3 px-4">Học sinh</th>
                <th className="py-3 px-4">Lớp</th>
                <th className="py-3 px-4">Tên bài kiểm tra</th>
                <th className="py-3 px-4">Thời điểm nộp</th>
                <th className="py-3 px-4 text-center">Trạng thái / Điểm</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline text-xs">
              {data?.gradingQueue?.map((sub) => {
                const isGraded = sub.status === 'graded';
                return (
                  <tr key={sub.id} className="hover:bg-surface-neutral/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-text-primary">{sub.studentName}</div>
                      <div className="text-[11px] text-text-secondary font-mono">{sub.studentCode}</div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-text-secondary">
                      {sub.className}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-primary max-w-xs truncate">
                      {sub.assignmentTitle}
                    </td>
                    <td className="py-3.5 px-4 text-text-secondary">
                      {sub.submittedAt ? sub.submittedAt.substring(0, 16) : 'Vừa xong'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Badge variant={isGraded ? 'success' : 'warning'} size="sm">
                        {isGraded ? `${sub.score} / 10 điểm` : 'Chờ chấm'}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant={isGraded ? 'secondary' : 'primary'}
                        size="sm"
                        icon={ClipboardCheck}
                        onClick={() => handleOpenGradingModal(sub)}
                      >
                        {isGraded ? 'Xem lại & Sửa' : 'Chấm bài ngay'}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Grading Modal */}
      <Modal
        isOpen={Boolean(selectedSubmission)}
        onClose={() => setSelectedSubmission(null)}
        title={`Chấm bài: ${selectedSubmission?.studentName} (${selectedSubmission?.className})`}
      >
        {selectedSubmission && (
          <form onSubmit={handleSaveGrading} className="space-y-4 text-xs text-text-secondary">
            <div className="p-3 bg-surface-neutral rounded border border-hairline space-y-1">
              <div className="font-semibold text-text-primary text-sm">
                {selectedSubmission.assignmentTitle}
              </div>
              <div className="text-text-secondary text-xs">
                Học sinh: <strong className="text-text-primary">{selectedSubmission.studentName}</strong> • {selectedSubmission.className}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-primary mb-1">
                Điểm số bài thi (Thang 10)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={gradingScore}
                onChange={(e) => setGradingScore(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-hairline rounded text-sm font-bold text-primary outline-none focus:border-ocean"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-primary mb-1">
                Nhận xét & Lời khuyên sư phạm
              </label>
              <textarea
                rows={4}
                value={gradingFeedback}
                onChange={(e) => setGradingFeedback(e.target.value)}
                className="w-full p-3 bg-white border border-hairline rounded text-xs text-text-primary outline-none resize-none"
                required
              />
            </div>

            {gradeSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Đã lưu kết quả chấm bài thành công!</span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2 hairline-t">
              <Button variant="secondary" size="md" onClick={() => setSelectedSubmission(null)}>
                Hủy bỏ
              </Button>
              <Button variant="primary" size="md" type="submit" disabled={isGrading}>
                {isGrading ? 'Đang lưu...' : 'Xác nhận điểm & Hoàn tất'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { studentApi } from '../../services/api';
import {
  Award,
  TrendingUp,
  Download,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  Star,
  Printer,
  ChevronRight,
  Sparkles,
  BookOpen,
} from 'lucide-react';

export function StudentGradesPage() {
  const [gradeData, setGradeData] = useState(null);
  const [activeSemester, setActiveSemester] = useState('hk1');
  const [selectedSubjectDetail, setSelectedSubjectDetail] = useState(null);

  useEffect(() => {
    studentApi.getGrades().then((res) => {
      if (res) setGradeData(res);
    });
  }, []);

  if (!gradeData) {
    return (
      <div className="p-12 text-center text-xs text-text-secondary">
        Đang tải bảng điểm điện tử từ cơ sở dữ liệu...
      </div>
    );
  }

  // Sample component test scores for detail modal
  const getSubjectComponentScores = (subjectName) => [
    { name: 'Kiểm tra miệng (KĐTX 1)', score: 9.0, factor: 'Hệ số 1', date: '15/09/2024' },
    { name: 'Kiểm tra 15 phút số 1 (KĐTX 2)', score: 8.5, factor: 'Hệ số 1', date: '28/09/2024' },
    { name: 'Kiểm tra 15 phút số 2 (KĐTX 3)', score: 9.0, factor: 'Hệ số 1', date: '14/10/2024' },
    { name: 'Kiểm tra 1 tiết (KĐĐK 1)', score: 8.0, factor: 'Hệ số 2', date: '05/11/2024' },
    { name: 'Kiểm tra Giữa kỳ I', score: 8.5, factor: 'Hệ số 2', date: '20/11/2024' },
    { name: 'Thi Cuối học kỳ I', score: 9.0, factor: 'Hệ số 3', date: '26/12/2024' },
  ];

  const competencies = [
    { topic: 'Đại số & Giải tích hàm số', percent: 94, isStrength: true, note: 'Nắm vững kiến thức nền và bài toán vận dụng cao' },
    { topic: 'Hình học phẳng & Vectơ', percent: 88, isStrength: true, note: 'Khả năng tư duy không gian và chứng minh tốt' },
    { topic: 'Hàm số lượng giác & Phương trình', percent: 66, isStrength: false, note: 'Cần ôn thêm các công thức biến đổi nhân ba và tích thành tổng' },
    { topic: 'Tổ hợp, Xác suất & Thống kê', percent: 70, isStrength: false, note: 'Cần rèn luyện thêm bài toán xác suất có điều kiện' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-text-secondary mb-1">
            <span>Học sinh</span>
            <span>/</span>
            <span className="text-text-primary font-medium">Học bạ & Kết quả học tập</span>
          </div>
          <h1 className="text-2xl font-medium text-text-primary">Bảng điểm & Học bạ điện tử</h1>
          <p className="text-xs text-text-secondary mt-1">
            Học kỳ I • Năm học 2024 - 2025 • Điểm số được mã hóa và xác thực bởi Hội đồng Khảo thí
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Semester Selector Tabs */}
          <div className="flex items-center gap-1 p-1 bg-surface-neutral rounded border border-hairline text-xs">
            <button
              type="button"
              onClick={() => setActiveSemester('hk1')}
              className={`px-3 py-1.5 rounded transition-all ${
                activeSemester === 'hk1'
                  ? 'bg-white text-primary font-medium shadow-whisper border border-hairline'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Học kỳ I
            </button>
            <button
              type="button"
              onClick={() => setActiveSemester('hk2')}
              className={`px-3 py-1.5 rounded transition-all ${
                activeSemester === 'hk2'
                  ? 'bg-white text-primary font-medium shadow-whisper border border-hairline'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Học kỳ II
            </button>
            <button
              type="button"
              onClick={() => setActiveSemester('year')}
              className={`px-3 py-1.5 rounded transition-all ${
                activeSemester === 'year'
                  ? 'bg-white text-primary font-medium shadow-whisper border border-hairline'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Cả năm
            </button>
          </div>

          <Button variant="secondary" size="md" icon={Printer} onClick={() => window.print()}>
            In học bạ số
          </Button>
        </div>
      </div>

      {/* KPI Overview Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="p-5">
          <div className="text-[11px] text-text-secondary uppercase tracking-wider font-medium">
            Điểm trung bình (GPA)
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-primary tracking-tight">{gradeData.overallGpa}</span>
            <span className="text-xs text-text-secondary">/ 10</span>
          </div>
          <div className="mt-2 text-xs text-success flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-success" />
            <span>Xếp loại: Xuất sắc</span>
          </div>
        </Card>

        <Card padding="p-5">
          <div className="text-[11px] text-text-secondary uppercase tracking-wider font-medium">
            Thứ hạng trong lớp
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-primary tracking-tight">{gradeData.classRank}</span>
          </div>
          <div className="mt-2 text-xs text-text-secondary flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-success" />
            <span>Top 7% học sinh toàn khối 10</span>
          </div>
        </Card>

        <Card padding="p-5">
          <div className="text-[11px] text-text-secondary uppercase tracking-wider font-medium">
            Hạnh kiểm & Rèn luyện
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-success tracking-tight">{gradeData.conduct}</span>
          </div>
          <div className="mt-2 text-xs text-text-secondary">
            Chuyên cần: <strong className="text-text-primary">{gradeData.attendanceRate}</strong>
          </div>
        </Card>

        <Card padding="p-5">
          <div className="text-[11px] text-text-secondary uppercase tracking-wider font-medium">
            Tổng số tín chỉ học phần
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-primary tracking-tight">{gradeData.totalCredits}</span>
            <span className="text-xs text-text-secondary">tín chỉ</span>
          </div>
          <div className="mt-2 text-xs text-text-secondary">
            100% hoàn thành điều kiện xét tuyển
          </div>
        </Card>
      </div>

      {/* Transcript Table */}
      <Card padding="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-medium text-text-primary">Chi tiết điểm các môn học</h2>
            <p className="text-xs text-text-secondary">Nhấp vào từng môn để xem chi tiết các đầu điểm kiểm tra thường xuyên và định kỳ</p>
          </div>
          <Badge variant="info">
            {activeSemester === 'hk1' ? 'Học kỳ I' : activeSemester === 'hk2' ? 'Học kỳ II' : 'Năm học 2024 - 2025'}
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="hairline-b text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                <th className="py-3 px-4">Môn học</th>
                <th className="py-3 px-4 text-center">Số bài kiểm tra</th>
                <th className="py-3 px-4 text-center">Điểm gần nhất</th>
                <th className="py-3 px-4 text-center">Điểm TB Môn</th>
                <th className="py-3 px-4 text-center">Xếp loại</th>
                <th className="py-3 px-4">Nhận xét của giáo viên</th>
                <th className="py-3 px-4 text-right">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline text-xs">
              {gradeData.subjects.map((sub, idx) => (
                <tr key={idx} className="hover:bg-surface-neutral/40 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-text-primary">
                    {sub.subject}
                  </td>
                  <td className="py-3.5 px-4 text-center text-text-secondary">
                    {sub.testsCount} bài
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono font-medium text-ocean">
                    {sub.recentScore}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="font-bold text-sm text-primary">{sub.average}</span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <Badge variant={sub.average >= 8.5 ? 'success' : sub.average >= 7.0 ? 'info' : 'warning'} size="sm">
                      {sub.average >= 8.5 ? 'Giỏi' : sub.average >= 7.0 ? 'Khá' : 'Đạt'}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-text-secondary text-xs max-w-xs">
                    {sub.teacherComment || 'Hoàn thành tốt các yêu cầu học phần.'}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedSubjectDetail(sub)}
                      className="text-xs text-ocean hover:underline font-medium"
                    >
                      Xem chi tiết &rarr;
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Competencies & Learning Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Strengths */}
        <Card padding="p-5" className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-medium text-text-primary">Điểm mạnh kiến thức</h3>
              <p className="text-[11px] text-text-secondary">Các chuyên đề học sinh đạt độ thành thạo cao (&ge; 85%)</p>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            {competencies.filter((c) => c.isStrength).map((comp, idx) => (
              <div key={idx} className="space-y-1.5 p-3 bg-surface-neutral/40 rounded border border-hairline">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-text-primary">{comp.topic}</span>
                  <span className="font-bold text-emerald-600 font-mono">{comp.percent}%</span>
                </div>
                <div className="w-full h-1.5 bg-hairline rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${comp.percent}%` }}></div>
                </div>
                <p className="text-[11px] text-text-secondary">{comp.note}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Needs Improvement & AI Recommendation */}
        <Card padding="p-5" className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-medium text-text-primary">Chuyên đề cần rèn luyện thêm</h3>
              <p className="text-[11px] text-text-secondary">Đề xuất lộ trình củng cố kiến thức cùng Gia sư AI</p>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            {competencies.filter((c) => !c.isStrength).map((comp, idx) => (
              <div key={idx} className="space-y-1.5 p-3 bg-amber-50/30 rounded border border-amber-200/60">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-text-primary">{comp.topic}</span>
                  <span className="font-bold text-amber-700 font-mono">{comp.percent}%</span>
                </div>
                <div className="w-full h-1.5 bg-hairline rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${comp.percent}%` }}></div>
                </div>
                <p className="text-[11px] text-text-secondary">{comp.note}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Subject Component Detail Modal */}
      <Modal
        isOpen={Boolean(selectedSubjectDetail)}
        onClose={() => setSelectedSubjectDetail(null)}
        title={`Chi tiết kết quả môn ${selectedSubjectDetail?.subject || ''}`}
        maxWidth="max-w-2xl"
      >
        {selectedSubjectDetail && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-surface-neutral rounded border border-hairline flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-primary">{selectedSubjectDetail.subject}</div>
                <div className="text-text-secondary mt-0.5">Giáo viên phụ trách: Cô Mai Lan • Tổ chuyên môn Toán</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-text-secondary">Điểm trung bình</div>
                <div className="text-2xl font-bold text-primary">{selectedSubjectDetail.average}</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-medium text-text-primary text-xs uppercase tracking-wider">
                Bảng phân rã các đầu điểm thành phần
              </div>
              <div className="divide-y divide-hairline border border-hairline rounded bg-white overflow-hidden">
                {getSubjectComponentScores(selectedSubjectDetail.subject).map((comp, i) => (
                  <div key={i} className="p-3 flex items-center justify-between hover:bg-surface-neutral/30 transition-colors">
                    <div>
                      <div className="font-medium text-text-primary">{comp.name}</div>
                      <div className="text-[11px] text-text-secondary mt-0.5">
                        Ngày kiểm tra: {comp.date} • {comp.factor}
                      </div>
                    </div>
                    <div className="font-mono text-sm font-bold text-primary px-2.5 py-1 bg-sky/50 rounded border border-ocean/20">
                      {comp.score.toFixed(1)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-sky/40 border border-ocean/20 rounded space-y-1">
              <div className="font-semibold text-ocean">Nhận xét đánh giá chuyên môn:</div>
              <p className="text-text-secondary leading-relaxed">
                {selectedSubjectDetail.teacherComment || 'Học sinh nắm vững lý thuyết, trình bày bài toán mạch lạc. Cần tiếp tục duy trì phong độ và luyện tập thêm các bài toán mở rộng.'}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="primary" size="md" onClick={() => setSelectedSubjectDetail(null)}>
                Đóng
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

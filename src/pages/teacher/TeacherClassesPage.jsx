import React, { useState, useEffect } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { teacherApi } from '../../services/api';
import { useSync } from '../../context/SyncContext';
import {
  Users,
  Search,
  Plus,
  Edit,
  Award,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Download,
  Filter,
} from 'lucide-react';

export function TeacherClassesPage() {
  const { lastSync, triggerSync } = useSync();
  const [classData, setClassData] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState('cls_10A1');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentForGrade, setSelectedStudentForGrade] = useState(null);
  const [gradeInput, setGradeInput] = useState({
    subject: 'Toán học 10',
    testName: 'Kiểm tra 15 phút thường xuyên',
    score: '9.0',
    comment: 'Làm bài cẩn thận, nắm chắc kiến thức chuyên đề.',
  });
  const [isSubmittingGrade, setIsSubmittingGrade] = useState(false);
  const [gradeSuccessMsg, setGradeSuccessMsg] = useState(false);

  const fetchClass = async (cid) => {
    const res = await teacherApi.getClasses(cid);
    if (res) setClassData(res);
  };

  useEffect(() => {
    fetchClass(selectedClassId);
  }, [selectedClassId, lastSync]);

  const handleOpenGradeModal = (student) => {
    setSelectedStudentForGrade(student);
    setGradeInput({
      subject: 'Toán học 10',
      testName: 'Kiểm tra 15 phút thường xuyên',
      score: student.gpa ? student.gpa.toString() : '8.5',
      comment: 'Làm bài cẩn thận, trình bày mạch lạc.',
    });
  };

  const handleSaveGrade = async (e) => {
    e.preventDefault();
    if (!selectedStudentForGrade) return;
    setIsSubmittingGrade(true);
    try {
      await teacherApi.updateGrade({
        studentId: selectedStudentForGrade.id,
        subject: gradeInput.subject,
        testName: gradeInput.testName,
        score: parseFloat(gradeInput.score),
        comment: gradeInput.comment,
      });
      await triggerSync();
      setGradeSuccessMsg(true);
      fetchClass(selectedClassId);
      setTimeout(() => {
        setGradeSuccessMsg(false);
        setSelectedStudentForGrade(null);
      }, 1200);
    } finally {
      setIsSubmittingGrade(false);
    }
  };

  const filteredStudents = (classData?.students || []).filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-text-secondary mb-1">
            <span>Giáo viên</span>
            <span>/</span>
            <span className="text-text-primary font-medium">Quản lý lớp học & Sổ điểm</span>
          </div>
          <h1 className="text-2xl font-medium text-text-primary">Danh sách lớp học & Sổ điểm điện tử</h1>
          <p className="text-xs text-text-secondary mt-1">
            Theo dõi danh sách học sinh, chuyên cần, thứ hạng và cập nhật điểm kiểm tra trực tiếp vào cơ sở dữ liệu.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {classData?.classes?.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedClassId(c.id)}
              className={`px-3.5 py-1.5 rounded text-xs transition-all ${
                selectedClassId === c.id
                  ? 'bg-primary text-white font-medium shadow-whisper'
                  : 'bg-white border border-hairline text-text-secondary hover:text-text-primary'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Roster & Grade Table Card */}
      <Card padding="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-text-primary">
              Sổ điểm lớp {selectedClassId === 'cls_10A1' ? '10A1' : '10A2'}
            </h2>
            <Badge variant="info">42 học sinh</Badge>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm học sinh theo tên, mã..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-8 pr-3 bg-white border border-hairline rounded text-xs text-text-primary outline-none focus:border-ocean w-56"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="hairline-b text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                <th className="py-3 px-4">Học sinh</th>
                <th className="py-3 px-4">Mã định danh</th>
                <th className="py-3 px-4 text-center">Thứ hạng</th>
                <th className="py-3 px-4 text-center">Điểm GPA</th>
                <th className="py-3 px-4 text-center">Chuyên cần</th>
                <th className="py-3 px-4 text-center">Xếp loại</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline text-xs">
              {filteredStudents.map((st) => (
                <tr key={st.id} className="hover:bg-surface-neutral/40 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-sky text-primary font-bold flex items-center justify-center text-xs">
                        {st.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-text-primary">{st.name}</div>
                        <div className="text-[11px] text-text-secondary">{st.phone || '0988-xxx-xxx'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-text-secondary">
                    {st.code}
                  </td>
                  <td className="py-3.5 px-4 text-center font-semibold text-text-primary">
                    #{st.rank}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="font-bold text-sm text-primary">{st.gpa}</span>
                  </td>
                  <td className="py-3.5 px-4 text-center text-text-secondary">
                    {st.attendance}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <Badge variant={st.statusType} size="sm">
                      {st.status}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={Edit}
                      onClick={() => handleOpenGradeModal(st)}
                    >
                      Nhập / Sửa điểm
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Grade Entry Modal */}
      <Modal
        isOpen={Boolean(selectedStudentForGrade)}
        onClose={() => setSelectedStudentForGrade(null)}
        title={`Vào điểm kiểm tra: ${selectedStudentForGrade?.name}`}
      >
        {selectedStudentForGrade && (
          <form onSubmit={handleSaveGrade} className="space-y-4 text-xs text-text-secondary">
            <div className="p-3 bg-surface-neutral rounded flex items-center justify-between">
              <div>
                <div className="font-semibold text-text-primary">{selectedStudentForGrade.name}</div>
                <div className="text-[11px] text-text-secondary">Mã HS: {selectedStudentForGrade.code}</div>
              </div>
              <Badge variant="info">Lớp 10A1</Badge>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-primary mb-1">Môn học</label>
              <input
                type="text"
                value={gradeInput.subject}
                onChange={(e) => setGradeInput({ ...gradeInput, subject: e.target.value })}
                className="w-full h-10 px-3 bg-white border border-hairline rounded text-xs text-text-primary outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-primary mb-1">Tên bài kiểm tra</label>
              <input
                type="text"
                value={gradeInput.testName}
                onChange={(e) => setGradeInput({ ...gradeInput, testName: e.target.value })}
                className="w-full h-10 px-3 bg-white border border-hairline rounded text-xs text-text-primary outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-primary mb-1">Điểm số (Thang 10)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={gradeInput.score}
                onChange={(e) => setGradeInput({ ...gradeInput, score: e.target.value })}
                className="w-full h-10 px-3 bg-white border border-hairline rounded text-sm font-bold text-primary outline-none focus:border-ocean"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-primary mb-1">Lời nhận xét sư phạm</label>
              <textarea
                rows={3}
                value={gradeInput.comment}
                onChange={(e) => setGradeInput({ ...gradeInput, comment: e.target.value })}
                className="w-full p-3 bg-white border border-hairline rounded text-xs text-text-primary outline-none resize-none"
              />
            </div>

            {gradeSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Đã ghi nhận điểm thành công vào học bạ điện tử!</span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2 hairline-t">
              <Button variant="secondary" size="md" onClick={() => setSelectedStudentForGrade(null)}>
                Hủy bỏ
              </Button>
              <Button variant="primary" size="md" type="submit" disabled={isSubmittingGrade}>
                {isSubmittingGrade ? 'Đang lưu...' : 'Lưu điểm vào cơ sở dữ liệu'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

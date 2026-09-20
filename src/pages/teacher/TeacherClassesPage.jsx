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
  Calendar,
  Clock,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';

export function TeacherClassesPage() {
  const { lastSync, triggerSync } = useSync();
  const [classData, setClassData] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState('cls_10A1');
  const [activeTab, setActiveTab] = useState('gradebook'); // 'gradebook' | 'attendance'
  const [searchQuery, setSearchQuery] = useState('');
  
  // Grade edit modal states
  const [selectedStudentForGrade, setSelectedStudentForGrade] = useState(null);
  const [gradeInput, setGradeInput] = useState({
    subject: 'Toán học 10',
    testName: 'Kiểm tra 15 phút thường xuyên',
    score: '9.0',
    comment: 'Làm bài cẩn thận, nắm chắc kiến thức chuyên đề.',
  });
  const [isSubmittingGrade, setIsSubmittingGrade] = useState(false);
  const [gradeSuccessMsg, setGradeSuccessMsg] = useState(false);

  // Attendance states
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [attendanceSuccessMsg, setAttendanceSuccessMsg] = useState(false);

  const fetchClass = async (cid) => {
    const res = await teacherApi.getClasses(cid);
    if (res) {
      setClassData(res);
      // Initialize attendance records default to present if not set
      setAttendanceRecords((prev) => {
        const next = { ...prev };
        res.students?.forEach((st) => {
          if (!next[st.id]) next[st.id] = 'present';
        });
        return next;
      });
    }
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

  const handleMarkAllPresent = () => {
    const next = {};
    classData?.students?.forEach((st) => {
      next[st.id] = 'present';
    });
    setAttendanceRecords(next);
  };

  const setStudentAttendance = (studentId, status) => {
    setAttendanceRecords((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleSaveAttendance = async () => {
    if (!classData?.students) return;
    setIsSavingAttendance(true);
    try {
      const records = classData.students.map((st) => ({
        studentId: st.id,
        status: attendanceRecords[st.id] || 'present',
        note: '',
      }));
      const res = await teacherApi.recordAttendance(selectedClassId, records, attendanceDate);
      if (res?.success) {
        await triggerSync();
        setAttendanceSuccessMsg(true);
        setTimeout(() => setAttendanceSuccessMsg(false), 2500);
      }
    } finally {
      setIsSavingAttendance(false);
    }
  };

  const handleExportGradebook = () => {
    if (!classData?.students) return;
    const className = selectedClassId === 'cls_10A1' ? '10A1' : '10A2';
    const headers = ['Mã định danh', 'Họ và tên', 'Số điện thoại', 'Điểm TB (GPA)', 'Thứ hạng', 'Chuyên cần', 'Xếp loại'];
    const rows = classData.students.map((s) => [
      s.code,
      `"${s.name}"`,
      s.phone || '',
      s.gpa,
      s.rank,
      s.attendance,
      `"${s.status}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Bang_Diem_Lop_${className}_EduPortal.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredStudents = (classData?.students || []).filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const presentCount = Object.values(attendanceRecords).filter((s) => s === 'present').length;
  const excusedCount = Object.values(attendanceRecords).filter((s) => s === 'excused').length;
  const unexcusedCount = Object.values(attendanceRecords).filter((s) => s === 'unexcused').length;
  const lateCount = Object.values(attendanceRecords).filter((s) => s === 'late').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-text-secondary mb-1">
            <span>Giáo viên</span>
            <span>/</span>
            <span className="text-text-primary font-medium">Quản lý lớp học & Chuyên cần</span>
          </div>
          <h1 className="text-2xl font-medium text-text-primary">Danh sách lớp & Quản lý sư phạm</h1>
          <p className="text-xs text-text-secondary mt-1">
            Điểm danh điện tử hàng ngày, theo dõi sổ điểm học sinh và xuất báo cáo học bạ chuẩn hóa.
          </p>
        </div>

        {/* Class switcher buttons */}
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

      {/* Main Tab Controller & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-1.5 bg-surface-neutral rounded border border-hairline">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('gradebook')}
            className={`px-4 py-2 rounded text-xs transition-all ${
              activeTab === 'gradebook'
                ? 'bg-white text-primary font-medium shadow-whisper border border-hairline'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Sổ điểm học sinh ({classData?.students?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className={`px-4 py-2 rounded text-xs transition-all ${
              activeTab === 'attendance'
                ? 'bg-white text-primary font-medium shadow-whisper border border-hairline'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Điểm danh chuyên cần
          </button>
        </div>

        <div className="flex items-center gap-2 px-1">
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

          {activeTab === 'gradebook' && (
            <Button
              variant="secondary"
              size="sm"
              icon={Download}
              onClick={handleExportGradebook}
            >
              Xuất Excel/CSV
            </Button>
          )}
        </div>
      </div>

      {/* TAB 1: SỔ ĐIỂM HỌC SINH */}
      {activeTab === 'gradebook' && (
        <Card padding="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-text-primary">
                Sổ điểm lớp {selectedClassId === 'cls_10A1' ? '10A1' : '10A2'}
              </h2>
              <Badge variant="info">{filteredStudents.length} học sinh</Badge>
            </div>
            <span className="text-xs text-text-secondary">Năm học 2024 - 2025 • Tổ Toán học</span>
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
      )}

      {/* TAB 2: ĐIỂM DANH CHUYÊN CẦN */}
      {activeTab === 'attendance' && (
        <Card padding="p-6" className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 hairline-b pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-text-primary">
                  Điểm danh lớp {selectedClassId === 'cls_10A1' ? '10A1' : '10A2'}
                </h2>
                <Badge variant="info">Buổi sáng</Badge>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                Học sinh vắng không phép sẽ được tự động kích hoạt thông báo gửi đến phụ huynh.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs">
                <Calendar className="w-4 h-4 text-text-secondary" />
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="h-9 px-3 bg-white border border-hairline rounded text-xs text-text-primary outline-none focus:border-ocean font-medium"
                />
              </div>

              <Button
                variant="secondary"
                size="sm"
                icon={Check}
                onClick={handleMarkAllPresent}
              >
                Tất cả có mặt
              </Button>

              <Button
                variant="primary"
                size="sm"
                disabled={isSavingAttendance}
                onClick={handleSaveAttendance}
              >
                {isSavingAttendance ? 'Đang lưu...' : 'Lưu điểm danh'}
              </Button>
            </div>
          </div>

          {/* Attendance KPI Summary Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-center">
              <div className="text-xs font-medium text-emerald-800">Có mặt</div>
              <div className="text-xl font-bold text-emerald-700 mt-1">{presentCount}</div>
            </div>
            <div className="p-3 bg-sky border border-ocean/20 rounded text-center">
              <div className="text-xs font-medium text-primary">Vắng có phép</div>
              <div className="text-xl font-bold text-ocean mt-1">{excusedCount}</div>
            </div>
            <div className="p-3 bg-red-50 border border-red-200 rounded text-center">
              <div className="text-xs font-medium text-red-800">Vắng không phép</div>
              <div className="text-xl font-bold text-red-600 mt-1">{unexcusedCount}</div>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded text-center">
              <div className="text-xs font-medium text-amber-800">Đi muộn</div>
              <div className="text-xl font-bold text-amber-600 mt-1">{lateCount}</div>
            </div>
          </div>

          {attendanceSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
              <span>Đã lưu sổ điểm danh ngày {attendanceDate} thành công! Hệ thống đã ghi nhận vào cơ sở dữ liệu.</span>
            </div>
          )}

          {/* Student Attendance List */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="hairline-b text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                  <th className="py-3 px-4">Học sinh</th>
                  <th className="py-3 px-4">Mã số</th>
                  <th className="py-3 px-4 text-center">Trạng thái điểm danh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline text-xs">
                {filteredStudents.map((st) => {
                  const status = attendanceRecords[st.id] || 'present';
                  return (
                    <tr key={st.id} className="hover:bg-surface-neutral/40 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-text-primary">
                        {st.name}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-text-secondary">
                        {st.code}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setStudentAttendance(st.id, 'present')}
                            className={`px-3 py-1 rounded text-xs transition-all ${
                              status === 'present'
                                ? 'bg-emerald-600 text-white font-medium shadow-sm'
                                : 'bg-surface-neutral text-text-secondary hover:text-text-primary'
                            }`}
                          >
                            Có mặt
                          </button>
                          <button
                            type="button"
                            onClick={() => setStudentAttendance(st.id, 'excused')}
                            className={`px-3 py-1 rounded text-xs transition-all ${
                              status === 'excused'
                                ? 'bg-ocean text-white font-medium shadow-sm'
                                : 'bg-surface-neutral text-text-secondary hover:text-text-primary'
                            }`}
                          >
                            Có phép
                          </button>
                          <button
                            type="button"
                            onClick={() => setStudentAttendance(st.id, 'unexcused')}
                            className={`px-3 py-1 rounded text-xs transition-all ${
                              status === 'unexcused'
                                ? 'bg-danger text-white font-medium shadow-sm'
                                : 'bg-surface-neutral text-text-secondary hover:text-text-primary'
                            }`}
                          >
                            Không phép
                          </button>
                          <button
                            type="button"
                            onClick={() => setStudentAttendance(st.id, 'late')}
                            className={`px-3 py-1 rounded text-xs transition-all ${
                              status === 'late'
                                ? 'bg-amber-500 text-white font-medium shadow-sm'
                                : 'bg-surface-neutral text-text-secondary hover:text-text-primary'
                            }`}
                          >
                            Đi muộn
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Grade Entry / Edit Modal */}
      <Modal
        isOpen={Boolean(selectedStudentForGrade)}
        onClose={() => setSelectedStudentForGrade(null)}
        title={`Cập nhật điểm số: ${selectedStudentForGrade?.name || ''}`}
      >
        {selectedStudentForGrade && (
          <form onSubmit={handleSaveGrade} className="space-y-4 text-xs">
            {gradeSuccessMsg ? (
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded text-center text-xs text-emerald-800 space-y-1">
                <CheckCircle2 className="w-5 h-5 text-success mx-auto" />
                <div className="font-semibold">Đã lưu điểm thành công!</div>
                <div className="text-[11px]">Hệ thống đã cập nhật GPA và đồng bộ bảng điểm học sinh.</div>
              </div>
            ) : (
              <>
                <div className="p-3 bg-surface-neutral rounded border border-hairline flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-text-primary">{selectedStudentForGrade.name}</div>
                    <div className="text-text-secondary">{selectedStudentForGrade.code} • Lớp 10A1</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-text-secondary">Điểm GPA hiện tại:</span>
                    <div className="text-base font-bold text-primary">{selectedStudentForGrade.gpa}</div>
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-text-primary mb-1">Môn học</label>
                  <input
                    type="text"
                    value={gradeInput.subject}
                    onChange={(e) => setGradeInput({ ...gradeInput, subject: e.target.value })}
                    className="w-full h-10 px-3 bg-white border border-hairline rounded text-xs text-text-primary outline-none focus:border-ocean"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium text-text-primary mb-1">Đầu điểm kiểm tra</label>
                  <input
                    type="text"
                    value={gradeInput.testName}
                    onChange={(e) => setGradeInput({ ...gradeInput, testName: e.target.value })}
                    className="w-full h-10 px-3 bg-white border border-hairline rounded text-xs text-text-primary outline-none focus:border-ocean"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium text-text-primary mb-1">Điểm số (Thang điểm 10)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={gradeInput.score}
                    onChange={(e) => setGradeInput({ ...gradeInput, score: e.target.value })}
                    className="w-full h-10 px-3 bg-white border border-hairline rounded text-xs text-text-primary font-mono font-bold outline-none focus:border-ocean"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium text-text-primary mb-1">Lời phê / Nhận xét sư phạm</label>
                  <textarea
                    rows={3}
                    value={gradeInput.comment}
                    onChange={(e) => setGradeInput({ ...gradeInput, comment: e.target.value })}
                    className="w-full p-3 bg-white border border-hairline rounded text-xs text-text-primary outline-none focus:border-ocean"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    variant="secondary"
                    size="md"
                    type="button"
                    onClick={() => setSelectedStudentForGrade(null)}
                  >
                    Hủy bỏ
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    type="submit"
                    disabled={isSubmittingGrade}
                  >
                    {isSubmittingGrade ? 'Đang cập nhật...' : 'Lưu điểm số'}
                  </Button>
                </div>
              </>
            )}
          </form>
        )}
      </Modal>
    </div>
  );
}

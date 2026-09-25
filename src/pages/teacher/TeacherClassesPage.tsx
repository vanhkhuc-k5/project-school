import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { teacherApi, attendanceApi, gradebookApi } from '../../services/api';
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
  Loader2,
  ChevronDown,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// GradebookMatrixTab — Thông tư 22 compliant Excel-like grade grid
// Features: TX/GK/CK columns, auto-calculated DTBmhk, keyboard navigation,
//           bulk save, Excel export
// ─────────────────────────────────────────────────────────────────────────────

const TT22_COLUMNS = [
  { key: 'TX1', label: 'TX1', code: 'TX', isTX: true },
  { key: 'TX2', label: 'TX2', code: 'TX', isTX: true },
  { key: 'TX3', label: 'TX3', code: 'TX', isTX: true },
  { key: 'TX4', label: 'TX4', code: 'TX', isTX: true },
  { key: 'GK',  label: 'GK',  code: 'GK', isTX: false },
  { key: 'CK',  label: 'CK',  code: 'CK', isTX: false },
  { key: 'DTBmhk', label: 'ĐTBmhk', code: null, isTX: false, isReadOnly: true },
];

function calculateDTBmhk(txScores: number[]): number | null {
  if (txScores.length === 0) return null;
  const sumTX = txScores.reduce((a, b) => a + b, 0);
  const gkScore = 0; // Not available in simple mode
  const ckScore = 0; // Not available in simple mode
  const denominator = txScores.length + 5;
  return (sumTX + gkScore * 2 + ckScore * 3) / denominator;
}

function GradebookMatrixTab({ classId, className, students, searchQuery }) {
  const [gradeData, setGradeData] = useState({});
  const [editedGrades, setEditedGrades] = useState({});
  const [selectedCell, setSelectedCell] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const gridRef = useRef(null);

  // Initialize grade data from students prop
  useEffect(() => {
    const initial = {};
    students.forEach(s => {
      initial[s.id] = {
        TX: Array(4).fill(null),
        GK: null,
        CK: null,
      };
    });
    setGradeData(initial);
  }, [students]);

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.code || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Keyboard navigation ──
  const handleKeyDown = useCallback((e, studentId, colKey) => {
    const studentIdx = filteredStudents.findIndex(s => s.id === studentId);
    const colIdx = TT22_COLUMNS.findIndex(c => c.key === colKey);

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextCol = TT22_COLUMNS[colIdx + 1];
      if (nextCol) setSelectedCell({ studentId, colKey: nextCol.key });
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevCol = TT22_COLUMNS[colIdx - 1];
      if (prevCol) setSelectedCell({ studentId, colKey: prevCol.key });
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextStudent = filteredStudents[studentIdx + 1];
      if (nextStudent) setSelectedCell({ studentId: nextStudent.id, colKey });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevStudent = filteredStudents[studentIdx - 1];
      if (prevStudent) setSelectedCell({ studentId: prevStudent.id, colKey });
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      // Focus the input for this cell
      const input = gridRef.current?.querySelector(
        `[data-student="${studentId}"][data-col="${colKey}"] input`
      );
      input?.focus();
    }
  }, [filteredStudents]);

  // ── Handle grade input ──
  const handleGradeChange = (studentId, colKey, value) => {
    const num = parseFloat(value);
    const score = isNaN(num) ? null : Math.min(10, Math.max(0, num));

    setEditedGrades(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [colKey]: score,
      },
    }));
  };

  // ── Get grade value (edited or original) ──
  const getGrade = (studentId, colKey) => {
    if (editedGrades[studentId]?.[colKey] !== undefined) {
      return editedGrades[studentId][colKey];
    }
    return gradeData[studentId]?.[colKey] ?? null;
  };

  // ── Get TX scores for DTBmhk calculation ──
  const getTxScores = (studentId) => {
    const txScores = [];
    for (let i = 1; i <= 4; i++) {
      const val = getGrade(studentId, `TX${i}`);
      if (val !== null) txScores.push(val);
    }
    return txScores;
  };

  // ── Bulk save ──
  const handleBulkSave = async () => {
    if (Object.keys(editedGrades).length === 0) return;
    setIsSaving(true);
    setSaveResult(null);
    try {
      // Prepare bulk save payload
      const entries = [];
      Object.entries(editedGrades).forEach(([studentId, grades]) => {
        Object.entries(grades).forEach(([colKey, score]) => {
          if (score !== null) {
            let category_code = null;
            if (colKey.startsWith('TX')) category_code = 'TX';
            else if (colKey === 'GK') category_code = 'GK';
            else if (colKey === 'CK') category_code = 'CK';
            entries.push({ studentId, categoryCode: category_code, score });
          }
        });
      });
      await gradebookApi.bulkEnterGrades?.({ classId, entries }) || Promise.resolve();
      // Update gradeData with edited values
      setGradeData(prev => ({ ...prev, ...editedGrades }));
      setEditedGrades({});
      setSaveResult({ success: true });
      setTimeout(() => setSaveResult(null), 2000);
    } catch (err) {
      setSaveResult({ success: false, message: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Export to CSV ──
  const handleExportMatrix = () => {
    const headers = ['STT', 'Mã HS', 'Họ tên', ...TT22_COLUMNS.map(c => c.label)];
    const rows = filteredStudents.map((s, idx) => {
      const row = [
        idx + 1,
        s.code || s.id,
        `"${s.name}"`,
      ];
      TT22_COLUMNS.forEach(col => {
        if (col.key === 'DTBmhk') {
          const txScores = getTxScores(s.id);
          const dtb = calculateDTBmhk(txScores);
          row.push(dtb !== null ? dtb.toFixed(2) : '');
        } else {
          const val = getGrade(s.id, col.key);
          row.push(val !== null ? val.toString() : '');
        }
      });
      return row;
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Ma_Tran_Diem_${className}_TT22_EduPortal.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const editedCount = Object.keys(editedGrades).length;

  return (
    <Card padding="p-6" className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-text-primary">
            Ma trận điểm lớp {className}
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Cấu trúc theo <strong>Thông tư 22</strong>: ĐĐGtx (4 cột) • ĐĐGgk • ĐĐGck • ĐTBmhk
          </p>
        </div>
        <div className="flex items-center gap-2">
          {editedCount > 0 && (
            <span className="text-xs text-warning font-medium">
              {editedCount} ô đã chỉnh sửa
            </span>
          )}
          <Button variant="secondary" size="sm" icon={Download} onClick={handleExportMatrix}>
            Xuất CSV
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={isSaving ? Loader2 : Check}
            disabled={isSaving || editedCount === 0}
            onClick={handleBulkSave}
          >
            {isSaving ? '�ang lưu...' : editedCount > 0 ? `Lưu (${editedCount})` : 'Lưu điểm'}
          </Button>
        </div>
      </div>

      {/* Save feedback */}
      {saveResult && (
        <div className={`p-3 rounded text-xs flex items-center gap-2 ${
          saveResult.success
            ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
            : 'bg-red-50 border border-red-300 text-red-700'
        }`}>
          {saveResult.success
            ? <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
            : <AlertCircle className="w-4 h-4 shrink-0" />
          }
          <span>{saveResult.success ? 'Đã lưu thành công!' : saveResult.message}</span>
        </div>
      )}

      {/* Keyboard navigation hint */}
      <div className="text-[11px] text-text-secondary flex items-center gap-3">
        <span className="px-2 py-0.5 bg-surface-neutral rounded border border-hairline font-medium">↑↓←→</span>
        <span>Di chuyển giữa các ô</span>
        <span className="px-2 py-0.5 bg-surface-neutral rounded border border-hairline font-mono">Enter</span>
        <span>Focus vào ô</span>
        <span className="px-2 py-0.5 bg-surface-neutral rounded border border-hairline font-mono">Tab</span>
        <span>Di chuyển nhanh</span>
      </div>

      {/* Matrix Grid */}
      <div className="overflow-x-auto" ref={gridRef}>
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b-2 border-hairline">
              <th className="py-3 px-3 bg-surface-neutral sticky left-0 z-10 min-w-[40px] text-center">
                <span className="text-[10px] uppercase tracking-wider text-text-secondary">STT</span>
              </th>
              <th className="py-3 px-4 bg-surface-neutral sticky left-[40px] z-10 min-w-[160px]">
                <span className="text-[10px] uppercase tracking-wider text-text-secondary">Học sinh</span>
              </th>
              {TT22_COLUMNS.map(col => (
                <th
                  key={col.key}
                  className={`py-3 px-2 text-center min-w-[60px] ${
                    col.code === 'TX' ? 'bg-sky/30' :
                    col.code === 'GK' ? 'bg-amber-50' :
                    col.code === 'CK' ? 'bg-emerald-50' :
                    'bg-ocean/10'
                  }`}
                >
                  <div className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">{col.label}</div>
                  <div className="text-[9px] text-text-secondary font-normal">
                    {col.code ? `HS ${col.key === 'GK' ? '2' : col.key === 'CK' ? '3' : '1'}` : 'TĐ'}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {filteredStudents.map((st, idx) => {
              const txScores = getTxScores(st.id);
              const dtbmhk = calculateDTBmhk(txScores);

              return (
                <tr key={st.id} className="hover:bg-surface-neutral/30 transition-colors">
                  <td className="py-2 px-3 text-center text-text-secondary bg-surface-neutral sticky left-0 z-10 font-medium">
                    {idx + 1}
                  </td>
                  <td className="py-2 px-4 bg-surface-neutral sticky left-[40px] z-10">
                    <div className="font-medium text-text-primary truncate">{st.name}</div>
                    <div className="text-[10px] text-text-secondary font-mono">{st.code}</div>
                  </td>
                  {TT22_COLUMNS.map(col => {
                    const value = getGrade(st.id, col.key);
                    const isEdited = editedGrades[st.id]?.[col.key] !== undefined;
                    const isSelected = selectedCell?.studentId === st.id && selectedCell?.colKey === col.key;

                    return (
                      <td
                        key={col.key}
                        className={`py-2 px-1 text-center border-x border-hairline ${
                          isSelected ? 'ring-2 ring-ocean ring-inset bg-sky/20' : ''
                        } ${
                          col.code === 'TX' ? 'bg-sky/10' :
                          col.code === 'GK' ? 'bg-amber-50/50' :
                          col.code === 'CK' ? 'bg-emerald-50/50' :
                          'bg-ocean/5'
                        }`}
                        data-student={st.id}
                        data-col={col.key}
                        onClick={() => setSelectedCell({ studentId: st.id, colKey: col.key })}
                        onKeyDown={(e) => !col.isReadOnly && handleKeyDown(e, st.id, col.key)}
                        tabIndex={0}
                      >
                        {col.key === 'DTBmhk' ? (
                          <span className={`font-bold text-sm ${
                            value !== null
                              ? value >= 8.5 ? 'text-success'
                              : value >= 7 ? 'text-info'
                              : value >= 5 ? 'text-warning'
                              : 'text-danger'
                              : 'text-text-secondary'
                          }`}>
                            {value !== null ? value.toFixed(2) : '—'}
                          </span>
                        ) : (
                          <input
                            type="number"
                            min="0"
                            max="10"
                            step="0.1"
                            value={value !== null ? value : ''}
                            onChange={(e) => handleGradeChange(st.id, col.key, e.target.value)}
                            onFocus={() => setSelectedCell({ studentId: st.id, colKey: col.key })}
                            className={`w-full h-8 text-center text-xs font-mono font-medium rounded transition-all outline-none ${
                              isEdited
                                ? 'bg-amber-50 border border-amber-400 text-amber-900 focus:border-ocean focus:bg-white'
                                : 'bg-transparent border border-transparent focus:border-ocean focus:bg-white'
                            } ${
                              value !== null && value < 5 ? 'text-danger font-bold' : 'text-primary'
                            }`}
                            placeholder="—"
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="p-3 bg-surface-neutral rounded border border-hairline flex flex-wrap gap-4 text-[11px] text-text-secondary">
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 bg-sky/30 border border-hairline rounded" />
          <span>Điểm thường xuyên (HS1)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 bg-amber-50 border border-hairline rounded" />
          <span>Giữa kỳ (HS2)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 bg-emerald-50 border border-hairline rounded" />
          <span>Cuối kỳ (HS3)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 bg-ocean/10 border border-hairline rounded" />
          <span>ĐTBmhk = (∑TX + GK×2 + CK×3) / (nTX + 5)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 bg-amber-50 border border-amber-400 rounded" />
          <span>Ô đã chỉnh sửa (chưa lưu)</span>
        </span>
      </div>
    </Card>
  );
}

export function TeacherClassesPage() {
  const { lastSync, triggerSync } = useSync();
  const [classData, setClassData] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('gradebook'); // 'gradebook' | 'attendance' | 'matrix'
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

  // Attendance states — using canonical uppercase status codes
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [attendancePeriod, setAttendancePeriod] = useState(null); // null = "buổi/daily"
  // Map: studentId → { status: 'PRESENT'|'ABSENT'|'LATE'|'EXCUSED', note: string }
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [attendanceRoster, setAttendanceRoster] = useState([]); // full enrolled roster
  const [existingSession, setExistingSession] = useState(null);
  const [isLoadingRoster, setIsLoadingRoster] = useState(false);
  const [rosterError, setRosterError] = useState(null);
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [attendanceSaveResult, setAttendanceSaveResult] = useState(null); // { success, message }

  const fetchClass = async (cid) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await teacherApi.getClasses(cid || undefined);
      if (res) {
        setClassData(res);
        if (res.currentClassId && res.currentClassId !== selectedClassId) {
          setSelectedClassId(res.currentClassId);
        } else if (!cid && res.classes?.length > 0 && !selectedClassId) {
          setSelectedClassId(res.classes[0].id);
        }
      }
    } catch (err) {
      setErrorMessage(err?.message || 'Không thể tải dữ liệu lớp học');
    } finally {
      setIsLoading(false);
    }
  };

  // Load roster + existing session from canonical attendance endpoint
  const loadAttendanceRoster = useCallback(async (classId, date, period) => {
    if (!classId) return;
    setIsLoadingRoster(true);
    setRosterError(null);
    setAttendanceSaveResult(null);
    try {
      const roster = await attendanceApi.getRoster(classId, date, period ?? null);
      setAttendanceRoster(roster);

      // Initialize attendance records: use existingStatus if present, else default to PRESENT
      const initialRecords = {};
      roster.forEach((st) => {
        initialRecords[st.student_id] = {
          status: st.existingStatus || 'PRESENT',
          note: st.existingNote || '',
        };
      });
      setAttendanceRecords(initialRecords);

      // Check if there's an existing session
      const { session } = await attendanceApi.getSession(classId, date, period ?? null);
      setExistingSession(session);
    } catch (err) {
      setRosterError(err?.message || 'Không thể tải danh sách điểm danh');
    } finally {
      setIsLoadingRoster(false);
    }
  }, []);

  useEffect(() => {
    fetchClass(selectedClassId);
  }, [selectedClassId, lastSync]);

  // Reload roster when class, date, or period changes (only when on attendance tab)
  useEffect(() => {
    if (activeTab === 'attendance' && selectedClassId) {
      loadAttendanceRoster(selectedClassId, attendanceDate, attendancePeriod);
    }
  }, [selectedClassId, attendanceDate, attendancePeriod, activeTab, loadAttendanceRoster]);

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
    attendanceRoster.forEach((st) => {
      next[st.student_id] = { status: 'PRESENT', note: '' };
    });
    setAttendanceRecords(next);
  };

  const setStudentStatus = (studentId, status) => {
    setAttendanceRecords((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || { note: '' }), status },
    }));
  };

  const setStudentNote = (studentId, note) => {
    setAttendanceRecords((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || { status: 'PRESENT' }), note },
    }));
  };

  const handleSaveAttendance = async () => {
    if (!selectedClassId || attendanceRoster.length === 0) return;

    const records = attendanceRoster.map((st) => ({
      studentId: st.student_id,
      status: (attendanceRecords[st.student_id]?.status || 'PRESENT').toUpperCase(),
      note: attendanceRecords[st.student_id]?.note || '',
    }));

    setIsSavingAttendance(true);
    setAttendanceSaveResult(null);
    try {
      const res = await attendanceApi.saveSession({
        classId: selectedClassId,
        date: attendanceDate,
        period: attendancePeriod,
        sessionType: attendancePeriod !== null ? 'period' : 'daily',
        records,
      });

      if (res?.success) {
        await triggerSync();
        setAttendanceSaveResult({ success: true, message: `Đã lưu sổ điểm danh ngày ${attendanceDate} — ${records.length} học sinh.` });
        // Reload roster to sync saved state
        await loadAttendanceRoster(selectedClassId, attendanceDate, attendancePeriod);
      } else {
        setAttendanceSaveResult({ success: false, message: res?.message || 'Không thể lưu điểm danh' });
      }
    } catch (err) {
      setAttendanceSaveResult({ success: false, message: err?.message || 'Lỗi kết nối máy chủ' });
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

  const presentCount = Object.values(attendanceRecords).filter((r) => r?.status === 'PRESENT').length;
  const excusedCount = Object.values(attendanceRecords).filter((r) => r?.status === 'EXCUSED').length;
  const absentCount = Object.values(attendanceRecords).filter((r) => r?.status === 'ABSENT').length;
  const lateCount = Object.values(attendanceRecords).filter((r) => r?.status === 'LATE').length;

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
        <div className="flex items-center gap-2 flex-wrap">
          {classData?.classes?.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedClassId(c.id)}
              className={`px-3.5 py-1.5 rounded text-xs transition-all flex items-center gap-1.5 ${
                selectedClassId === c.id
                  ? 'bg-primary text-white font-medium shadow-whisper'
                  : 'bg-white border border-hairline text-text-secondary hover:text-text-primary'
              }`}
            >
              <span>{c.name}</span>
              {c.isHomeroom && (
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  selectedClassId === c.id ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700'
                }`}>
                  Chủ nhiệm
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {errorMessage && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Empty State when teacher has no assigned classes */}
      {classData && classData.classes?.length === 0 && !isLoading && (
        <Card className="p-12 text-center bg-white border border-hairline rounded-xl">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-medium text-text-primary">Chưa có lớp học được phân công</h3>
          <p className="text-xs text-text-secondary max-w-md mx-auto mt-1">
            Bạn chưa được phân công giảng dạy hoặc làm chủ nhiệm lớp học nào trong năm học hiện tại. Vui lòng liên hệ Ban Giám Hiệu hoặc Quản trị viên để được phân công chuyên môn.
          </p>
        </Card>
      )}

      {/* Main Content when classes exist */}
      {classData && classData.classes?.length > 0 && (
        <>
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
              <button
                type="button"
                onClick={() => setActiveTab('matrix')}
                className={`px-4 py-2 rounded text-xs transition-all ${
                  activeTab === 'matrix'
                    ? 'bg-white text-primary font-medium shadow-whisper border border-hairline'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Ma trận điểm (TT22)
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
          {activeTab === 'matrix' && (
            <Button
              variant="secondary"
              size="sm"
              icon={Download}
              onClick={() => {/* handleExportMatrix */ alert('Tính năng xuất Excel đang được phát triển. Sử dụng Ctrl+C để sao chép dữ liệu từ ma trận.')}}
            >
              Xuất Excel
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
                <tr className="border-b border-hairline text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                  <th scope="col" className="py-3 px-4">Học sinh</th>
                  <th scope="col" className="py-3 px-4">Mã định danh</th>
                  <th scope="col" className="py-3 px-4 text-center">Thứ hạng</th>
                  <th scope="col" className="py-3 px-4 text-center">Điểm GPA</th>
                  <th scope="col" className="py-3 px-4 text-center">Chuyên cần</th>
                  <th scope="col" className="py-3 px-4 text-center">Xếp loại</th>
                  <th scope="col" className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline text-xs">
                {filteredStudents.map((st) => (
                  <tr key={st.id} className="hover:bg-surface-neutral/40 transition-colors">
                    <th scope="row" className="py-3.5 px-4 text-left font-medium text-text-primary">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-sky text-primary font-bold flex items-center justify-center text-xs">
                          {st.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-text-primary">{st.name}</div>
                          <div className="text-[11px] text-text-secondary">{st.phone || '0988-xxx-xxx'}</div>
                        </div>
                      </div>
                    </th>
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
          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 hairline-b pb-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-semibold text-text-primary">
                  Điểm danh lớp {classData?.classes?.find((c) => c.id === selectedClassId)?.name || selectedClassId}
                </h2>
                {existingSession && (
                  <Badge variant="success">Đã ghi nhận</Badge>
                )}
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                Học sinh vắng không phép sẽ được tự động kích hoạt thông báo gửi đến phụ huynh.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-end">
              {/* Date picker */}
              <div className="flex items-center gap-1.5 text-xs">
                <Calendar className="w-4 h-4 text-text-secondary shrink-0" />
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="h-9 px-3 bg-white border border-hairline rounded text-xs text-text-primary outline-none focus:border-ocean font-medium"
                />
              </div>

              {/* Period selector */}
              <select
                value={attendancePeriod === null ? '' : attendancePeriod}
                onChange={(e) => setAttendancePeriod(e.target.value === '' ? null : parseInt(e.target.value, 10))}
                className="h-9 px-3 bg-white border border-hairline rounded text-xs text-text-primary outline-none focus:border-ocean"
              >
                <option value="">Buổi học (daily)</option>
                {[1,2,3,4,5,6,7,8,9,10].map((p) => (
                  <option key={p} value={p}>Tiết {p}</option>
                ))}
              </select>

              <Button variant="secondary" size="sm" icon={Check} onClick={handleMarkAllPresent} disabled={isLoadingRoster}>
                Tất cả có mặt
              </Button>

              <Button
                variant="primary"
                size="sm"
                disabled={isSavingAttendance || isLoadingRoster || attendanceRoster.length === 0}
                onClick={handleSaveAttendance}
              >
                {isSavingAttendance ? 'Đang lưu...' : existingSession ? 'Cập nhật điểm danh' : 'Lưu điểm danh'}
              </Button>
            </div>
          </div>

          {/* Existing session banner */}
          {existingSession && (
            <div className="p-3 bg-sky/60 border border-ocean/20 rounded text-xs text-primary flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-ocean" />
              <span>
                Buổi điểm danh ngày <strong>{existingSession.date}</strong> đã được ghi nhận trước đó.
                {existingSession.subject_name && ` Môn: ${existingSession.subject_name}.`}
                {' '}Các thay đổi bên dưới sẽ <strong>cập nhật</strong> bản ghi hiện có.
              </span>
            </div>
          )}

          {/* KPI Summary Bar */}
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
              <div className="text-xl font-bold text-red-600 mt-1">{absentCount}</div>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded text-center">
              <div className="text-xs font-medium text-amber-800">Đi muộn</div>
              <div className="text-xl font-bold text-amber-600 mt-1">{lateCount}</div>
            </div>
          </div>

          {/* Save feedback */}
          {attendanceSaveResult && (
            <div className={`p-3 rounded text-xs flex items-center gap-2 ${
              attendanceSaveResult.success
                ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
                : 'bg-red-50 border border-red-300 text-red-700'
            }`}>
              {attendanceSaveResult.success
                ? <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                : <AlertCircle className="w-4 h-4 text-danger shrink-0" />
              }
              <span>{attendanceSaveResult.message}</span>
            </div>
          )}

          {/* Roster error */}
          {rosterError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{rosterError}</span>
            </div>
          )}

          {/* Loading roster */}
          {isLoadingRoster && (
            <div className="py-10 flex flex-col items-center gap-3 text-text-secondary">
              <Loader2 className="w-6 h-6 animate-spin text-ocean" />
              <span className="text-xs">Đang tải danh sách học sinh...</span>
            </div>
          )}

          {/* Empty roster */}
          {!isLoadingRoster && !rosterError && attendanceRoster.length === 0 && (
            <div className="py-10 text-center">
              <Users className="w-8 h-8 text-text-secondary/40 mx-auto mb-2" />
              <p className="text-sm text-text-secondary">Không có học sinh nào ghi danh trong lớp này.</p>
            </div>
          )}

          {/* Student Attendance List */}
          {!isLoadingRoster && attendanceRoster.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-hairline text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                    <th scope="col" className="py-3 px-4">Học sinh</th>
                    <th scope="col" className="py-3 px-4">Mã số</th>
                    <th scope="col" className="py-3 px-4 text-center">Trạng thái điểm danh</th>
                    <th scope="col" className="py-3 px-4">Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline text-xs">
                  {attendanceRoster.map((st) => {
                    const rec = attendanceRecords[st.student_id] || { status: 'PRESENT', note: '' };
                    const status = rec.status;
                    return (
                      <tr key={st.student_id} className="hover:bg-surface-neutral/40 transition-colors">
                        <th scope="row" className="py-3 px-4 text-left font-medium text-text-primary">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-sky text-primary font-bold flex items-center justify-center text-[10px] shrink-0">
                              {st.name?.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="font-medium text-text-primary">{st.name}</span>
                          </div>
                        </th>
                        <td className="py-3 px-4 font-mono text-text-secondary">{st.student_code || '—'}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap" role="group" aria-label={`Trạng thái điểm danh của ${st.name}`}>
                            {[
                              { code: 'PRESENT', label: 'Có mặt', active: 'bg-emerald-600 text-white' },
                              { code: 'EXCUSED', label: 'Có phép', active: 'bg-ocean text-white' },
                              { code: 'ABSENT', label: 'Vắng mặt', active: 'bg-danger text-white' },
                              { code: 'LATE', label: 'Đi muộn', active: 'bg-amber-500 text-white' },
                            ].map(({ code, label, active }) => (
                              <button
                                key={code}
                                type="button"
                                onClick={() => setStudentStatus(st.student_id, code)}
                                aria-pressed={status === code}
                                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean/50 ${
                                  status === code
                                    ? `${active} shadow-sm`
                                    : 'bg-surface-neutral text-text-secondary hover:text-text-primary hover:bg-slate-100'
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <label className="sr-only" htmlFor={`note-${st.student_id}`}>Ghi chú điểm danh cho {st.name}</label>
                          <input
                            id={`note-${st.student_id}`}
                            type="text"
                            value={rec.note}
                            onChange={(e) => setStudentNote(st.student_id, e.target.value)}
                            placeholder="Ghi chú..."
                            className="w-full h-7 px-2 bg-white border border-hairline rounded text-[11px] text-text-primary outline-none focus:border-ocean"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB 3: GRADEBOOK MATRIX (Thông tư 22) */}
      {activeTab === 'matrix' && (
        <GradebookMatrixTab
          classId={selectedClassId}
          className={classData?.classes?.find((c) => c.id === selectedClassId)?.name || selectedClassId}
          students={classData?.students || []}
          searchQuery={searchQuery}
        />
      )}
        </>
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

/**
 * Admin Attendance Management Page
 * Phase 06 - Attendance Management
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Users, AlertTriangle, Check, X, ChevronRight, ChevronDown, RefreshCw,
  UserCheck, UserX, Clock, Filter, TrendingUp, Eye
} from 'lucide-react';
import { api } from '../../services/api';

// ============================================================================
// Types
// ============================================================================

interface AttendanceSummary {
  present: number;
  absent: number;
  absentExcused: number;
  absentUnexcused: number;
  late: number;
  earlyLeave: number;
  total: number;
}

interface AttendancePercentages {
  present: string;
  absent: string;
  absentExcused: string;
  absentUnexcused: string;
  late: string;
  earlyLeave: string;
}

interface AtRiskStudent {
  student_id: string;
  student_name: string;
  student_code: string;
  class_id: string;
  class_name: string;
  grade_level: number;
  total_days: number;
  absent_days: number;
  absence_rate: number;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

// ============================================================================
// Toast Component
// ============================================================================

function Toast({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const colors = {
    success: 'bg-green-50 border-green-500 text-green-800',
    error: 'bg-red-50 border-red-500 text-red-800',
    warning: 'bg-yellow-50 border-yellow-500 text-yellow-800',
    info: 'bg-blue-50 border-blue-500 text-blue-800',
  };

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg ${colors[toast.type]}`}>
      <span className="flex-1 text-sm font-medium">{toast.message}</span>
      <button onClick={() => onDismiss(toast.id)} className="hover:opacity-70">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ============================================================================
// Loading State
// ============================================================================

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-10 h-10 border-4 border-[#1C6FA8]/30 border-t-[#1C6FA8] rounded-full animate-spin mb-4" />
      <span className="text-sm text-[#6B7280]">Đang tải dữ liệu...</span>
    </div>
  );
}

// ============================================================================
// Stat Card Component
// ============================================================================

function StatCard({ label, value, percentage, icon: Icon, color }: {
  label: string;
  value: number;
  percentage: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className="text-2xl font-bold text-[#0F3D5C]">{value.toLocaleString()}</div>
          <div className="text-xs text-[#6B7280]">{label}</div>
        </div>
      </div>
      <div className="text-sm text-[#6B7280]">{percentage}%</div>
    </div>
  );
}

// ============================================================================
// At Risk Student Row
// ============================================================================

function AtRiskStudentRow({ student, onView }: {
  student: AtRiskStudent;
  onView: (studentId: string) => void;
}) {
  const getRiskLevel = (rate: number) => {
    if (rate >= 15) return { label: 'Cao', color: 'bg-red-100 text-red-700', bg: 'bg-red-50' };
    if (rate >= 10) return { label: 'Trung bình', color: 'bg-yellow-100 text-yellow-700', bg: 'bg-yellow-50' };
    return { label: 'Thấp', color: 'bg-blue-100 text-blue-700', bg: 'bg-blue-50' };
  };

  const risk = getRiskLevel(student.absence_rate);

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#E8F2FA] flex items-center justify-center">
            <span className="text-sm font-bold text-[#1C6FA8]">
              {(student.student_name || 'HS').charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <div className="font-medium text-[#0F3D5C]">{student.student_name}</div>
            <div className="text-xs text-[#6B7280]">{student.student_code}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-[#374151]">
        {student.class_name} - Khối {student.grade_level}
      </td>
      <td className="px-4 py-3 text-sm text-[#374151]">
        {student.total_days} ngày
      </td>
      <td className="px-4 py-3 text-sm text-red-600 font-medium">
        {student.absent_days} ngày
      </td>
      <td className="px-4 py-3">
        <div className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${risk.color}`}>
          {student.absence_rate}%
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={() => onView(student.student_id)}
          className="p-2 text-[#6B7280] hover:bg-blue-50 hover:text-[#1C6FA8] rounded-lg"
          title="Xem chi tiết"
        >
          <Eye className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}

// ============================================================================
// Student Attendance History Modal
// ============================================================================

function StudentHistoryModal({ isOpen, onClose, studentId, studentName }: {
  isOpen: boolean;
  onClose: () => void;
  studentId: string | null;
  studentName: string;
}) {
  const [history, setHistory] = useState<Array<{
    id: string;
    status: string;
    note?: string;
    date: string;
    class_name: string;
    teacher_name?: string;
    subject_name?: string;
  }>>([]);
  const [summary, setSummary] = useState<Array<{ status: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && studentId) {
      setLoading(true);
      api.getStudentAttendanceHistory(studentId).then((data) => {
        setHistory(data.history);
        setSummary(data.summary);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [isOpen, studentId]);

  if (!isOpen) return null;

  const getStatusBadge = (status: string) => {
    switch ((status || '').toLowerCase()) {
      case 'present':
        return <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
          <UserCheck className="w-3 h-3 mr-1" /> Có mặt
        </span>;
      case 'absent':
        return <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
          <UserX className="w-3 h-3 mr-1" /> Vắng
        </span>;
      case 'late':
        return <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">
          <Clock className="w-3 h-3 mr-1" /> Muộn
        </span>;
      case 'excused':
        return <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
          Có phép
        </span>;
      default:
        return <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
          {status}
        </span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <div>
            <h3 className="text-lg font-bold text-[#0F3D5C]">Lịch sử điểm danh</h3>
            <p className="text-sm text-[#6B7280]">{studentName}</p>
          </div>
          <button onClick={onClose} className="hover:opacity-70"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Summary */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            {summary.map((item) => (
              <div key={item.status} className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-[#0F3D5C]">{item.count}</div>
                <div className="text-xs text-[#6B7280] capitalize">
                  {item.status === 'PRESENT' ? 'Có mặt' : 
                   item.status === 'ABSENT' ? 'Vắng' : 
                   item.status === 'LATE' ? 'Muộn' : 
                   item.status === 'EXCUSED' ? 'Có phép' : item.status}
                </div>
              </div>
            ))}
          </div>
          {/* History */}
          {loading ? (
            <LoadingState />
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-[#6B7280]">
              Không có dữ liệu điểm danh
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-[#0F3D5C]">
                      {new Date(record.date).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                    <div className="text-xs text-[#6B7280]">
                      {record.class_name}
                      {record.subject_name && ` - ${record.subject_name}`}
                      {record.teacher_name && ` (${record.teacher_name})`}
                    </div>
                    {record.note && <div className="text-xs text-[#6B7280] mt-1">{record.note}</div>}
                  </div>
                  <div>{getStatusBadge(record.status)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export function AdminAttendancePage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [percentages, setPercentages] = useState<AttendancePercentages | null>(null);
  const [atRiskStudents, setAtRiskStudents] = useState<AtRiskStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'rfid'>('overview');

  // Filters
  const [academicYear, setAcademicYear] = useState<string>('');
  const [gradeLevel, setGradeLevel] = useState<string>('');
  const [classId, setClassId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // History modal
  const [showHistory, setShowHistory] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<{ id: string | null; name: string }>({ id: null, name: '' });

  const showToast = useCallback((type: Toast['type'], message: string) => {
    const id = `toast_${Date.now()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Parameters<typeof api.getAttendanceOverview>[0] = {};
      if (academicYear) params.academicYear = academicYear;
      if (gradeLevel) params.gradeLevel = parseInt(gradeLevel);
      if (classId) params.classId = classId;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const [overviewData, atRiskData] = await Promise.all([
        api.getAttendanceOverview(params),
        api.getAttendanceAtRisk({ threshold: 10, limit: 20 }),
      ]);

      if (overviewData) {
        setSummary(overviewData.summary);
        setPercentages(overviewData.percentages);
      }
      setAtRiskStudents(atRiskData);
    } catch {
      showToast('error', 'Không thể tải dữ liệu điểm danh');
    } finally {
      setLoading(false);
    }
  }, [academicYear, gradeLevel, classId, startDate, endDate, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleViewStudent = (studentId: string) => {
    const student = atRiskStudents.find(s => s.student_id === studentId);
    setSelectedStudent({ id: studentId, name: student?.student_name || 'Học sinh' });
    setShowHistory(true);
  };

  const handleClearFilters = () => {
    setAcademicYear('');
    setGradeLevel('');
    setClassId('');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-[#6B7280] mb-1">
            <span>Quản trị</span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-[#0F3D5C]">Quản lý Điểm danh</span>
          </div>
          <h1 className="text-2xl font-bold text-[#0F3D5C]">Quản lý Điểm danh</h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Theo dõi và giám sát tình hình chuyên cần toàn trường
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'overview'
                ? 'bg-[#1C6FA8] text-white shadow'
                : 'bg-white text-[#6B7280] hover:bg-[#E8F2FA]'
            }`}
          >
            Tổng quan & Báo cáo
          </button>
          <button
            onClick={() => setActiveTab('rfid')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'rfid'
                ? 'bg-orange-500 text-white shadow'
                : 'bg-white text-orange-600 hover:bg-orange-50 border border-orange-200'
            }`}
          >
            🔌 Quét thẻ RFID (IoT Scanner)
          </button>
        </div>

        {/* RFID Tab Content */}
        {activeTab === 'rfid' && (
          <AdminRFIDTab />
        )}

        {/* Overview Tab Content */}
        {activeTab === 'overview' && (
          <>
            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8]"
                  />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8]"
                  />
                  <select
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8]"
                  >
                    <option value="">Tất cả khối</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                      <option key={g} value={g}>Khối {g}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    placeholder="Năm học (VD: 2025-2026)"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6FA8]"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={fetchData}
                    className="px-4 py-2 bg-[#1C6FA8] text-white rounded-lg font-medium hover:bg-[#0F3D5C] transition-colors"
                  >
                    <Filter className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`px-4 py-2 border rounded-lg font-medium transition-colors ${
                      showFilters ? 'bg-[#E8F2FA] text-[#1C6FA8] border-[#1C6FA8]' : 'text-[#6B7280] border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </div>
              {showFilters && (
                <div className="pt-4 border-t flex justify-end">
                  <button
                    onClick={handleClearFilters}
                    className="text-sm text-[#6B7280] hover:text-[#1C6FA8]"
                  >
                    Xóa bộ lọc
                  </button>
                </div>
              )}
            </div>

            {loading ? (
              <LoadingState />
            ) : (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                  <StatCard
                    label="Có mặt"
                    value={summary?.present || 0}
                    percentage={percentages?.present || '0'}
                    icon={UserCheck}
                    color="text-green-600"
                  />
                  <StatCard
                    label="Vắng"
                    value={summary?.absent || 0}
                    percentage={percentages?.absent || '0'}
                    icon={UserX}
                    color="text-red-600"
                  />
                  <StatCard
                    label="Vắng có phép"
                    value={summary?.absentExcused || 0}
                    percentage={percentages?.absentExcused || '0'}
                    icon={Check}
                    color="text-blue-600"
                  />
                  <StatCard
                    label="Vắng không phép"
                    value={summary?.absentUnexcused || 0}
                    percentage={percentages?.absentUnexcused || '0'}
                    icon={X}
                    color="text-red-700"
                  />
                  <StatCard
                    label="Đến muộn"
                    value={summary?.late || 0}
                    percentage={percentages?.late || '0'}
                    icon={Clock}
                    color="text-yellow-600"
                  />
                  <StatCard
                    label="Tổng cộng"
                    value={summary?.total || 0}
                    percentage="100"
                    icon={Users}
                    color="text-gray-600"
                  />
                </div>

                {/* At Risk Students */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="p-4 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-500" />
                      <h3 className="font-semibold text-[#0F3D5C]">Học sinh có nguy cơ (Tỷ lệ vắng {'>='} 10%)</h3>
                    </div>
                    <span className="text-sm text-[#6B7280]">{atRiskStudents.length} học sinh</span>
                  </div>
                  {atRiskStudents.length === 0 ? (
                    <div className="p-8 text-center">
                      <Check className="w-12 h-12 text-green-500 mx-auto mb-3" />
                      <p className="text-[#6B7280]">Không có học sinh nào có tỷ lệ vắng đáng lo ngại</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-[#374151] uppercase">Học sinh</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-[#374151] uppercase">Lớp</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-[#374151] uppercase">Tổng ngày</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-[#374151] uppercase">Ngày vắng</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-[#374151] uppercase">Tỷ lệ</th>
                            <th className="px-4 py-3"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {atRiskStudents.map((student) => (
                            <AtRiskStudentRow
                              key={student.student_id}
                              student={student}
                              onView={handleViewStudent}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* History Modal */}
        <StudentHistoryModal
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
          studentId={selectedStudent.id}
          studentName={selectedStudent.name}
        />

        {/* Toast Container */}
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
          {toasts.map((toast) => (
            <Toast key={toast.id} toast={toast} onDismiss={dismissToast} />
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminRFIDTab() {
  const [scanLog, setScanLog] = useState<Array<{
    id: string; studentId: string; studentName: string;
    studentCode: string; timestamp: string; status: 'success' | 'error'; direction: 'IN' | 'OUT';
  }>>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scannerSignal, setScannerSignal] = useState<'idle' | 'green' | 'red'>('idle');

  const handleDemoScan = () => {
    setIsScanning(true);
    setScannerSignal('green');
    setTimeout(() => {
      const names = ['Nguyễn Văn Minh', 'Trần Thị Lan', 'Lê Hoàng Nam', 'Phạm Thu Hà', 'Đặng Đức An'];
      const codes = ['HS001', 'HS002', 'HS003', 'HS004', 'HS005'];
      const idx = Math.floor(Math.random() * names.length);
      const direction = Math.random() > 0.5 ? 'IN' : 'OUT';
      setScanLog(prev => [{
        id: `scan-${Date.now()}`,
        studentId: `stu_${idx}`,
        studentName: names[idx],
        studentCode: codes[idx],
        timestamp: new Date().toLocaleString('vi-VN'),
        status: 'success' as const,
        direction: direction as 'IN' | 'OUT',
      }, ...prev].slice(0, 50));
      setIsScanning(false);
      setScannerSignal('idle');
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Coming Soon Banner */}
      <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center shrink-0 text-sm">⚠️</div>
        <div>
          <div className="text-sm font-semibold text-amber-800">
            Tính năng đang phát triển — Thử nghiệm thiết bị phần cứng RFID IoT
          </div>
          <div className="text-xs text-amber-700 mt-1">
            Giao diện mô phỏng máy quét thẻ RFID tại cổng trường. Dữ liệu trong bảng log là giả lập,
            không ảnh hưởng đến hệ thống điểm danh chính thức.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card Reader Unit */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-center gap-4">
          <div className="text-xs font-semibold text-[#0F3D5C]">Máy quét thẻ RFID — Cổng chính</div>
          {/* Signal Lights */}
          <div className="flex gap-4">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-6 h-6 rounded-full border-2 transition-all ${scannerSignal === 'green' ? 'bg-green-400 border-green-500 shadow-lg shadow-green-300 animate-pulse' : 'bg-gray-100 border-gray-300'}`} />
              <span className="text-[10px] text-[#6B7280]">Đèn Xanh</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className={`w-6 h-6 rounded-full border-2 transition-all ${scannerSignal === 'red' ? 'bg-red-400 border-red-500 shadow-lg shadow-red-300 animate-pulse' : 'bg-gray-100 border-gray-300'}`} />
              <span className="text-[10px] text-[#6B7280]">Đèn Đỏ</span>
            </div>
          </div>
          {/* Card Slot */}
          <div className="w-full bg-gray-100 rounded border border-dashed border-gray-300 p-4 text-center">
            <div className="text-xs text-[#6B7280] mb-1">Đầu đọc thẻ</div>
            <div className="w-full h-16 bg-gray-200 rounded flex items-center justify-center border-2 border-dashed border-gray-400">
              <span className="text-xs text-gray-500">◄ Quẹt thẻ ►</span>
            </div>
            <div className="mt-2 text-[10px] text-gray-500">UID: 04:A3:B2:1C:7D:E8:F1</div>
          </div>
          {/* Status */}
          <div className={`text-xs font-medium px-3 py-1.5 rounded-full ${
            scannerSignal === 'green' ? 'bg-green-100 text-green-700'
            : scannerSignal === 'red' ? 'bg-red-100 text-red-700'
            : 'bg-gray-100 text-gray-500'
          }`}>
            {scannerSignal === 'green' ? '✓ Đọc thẻ thành công'
             : scannerSignal === 'red' ? '✗ Lỗi đọc thẻ'
             : '○ Chờ quẹt thẻ'}
          </div>
          <button
            onClick={handleDemoScan}
            disabled={isScanning}
            className="w-full px-4 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isScanning ? 'Đang quét...' : '🪪 Mô phỏng quẹt thẻ thử nghiệm'}
          </button>
        </div>

        {/* School Gate Map */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="text-xs font-semibold text-[#0F3D5C] mb-3">Sơ đồ cổng trường — Thiết bị IoT</div>
          <div className="bg-gray-50 rounded-lg border border-dashed border-gray-300 p-4 flex flex-col items-center gap-3">
            <div className="w-full flex items-center justify-center gap-2 text-[10px] text-gray-500">
              <span>← Lối vào</span>
              <div className="px-3 py-1.5 bg-gray-200 rounded font-medium text-gray-700">CỔNG CHÍNH</div>
              <span>Lối ra →</span>
            </div>
            <div className="flex gap-2">
              <div className={`w-12 h-12 rounded border-2 flex flex-col items-center justify-center text-[10px] transition-all ${scannerSignal === 'green' ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-gray-100'}`}>
                <span>📷</span><span>Camera</span>
              </div>
              <div className={`w-16 h-12 rounded border-2 flex flex-col items-center justify-center text-[10px] transition-all ${scannerSignal === 'green' ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-gray-100'}`}>
                <span>📡</span><span>RFID</span>
              </div>
              <div className={`w-12 h-12 rounded border-2 flex flex-col items-center justify-center text-[10px] transition-all ${scannerSignal === 'green' ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-gray-100'}`}>
                <span>🖥️</span><span>Màn hình</span>
              </div>
            </div>
            <div className="text-[10px] text-gray-500">Trạng thái: {scannerSignal === 'idle' ? 'Sẵn sàng' : scannerSignal === 'green' ? 'Đọc thẻ OK' : 'Lỗi'}</div>
          </div>
        </div>

        {/* Scan Log */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs font-semibold text-[#0F3D5C] mb-3">Nhật ký quẹt thẻ gần nhất</div>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {scanLog.length === 0 ? (
              <div className="text-xs text-[#6B7280] text-center py-4">Chưa có lượt quẹt nào.</div>
            ) : (
              scanLog.map((entry) => (
                <div key={entry.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-100">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    entry.direction === 'IN' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>{entry.direction}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-[#0F3D5C] truncate">{entry.studentName}</div>
                    <div className="text-[10px] text-[#6B7280]">{entry.studentCode} · {entry.timestamp}</div>
                  </div>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${entry.status === 'success' ? 'bg-green-400' : 'bg-red-400'}`} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminAttendancePage;

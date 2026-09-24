/**
 * Admin Student 360 Page
 * Phase 03 - Student Management
 * 
 * Student detail view with tabs:
 * 1. Overview
 * 2. Profile
 * 3. Family / Guardians
 * 4. Enrollment
 * 5. Class
 * 6. Attendance
 * 7. Grades
 * 8. Assignments
 * 9. Leave Requests
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Users, GraduationCap, User, Home, BookOpen, Calendar, Award, ClipboardList,
  FileText, Clock, ChevronRight, ChevronLeft, ArrowLeft, Phone, Mail,
  MapPin, RefreshCw, AlertTriangle, Check, X, Link2, Link2Off, UserCheck, UserX
} from 'lucide-react';
import { api } from '../../services/api';
import type { Student, ClassRoom } from '../../types';

// ============================================================================
// Types
// ============================================================================

type TabId = 'overview' | 'profile' | 'guardians' | 'enrollment' | 'class' | 'attendance' | 'grades' | 'assignments' | 'leaves';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

interface EnrollmentRecord {
  id: string;
  student_id: string;
  class_id: string;
  academic_year_id: string;
  semester_id?: string;
  is_current: boolean;
  status: string;
  enrolled_at: string;
  class_name: string;
  grade_level: number;
  academic_year_name: string;
}

interface AttendanceRecord {
  id: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  note?: string;
  class_name?: string;
}

interface GradeRecord {
  id: string;
  subject: string;
  test_name: string;
  score: number;
  max_score: number;
  coefficient: number;
  semester?: number;
  teacher_name?: string;
  graded_at?: string;
}

interface AssignmentRecord {
  submission_id: string;
  submission_status: string;
  score?: number;
  submitted_at?: string;
  is_late?: boolean;
  assignment_id: string;
  title: string;
  subject: string;
  type: string;
  due_date: string;
  due_time: string;
  total_score: number;
}

interface LeaveRequestRecord {
  id: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: 'approved' | 'rejected' | 'pending';
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  reviewed_by_name?: string;
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
      <span className="text-sm text-[#6B7280]">Đang tải thông tin học sinh...</span>
    </div>
  );
}

// ============================================================================
// Badge Component
// ============================================================================

function StatusBadge({ status, type }: { status: string; type: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }) {
  const styles = {
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
    neutral: 'bg-gray-100 text-gray-700',
  };
  return (
    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${styles[type]}`}>
      {status}
    </span>
  );
}

// ============================================================================
// Tab Navigation
// ============================================================================

const TABS: Array<{ id: TabId; label: string; icon: React.ElementType }> = [
  { id: 'overview', label: 'Tổng quan', icon: GraduationCap },
  { id: 'profile', label: 'Hồ sơ', icon: User },
  { id: 'guardians', label: 'Gia đình', icon: Home },
  { id: 'enrollment', label: 'Ghi danh', icon: BookOpen },
  { id: 'class', label: 'Lớp học', icon: Users },
  { id: 'attendance', label: 'Điểm danh', icon: Calendar },
  { id: 'grades', label: 'Điểm số', icon: Award },
  { id: 'assignments', label: 'Bài tập', icon: ClipboardList },
  { id: 'leaves', label: 'Đơn nghỉ phép', icon: FileText },
];

// ============================================================================
// Overview Tab
// ============================================================================

function OverviewTab({ student }: { student: Student }) {
  const hasParent = student.parentId || student.parent_name;
  const isActive = student.is_active !== false;
  
  const stats = [
    { label: 'GPA', value: student.gpa?.toFixed(2) || '-', icon: Award, color: 'text-blue-600' },
    { label: 'Xếp loại', value: student.classRank || '-', icon: GraduationCap, color: 'text-green-600' },
    { label: 'Chuyên cần', value: student.attendanceRate ? `${student.attendanceRate}%` : '-', icon: Calendar, color: 'text-purple-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center ${stat.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#0F3D5C]">{stat.value}</div>
                  <div className="text-xs text-[#6B7280]">{stat.label}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-medium text-[#374151] mb-3">Trạng thái tài khoản</h3>
          <div className="flex items-center gap-2">
            {isActive ? (
              <>
                <UserCheck className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-700">Đang học</span>
              </>
            ) : (
              <>
                <UserX className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-700">Đã nghỉ</span>
              </>
            )}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-medium text-[#374151] mb-3">Liên kết phụ huynh</h3>
          <div className="flex items-center gap-2">
            {hasParent ? (
              <>
                <Link2 className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-700">Đã liên kết: {student.parent_name}</span>
              </>
            ) : (
              <>
                <Link2Off className="w-5 h-5 text-yellow-600" />
                <span className="font-medium text-yellow-700">Chưa liên kết</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="text-sm font-medium text-[#374151] mb-3">Thông tin liên hệ</h3>
        <div className="space-y-2">
          {student.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-[#6B7280]" />
              <span>{student.phone}</span>
            </div>
          )}
          {student.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-[#6B7280]" />
              <span>{student.email}</span>
            </div>
          )}
          {!student.phone && !student.email && (
            <p className="text-sm text-[#6B7280] italic">Chưa có thông tin liên hệ</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Profile Tab
// ============================================================================

function ProfileTab({ student }: { student: Student }) {
  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="text-sm font-medium text-[#374151] mb-4">Thông tin cá nhân</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-[#6B7280] mb-1">Họ và tên</label>
            <div className="text-sm font-medium text-[#0F3D5C]">{student.name || '-'}</div>
          </div>
          <div>
            <label className="block text-xs text-[#6B7280] mb-1">Mã học sinh</label>
            <div className="text-sm text-[#374151]">{student.code || '-'}</div>
          </div>
          <div>
            <label className="block text-xs text-[#6B7280] mb-1">Email</label>
            <div className="text-sm text-[#374151]">{student.email || '-'}</div>
          </div>
          <div>
            <label className="block text-xs text-[#6B7280] mb-1">Số điện thoại</label>
            <div className="text-sm text-[#374151]">{student.phone || '-'}</div>
          </div>
          <div>
            <label className="block text-xs text-[#6B7280] mb-1">Ngày tạo tài khoản</label>
            <div className="text-sm text-[#374151]">
              {student.created_at ? new Date(student.created_at).toLocaleDateString('vi-VN') : '-'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Guardians Tab
// ============================================================================

function GuardiansTab({ student }: { student: Student }) {
  const hasParent = student.parentId || student.parent_name;

  if (!hasParent) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-yellow-800 mb-2">Chưa liên kết phụ huynh</h3>
        <p className="text-sm text-yellow-700">Học sinh này chưa được liên kết với tài khoản phụ huynh nào.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="text-sm font-medium text-[#374151] mb-4">Thông tin phụ huynh / người giám hộ</h3>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-[#E8F2FA] flex items-center justify-center">
            <User className="w-6 h-6 text-[#1C6FA8]" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-[#0F3D5C]">{student.parent_name || 'Phụ huynh'}</div>
            <div className="mt-2 space-y-2">
              {student.parent_phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-[#6B7280]" />
                  <span>{student.parent_phone}</span>
                </div>
              )}
              {student.parent_email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-[#6B7280]" />
                  <span>{student.parent_email}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Enrollment Tab
// ============================================================================

function EnrollmentTab({ enrollments }: { enrollments: EnrollmentRecord[] }) {
  if (!enrollments || enrollments.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
        <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-600 mb-2">Chưa có lịch sử ghi danh</h3>
        <p className="text-sm text-gray-500">Không tìm thấy thông tin ghi danh cho học sinh này.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {enrollments.map((enrollment, index) => (
        <div key={index} className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium text-[#0F3D5C]">
              {enrollment.class_name || 'Lớp học'}
              {enrollment.grade_level ? <span className="text-[#6B7280] ml-2">- Khối {enrollment.grade_level}</span> : null}
            </div>
            {enrollment.is_current ? (
              <StatusBadge status="Hiện tại" type="success" />
            ) : (
              <StatusBadge status="Đã kết thúc" type="neutral" />
            )}
          </div>
          <div className="text-sm text-[#6B7280]">
            {enrollment.academic_year_name || 'Năm học'} • {enrollment.status || 'Đang học'}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Class Tab
// ============================================================================

function ClassTab({ student }: { student: Student }) {
  if (!student.className) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
        <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-600 mb-2">Chưa có lớp học</h3>
        <p className="text-sm text-gray-500">Học sinh này chưa được xếp vào lớp học nào.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="text-sm font-medium text-[#374151] mb-4">Lớp học hiện tại</h3>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-[#E8F2FA] flex items-center justify-center">
            <Users className="w-7 h-7 text-[#1C6FA8]" />
          </div>
          <div>
            <div className="font-bold text-xl text-[#0F3D5C]">{student.className}</div>
            <div className="text-sm text-[#6B7280]">
              Khối {student.gradeLevel || '-'} • {student.class_academic_year || 'Năm học'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Attendance Tab
// ============================================================================

function AttendanceTab({ attendance }: { attendance: AttendanceRecord[] }) {
  if (!attendance || attendance.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-600 mb-2">Chưa có dữ liệu điểm danh</h3>
        <p className="text-sm text-gray-500">Không tìm thấy bản ghi điểm danh cho học sinh này.</p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present': return <StatusBadge status="Có mặt" type="success" />;
      case 'absent': return <StatusBadge status="Vắng" type="danger" />;
      case 'late': return <StatusBadge status="Đi muộn" type="warning" />;
      case 'excused': return <StatusBadge status="Có phép" type="info" />;
      default: return <StatusBadge status={status} type="neutral" />;
    }
  };

  return (
    <div className="space-y-3">
      {attendance.slice(0, 30).map((record, index) => (
        <div key={index} className="bg-white border border-gray-200 rounded-xl p-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-[#0F3D5C]">
              {new Date(record.date).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            {record.note && <div className="text-xs text-[#6B7280] mt-1">{record.note}</div>}
          </div>
          <div>{getStatusBadge(record.status)}</div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Grades Tab
// ============================================================================

function GradesTab({ grades }: { grades: GradeRecord[] }) {
  if (!grades || grades.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
        <Award className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-600 mb-2">Chưa có điểm số</h3>
        <p className="text-sm text-gray-500">Không tìm thấy bản ghi điểm cho học sinh này.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {grades.slice(0, 30).map((grade, index) => (
        <div key={index} className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="font-medium text-[#0F3D5C]">{grade.subject}</div>
              <div className="text-sm text-[#6B7280]">{grade.test_name}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-[#1C6FA8]">
                {grade.score}/{grade.max_score}
              </div>
              <div className="text-xs text-[#6B7280]">
                Hệ số {grade.coefficient || 1}
              </div>
            </div>
          </div>
          {grade.teacher_name && (
            <div className="text-xs text-[#6B7280]">Giáo viên: {grade.teacher_name}</div>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Assignments Tab
// ============================================================================

function AssignmentsTab({ assignments }: { assignments: AssignmentRecord[] }) {
  if (!assignments || assignments.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
        <ClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-600 mb-2">Chưa có bài tập</h3>
        <p className="text-sm text-gray-500">Không tìm thấy bài tập cho học sinh này.</p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted': return <StatusBadge status="Đã nộp" type="success" />;
      case 'in_progress': return <StatusBadge status="Đang làm" type="info" />;
      case 'graded': return <StatusBadge status="Đã chấm" type="success" />;
      case 'not_submitted': return <StatusBadge status="Chưa nộp" type="danger" />;
      default: return <StatusBadge status={status} type="neutral" />;
    }
  };

  return (
    <div className="space-y-3">
      {assignments.slice(0, 30).map((assignment, index) => (
        <div key={index} className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="font-medium text-[#0F3D5C]">{assignment.title}</div>
              <div className="text-sm text-[#6B7280]">{assignment.subject}</div>
            </div>
            {getStatusBadge(assignment.submission_status || '')}
          </div>
          <div className="flex items-center justify-between text-xs text-[#6B7280]">
            <span>Hạn: {assignment.due_date}</span>
            {assignment.score !== undefined && assignment.score !== null && (
              <span className="font-medium">Điểm: {assignment.score}/{assignment.total_score}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Leave Requests Tab
// ============================================================================

function LeaveRequestsTab({ leaveRequests }: { leaveRequests: LeaveRequestRecord[] }) {
  if (!leaveRequests || leaveRequests.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-600 mb-2">Không có đơn nghỉ phép</h3>
        <p className="text-sm text-gray-500">Học sinh này chưa có đơn xin nghỉ phép nào.</p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <StatusBadge status="Đã duyệt" type="success" />;
      case 'rejected': return <StatusBadge status="Từ chối" type="danger" />;
      case 'pending': return <StatusBadge status="Chờ duyệt" type="warning" />;
      default: return <StatusBadge status={status} type="neutral" />;
    }
  };

  return (
    <div className="space-y-3">
      {leaveRequests.map((request, index) => (
        <div key={index} className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="font-medium text-[#0F3D5C]">
                {new Date(request.start_date).toLocaleDateString('vi-VN')} - {new Date(request.end_date).toLocaleDateString('vi-VN')}
              </div>
              <div className="text-sm text-[#6B7280] mt-1">{request.reason}</div>
            </div>
            {getStatusBadge(request.status)}
          </div>
          {request.reviewed_by_name && (
            <div className="text-xs text-[#6B7280] mt-2">
              Người duyệt: {request.reviewed_by_name as string}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export function AdminStudent360Page() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  // Additional data
  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [grades, setGrades] = useState<GradeRecord[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestRecord[]>([]);

  const showToast = useCallback((type: Toast['type'], message: string) => {
    const id = `toast_${Date.now()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const fetchStudent = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getStudentById(studentId);
      if (data) {
        setStudent(data);
      } else {
        setError('Không tìm thấy học sinh');
      }
    } catch {
      setError('Lỗi khi tải thông tin học sinh');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  const fetchStudentData = useCallback(async () => {
    if (!studentId) return;
    try {
      const [enrollData, attendData, gradesData, assignData, leavesData] = await Promise.all([
        api.getStudentEnrollments(studentId),
        api.getStudentAttendance(studentId, { limit: 30 }),
        api.getStudentGrades(studentId, { limit: 30 }),
        api.getStudentAssignments(studentId, { limit: 30 }),
        api.getStudentLeaveRequests(studentId),
      ]);
      setEnrollments(enrollData as EnrollmentRecord[]);
      setAttendance(attendData as AttendanceRecord[]);
      setGrades(gradesData as GradeRecord[]);
      setAssignments(assignData as AssignmentRecord[]);
      setLeaveRequests(leavesData as LeaveRequestRecord[]);
    } catch {
      console.error('Failed to fetch student data');
    }
  }, [studentId]);

  useEffect(() => {
    fetchStudent();
  }, [fetchStudent]);

  useEffect(() => {
    if (student) {
      fetchStudentData();
    }
  }, [student, fetchStudentData]);

  const renderTabContent = () => {
    if (!student) return null;
    
    switch (activeTab) {
      case 'overview': return <OverviewTab student={student} />;
      case 'profile': return <ProfileTab student={student} />;
      case 'guardians': return <GuardiansTab student={student} />;
      case 'enrollment': return <EnrollmentTab enrollments={enrollments} />;
      case 'class': return <ClassTab student={student} />;
      case 'attendance': return <AttendanceTab attendance={attendance} />;
      case 'grades': return <GradesTab grades={grades} />;
      case 'assignments': return <AssignmentsTab assignments={assignments} />;
      case 'leaves': return <LeaveRequestsTab leaveRequests={leaveRequests} />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center">
        <LoadingState />
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#0F3D5C] mb-2">{error || 'Không tìm thấy học sinh'}</h2>
          <button
            onClick={() => navigate('/admin/students')}
            className="px-4 py-2 bg-[#1C6FA8] text-white rounded-lg hover:bg-[#0F3D5C]"
          >
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  const hasParent = student.parentId || student.parent_name;
  const isActive = student.is_active !== false;

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate('/admin/students')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5 text-[#6B7280]" />
            </button>
            <div className="flex items-center gap-2 text-sm text-[#6B7280]">
              <span>Quản trị</span>
              <ChevronRight className="w-4 h-4" />
              <button onClick={() => navigate('/admin/students')} className="hover:text-[#1C6FA8]">Học sinh</button>
              <ChevronRight className="w-4 h-4" />
              <span className="text-[#0F3D5C]">{student.name}</span>
            </div>
          </div>
          
          {/* Student Header Card */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#E8F2FA] flex items-center justify-center overflow-hidden">
              {student.avatar ? (
                <img src={student.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-[#1C6FA8]">
                  {(student.name || 'HS').charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-[#0F3D5C]">{student.name}</h1>
                {isActive ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                    <UserCheck className="w-3 h-3" />
                    Đang học
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                    <UserX className="w-3 h-3" />
                    Đã nghỉ
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-[#6B7280] mt-1">
                {student.code && <span>Mã: {student.code}</span>}
                {student.className && <span>Lớp: {student.className}</span>}
                {student.gradeLevel && <span>Khối: {student.gradeLevel}</span>}
                {hasParent ? (
                  <span className="flex items-center gap-1 text-green-600">
                    <Link2 className="w-3 h-3" />
                    Đã liên kết PH
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-yellow-600">
                    <Link2Off className="w-3 h-3" />
                    Chưa liên kết PH
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    isActive
                      ? 'text-[#1C6FA8] border-[#1C6FA8]'
                      : 'text-[#6B7280] border-transparent hover:text-[#374151] hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {renderTabContent()}
      </div>

      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </div>
    </div>
  );
}

export default AdminStudent360Page;

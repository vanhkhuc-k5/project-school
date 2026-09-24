/**
 * Admin Teacher 360 Page
 * Phase 04 - Teacher Management
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Users, GraduationCap, User, BookOpen, Calendar, Award, Clock, ClipboardList,
  FileText, ChevronRight, ChevronLeft, ArrowLeft, Phone, Mail,
  MapPin, RefreshCw, AlertTriangle, Check, X, Building, UserCheck, UserX
} from 'lucide-react';
import { api } from '../../services/api';
import type { Teacher } from '../../types';

// ============================================================================
// Types
// ============================================================================

type TabId = 'overview' | 'profile' | 'department' | 'subjects' | 'classes' | 'workload' | 'assignments';

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
      <span className="text-sm text-[#6B7280]">Đang tải thông tin giáo viên...</span>
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
  { id: 'department', label: 'Bộ môn', icon: Building },
  { id: 'subjects', label: 'Môn dạy', icon: BookOpen },
  { id: 'classes', label: 'Lớp dạy', icon: Users },
  { id: 'workload', label: 'Phân công', icon: Clock },
  { id: 'assignments', label: 'Chi tiết', icon: ClipboardList },
];

// ============================================================================
// Overview Tab
// ============================================================================

function OverviewTab({ teacher, workload }: { teacher: Teacher; workload: { periods: number; classes: number; subjects: number } | null }) {
  const isActive = teacher.is_active !== false;

  const stats = [
    { label: 'Số lớp', value: workload?.classes || 0, icon: Users, color: 'text-blue-600' },
    { label: 'Số môn', value: workload?.subjects || 0, icon: BookOpen, color: 'text-green-600' },
    { label: 'Số tiết', value: workload?.periods || 0, icon: Clock, color: 'text-purple-600' },
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
          <h3 className="text-sm font-medium text-[#374151] mb-3">Trạng thái</h3>
          <div className="flex items-center gap-2">
            {isActive ? (
              <>
                <UserCheck className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-700">Đang giảng dạy</span>
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
          <h3 className="text-sm font-medium text-[#374151] mb-3">Lớp chủ nhiệm</h3>
          <div className="flex items-center gap-2">
            {teacher.homeroomClassName ? (
              <>
                <Users className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-700">{teacher.homeroomClassName}</span>
              </>
            ) : (
              <>
                <Users className="w-5 h-5 text-gray-400" />
                <span className="font-medium text-gray-500">Không có lớp chủ nhiệm</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Department Info */}
      {teacher.department && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-medium text-[#374151] mb-3">Bộ môn</h3>
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5 text-[#6B7280]" />
            <span className="font-medium text-[#0F3D5C]">{teacher.department}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Profile Tab
// ============================================================================

function ProfileTab({ teacher }: { teacher: Teacher }) {
  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="text-sm font-medium text-[#374151] mb-4">Thông tin cá nhân</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-[#6B7280] mb-1">Họ và tên</label>
            <div className="text-sm font-medium text-[#0F3D5C]">{teacher.name || '-'}</div>
          </div>
          <div>
            <label className="block text-xs text-[#6B7280] mb-1">Mã giáo viên</label>
            <div className="text-sm text-[#374151]">{teacher.code || '-'}</div>
          </div>
          <div>
            <label className="block text-xs text-[#6B7280] mb-1">Email</label>
            <div className="text-sm text-[#374151]">{teacher.email || '-'}</div>
          </div>
          <div>
            <label className="block text-xs text-[#6B7280] mb-1">Số điện thoại</label>
            <div className="text-sm text-[#374151]">{teacher.phone || '-'}</div>
          </div>
          <div>
            <label className="block text-xs text-[#6B7280] mb-1">Ngày tạo tài khoản</label>
            <div className="text-sm text-[#374151]">
              {teacher.created_at ? new Date(teacher.created_at).toLocaleDateString('vi-VN') : '-'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Department Tab
// ============================================================================

function DepartmentTab({ teacher }: { teacher: Teacher }) {
  if (!teacher.departments || teacher.departments.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
        <Building className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-600 mb-2">Chưa có thông tin bộ môn</h3>
        <p className="text-sm text-gray-500">Giáo viên này chưa được phân công vào bộ môn nào.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="text-sm font-medium text-[#374151] mb-4">Bộ môn tham gia</h3>
        <div className="space-y-2">
          {teacher.departments.map((dept, index) => (
            <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <Building className="w-5 h-5 text-[#1C6FA8]" />
              <span className="font-medium text-[#0F3D5C]">{dept}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Subjects Tab
// ============================================================================

function SubjectsTab({ subjects }: { subjects: { id: string; name: string; code: string; department: string }[] }) {
  if (!subjects || subjects.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
        <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-600 mb-2">Chưa có môn dạy</h3>
        <p className="text-sm text-gray-500">Giáo viên này chưa được phân công dạy môn nào.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {subjects.map((subject) => (
        <div key={subject.id} className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-medium text-[#0F3D5C]">{subject.name}</div>
              <div className="text-sm text-[#6B7280]">Mã: {subject.code}</div>
            </div>
            {subject.department && (
              <StatusBadge status={subject.department} type="info" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Classes Tab
// ============================================================================

function ClassesTab({ assignments }: { assignments: { id: string; class_id: string; class_name: string; grade_level: number; subject_name: string }[] }) {
  if (!assignments || assignments.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
        <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-600 mb-2">Chưa có lớp dạy</h3>
        <p className="text-sm text-gray-500">Giáo viên này chưa được phân công vào lớp nào.</p>
      </div>
    );
  }

  // Group by class
  const classGroups: Record<string, { class_name: string; grade_level: number; subjects: string[] }> = {};
  assignments.forEach(a => {
    if (!classGroups[a.class_id]) {
      classGroups[a.class_id] = {
        class_name: a.class_name,
        grade_level: a.grade_level,
        subjects: [],
      };
    }
    if (!classGroups[a.class_id].subjects.includes(a.subject_name)) {
      classGroups[a.class_id].subjects.push(a.subject_name);
    }
  });

  return (
    <div className="space-y-3">
      {Object.entries(classGroups).map(([classId, group]) => (
        <div key={classId} className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="font-medium text-[#0F3D5C]">{group.class_name}</div>
            <StatusBadge status={`Khối ${group.grade_level}`} type="info" />
          </div>
          <div className="flex flex-wrap gap-2">
            {group.subjects.map((subject, i) => (
              <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                {subject}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Workload Tab
// ============================================================================

function WorkloadTab({ workload }: { workload: {
  classAssignments: { class_id: string; class_name: string; grade_level: number; period_count: number; subject_count: number }[];
  subjectBreakdown: { subject_id: string; subject_name: string; subject_code: string; department: string; period_count: number; class_count: number }[];
  totals: { periods: number; classes: number; subjects: number };
  homeroom: { id: string; name: string; grade_level: number } | null;
} | null }) {
  if (!workload) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
        <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-600 mb-2">Chưa có dữ liệu phân công</h3>
        <p className="text-sm text-gray-500">Không tìm thấy thông tin phân công giảng dạy.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-[#1C6FA8]">{workload.totals.classes}</div>
          <div className="text-sm text-[#6B7280]">Số lớp dạy</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-[#1C6FA8]">{workload.totals.subjects}</div>
          <div className="text-sm text-[#6B7280]">Số môn dạy</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-[#1C6FA8]">{workload.totals.periods}</div>
          <div className="text-sm text-[#6B7280]">Tổng số tiết</div>
        </div>
      </div>

      {/* Homeroom */}
      {workload.homeroom && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Lớp chủ nhiệm</h3>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-blue-900">{workload.homeroom.name}</span>
            <span className="text-blue-700">- Khối {workload.homeroom.grade_level}</span>
          </div>
        </div>
      )}

      {/* Class Assignments */}
      {workload.classAssignments.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-medium text-[#374151] mb-4">Phân công theo lớp</h3>
          <div className="space-y-2">
            {workload.classAssignments.map((ca) => (
              <div key={ca.class_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-[#0F3D5C]">{ca.class_name}</div>
                  <div className="text-xs text-[#6B7280]">Khối {ca.grade_level}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-[#1C6FA8]">{ca.period_count} tiết</div>
                  <div className="text-xs text-[#6B7280]">{ca.subject_count} môn</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Assignments Tab
// ============================================================================

function AssignmentsTab({ assignments }: { assignments: {
  id: string;
  class_id: string;
  subject_id: string;
  academic_year: string;
  class_name: string;
  grade_level: number;
  subject_name: string;
  subject_code: string;
}[] }) {
  if (!assignments || assignments.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
        <ClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-600 mb-2">Chưa có phân công</h3>
        <p className="text-sm text-gray-500">Không tìm thấy bản ghi phân công giảng dạy.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {assignments.map((assignment) => (
        <div key={assignment.id} className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="font-medium text-[#0F3D5C]">{assignment.subject_name}</div>
              <div className="text-sm text-[#6B7280]">Mã: {assignment.subject_code}</div>
            </div>
            <StatusBadge status={`HK ${assignment.academic_year.split('-')[0] || ''}`} type="info" />
          </div>
          <div className="flex items-center gap-4 text-sm text-[#6B7280]">
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {assignment.class_name} - Khối {assignment.grade_level}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export function AdminTeacher360Page() {
  const { teacherId } = useParams<{ teacherId: string }>();
  const navigate = useNavigate();

  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [subjects, setSubjects] = useState<{ id: string; name: string; code: string; department: string }[]>([]);
  const [assignments, setAssignments] = useState<{
    id: string;
    class_id: string;
    subject_id: string;
    academic_year: string;
    class_name: string;
    grade_level: number;
    subject_name: string;
    subject_code: string;
  }[]>([]);
  const [workload, setWorkload] = useState<{
    classAssignments: { class_id: string; class_name: string; grade_level: number; period_count: number; subject_count: number }[];
    subjectBreakdown: { subject_id: string; subject_name: string; subject_code: string; department: string; period_count: number; class_count: number }[];
    totals: { periods: number; classes: number; subjects: number };
    homeroom: { id: string; name: string; grade_level: number } | null;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: Toast['type'], message: string) => {
    const id = `toast_${Date.now()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const fetchTeacher = useCallback(async () => {
    if (!teacherId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getTeacherById(teacherId);
      if (data) {
        const teacherData = data as Record<string, unknown>;
        setTeacher(teacherData.teacher as Teacher);
        setSubjects((teacherData.subjects as typeof subjects) || []);
        setAssignments((teacherData.assignments as typeof assignments) || []);
      } else {
        setError('Không tìm thấy giáo viên');
      }
    } catch {
      setError('Lỗi khi tải thông tin giáo viên');
    } finally {
      setLoading(false);
    }
  }, [teacherId]);

  const fetchWorkload = useCallback(async () => {
    if (!teacherId) return;
    try {
      const data = await api.getTeacherWorkload(teacherId);
      const workloadData = {
        classAssignments: data.classAssignments as Array<{
          class_id: string;
          class_name: string;
          grade_level: number;
          period_count: number;
          subject_count: number;
        }>,
        subjectBreakdown: data.subjectBreakdown as Array<{
          subject_id: string;
          subject_name: string;
          subject_code: string;
          department: string;
          period_count: number;
          class_count: number;
        }>,
        totals: {
          periods: data.totals.periods,
          classes: data.totals.classes,
          subjects: data.totals.subjects,
          isHomeroom: !!data.homeroom,
        },
        homeroom: data.homeroom as { id: string; name: string; grade_level: number } | null,
      };
      setWorkload(workloadData);
    } catch {
      console.error('Failed to fetch workload');
    }
  }, [teacherId]);

  useEffect(() => {
    fetchTeacher();
  }, [fetchTeacher]);

  useEffect(() => {
    if (teacher) {
      fetchWorkload();
    }
  }, [teacher, fetchWorkload]);

  const renderTabContent = () => {
    if (!teacher) return null;

    switch (activeTab) {
      case 'overview': return <OverviewTab teacher={teacher} workload={workload?.totals || null} />;
      case 'profile': return <ProfileTab teacher={teacher} />;
      case 'department': return <DepartmentTab teacher={teacher} />;
      case 'subjects': return <SubjectsTab subjects={subjects} />;
      case 'classes': return <ClassesTab assignments={assignments} />;
      case 'workload': return <WorkloadTab workload={workload} />;
      case 'assignments': return <AssignmentsTab assignments={assignments} />;
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

  if (error || !teacher) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#0F3D5C] mb-2">{error || 'Không tìm thấy giáo viên'}</h2>
          <button
            onClick={() => navigate('/admin/teachers')}
            className="px-4 py-2 bg-[#1C6FA8] text-white rounded-lg hover:bg-[#0F3D5C]"
          >
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  const isActive = teacher.is_active !== false;

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate('/admin/teachers')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5 text-[#6B7280]" />
            </button>
            <div className="flex items-center gap-2 text-sm text-[#6B7280]">
              <span>Quản trị</span>
              <ChevronRight className="w-4 h-4" />
              <button onClick={() => navigate('/admin/teachers')} className="hover:text-[#1C6FA8]">Giáo viên</button>
              <ChevronRight className="w-4 h-4" />
              <span className="text-[#0F3D5C]">{teacher.name}</span>
            </div>
          </div>

          {/* Teacher Header Card */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#E8F2FA] flex items-center justify-center overflow-hidden">
              {teacher.avatar ? (
                <img src={teacher.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-[#1C6FA8]">
                  {(teacher.name || 'GV').charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-[#0F3D5C]">{teacher.name}</h1>
                {isActive ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                    <UserCheck className="w-3 h-3" />
                    Đang giảng dạy
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                    <UserX className="w-3 h-3" />
                    Đã nghỉ
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-[#6B7280] mt-1">
                {teacher.code && <span>Mã: {teacher.code}</span>}
                {teacher.homeroomClassName && <span>CN: {teacher.homeroomClassName}</span>}
                {teacher.department && <span>BM: {teacher.department}</span>}
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

export default AdminTeacher360Page;

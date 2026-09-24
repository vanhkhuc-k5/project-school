import React, { useState, useEffect } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { ADMIN_DASHBOARD_DATA } from '../../mock/adminData';
import { adminApi, profilesApi, academicStructureApi, academicYearsApi, enrollmentsApi, teacherAssignmentsApi, timetableApi } from '../../services/api';
import AdminAnnouncementsPage from './AdminAnnouncementsPage';
import { useSync } from '../../context/SyncContext';
import {
  Users,
  Briefcase,
  Layers,
  Award,
  TrendingUp,
  Download,
  Bell,
  AlertTriangle,
  Clock,
  ShieldCheck,
  RefreshCw,
  FileText,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  Plus,
  Search,
  Key,
  Edit2,
  Trash2,
  BookOpen,
  DollarSign,
  Shield,
  Send,
  Printer,
  Check,
  X,
  CreditCard,
  UserCheck,
  UserPlus,
  GraduationCap,
  FolderTree,
  Building2,
  Archive,
  Eye,
  DoorOpen,
  AlertCircle,
  Calendar,
  ArrowRightLeft,
  UserMinus,
  History,
  ListPlus,
} from 'lucide-react';

export function AdminDashboard({ activeTab = 'overview', onTabChange }) {
  const { lastSync, triggerSync } = useSync();
  const [data, setData] = useState(ADMIN_DASHBOARD_DATA);
  const [selectedYear, setSelectedYear] = useState('2024-2025');
  const [selectedTerm, setSelectedTerm] = useState('Học kỳ II (Hiện tại)');

  // Sync & Feedback
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState(null);

  // Broadcast modal
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastSent, setBroadcastSent] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastContent, setBroadcastContent] = useState('');

  // User Management
  const [users, setUsers] = useState([]);
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userSearch, setUserSearch] = useState('');
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // New User Form
  const [newUserName, setNewUserName] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('teacher');
  const [newUserCode, setNewUserCode] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserClass, setNewUserClass] = useState('cls_10A1');
  const [isSavingUser, setIsSavingUser] = useState(false);

  // Classes & Academic Structure
  const [curriculumSubTab, setCurriculumSubTab] = useState('classes'); // 'classes' | 'subjects' | 'departments'
  const [classesList, setClassesList] = useState([]);
  const [teachersList, setTeachersList] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [academicYearsList, setAcademicYearsList] = useState([]);
  const [selectedAcademicYearFilter, setSelectedAcademicYearFilter] = useState('');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('active');
  const [classSearch, setClassSearch] = useState('');
  const [isClassLoading, setIsClassLoading] = useState(false);
  const [classError, setClassError] = useState(null);

  // Class Modals & Drawer
  const [isCreateClassModalOpen, setIsCreateClassModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassGrade, setNewClassGrade] = useState(10);
  const [newClassTeacher, setNewClassTeacher] = useState('');
  const [newClassRoom, setNewClassRoom] = useState('Phòng 301');
  const [newClassCapacity, setNewClassCapacity] = useState(45);
  const [newClassYearId, setNewClassYearId] = useState('');
  const [isSavingClass, setIsSavingClass] = useState(false);

  const [editingClass, setEditingClass] = useState(null);
  const [isEditClassModalOpen, setIsEditClassModalOpen] = useState(false);

  const [viewingClassDetails, setViewingClassDetails] = useState(null);
  const [classRoster, setClassRoster] = useState([]);
  const [isLoadingRoster, setIsLoadingRoster] = useState(false);

  const [classToDelete, setClassToDelete] = useState(null);
  const [isDeleteClassModalOpen, setIsDeleteClassModalOpen] = useState(false);
  const [isDeletingClass, setIsDeletingClass] = useState(false);

  // Student Enrollment Lifecycle States (G14)
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [enrollStudentId, setEnrollStudentId] = useState('');
  const [enrollDate, setEnrollDate] = useState(new Date().toISOString().split('T')[0]);
  const [enrollNotes, setEnrollNotes] = useState('');
  const [isEnrolling, setIsEnrolling] = useState(false);

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferStudentData, setTransferStudentData] = useState(null);
  const [transferTargetClassId, setTransferTargetClassId] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [transferReason, setTransferReason] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawStudentData, setWithdrawStudentData] = useState(null);
  const [withdrawDate, setWithdrawDate] = useState(new Date().toISOString().split('T')[0]);
  const [withdrawReason, setWithdrawReason] = useState('');
  const [withdrawNotes, setWithdrawNotes] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyStudentData, setHistoryStudentData] = useState(null);
  const [studentEnrollmentHistory, setStudentEnrollmentHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const [isBulkEnrollModalOpen, setIsBulkEnrollModalOpen] = useState(false);
  const [bulkSelectedStudentIds, setBulkSelectedStudentIds] = useState([]);
  const [isBulkEnrolling, setIsBulkEnrolling] = useState(false);

  // Subjects Management
  const [subjectsList, setSubjectsList] = useState([]);
  const [subjectSearch, setSubjectSearch] = useState('');
  const [selectedSubjectDeptFilter, setSelectedSubjectDeptFilter] = useState('');
  const [isSubjectLoading, setIsSubjectLoading] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isSavingSubject, setIsSavingSubject] = useState(false);
  const [subjectFormData, setSubjectFormData] = useState({
    name: '',
    code: '',
    departmentId: '',
    gradeLevel: '',
    weeklyPeriods: 3,
    credits: 2.0,
    status: 'active',
    description: '',
  });

  // Departments Management
  const [departmentsList, setDepartmentsList] = useState([]);
  const [deptSearch, setDeptSearch] = useState('');
  const [isDeptLoading, setIsDeptLoading] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [isSavingDept, setIsSavingDept] = useState(false);
  const [deptFormData, setDeptFormData] = useState({
    name: '',
    code: '',
    description: '',
    headTeacherId: '',
  });

  // Normalized Profiles Editing
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [isEditTeacherModalOpen, setIsEditTeacherModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [isEditStudentModalOpen, setIsEditStudentModalOpen] = useState(false);
  const [managingGuardiansStudent, setManagingGuardiansStudent] = useState(null);
  const [studentGuardians, setStudentGuardians] = useState([]);
  const [isGuardiansModalOpen, setIsGuardiansModalOpen] = useState(false);
  const [parentsList, setParentsList] = useState([]);
  const [assignParentId, setAssignParentId] = useState('');
  const [assignRelationship, setAssignRelationship] = useState('guardian');
  const [assignIsPrimary, setAssignIsPrimary] = useState(true);
  const [assignIsVerified, setAssignIsVerified] = useState(true);

  // Teacher Assignments Management (G15)
  const [assignmentsList, setAssignmentsList] = useState([]);
  const [assignmentSearch, setAssignmentSearch] = useState('');
  const [selectedAssignmentRoleFilter, setSelectedAssignmentRoleFilter] = useState('all');
  const [selectedAssignmentDeptFilter, setSelectedAssignmentDeptFilter] = useState('');
  const [selectedAssignmentTeacherFilter, setSelectedAssignmentTeacherFilter] = useState('');
  const [selectedAssignmentClassFilter, setSelectedAssignmentClassFilter] = useState('');
  const [isAssignmentsLoading, setIsAssignmentsLoading] = useState(false);
  const [isCreateAssignmentModalOpen, setIsCreateAssignmentModalOpen] = useState(false);
  const [isEditAssignmentModalOpen, setIsEditAssignmentModalOpen] = useState(false);
  const [selectedAssignmentForEdit, setSelectedAssignmentForEdit] = useState(null);
  const [isDeleteAssignmentModalOpen, setIsDeleteAssignmentModalOpen] = useState(false);
  const [selectedAssignmentForDelete, setSelectedAssignmentForDelete] = useState(null);
  const [newAssignTeacherId, setNewAssignTeacherId] = useState('');
  const [newAssignClassId, setNewAssignClassId] = useState('');
  const [newAssignSubjectId, setNewAssignSubjectId] = useState('');
  const [newAssignYearId, setNewAssignYearId] = useState('');
  const [newAssignSemesterId, setNewAssignSemesterId] = useState('');
  const [newAssignRole, setNewAssignRole] = useState('primary');
  const [newAssignNotes, setNewAssignNotes] = useState('');
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);
  const [assignmentFormError, setAssignmentFormError] = useState(null);
  const [editAssignRole, setEditAssignRole] = useState('primary');
  const [editAssignStatus, setEditAssignStatus] = useState('active');
  const [editAssignNotes, setEditAssignNotes] = useState('');
  const [isUpdatingAssignment, setIsUpdatingAssignment] = useState(false);

  // Timetable Schedule Management States (G16)
  const [timetableSlots, setTimetableSlots] = useState([]);
  const [selectedTimetableClassId, setSelectedTimetableClassId] = useState('cls_10A1');
  const [selectedTimetableYearId, setSelectedTimetableYearId] = useState('');
  const [selectedTimetableSemesterId, setSelectedTimetableSemesterId] = useState('');
  const [isTimetableLoading, setIsTimetableLoading] = useState(false);
  const [timetableError, setTimetableError] = useState(null);

  // Timetable Slot Modal & Form
  const [isCreateSlotModalOpen, setIsCreateSlotModalOpen] = useState(false);
  const [slotFormData, setSlotFormData] = useState({
    class_id: '',
    subject_id: '',
    teacher_id: '',
    day_of_week: 2,
    period: 1,
    room: '',
    academic_year_id: '',
    semester_id: '',
  });
  const [slotConflictError, setSlotConflictError] = useState(null);
  const [isSavingSlot, setIsSavingSlot] = useState(false);

  // Timetable Delete Modal
  const [slotToDelete, setSlotToDelete] = useState(null);
  const [isDeleteSlotModalOpen, setIsDeleteSlotModalOpen] = useState(false);
  const [isDeletingSlot, setIsDeletingSlot] = useState(false);

  // Financials & Audit
  const [financials, setFinancials] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);

  const showToast = (msg) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  // Fetch overview data
  const fetchOverview = async () => {
    const res = await adminApi.getOverview();
    if (res) setData(res);
  };

  useEffect(() => {
    fetchOverview();
  }, [lastSync]);

  const loadCurriculumData = async () => {
    setIsClassLoading(true);
    setClassError(null);
    try {
      const [classesRes, deptsRes, subsRes, yearsRes, teachersRes, assignsRes] = await Promise.all([
        academicStructureApi.listClasses({
          academicYearId: selectedAcademicYearFilter,
          gradeLevel: selectedGradeFilter,
          status: selectedStatusFilter,
          search: classSearch,
        }),
        academicStructureApi.listDepartments({ search: deptSearch }),
        academicStructureApi.listSubjects({
          departmentId: selectedSubjectDeptFilter,
          search: subjectSearch,
        }),
        academicYearsApi.list(),
        profilesApi.listTeachers(),
        teacherAssignmentsApi.getAssignments({
          search: assignmentSearch,
          role: selectedAssignmentRoleFilter,
          departmentId: selectedAssignmentDeptFilter,
        }),
      ]);
      setClassesList(classesRes || []);
      setDepartmentsList(deptsRes || []);
      setSubjectsList(subsRes || []);
      setAcademicYearsList(yearsRes || []);
      if (teachersRes?.teachers) setTeachersList(teachersRes.teachers);
      if (assignsRes?.assignments) setAssignmentsList(assignsRes.assignments);
      if (!newClassYearId && yearsRes?.length > 0) {
        const curr = yearsRes.find(y => y.is_current) || yearsRes[0];
        setNewClassYearId(curr.id);
      }
      if (classesRes?.length > 0 && !selectedTimetableClassId) {
        setSelectedTimetableClassId(classesRes[0].id);
      }
    } catch (err) {
      setClassError(err?.message || 'Không thể tải dữ liệu cấu trúc học vụ');
    } finally {
      setIsClassLoading(false);
    }
  };

  const loadTimetableSlots = async (classId = selectedTimetableClassId, yearId = selectedTimetableYearId, semId = selectedTimetableSemesterId) => {
    const targetClassId = classId || selectedTimetableClassId || classesList[0]?.id;
    if (!targetClassId) return;
    setIsTimetableLoading(true);
    setTimetableError(null);
    try {
      const params = { class_id: targetClassId };
      if (yearId) params.academic_year_id = yearId;
      if (semId) params.semester_id = semId;
      const res = await timetableApi.getSlots(params);
      if (res?.success) {
        setTimetableSlots(res.data?.slots || res.data || []);
      } else {
        setTimetableError(res?.message || 'Không thể tải thời khóa biểu');
      }
    } catch (err) {
      console.error('Failed to load timetable slots:', err);
      setTimetableError(err?.message || 'Lỗi khi tải thời khóa biểu');
    } finally {
      setIsTimetableLoading(false);
    }
  };

  useEffect(() => {
    if (curriculumSubTab === 'timetable') {
      loadTimetableSlots(selectedTimetableClassId, selectedTimetableYearId, selectedTimetableSemesterId);
    }
  }, [curriculumSubTab, selectedTimetableClassId, selectedTimetableYearId, selectedTimetableSemesterId]);

  const handleOpenAddSlotModal = (day = 2, period = 1) => {
    setSlotConflictError(null);
    const targetClassId = selectedTimetableClassId || classesList[0]?.id || '';
    const matchedClass = classesList.find(c => c.id === targetClassId);
    setSlotFormData({
      class_id: targetClassId,
      subject_id: subjectsList[0]?.id || '',
      teacher_id: teachersList[0]?.user_id || teachersList[0]?.id || '',
      day_of_week: day,
      period: period,
      room: matchedClass?.room_number || 'Phòng 301',
      academic_year_id: selectedTimetableYearId || '',
      semester_id: selectedTimetableSemesterId || '',
    });
    setIsCreateSlotModalOpen(true);
  };

  const handleSaveSlot = async (e) => {
    if (e) e.preventDefault();
    setSlotConflictError(null);
    setIsSavingSlot(true);
    try {
      const res = await timetableApi.createSlot({
        ...slotFormData,
        day_of_week: Number(slotFormData.day_of_week),
        period: Number(slotFormData.period),
      });
      if (res?.success) {
        setIsCreateSlotModalOpen(false);
        showToast('Đã thêm tiết học thành công!');
        await loadTimetableSlots(slotFormData.class_id, selectedTimetableYearId, selectedTimetableSemesterId);
      } else {
        setSlotConflictError(res?.message || 'Không thể tạo tiết học');
      }
    } catch (err) {
      console.error('Error creating slot:', err);
      const errDetail = err?.response?.data || err;
      const errCode = errDetail?.error?.code || errDetail?.code;
      if (errCode === 'CLASS_COLLISION' || err?.message?.includes('CLASS_COLLISION')) {
        setSlotConflictError(`Xung đột: Lớp này đã có môn học khác vào Tiết ${slotFormData.period} Thứ ${slotFormData.day_of_week}!`);
      } else if (errCode === 'TEACHER_COLLISION' || err?.message?.includes('TEACHER_COLLISION')) {
        setSlotConflictError(`Xung đột: Giáo viên đã có lịch dạy ở lớp khác vào Tiết ${slotFormData.period} Thứ ${slotFormData.day_of_week}!`);
      } else if (errCode === 'ROOM_COLLISION' || err?.message?.includes('ROOM_COLLISION')) {
        setSlotConflictError(`Xung đột: Phòng học "${slotFormData.room}" đã được xếp lịch vào Tiết ${slotFormData.period} Thứ ${slotFormData.day_of_week}!`);
      } else {
        setSlotConflictError(errDetail?.error?.message || err?.message || 'Lỗi khi lưu tiết học');
      }
    } finally {
      setIsSavingSlot(false);
    }
  };

  const handleDeleteSlotConfirm = async () => {
    if (!slotToDelete) return;
    setIsDeletingSlot(true);
    try {
      const res = await timetableApi.deleteSlot(slotToDelete.id);
      if (res?.success) {
        setIsDeleteSlotModalOpen(false);
        setSlotToDelete(null);
        showToast('Đã xóa tiết học khỏi thời khóa biểu');
        await loadTimetableSlots(selectedTimetableClassId, selectedTimetableYearId, selectedTimetableSemesterId);
      } else {
        alert(res?.message || 'Không thể xóa tiết học');
      }
    } catch (err) {
      alert(err?.message || 'Lỗi khi xóa tiết học');
    } finally {
      setIsDeletingSlot(false);
    }
  };

  const handleOpenCreateAssignmentModal = () => {
    setNewAssignTeacherId(teachersList[0]?.user_id || teachersList[0]?.id || '');
    setNewAssignClassId(classesList[0]?.id || '');
    setNewAssignSubjectId(subjectsList[0]?.id || '');
    const currYear = academicYearsList.find(y => y.is_current) || academicYearsList[0];
    setNewAssignYearId(currYear?.id || '');
    setNewAssignSemesterId('');
    setNewAssignRole('primary');
    setNewAssignNotes('');
    setAssignmentFormError(null);
    setIsCreateAssignmentModalOpen(true);
  };

  const handleSaveNewAssignment = async (e) => {
    e.preventDefault();
    if (!newAssignTeacherId || !newAssignClassId || !newAssignSubjectId) {
      setAssignmentFormError('Vui lòng chọn đầy đủ Giáo viên, Lớp học và Môn học');
      return;
    }
    setIsSavingAssignment(true);
    setAssignmentFormError(null);
    try {
      const res = await teacherAssignmentsApi.createAssignment({
        teacherId: newAssignTeacherId,
        classId: newAssignClassId,
        subjectId: newAssignSubjectId,
        academicYearId: newAssignYearId || undefined,
        semesterId: newAssignSemesterId || null,
        role: newAssignRole,
        notes: newAssignNotes || undefined,
      });
      if (res?.success) {
        showToast('Đã tạo phân công giảng dạy thành công!');
        setIsCreateAssignmentModalOpen(false);
        await loadCurriculumData();
      } else {
        setAssignmentFormError(res?.message || 'Không thể tạo phân công');
      }
    } catch (err) {
      setAssignmentFormError(err?.message || 'Lỗi khi lưu phân công giảng dạy');
    } finally {
      setIsSavingAssignment(false);
    }
  };

  const handleOpenEditAssignmentModal = (assignment) => {
    setSelectedAssignmentForEdit(assignment);
    setEditAssignRole(assignment.role || 'primary');
    setEditAssignStatus(assignment.status || 'active');
    setEditAssignNotes(assignment.notes || '');
    setAssignmentFormError(null);
    setIsEditAssignmentModalOpen(true);
  };

  const handleSaveEditAssignment = async (e) => {
    e.preventDefault();
    if (!selectedAssignmentForEdit) return;
    setIsUpdatingAssignment(true);
    setAssignmentFormError(null);
    try {
      const res = await teacherAssignmentsApi.updateAssignment(selectedAssignmentForEdit.id, {
        role: editAssignRole,
        status: editAssignStatus,
        notes: editAssignNotes,
      });
      if (res?.success) {
        showToast('Đã cập nhật phân công giảng dạy thành công!');
        setIsEditAssignmentModalOpen(false);
        setSelectedAssignmentForEdit(null);
        await loadCurriculumData();
      } else {
        setAssignmentFormError(res?.message || 'Không thể cập nhật phân công');
      }
    } catch (err) {
      setAssignmentFormError(err?.message || 'Lỗi cập nhật phân công giảng dạy');
    } finally {
      setIsUpdatingAssignment(false);
    }
  };

  const handleDeleteAssignmentConfirm = async () => {
    if (!selectedAssignmentForDelete) return;
    try {
      const res = await teacherAssignmentsApi.deleteAssignment(selectedAssignmentForDelete.id);
      if (res?.success) {
        showToast('Đã thu hồi / xóa phân công giảng dạy thành công!');
        setIsDeleteAssignmentModalOpen(false);
        setSelectedAssignmentForDelete(null);
        await loadCurriculumData();
      }
    } catch (err) {
      showToast(err?.message || 'Lỗi khi xóa phân công');
    }
  };

  // Fetch tab-specific data
  useEffect(() => {
    if (activeTab === 'roles') {
      adminApi.getUsers({ role: userRoleFilter, search: userSearch }).then((res) => {
        if (res) setUsers(res);
      });
    } else if (activeTab === 'curriculum') {
      loadCurriculumData();
    } else if (activeTab === 'teachers') {
      profilesApi.listTeachers().then((res) => {
        if (res?.teachers) setTeachersList(res.teachers);
      });
      adminApi.getClasses().then((res) => {
        if (res) setClassesList(res);
      });
    } else if (activeTab === 'students') {
      profilesApi.listStudents().then((res) => {
        if (res?.students) setStudentsList(res.students);
      });
      adminApi.getClasses().then((res) => {
        if (res) setClassesList(res);
      });
      profilesApi.listParents().then((res) => {
        if (res?.parents) setParentsList(res.parents);
      });
    } else if (activeTab === 'reports') {
      adminApi.getFinancials().then((res) => {
        if (res) setFinancials(res);
      });
    } else if (activeTab === 'settings') {
      adminApi.getAuditLogs().then((res) => {
        if (res) setAuditLogs(res);
      });
    }
  }, [
    activeTab,
    userRoleFilter,
    userSearch,
    selectedAcademicYearFilter,
    selectedGradeFilter,
    selectedStatusFilter,
    classSearch,
    selectedSubjectDeptFilter,
    subjectSearch,
    deptSearch,
    lastSync,
  ]);

  const handleSyncMoet = async () => {
    setIsSyncing(true);
    try {
      await adminApi.syncMoet();
      await triggerSync();
      setSyncSuccess(true);
      showToast('Đồng bộ cơ sở dữ liệu học bạ số với Bộ GD&ĐT thành công!');
      await fetchOverview();
      setTimeout(() => setSyncSuccess(false), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastTitle.trim()) return;
    setBroadcastSent(true);
    try {
      await adminApi.broadcastNotice(broadcastTitle, broadcastContent);
      await triggerSync();
      showToast('Đã phát thông báo khẩn toàn trường tới tất cả các phân hệ!');
      await fetchOverview();
      setTimeout(() => {
        setBroadcastSent(false);
        setIsBroadcastModalOpen(false);
        setBroadcastTitle('');
        setBroadcastContent('');
      }, 1200);
    } catch {
      setBroadcastSent(false);
    }
  };

  // User Actions
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setIsSavingUser(true);
    try {
      const res = await adminApi.createUser({
        name: newUserName,
        username: newUserUsername,
        email: newUserEmail,
        role: newUserRole,
        code: newUserCode,
        phone: newUserPhone,
        classId: newUserClass,
      });
      if (res?.success) {
        showToast(`Tạo tài khoản ${newUserName} thành công!`);
        setIsCreateUserModalOpen(false);
        setNewUserName('');
        setNewUserUsername('');
        setNewUserEmail('');
        setNewUserCode('');
        setNewUserPhone('');
        await triggerSync();
        const updated = await adminApi.getUsers({ role: userRoleFilter, search: userSearch });
        if (updated) setUsers(updated);
      } else {
        alert(res?.message || 'Không thể tạo tài khoản');
      }
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleResetPassword = async (userId, name) => {
    if (confirm(`Bạn có chắc chắn muốn đặt lại mật khẩu cho ${name} về mặc định (123456)?`)) {
      await adminApi.resetPassword(userId);
      await triggerSync();
      showToast(`Mật khẩu của ${name} đã được đặt lại về 123456`);
    }
  };

  const handleDeleteUser = async (userId, name) => {
    if (confirm(`Bạn có chắc chắn muốn xóa tài khoản ${name}?`)) {
      await adminApi.deleteUser(userId);
      await triggerSync();
      showToast(`Đã xóa tài khoản ${name} khỏi hệ thống`);
      const updated = await adminApi.getUsers({ role: userRoleFilter, search: userSearch });
      if (updated) setUsers(updated);
    }
  };

  // =========================================================================
  // ACADEMIC STRUCTURE HANDLERS (Classes, Subjects, Departments)
  // =========================================================================

  // Classes
  const handleCreateClass = async (e) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    setIsSavingClass(true);
    try {
      const res = await academicStructureApi.createClass({
        name: newClassName.trim(),
        gradeLevel: Number(newClassGrade),
        academicYearId: newClassYearId || undefined,
        homeroomTeacherId: newClassTeacher || null,
        room: newClassRoom,
        maxCapacity: Number(newClassCapacity),
      });
      if (res?.success) {
        showToast(`Đã mở lớp ${newClassName} thành công!`);
        setIsCreateClassModalOpen(false);
        setNewClassName('');
        setNewClassTeacher('');
        await loadCurriculumData();
        await triggerSync();
      } else {
        alert(res?.message || 'Không thể tạo lớp học');
      }
    } catch (err) {
      alert(err?.message || 'Lỗi khi tạo lớp học');
    } finally {
      setIsSavingClass(false);
    }
  };

  const handleOpenEditClass = (cls) => {
    setEditingClass({
      ...cls,
      name: cls.name,
      gradeLevel: cls.grade_level,
      academicYearId: cls.academic_year_id || '',
      homeroomTeacherId: cls.homeroom_teacher_id || '',
      room: cls.room || 'Phòng 301',
      maxCapacity: cls.max_capacity || cls.max_students || 45,
      status: cls.status || 'active',
    });
    setIsEditClassModalOpen(true);
  };

  const handleSaveEditClass = async (e) => {
    e.preventDefault();
    if (!editingClass) return;
    setIsSavingClass(true);
    try {
      const res = await academicStructureApi.updateClass(editingClass.id, {
        name: editingClass.name,
        gradeLevel: Number(editingClass.gradeLevel),
        academicYearId: editingClass.academicYearId || undefined,
        homeroomTeacherId: editingClass.homeroomTeacherId || null,
        room: editingClass.room,
        maxCapacity: Number(editingClass.maxCapacity),
        status: editingClass.status,
      });
      if (res?.success) {
        showToast(`Cập nhật thông tin lớp ${editingClass.name} thành công!`);
        setIsEditClassModalOpen(false);
        setEditingClass(null);
        await loadCurriculumData();
        await triggerSync();
      } else {
        alert(res?.message || 'Không thể cập nhật lớp học');
      }
    } catch (err) {
      alert(err?.message || 'Lỗi khi cập nhật lớp học');
    } finally {
      setIsSavingClass(false);
    }
  };

  const handleArchiveClass = async (cls) => {
    if (confirm(`Bạn có chắc chắn muốn chuyển lớp ${cls.name} sang trạng thái "Lưu trữ" (archived)?\nDữ liệu học bạ và điểm số vẫn được bảo lưu an toàn.`)) {
      const res = await academicStructureApi.archiveClass(cls.id);
      if (res?.success) {
        showToast(`Đã chuyển lớp ${cls.name} vào kho lưu trữ`);
        await loadCurriculumData();
        await triggerSync();
      } else {
        alert(res?.message || 'Không thể lưu trữ lớp học');
      }
    }
  };

  const handleOpenDeleteClass = (cls) => {
    setClassToDelete(cls);
    setIsDeleteClassModalOpen(true);
  };

  const handleConfirmDeleteClass = async () => {
    if (!classToDelete) return;
    setIsDeletingClass(true);
    try {
      const res = await academicStructureApi.deleteClass(classToDelete.id);
      if (res?.success) {
        showToast(`Đã xóa lớp ${classToDelete.name} thành công`);
        setIsDeleteClassModalOpen(false);
        setClassToDelete(null);
        await loadCurriculumData();
        await triggerSync();
      } else {
        alert(res?.message || 'Không thể xóa lớp học');
      }
    } catch (err) {
      alert(err?.message || 'Lỗi khi xóa lớp học');
    } finally {
      setIsDeletingClass(false);
    }
  };

  const handleViewClassDetails = async (cls) => {
    setViewingClassDetails(cls);
    setIsLoadingRoster(true);
    try {
      const rosterRes = await enrollmentsApi.getClassRoster(cls.id);
      if (rosterRes?.roster) {
        setClassRoster(rosterRes.roster);
      } else {
        const roster = await academicStructureApi.getClassStudents(cls.id);
        setClassRoster(roster || []);
      }
    } catch {
      setClassRoster([]);
    } finally {
      setIsLoadingRoster(false);
    }
  };

  const refreshCurrentRoster = async () => {
    if (!viewingClassDetails) return;
    setIsLoadingRoster(true);
    try {
      const rosterRes = await enrollmentsApi.getClassRoster(viewingClassDetails.id);
      if (rosterRes?.roster) {
        setClassRoster(rosterRes.roster);
      } else {
        const fallback = await academicStructureApi.getClassStudents(viewingClassDetails.id);
        setClassRoster(fallback || []);
      }
    } catch {
      setClassRoster([]);
    } finally {
      setIsLoadingRoster(false);
    }
  };

  const handleOpenEnrollModal = async () => {
    if (studentsList.length === 0) {
      try {
        const res = await profilesApi.listStudents({ limit: 100 });
        if (res?.students) setStudentsList(res.students);
      } catch (err) {
        console.error(err);
      }
    }
    setEnrollStudentId('');
    setEnrollDate(new Date().toISOString().split('T')[0]);
    setEnrollNotes('');
    setIsEnrollModalOpen(true);
  };

  const handleSubmitEnroll = async (e) => {
    e.preventDefault();
    if (!enrollStudentId || !viewingClassDetails) return;
    setIsEnrolling(true);
    try {
      const res = await enrollmentsApi.enrollStudent({
        studentId: enrollStudentId,
        classId: viewingClassDetails.id,
        enrollmentDate: enrollDate,
        notes: enrollNotes,
      });
      if (res?.success) {
        showToast('Ghi danh học sinh vào lớp thành công!');
        setIsEnrollModalOpen(false);
        await refreshCurrentRoster();
        await loadCurriculumData();
        await triggerSync();
      } else {
        alert(res?.message || 'Không thể ghi danh học sinh');
      }
    } catch (err) {
      alert(err?.message || 'Lỗi khi ghi danh học sinh');
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleOpenTransferModal = (student) => {
    setTransferStudentData(student);
    const otherClasses = classesList.filter((c) => c.id !== viewingClassDetails?.id && c.status === 'active');
    setTransferTargetClassId(otherClasses[0]?.id || '');
    setTransferDate(new Date().toISOString().split('T')[0]);
    setTransferReason('');
    setTransferNotes('');
    setIsTransferModalOpen(true);
  };

  const handleSubmitTransfer = async (e) => {
    e.preventDefault();
    if (!transferStudentData || !transferTargetClassId || !transferReason.trim()) return;
    setIsTransferring(true);
    try {
      const res = await enrollmentsApi.transferStudent({
        studentId: transferStudentData.student_id,
        targetClassId: transferTargetClassId,
        transferDate: transferDate,
        reason: transferReason.trim(),
        notes: transferNotes,
      });
      if (res?.success) {
        showToast(`Đã chuyển học sinh ${transferStudentData.name} sang lớp mới thành công!`);
        setIsTransferModalOpen(false);
        setTransferStudentData(null);
        await refreshCurrentRoster();
        await loadCurriculumData();
        await triggerSync();
      } else {
        alert(res?.message || 'Không thể chuyển lớp cho học sinh');
      }
    } catch (err) {
      alert(err?.message || 'Lỗi khi chuyển lớp');
    } finally {
      setIsTransferring(false);
    }
  };

  const handleOpenWithdrawModal = (student) => {
    setWithdrawStudentData(student);
    setWithdrawDate(new Date().toISOString().split('T')[0]);
    setWithdrawReason('');
    setWithdrawNotes('');
    setIsWithdrawModalOpen(true);
  };

  const handleSubmitWithdraw = async (e) => {
    e.preventDefault();
    if (!withdrawStudentData || !withdrawReason.trim()) return;
    setIsWithdrawing(true);
    try {
      const res = await enrollmentsApi.withdrawStudent({
        studentId: withdrawStudentData.student_id,
        withdrawalDate: withdrawDate,
        reason: withdrawReason.trim(),
        notes: withdrawNotes,
      });
      if (res?.success) {
        showToast(`Đã rút học sinh ${withdrawStudentData.name} khỏi lớp`);
        setIsWithdrawModalOpen(false);
        setWithdrawStudentData(null);
        await refreshCurrentRoster();
        await loadCurriculumData();
        await triggerSync();
      } else {
        alert(res?.message || 'Không thể rút học sinh');
      }
    } catch (err) {
      alert(err?.message || 'Lỗi khi rút học sinh');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleOpenHistoryModal = async (student) => {
    setHistoryStudentData(student);
    setIsHistoryModalOpen(true);
    setIsLoadingHistory(true);
    try {
      const res = await enrollmentsApi.getStudentHistory(student.student_id);
      setStudentEnrollmentHistory(res?.history || []);
    } catch {
      setStudentEnrollmentHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleOpenBulkEnrollModal = async () => {
    if (studentsList.length === 0) {
      try {
        const res = await profilesApi.listStudents({ limit: 100 });
        if (res?.students) setStudentsList(res.students);
      } catch (err) {
        console.error(err);
      }
    }
    setBulkSelectedStudentIds([]);
    setIsBulkEnrollModalOpen(true);
  };

  const handleSubmitBulkEnroll = async (e) => {
    e.preventDefault();
    if (bulkSelectedStudentIds.length === 0 || !viewingClassDetails) return;
    setIsBulkEnrolling(true);
    try {
      const res = await enrollmentsApi.bulkEnroll({
        classId: viewingClassDetails.id,
        studentIds: bulkSelectedStudentIds,
        enrollmentDate: new Date().toISOString().split('T')[0],
      });
      if (res?.success) {
        showToast(`Đã ghi danh ${bulkSelectedStudentIds.length} học sinh vào lớp ${viewingClassDetails.name}!`);
        setIsBulkEnrollModalOpen(false);
        setBulkSelectedStudentIds([]);
        await refreshCurrentRoster();
        await loadCurriculumData();
        await triggerSync();
      } else {
        alert(res?.message || 'Không thể ghi danh hàng loạt');
      }
    } catch (err) {
      alert(err?.message || 'Lỗi khi ghi danh hàng loạt');
    } finally {
      setIsBulkEnrolling(false);
    }
  };

  // Subjects Handlers
  const handleOpenCreateSubject = () => {
    setEditingSubject(null);
    setSubjectFormData({
      name: '',
      code: '',
      departmentId: departmentsList[0]?.id || '',
      gradeLevel: '',
      weeklyPeriods: 3,
      credits: 2.0,
      status: 'active',
      description: '',
    });
    setIsSubjectModalOpen(true);
  };

  const handleOpenEditSubject = (sub) => {
    setEditingSubject(sub);
    setSubjectFormData({
      name: sub.name,
      code: sub.code,
      departmentId: sub.department_id || '',
      gradeLevel: sub.grade_level || '',
      weeklyPeriods: sub.weekly_periods || 3,
      credits: sub.credits || 2.0,
      status: sub.status || 'active',
      description: sub.description || '',
    });
    setIsSubjectModalOpen(true);
  };

  const handleSaveSubject = async (e) => {
    e.preventDefault();
    if (!subjectFormData.name.trim() || !subjectFormData.code.trim()) return;
    setIsSavingSubject(true);
    try {
      const payload = {
        ...subjectFormData,
        name: subjectFormData.name.trim(),
        code: subjectFormData.code.trim().toUpperCase(),
        departmentId: subjectFormData.departmentId || null,
        gradeLevel: subjectFormData.gradeLevel ? Number(subjectFormData.gradeLevel) : null,
        weeklyPeriods: Number(subjectFormData.weeklyPeriods) || 3,
        credits: Number(subjectFormData.credits) || 2.0,
      };
      const res = editingSubject
        ? await academicStructureApi.updateSubject(editingSubject.id, payload)
        : await academicStructureApi.createSubject(payload);

      if (res?.success) {
        showToast(editingSubject ? `Cập nhật môn ${payload.name} thành công!` : `Thêm môn học mới thành công!`);
        setIsSubjectModalOpen(false);
        setEditingSubject(null);
        await loadCurriculumData();
      } else {
        alert(res?.message || 'Không thể lưu thông tin môn học');
      }
    } catch (err) {
      alert(err?.message || 'Lỗi khi lưu môn học');
    } finally {
      setIsSavingSubject(false);
    }
  };

  const handleDeleteSubject = async (sub) => {
    if (confirm(`Bạn có chắc chắn muốn xóa môn học "${sub.name}" (${sub.code})?`)) {
      try {
        const res = await academicStructureApi.deleteSubject(sub.id);
        if (res?.success) {
          showToast(`Đã xóa môn học ${sub.name}`);
          await loadCurriculumData();
        } else {
          alert(res?.message || 'Không thể xóa môn học');
        }
      } catch (err) {
        alert(err?.message || 'Lỗi khi xóa môn học');
      }
    }
  };

  // Departments Handlers
  const handleOpenCreateDept = () => {
    setEditingDept(null);
    setDeptFormData({
      name: '',
      code: '',
      description: '',
      headTeacherId: '',
    });
    setIsDeptModalOpen(true);
  };

  const handleOpenEditDept = (dept) => {
    setEditingDept(dept);
    setDeptFormData({
      name: dept.name,
      code: dept.code || '',
      description: dept.description || '',
      headTeacherId: dept.head_teacher_id || '',
    });
    setIsDeptModalOpen(true);
  };

  const handleSaveDept = async (e) => {
    e.preventDefault();
    if (!deptFormData.name.trim()) return;
    setIsSavingDept(true);
    try {
      const payload = {
        name: deptFormData.name.trim(),
        code: deptFormData.code ? deptFormData.code.trim().toUpperCase() : null,
        description: deptFormData.description ? deptFormData.description.trim() : null,
        headTeacherId: deptFormData.headTeacherId || null,
      };
      const res = editingDept
        ? await academicStructureApi.updateDepartment(editingDept.id, payload)
        : await academicStructureApi.createDepartment(payload);

      if (res?.success) {
        showToast(editingDept ? `Cập nhật tổ chuyên môn thành công!` : `Tạo tổ chuyên môn mới thành công!`);
        setIsDeptModalOpen(false);
        setEditingDept(null);
        await loadCurriculumData();
      } else {
        alert(res?.message || 'Không thể lưu tổ chuyên môn');
      }
    } catch (err) {
      alert(err?.message || 'Lỗi khi lưu tổ chuyên môn');
    } finally {
      setIsSavingDept(false);
    }
  };

  const handleDeleteDept = async (dept) => {
    if (confirm(`Bạn có chắc chắn muốn xóa tổ chuyên môn "${dept.name}"?`)) {
      try {
        const res = await academicStructureApi.deleteDepartment(dept.id);
        if (res?.success) {
          showToast(`Đã xóa tổ ${dept.name}`);
          await loadCurriculumData();
        } else {
          alert(res?.message || 'Không thể xóa tổ chuyên môn');
        }
      } catch (err) {
        alert(err?.message || 'Lỗi khi xóa tổ chuyên môn');
      }
    }
  };

  // Profile Management Handlers
  const handleOpenEditTeacher = (teacher) => {
    setEditingTeacher({
      ...teacher,
      employeeId: teacher.employee_id || teacher.code || '',
      departmentId: teacher.department_id || 'dept_math_it',
      homeroomClassId: teacher.homeroom_class_id || '',
      qualification: teacher.qualification || '',
      specialty: teacher.specialty || '',
      status: teacher.status || 'active',
      contactEmail: teacher.contact_email || teacher.email || '',
      contactPhone: teacher.contact_phone || teacher.phone || '',
      officeRoom: teacher.office_room || '',
      bio: teacher.bio || '',
    });
    setIsEditTeacherModalOpen(true);
  };

  const handleSaveTeacher = async (e) => {
    e.preventDefault();
    if (!editingTeacher) return;
    try {
      await profilesApi.updateTeacher(editingTeacher.id, {
        employeeId: editingTeacher.employeeId,
        departmentId: editingTeacher.departmentId || null,
        homeroomClassId: editingTeacher.homeroomClassId || null,
        qualification: editingTeacher.qualification,
        specialty: editingTeacher.specialty,
        status: editingTeacher.status,
        contactEmail: editingTeacher.contactEmail,
        contactPhone: editingTeacher.contactPhone,
        officeRoom: editingTeacher.officeRoom,
        bio: editingTeacher.bio,
      });
      showToast('Cập nhật hồ sơ giáo viên thành công!');
      setIsEditTeacherModalOpen(false);
      const res = await profilesApi.listTeachers();
      if (res?.teachers) setTeachersList(res.teachers);
    } catch (err) {
      alert(err?.message || 'Lỗi khi lưu hồ sơ giáo viên');
    }
  };

  const handleOpenEditStudent = (student) => {
    setEditingStudent({
      ...student,
      studentCode: student.student_code || student.code || '',
      currentClassId: student.current_class_id || student.class_id || 'cls_10A1',
      dob: student.dob ? student.dob.split('T')[0] : '2008-05-15',
      gender: student.gender || 'male',
      address: student.address || '',
      enrollmentStatus: student.enrollment_status || 'active',
    });
    setIsEditStudentModalOpen(true);
  };

  const handleSaveStudent = async (e) => {
    e.preventDefault();
    if (!editingStudent) return;
    try {
      await profilesApi.updateStudent(editingStudent.id, {
        studentCode: editingStudent.studentCode,
        currentClassId: editingStudent.currentClassId,
        dob: editingStudent.dob,
        gender: editingStudent.gender,
        address: editingStudent.address,
        enrollmentStatus: editingStudent.enrollmentStatus,
      });
      showToast('Cập nhật hồ sơ học sinh thành công!');
      setIsEditStudentModalOpen(false);
      const res = await profilesApi.listStudents();
      if (res?.students) setStudentsList(res.students);
    } catch (err) {
      alert(err?.message || 'Lỗi khi lưu hồ sơ học sinh');
    }
  };

  const handleOpenGuardians = async (student) => {
    setManagingGuardiansStudent(student);
    const guardians = await profilesApi.getStudentGuardians(student.id);
    setStudentGuardians(guardians || []);
    setIsGuardiansModalOpen(true);
  };

  const handleAssignGuardian = async (e) => {
    e.preventDefault();
    if (!managingGuardiansStudent || !assignParentId) return;
    try {
      await profilesApi.assignGuardian(managingGuardiansStudent.id, {
        parentId: assignParentId,
        relationship: assignRelationship,
        isPrimaryContact: assignIsPrimary,
        isVerified: assignIsVerified,
      });
      showToast('Gán người giám hộ thành công!');
      const updated = await profilesApi.getStudentGuardians(managingGuardiansStudent.id);
      setStudentGuardians(updated || []);
      setAssignParentId('');
    } catch (err) {
      alert(err?.message || 'Lỗi khi gán người giám hộ');
    }
  };

  const handleRemoveGuardian = async (parentId) => {
    if (!managingGuardiansStudent) return;
    if (confirm('Bạn có chắc chắn muốn gỡ liên kết người giám hộ này?')) {
      try {
        await profilesApi.removeGuardian(managingGuardiansStudent.id, parentId);
        showToast('Đã gỡ người giám hộ thành công!');
        const updated = await profilesApi.getStudentGuardians(managingGuardiansStudent.id);
        setStudentGuardians(updated || []);
      } catch (err) {
        alert(err?.message || 'Lỗi khi gỡ người giám hộ');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Global Toast */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-primary text-white px-5 py-3 rounded-card shadow-whisper flex items-center gap-3 border border-ocean/30 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
          <span className="text-xs font-medium">{feedbackToast}</span>
        </div>
      )}

      {/* Top Header & Executive Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-text-secondary mb-1">
            <span>Ban Giám Hiệu</span>
            <span>/</span>
            <span className="text-text-primary font-medium">
              {activeTab === 'overview' && 'Tổng quan toàn trường'}
              {activeTab === 'roles' && 'Phân quyền & Quản trị tài khoản'}
              {activeTab === 'curriculum' && 'Chuyên môn & Khối lớp'}
              {activeTab === 'teachers' && 'Hội đồng Sư phạm'}
              {activeTab === 'students' && 'Học sinh & Điểm số'}
              {activeTab === 'reports' && 'Báo cáo & Cổng thông báo'}
              {activeTab === 'announcements' && 'Quản lý Thông báo'}
              {activeTab === 'settings' && 'Cài đặt hệ thống & Kiểm toán'}
            </span>
            <span className="text-[11px] text-text-secondary">• {data.lastSync}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-medium text-text-primary">
              {activeTab === 'overview' && 'Tổng quan tình hình trường học'}
              {activeTab === 'roles' && 'Danh mục tài khoản người dùng'}
              {activeTab === 'curriculum' && 'Cơ cấu tổ chức lớp học & Khối'}
              {activeTab === 'teachers' && 'Danh mục Hội đồng Sư phạm'}
              {activeTab === 'students' && 'Đánh giá học lực & Xếp hạng toàn trường'}
              {activeTab === 'reports' && 'Cổng thông báo & Tài chính số VietQR'}
              {activeTab === 'announcements' && 'Quản lý Thông báo nhà trường'}
              {activeTab === 'settings' && 'Nhật ký kiểm toán & Cấu hình bảo mật'}
            </h1>
            <Badge variant="success" size="sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Trực tuyến</span>
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="h-10 px-3 bg-white border border-hairline rounded text-xs font-medium text-text-primary focus:border-ocean outline-none"
          >
            <option>Năm học 2024 - 2025</option>
            <option>Năm học 2023 - 2024</option>
          </select>

          <select
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            className="h-10 px-3 bg-white border border-hairline rounded text-xs font-medium text-text-primary focus:border-ocean outline-none"
          >
            <option>Học kỳ II (Hiện tại)</option>
            <option>Học kỳ I</option>
          </select>

          <Button
            variant="secondary"
            size="md"
            icon={Download}
            onClick={() => window.print()}
          >
            Xuất PDF/In
          </Button>

          <Button
            variant="primary"
            size="md"
            icon={Bell}
            onClick={() => setIsBroadcastModalOpen(true)}
          >
            Thông báo toàn trường
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW DASHBOARD                                                 */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 4 Large Institutional KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card
              padding="p-5"
              className="cursor-pointer hover:border-ocean transition-colors"
              onClick={() => onTabChange?.('students')}
            >
              <div className="flex items-start justify-between">
                <div className="text-[11px] font-medium text-text-secondary uppercase tracking-wider">
                  Tổng học sinh
                </div>
                <div className="w-8 h-8 rounded bg-surface-neutral flex items-center justify-center text-primary">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-semibold text-primary">{data.kpis.students.total}</span>
                <Badge variant="success" size="sm">{data.kpis.students.diff}</Badge>
              </div>
              <div className="text-xs text-text-secondary mt-2 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                <span>{data.kpis.students.subStatus}</span>
              </div>
            </Card>

            <Card
              padding="p-5"
              className="cursor-pointer hover:border-ocean transition-colors"
              onClick={() => onTabChange?.('teachers')}
            >
              <div className="flex items-start justify-between">
                <div className="text-[11px] font-medium text-text-secondary uppercase tracking-wider">
                  Tổng giáo viên
                </div>
                <div className="w-8 h-8 rounded bg-surface-neutral flex items-center justify-center text-primary">
                  <Briefcase className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-semibold text-primary">{data.kpis.teachers.total}</span>
                <Badge variant="info" size="sm">{data.kpis.teachers.active} trực tiếp</Badge>
              </div>
              <div className="text-xs text-text-secondary mt-2">
                Tỷ lệ HS/GV: <strong>{data.kpis.teachers.ratio}</strong>
              </div>
            </Card>

            <Card
              padding="p-5"
              className="cursor-pointer hover:border-ocean transition-colors"
              onClick={() => onTabChange?.('curriculum')}
            >
              <div className="flex items-start justify-between">
                <div className="text-[11px] font-medium text-text-secondary uppercase tracking-wider">
                  Quy mô lớp học
                </div>
                <div className="w-8 h-8 rounded bg-surface-neutral flex items-center justify-center text-primary">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-semibold text-primary">{data.kpis.classes.total}</span>
                <span className="text-sm font-normal text-text-secondary">lớp</span>
              </div>
              <div className="text-xs text-text-secondary mt-2">
                {data.kpis.classes.breakdown} • {data.kpis.classes.occupancy}
              </div>
            </Card>

            <Card
              padding="p-5"
              className="cursor-pointer hover:border-ocean transition-colors"
              onClick={() => onTabChange?.('students')}
            >
              <div className="flex items-start justify-between">
                <div className="text-[11px] font-medium text-text-secondary uppercase tracking-wider">
                  Điểm TB toàn trường
                </div>
                <div className="w-8 h-8 rounded bg-surface-neutral flex items-center justify-center text-primary">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-semibold text-primary">{data.kpis.averageGpa.score}</span>
                <span className="text-xs text-text-secondary">{data.kpis.averageGpa.scale}</span>
                <Badge variant="success" size="sm">{data.kpis.averageGpa.diff}</Badge>
              </div>
              <div className="text-xs text-text-secondary mt-2">
                {data.kpis.averageGpa.note}
              </div>
            </Card>
          </div>

          {/* Academic Charts: Left Grade Comparison, Right Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Card padding="p-6" className="lg:col-span-8 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-medium text-text-primary">
                    So sánh điểm trung bình các môn theo khối
                  </h2>
                  <p className="text-xs text-text-secondary">
                    Đánh giá đồng đều năng lực học thuật giữa các khối 10, 11 và 12
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-primary"></span>
                    <span>Khối 10</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-ocean"></span>
                    <span>Khối 11</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-sky-light border border-ocean/40"></span>
                    <span>Khối 12</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                {data.gradeSubjectComparison.map((item) => (
                  <div key={item.subject} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-text-primary">{item.subject}</span>
                      <span className="text-text-secondary font-mono">
                        ĐTB: <strong>{item.avg.toFixed(2)}</strong> (K10: {item.k10} • K11: {item.k11} • K12: {item.k12})
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 h-3 bg-surface-neutral rounded overflow-hidden p-0.5">
                      <div style={{ width: `${(item.k10 / 10) * 100}%` }} className="bg-primary h-full rounded-sm"></div>
                      <div style={{ width: `${(item.k11 / 10) * 100}%` }} className="bg-ocean h-full rounded-sm"></div>
                      <div style={{ width: `${(item.k12 / 10) * 100}%` }} className="bg-sky border border-ocean/30 h-full rounded-sm"></div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card padding="p-6" className="lg:col-span-4 space-y-4">
              <div>
                <h2 className="text-base font-medium text-text-primary">Phân bổ xếp loại học lực</h2>
                <p className="text-xs text-text-secondary">Quy chuẩn thông tư Bộ GD&ĐT</p>
              </div>

              <div className="space-y-3 pt-2">
                {data.distribution.groups.map((group) => (
                  <div key={group.name} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-text-primary font-medium">{group.name}</span>
                      <span className="text-text-secondary">
                        <strong>{group.percent}%</strong> ({group.count.toLocaleString('vi-VN')} em)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-surface-neutral rounded-full overflow-hidden">
                      <div
                        style={{ width: `${group.percent}%` }}
                        className={`h-full ${group.color} rounded-full`}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-surface-neutral rounded border border-hairline text-xs text-text-secondary space-y-1">
                <div className="font-semibold text-text-primary flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-success" />
                  <span>Chuẩn chất lượng trường trọng điểm</span>
                </div>
                <p className="leading-relaxed">
                  Tỷ lệ học sinh đạt chuẩn Xuất sắc và Giỏi chiếm 66% tổng sĩ số, vượt chỉ tiêu đầu năm 4.2%.
                </p>
              </div>
            </Card>
          </div>

          {/* Bottom Grid: Alerts & Audit Logs */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Card padding="p-6" className="lg:col-span-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning-dark" />
                  <h3 className="text-base font-medium text-text-primary">Cảnh báo can thiệp sư phạm</h3>
                </div>
                <Badge variant="warning">{data.academicAlerts.length} cảnh báo</Badge>
              </div>

              <div className="space-y-3">
                {data.academicAlerts.map((alert) => (
                  <div key={alert.id} className="p-4 bg-amber-50/70 border border-amber-200 rounded-card space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-900">{alert.class}</span>
                      <Badge variant="danger" size="sm">{alert.drop}</Badge>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">{alert.content}</p>
                    <div className="text-[11px] text-ocean font-medium pt-1">{alert.teacher}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card padding="p-6" className="lg:col-span-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <h3 className="text-base font-medium text-text-primary">Nhật ký hoạt động hệ thống</h3>
                </div>
                <button
                  onClick={() => onTabChange?.('settings')}
                  className="text-xs text-ocean hover:underline font-medium"
                >
                  Xem toàn bộ
                </button>
              </div>

              <div className="space-y-3">
                {data.recentActivities.slice(0, 5).map((act) => (
                  <div key={act.id} className="p-3 bg-surface-neutral/60 rounded border border-hairline flex items-center justify-between text-xs">
                    <span className="text-text-primary font-medium">{act.text}</span>
                    <Badge variant={act.badgeType} size="sm">{act.badge}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ROLES & USER ACCOUNTS                                              */}
      {/* ========================================================================= */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-medium text-text-primary">Quản lý phân quyền & Tài khoản</h2>
              <p className="text-xs text-text-secondary mt-1">
                Quản trị toàn bộ danh sách tài khoản Học sinh, Giáo viên, Phụ huynh và Cán bộ quản lý trên cơ sở dữ liệu trường.
              </p>
            </div>
            <Button
              variant="primary"
              size="md"
              icon={Plus}
              onClick={() => setIsCreateUserModalOpen(true)}
            >
              Thêm tài khoản mới
            </Button>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-card border border-hairline">
            <div className="flex items-center gap-2 overflow-x-auto">
              {[
                { id: 'all', label: 'Tất cả vai trò' },
                { id: 'teacher', label: 'Giáo viên' },
                { id: 'student', label: 'Học sinh' },
                { id: 'parent', label: 'Phụ huynh' },
                { id: 'admin', label: 'Ban giám hiệu' },
              ].map((rf) => (
                <button
                  key={rf.id}
                  onClick={() => setUserRoleFilter(rf.id)}
                  className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                    userRoleFilter === rf.id
                      ? 'bg-primary text-white'
                      : 'bg-surface-neutral text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {rf.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-text-secondary absolute left-3 top-2.5" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Tìm tên, username, mã..."
                className="w-full pl-9 pr-3 py-2 bg-surface-neutral border border-hairline rounded text-xs text-text-primary focus:outline-none focus:border-ocean"
              />
            </div>
          </div>

          {/* Users Table */}
          <Card padding="p-0" className="overflow-hidden">
            <div className="p-4 bg-surface-neutral hairline-b flex items-center justify-between text-xs">
              <span className="font-semibold text-text-primary">
                Tìm thấy {users.length} tài khoản người dùng
              </span>
              <span className="text-text-secondary">Trạng thái: 100% tài khoản bảo mật ISO 27001</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-neutral text-text-secondary font-medium border-b border-hairline">
                  <tr>
                    <th scope="col" className="py-3 px-4">Họ và tên</th>
                    <th scope="col" className="py-3 px-4">Tên đăng nhập / Mã</th>
                    <th scope="col" className="py-3 px-3 text-center">Vai trò</th>
                    <th scope="col" className="py-3 px-4">Email / SĐT</th>
                    <th scope="col" className="py-3 px-4">Đơn vị / Lớp</th>
                    <th scope="col" className="py-3 px-3 text-center">Trạng thái</th>
                    <th scope="col" className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-sky/20 transition-colors">
                      <th scope="row" className="py-3 px-4 text-left font-medium text-text-primary">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120&h=120'}
                            alt=""
                            className="w-7 h-7 rounded-full object-cover border border-hairline"
                          />
                          <span className="font-semibold text-text-primary">{u.name}</span>
                        </div>
                      </th>
                      <td className="py-3 px-4 font-mono">
                        <div className="text-text-primary font-medium">{u.username}</div>
                        <div className="text-[10px] text-text-secondary">{u.code}</div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge
                          variant={
                            u.role === 'admin'
                              ? 'danger'
                              : u.role === 'teacher'
                              ? 'primary'
                              : u.role === 'student'
                              ? 'info'
                              : 'neutral'
                          }
                          size="sm"
                        >
                          {u.role === 'admin'
                            ? 'BGH'
                            : u.role === 'teacher'
                            ? 'Giáo viên'
                            : u.role === 'student'
                            ? 'Học sinh'
                            : 'Phụ huynh'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-text-secondary">
                        <div>{u.email}</div>
                        <div className="text-[10px] font-mono">{u.phone}</div>
                      </td>
                      <td className="py-3 px-4 text-text-secondary font-medium">
                        {u.class_name || (u.role === 'teacher' ? 'Tổ chuyên môn' : 'Toàn trường')}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge variant="success" size="sm">Hoạt động</Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleResetPassword(u.id, u.name)}
                            title="Đặt lại mật khẩu về 123456"
                            className="p-1.5 hover:bg-hairline rounded text-ocean transition-colors"
                          >
                            <Key className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            title="Xóa tài khoản"
                            className="p-1.5 hover:bg-danger-light rounded text-danger transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CURRICULUM & ACADEMIC STRUCTURE                                    */}
      {/* ========================================================================= */}
      {activeTab === 'curriculum' && (
        <div className="space-y-6">
          {/* Header & Sub-Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-medium text-text-primary">Cơ cấu tổ chức học vụ & Chương trình</h2>
              <p className="text-xs text-text-secondary mt-1">
                Quản lý các lớp học chính khóa, danh mục môn học chuẩn hóa và cơ cấu tổ chuyên môn sư phạm.
              </p>
            </div>

            {/* Sub-tabs pills */}
            <div className="flex items-center bg-surface-neutral p-1 rounded-lg border border-hairline gap-1">
              <button
                onClick={() => setCurriculumSubTab('classes')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  curriculumSubTab === 'classes'
                    ? 'bg-white text-primary shadow-sm font-semibold'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Lớp học ({classesList.length})</span>
              </button>

              <button
                onClick={() => setCurriculumSubTab('subjects')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  curriculumSubTab === 'subjects'
                    ? 'bg-white text-primary shadow-sm font-semibold'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Môn học ({subjectsList.length})</span>
              </button>

              <button
                onClick={() => setCurriculumSubTab('departments')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  curriculumSubTab === 'departments'
                    ? 'bg-white text-primary shadow-sm font-semibold'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <FolderTree className="w-3.5 h-3.5" />
                <span>Tổ chuyên môn ({departmentsList.length})</span>
              </button>

              <button
                onClick={() => setCurriculumSubTab('assignments')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  curriculumSubTab === 'assignments'
                    ? 'bg-white text-primary shadow-sm font-semibold'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Phân công giảng dạy ({assignmentsList.length})</span>
              </button>

              <button
                onClick={() => setCurriculumSubTab('timetable')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  curriculumSubTab === 'timetable'
                    ? 'bg-white text-primary shadow-sm font-semibold'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Thời khóa biểu ({timetableSlots.length})</span>
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {classError && (
            <div className="p-3 bg-danger-light border border-danger/30 rounded-card flex items-center justify-between text-xs text-danger">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{classError}</span>
              </div>
              <Button size="sm" variant="ghost" onClick={loadCurriculumData}>
                Thử lại
              </Button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUB-VIEW 1: CLASSES ROSTER & MANAGEMENT                                   */}
          {/* ========================================================================= */}
          {curriculumSubTab === 'classes' && (
            <div className="space-y-4">
              {/* Filters Bar */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3 rounded-card border border-hairline">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Academic Year Filter */}
                  <select
                    value={selectedAcademicYearFilter}
                    onChange={(e) => setSelectedAcademicYearFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-surface-neutral border border-hairline rounded text-xs text-text-primary focus:outline-none focus:border-ocean"
                  >
                    <option value="">Tất cả năm học</option>
                    {academicYearsList.map((ay) => (
                      <option key={ay.id} value={ay.id}>
                        {ay.name} {ay.is_current ? '★ (Hiện tại)' : ''}
                      </option>
                    ))}
                  </select>

                  {/* Grade Filters */}
                  <div className="flex items-center gap-1">
                    {[
                      { id: '', label: 'Tất cả khối' },
                      { id: '10', label: 'Khối 10' },
                      { id: '11', label: 'Khối 11' },
                      { id: '12', label: 'Khối 12' },
                      { id: '7', label: 'Khối 7' },
                    ].map((gf) => (
                      <button
                        key={gf.id}
                        onClick={() => setSelectedGradeFilter(gf.id)}
                        className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                          selectedGradeFilter === gf.id
                            ? 'bg-primary text-white'
                            : 'bg-surface-neutral text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        {gf.label}
                      </button>
                    ))}
                  </div>

                  {/* Status Filter */}
                  <select
                    value={selectedStatusFilter}
                    onChange={(e) => setSelectedStatusFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-surface-neutral border border-hairline rounded text-xs text-text-primary focus:outline-none focus:border-ocean"
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="active">Đang hoạt động</option>
                    <option value="archived">Đã lưu trữ</option>
                    <option value="completed">Đã hoàn thành</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative w-full sm:w-56">
                    <Search className="w-3.5 h-3.5 text-text-secondary absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={classSearch}
                      onChange={(e) => setClassSearch(e.target.value)}
                      placeholder="Tìm lớp, phòng, GV..."
                      className="w-full pl-8 pr-3 py-1.5 bg-surface-neutral border border-hairline rounded text-xs text-text-primary focus:outline-none focus:border-ocean"
                    />
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    icon={Plus}
                    onClick={() => setIsCreateClassModalOpen(true)}
                  >
                    Mở lớp mới
                  </Button>
                </div>
              </div>

              {/* State: Loading */}
              {isClassLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((n) => (
                    <Card key={n} padding="p-5" className="animate-pulse space-y-3">
                      <div className="h-5 bg-hairline rounded w-1/2" />
                      <div className="h-16 bg-hairline/60 rounded" />
                      <div className="h-4 bg-hairline rounded w-1/3" />
                    </Card>
                  ))}
                </div>
              ) : classesList.length === 0 ? (
                /* State: Empty */
                <Card padding="p-8" className="text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-ocean-light flex items-center justify-center mx-auto text-ocean">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-semibold text-text-primary">Không tìm thấy lớp học nào</h3>
                  <p className="text-xs text-text-secondary max-w-md mx-auto">
                    Hiện chưa có lớp học nào thỏa mãn điều kiện tìm kiếm và bộ lọc của bạn. Bạn có thể mở lớp mới cho năm học này.
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Plus}
                    onClick={() => setIsCreateClassModalOpen(true)}
                  >
                    Mở lớp học đầu tiên
                  </Button>
                </Card>
              ) : (
                /* State: Success / Cards Grid */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {classesList.map((cls) => {
                    const capacity = cls.max_capacity || cls.max_students || 45;
                    const studentCount = cls.student_count || 0;
                    const fillPercent = Math.min(Math.round((studentCount / capacity) * 100), 100);

                    return (
                      <Card key={cls.id} padding="p-5" className="flex flex-col justify-between space-y-3 border-hairline hover:border-ocean/40 transition-colors">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold text-primary">Lớp {cls.name}</h3>
                                <Badge
                                  variant={
                                    cls.status === 'active' || !cls.status
                                      ? 'success'
                                      : cls.status === 'completed'
                                      ? 'info'
                                      : 'neutral'
                                  }
                                  size="sm"
                                >
                                  {cls.status === 'active' || !cls.status
                                    ? 'Đang học'
                                    : cls.status === 'completed'
                                    ? 'Đã xong'
                                    : 'Lưu trữ'}
                                </Badge>
                              </div>
                              <div className="text-xs text-text-secondary mt-0.5">
                                Khối {cls.grade_level} • Năm {cls.academic_year_name || cls.academic_year}
                              </div>
                            </div>
                            <Badge variant="info" size="sm" className="font-mono">
                              {cls.room || 'Phòng học'}
                            </Badge>
                          </div>

                          {/* Sĩ số & Sức chứa Indicator */}
                          <div className="p-3 bg-surface-neutral rounded border border-hairline text-xs space-y-2">
                            <div>
                              <div className="flex justify-between text-text-secondary mb-1">
                                <span>Sĩ số ghi danh:</span>
                                <span className="font-semibold text-text-primary font-mono">
                                  {studentCount} / {capacity} em ({fillPercent}%)
                                </span>
                              </div>
                              <div className="w-full bg-hairline rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    fillPercent >= 100
                                      ? 'bg-danger'
                                      : fillPercent >= 85
                                      ? 'bg-amber-500'
                                      : 'bg-ocean'
                                  }`}
                                  style={{ width: `${fillPercent}%` }}
                                />
                              </div>
                            </div>

                            <div className="flex justify-between pt-1">
                              <span className="text-text-secondary">Điểm TB học kỳ:</span>
                              <span className="font-bold text-ocean font-mono">
                                {cls.avg_gpa ? `${cls.avg_gpa} / 10` : 'Chưa có điểm'}
                              </span>
                            </div>

                            <div className="flex justify-between">
                              <span className="text-text-secondary">Giáo viên chủ nhiệm:</span>
                              <span className="font-medium text-primary truncate max-w-[160px]">
                                {cls.homeroom_teacher_name || 'Chưa phân công'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Card Actions */}
                        <div className="pt-2 hairline-t flex items-center justify-between text-xs">
                          <button
                            onClick={() => handleViewClassDetails(cls)}
                            className="text-ocean hover:underline font-medium flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Chi tiết & DS</span>
                          </button>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEditClass(cls)}
                              title="Chỉnh sửa lớp học"
                              className="p-1.5 hover:bg-hairline rounded text-text-secondary hover:text-ocean transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {cls.status === 'active' && (
                              <button
                                onClick={() => handleArchiveClass(cls)}
                                title="Lưu trữ lớp học"
                                className="p-1.5 hover:bg-hairline rounded text-text-secondary hover:text-amber-600 transition-colors"
                              >
                                <Archive className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              onClick={() => handleOpenDeleteClass(cls)}
                              title="Xóa lớp học"
                              className="p-1.5 hover:bg-danger-light rounded text-danger transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUB-VIEW 2: SUBJECTS DIRECTORY                                            */}
          {/* ========================================================================= */}
          {curriculumSubTab === 'subjects' && (
            <div className="space-y-4">
              {/* Filter bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-card border border-hairline">
                <div className="flex items-center gap-2">
                  <select
                    value={selectedSubjectDeptFilter}
                    onChange={(e) => setSelectedSubjectDeptFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-surface-neutral border border-hairline rounded text-xs text-text-primary focus:outline-none focus:border-ocean"
                  >
                    <option value="">Tất cả tổ chuyên môn</option>
                    {departmentsList.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>

                  <div className="relative w-48 sm:w-64">
                    <Search className="w-3.5 h-3.5 text-text-secondary absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={subjectSearch}
                      onChange={(e) => setSubjectSearch(e.target.value)}
                      placeholder="Tìm tên môn, mã..."
                      className="w-full pl-8 pr-3 py-1.5 bg-surface-neutral border border-hairline rounded text-xs text-text-primary focus:outline-none focus:border-ocean"
                    />
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  icon={Plus}
                  onClick={handleOpenCreateSubject}
                >
                  Thêm môn học mới
                </Button>
              </div>

              {/* Subjects Table */}
              <Card padding="p-0" className="overflow-hidden">
                <div className="p-3 bg-surface-neutral hairline-b flex items-center justify-between text-xs">
                  <span className="font-semibold text-text-primary">
                    Danh mục {subjectsList.length} môn học trong chương trình
                  </span>
                  <span className="text-text-secondary">Chương trình giáo dục phổ thông GDPT 2018</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-neutral text-text-secondary font-medium border-b border-hairline">
                      <tr>
                        <th scope="col" className="py-3 px-4">Mã môn</th>
                        <th scope="col" className="py-3 px-4">Tên môn học</th>
                        <th scope="col" className="py-3 px-4">Tổ chuyên môn</th>
                        <th scope="col" className="py-3 px-3 text-center">Số tiết/tuần</th>
                        <th scope="col" className="py-3 px-3 text-center">Số tín chỉ</th>
                        <th scope="col" className="py-3 px-3 text-center">Trạng thái</th>
                        <th scope="col" className="py-3 px-4 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline">
                      {subjectsList.map((s) => (
                        <tr key={s.id} className="hover:bg-sky/20 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-ocean">
                            {s.code}
                          </td>
                          <th scope="row" className="py-3 px-4 text-left font-medium text-text-primary">
                            <div>{s.name}</div>
                            {s.description && (
                              <div className="text-[11px] text-text-secondary font-normal truncate max-w-xs">{s.description}</div>
                            )}
                          </th>
                          <td className="py-3 px-4 text-text-secondary">
                            {s.department_name || s.department || 'Chưa gán tổ'}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-medium">
                            {s.weekly_periods || 3} tiết
                          </td>
                          <td className="py-3 px-3 text-center font-mono">
                            {s.credits || 2.0}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <Badge variant={s.status === 'active' || !s.status ? 'success' : 'neutral'} size="sm">
                              {s.status === 'active' || !s.status ? 'Đang dạy' : 'Lưu trữ'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditSubject(s)}
                                title="Sửa môn học"
                                className="p-1.5 hover:bg-hairline rounded text-ocean transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteSubject(s)}
                                title="Xóa môn học"
                                className="p-1.5 hover:bg-danger-light rounded text-danger transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUB-VIEW 3: DEPARTMENTS (TỔ BỘ MÔN)                                       */}
          {/* ========================================================================= */}
          {curriculumSubTab === 'departments' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-card border border-hairline">
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-text-secondary absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={deptSearch}
                    onChange={(e) => setDeptSearch(e.target.value)}
                    placeholder="Tìm tổ bộ môn..."
                    className="w-full pl-8 pr-3 py-1.5 bg-surface-neutral border border-hairline rounded text-xs text-text-primary focus:outline-none focus:border-ocean"
                  />
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  icon={Plus}
                  onClick={handleOpenCreateDept}
                >
                  Thêm tổ chuyên môn
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {departmentsList.map((d) => (
                  <Card key={d.id} padding="p-5" className="flex flex-col justify-between space-y-3">
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-base font-bold text-primary">{d.name}</h3>
                          <span className="text-[11px] font-mono text-ocean font-semibold">{d.code || 'DEPT'}</span>
                        </div>
                        <Badge variant="neutral" size="sm">
                          {d.teacher_count || 0} GV • {d.subject_count || 0} Môn
                        </Badge>
                      </div>

                      {d.description && (
                        <p className="text-xs text-text-secondary line-clamp-2">{d.description}</p>
                      )}

                      <div className="p-2.5 bg-surface-neutral rounded border border-hairline text-xs">
                        <div className="flex justify-between">
                          <span className="text-text-secondary">Tổ trưởng bộ môn:</span>
                          <span className="font-semibold text-primary">
                            {d.head_teacher_name || 'Chưa bổ nhiệm'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 hairline-t flex items-center justify-end gap-1.5 text-xs">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Edit2}
                        onClick={() => handleOpenEditDept(d)}
                      >
                        Sửa
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Trash2}
                        className="text-danger hover:bg-danger-light"
                        onClick={() => handleDeleteDept(d)}
                      >
                        Xóa
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* SUB-TAB 4: PHÂN CÔNG GIẢNG DẠY (TEACHER ASSIGNMENTS) */}
          {curriculumSubTab === 'assignments' && (
            <div className="space-y-4">
              {/* Toolbar & Filters */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-surface-neutral rounded-lg border border-hairline">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Search */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Tìm giáo viên, môn học, lớp..."
                      value={assignmentSearch}
                      onChange={(e) => setAssignmentSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && loadCurriculumData()}
                      className="h-8 pl-8 pr-3 bg-white border border-hairline rounded text-xs text-text-primary outline-none focus:border-ocean w-48 sm:w-56"
                    />
                  </div>

                  {/* Filter by Role */}
                  <select
                    value={selectedAssignmentRoleFilter}
                    onChange={(e) => {
                      setSelectedAssignmentRoleFilter(e.target.value);
                      setTimeout(loadCurriculumData, 0);
                    }}
                    className="h-8 px-2.5 bg-white border border-hairline rounded text-xs text-text-primary focus:outline-none focus:border-ocean"
                  >
                    <option value="all">Tất cả vai trò</option>
                    <option value="primary">Giáo viên chính</option>
                    <option value="secondary">Giáo viên phụ tá</option>
                    <option value="assistant">Trợ giảng</option>
                  </select>

                  {/* Filter by Department */}
                  <select
                    value={selectedAssignmentDeptFilter}
                    onChange={(e) => {
                      setSelectedAssignmentDeptFilter(e.target.value);
                      setTimeout(loadCurriculumData, 0);
                    }}
                    className="h-8 px-2.5 bg-white border border-hairline rounded text-xs text-text-primary focus:outline-none focus:border-ocean"
                  >
                    <option value="">Tất cả tổ bộ môn</option>
                    {departmentsList.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  icon={Plus}
                  onClick={handleOpenCreateAssignmentModal}
                >
                  Phân công mới
                </Button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto bg-white border border-hairline rounded-xl shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-surface-neutral text-text-secondary border-b border-hairline font-semibold">
                      <th scope="col" className="py-3 px-4">Giáo viên giảng dạy</th>
                      <th scope="col" className="py-3 px-4">Môn học</th>
                      <th scope="col" className="py-3 px-4">Lớp học</th>
                      <th scope="col" className="py-3 px-4">Niên khóa / Học kỳ</th>
                      <th scope="col" className="py-3 px-4">Vai trò</th>
                      <th scope="col" className="py-3 px-4">Trạng thái</th>
                      <th scope="col" className="py-3 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {assignmentsList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-text-secondary">
                          <UserCheck className="w-8 h-8 mx-auto mb-2 text-text-tertiary" />
                          <p className="font-medium text-text-primary">Chưa có phân công giảng dạy nào</p>
                          <p className="text-[11px] mt-0.5">Nhấn "Phân công mới" để gán giáo viên vào môn học và lớp.</p>
                        </td>
                      </tr>
                    ) : (
                      assignmentsList.map((asg) => (
                        <tr key={asg.id} className="hover:bg-surface-neutral/60 transition-colors">
                          <th scope="row" className="py-3 px-4 text-left font-medium text-text-primary">
                            <div className="font-semibold text-text-primary">{asg.teacher_name}</div>
                            <div className="text-[11px] text-text-secondary">{asg.teacher_code || asg.employee_id || 'GV-THPT'} • {asg.department_name || 'Tổ bộ môn'}</div>
                          </th>
                          <td className="py-3 px-4">
                            <div className="font-medium text-text-primary">{asg.subject_name}</div>
                            <div className="text-[11px] text-text-secondary font-mono">{asg.subject_code}</div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="neutral" size="sm">
                              {asg.class_name} (K{asg.grade_level})
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-text-primary font-medium">{asg.academic_year_name || asg.academic_year}</div>
                            <div className="text-[11px] text-text-secondary">{asg.semester_name || 'Cả năm'}</div>
                          </td>
                          <td className="py-3 px-4">
                            {asg.role === 'primary' ? (
                              <Badge variant="success" size="sm">GV Chính</Badge>
                            ) : asg.role === 'secondary' ? (
                              <Badge variant="info" size="sm">Phụ tá</Badge>
                            ) : (
                              <Badge variant="neutral" size="sm">Trợ giảng</Badge>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {asg.status === 'active' ? (
                              <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Hoạt động
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-slate-500 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                {asg.status === 'revoked' ? 'Đã thu hồi' : 'Ngưng'}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                icon={Edit2}
                                onClick={() => handleOpenEditAssignmentModal(asg)}
                              >
                                Sửa
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                icon={Trash2}
                                className="text-danger hover:bg-danger-light"
                                onClick={() => {
                                  setSelectedAssignmentForDelete(asg);
                                  setIsDeleteAssignmentModalOpen(true);
                                }}
                              >
                                Thu hồi
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUB-TAB 5: QUẢN LÝ THỜI KHÓA BIỂU (TIMETABLE SCHEDULING - G16) */}
          {curriculumSubTab === 'timetable' && (
            <div className="space-y-4">
              {/* Controls bar */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 bg-surface-neutral rounded-lg border border-hairline">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Class Selector */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-text-secondary whitespace-nowrap">Lớp học:</span>
                    <select
                      value={selectedTimetableClassId}
                      onChange={(e) => {
                        setSelectedTimetableClassId(e.target.value);
                        loadTimetableSlots(e.target.value, selectedTimetableYearId, selectedTimetableSemesterId);
                      }}
                      className="h-8 px-2.5 bg-white border border-hairline rounded text-xs font-semibold text-text-primary focus:outline-none focus:border-ocean min-w-[130px]"
                    >
                      {classesList.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name} (Khối {cls.grade_level})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Academic Year Selector */}
                  <select
                    value={selectedTimetableYearId}
                    onChange={(e) => {
                      setSelectedTimetableYearId(e.target.value);
                      loadTimetableSlots(selectedTimetableClassId, e.target.value, selectedTimetableSemesterId);
                    }}
                    className="h-8 px-2.5 bg-white border border-hairline rounded text-xs text-text-primary focus:outline-none focus:border-ocean"
                  >
                    <option value="">Tất cả niên khóa</option>
                    {academicYearsList.map((yr) => (
                      <option key={yr.id} value={yr.id}>{yr.name || yr.year_code}</option>
                    ))}
                  </select>

                  {/* Semester Selector */}
                  <select
                    value={selectedTimetableSemesterId}
                    onChange={(e) => {
                      setSelectedTimetableSemesterId(e.target.value);
                      loadTimetableSlots(selectedTimetableClassId, selectedTimetableYearId, e.target.value);
                    }}
                    className="h-8 px-2.5 bg-white border border-hairline rounded text-xs text-text-primary focus:outline-none focus:border-ocean"
                  >
                    <option value="">Cả năm / Tất cả kỳ</option>
                    <option value="sem_1">Học kỳ 1</option>
                    <option value="sem_2">Học kỳ 2</option>
                  </select>

                  <Button
                    variant="ghost"
                    size="sm"
                    icon={RefreshCw}
                    className={isTimetableLoading ? 'animate-spin' : ''}
                    onClick={() => loadTimetableSlots(selectedTimetableClassId, selectedTimetableYearId, selectedTimetableSemesterId)}
                  >
                    Làm mới
                  </Button>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  icon={Plus}
                  onClick={() => handleOpenAddSlotModal(2, 1)}
                >
                  Thêm tiết học
                </Button>
              </div>

              {/* Error Alert */}
              {timetableError && (
                <div className="p-3 bg-danger-light border border-danger/30 rounded-card flex items-center justify-between text-xs text-danger">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>{timetableError}</span>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => loadTimetableSlots()}>
                    Thử lại
                  </Button>
                </div>
              )}

              {/* Weekly Timetable Grid Table */}
              <div className="bg-white border border-hairline rounded-xl shadow-xs overflow-hidden">
                <div className="px-4 py-3 border-b border-hairline bg-surface-neutral/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-ocean" />
                    <span className="text-xs font-semibold text-text-primary uppercase tracking-wider">
                      Thời khóa biểu chính khóa: Lớp {classesList.find(c => c.id === selectedTimetableClassId)?.name || selectedTimetableClassId}
                    </span>
                  </div>
                  <span className="text-[11px] text-text-secondary font-medium">
                    {timetableSlots.length} tiết đã phân lịch
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-surface-neutral text-text-secondary border-b border-hairline font-semibold">
                        <th className="py-2.5 px-3 w-28 text-center border-r border-hairline">Tiết / Giờ</th>
                        {[2, 3, 4, 5, 6, 7].map((day) => (
                          <th key={day} className="py-2.5 px-3 min-w-[130px] text-center border-r border-hairline last:border-r-0">
                            Thứ {day}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline">
                      {/* Morning Sessions Header */}
                      <tr className="bg-slate-50/80 font-bold text-[11px] text-text-tertiary">
                        <td colSpan={7} className="py-1 px-3 text-center uppercase tracking-wider">
                          Buổi Sáng (Tiết 1 — Tiết 5)
                        </td>
                      </tr>
                      {[1, 2, 3, 4, 5].map((period) => {
                        const times = [
                          '07:00 - 07:45',
                          '07:50 - 08:35',
                          '08:50 - 09:35',
                          '09:40 - 10:25',
                          '10:30 - 11:15'
                        ];
                        return (
                          <tr key={period} className="hover:bg-surface-neutral/40 transition-colors">
                            <td className="py-2 px-3 text-center font-medium border-r border-hairline bg-surface-neutral/20">
                              <div className="font-semibold text-text-primary">Tiết {period}</div>
                              <div className="text-[10px] text-text-tertiary">{times[period - 1]}</div>
                            </td>
                            {[2, 3, 4, 5, 6, 7].map((day) => {
                              const slot = timetableSlots.find((s) => s.day_of_week === day && s.period === period);
                              return (
                                <td key={day} className="py-1.5 px-2 border-r border-hairline last:border-r-0 align-top h-16">
                                  {slot ? (
                                    <div className="group relative p-2 bg-ocean/5 hover:bg-ocean/10 border border-ocean/20 rounded-md transition-all">
                                      <div className="flex items-start justify-between gap-1">
                                        <div className="font-semibold text-xs text-ocean line-clamp-1">
                                          {slot.subject_name}
                                        </div>
                                        <button
                                          onClick={() => {
                                            setSlotToDelete(slot);
                                            setIsDeleteSlotModalOpen(true);
                                          }}
                                          title="Xóa tiết học này"
                                          className="opacity-0 group-hover:opacity-100 text-danger hover:text-red-700 transition-opacity p-0.5"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                      <div className="text-[11px] text-text-secondary mt-0.5 line-clamp-1">
                                        {slot.teacher_name || 'Chưa gán GV'}
                                      </div>
                                      <div className="text-[10px] text-text-tertiary mt-1 flex items-center justify-between font-mono">
                                        <span>{slot.room || 'P.---'}</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => handleOpenAddSlotModal(day, period)}
                                      className="w-full h-full min-h-[50px] border border-dashed border-hairline hover:border-ocean/40 rounded flex items-center justify-center text-text-tertiary hover:text-ocean hover:bg-ocean/5 transition-colors group"
                                      title={`Thêm tiết ${period} Thứ ${day}`}
                                    >
                                      <Plus className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}

                      {/* Afternoon Sessions Header */}
                      <tr className="bg-slate-50/80 font-bold text-[11px] text-text-tertiary">
                        <td colSpan={7} className="py-1 px-3 text-center uppercase tracking-wider">
                          Buổi Chiều (Tiết 6 — Tiết 10)
                        </td>
                      </tr>
                      {[6, 7, 8, 9, 10].map((period) => {
                        const times = [
                          '13:00 - 13:45',
                          '13:50 - 14:35',
                          '14:50 - 15:35',
                          '15:40 - 16:25',
                          '16:30 - 17:15'
                        ];
                        return (
                          <tr key={period} className="hover:bg-surface-neutral/40 transition-colors">
                            <td className="py-2 px-3 text-center font-medium border-r border-hairline bg-surface-neutral/20">
                              <div className="font-semibold text-text-primary">Tiết {period}</div>
                              <div className="text-[10px] text-text-tertiary">{times[period - 6]}</div>
                            </td>
                            {[2, 3, 4, 5, 6, 7].map((day) => {
                              const slot = timetableSlots.find((s) => s.day_of_week === day && s.period === period);
                              return (
                                <td key={day} className="py-1.5 px-2 border-r border-hairline last:border-r-0 align-top h-16">
                                  {slot ? (
                                    <div className="group relative p-2 bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200 rounded-md transition-all">
                                      <div className="flex items-start justify-between gap-1">
                                        <div className="font-semibold text-xs text-emerald-800 line-clamp-1">
                                          {slot.subject_name}
                                        </div>
                                        <button
                                          onClick={() => {
                                            setSlotToDelete(slot);
                                            setIsDeleteSlotModalOpen(true);
                                          }}
                                          title="Xóa tiết học này"
                                          className="opacity-0 group-hover:opacity-100 text-danger hover:text-red-700 transition-opacity p-0.5"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                      <div className="text-[11px] text-text-secondary mt-0.5 line-clamp-1">
                                        {slot.teacher_name || 'Chưa gán GV'}
                                      </div>
                                      <div className="text-[10px] text-text-tertiary mt-1 flex items-center justify-between font-mono">
                                        <span>{slot.room || 'P.---'}</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => handleOpenAddSlotModal(day, period)}
                                      className="w-full h-full min-h-[50px] border border-dashed border-hairline hover:border-ocean/40 rounded flex items-center justify-center text-text-tertiary hover:text-ocean hover:bg-ocean/5 transition-colors group"
                                      title={`Thêm tiết ${period} Thứ ${day}`}
                                    >
                                      <Plus className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
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
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: TEACHERS DIRECTORY                                                 */}
      {/* ========================================================================= */}
      {activeTab === 'teachers' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-medium text-text-primary">Danh mục Hội đồng Sư phạm</h2>
              <p className="text-xs text-text-secondary mt-1">
                Toàn bộ đội ngũ cán bộ giảng dạy, tổ chuyên môn và định mức hồ sơ chuẩn hóa.
              </p>
            </div>
            <Badge variant="info">Tổng {teachersList.length} Giáo viên</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teachersList.map((t) => (
              <Card key={t.id} padding="p-5" className="flex flex-col justify-between space-y-3">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={t.avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=120&h=120'}
                      alt={t.name}
                      className="w-12 h-12 rounded-full object-cover border border-hairline"
                    />
                    <div>
                      <div className="text-sm font-semibold text-text-primary">{t.name}</div>
                      <div className="text-xs text-ocean font-medium">{t.department_name || t.department || 'Chưa phân tổ'}</div>
                      <div className="text-[11px] text-text-secondary font-mono">{t.employee_id || t.code || t.id}</div>
                    </div>
                  </div>

                  <div className="p-3 bg-surface-neutral rounded border border-hairline text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Chủ nhiệm:</span>
                      <span className="font-semibold text-text-primary">{t.homeroom_class_name || t.homeroomClass || 'Không'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Trình độ / Môn:</span>
                      <span className="font-medium text-text-primary">{t.qualification || 'Cử nhân'} • {t.specialty || 'Chung'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Email liên hệ:</span>
                      <span className="font-mono text-[11px] text-text-secondary truncate max-w-[160px]">{t.contact_email || t.account_email || t.email}</span>
                    </div>
                    {t.contact_phone && (
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Số ĐT:</span>
                        <span className="font-mono text-[11px] text-text-secondary">{t.contact_phone}</span>
                      </div>
                    )}
                    {t.office_room && (
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Phòng làm việc:</span>
                        <span className="text-text-primary font-medium">{t.office_room}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 hairline-t flex items-center justify-between text-xs">
                  <Badge variant={t.status === 'active' || !t.status ? 'success' : 'neutral'} size="sm">
                    {t.status === 'active' || !t.status ? 'Đang giảng dạy' : t.status === 'on_leave' ? 'Nghỉ phép' : 'Nghỉ hưu'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-ocean hover:underline font-medium"
                    onClick={() => handleOpenEditTeacher(t)}
                  >
                    Sửa hồ sơ →
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: STUDENTS & ACADEMIC RANKINGS                                       */}
      {/* ========================================================================= */}
      {activeTab === 'students' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-medium text-text-primary">Đánh giá học lực & Hồ sơ học sinh</h2>
              <p className="text-xs text-text-secondary mt-1">
                Quản lý hồ sơ định danh, người giám hộ và theo dõi học lực toàn trường.
              </p>
            </div>
            <Button variant="secondary" size="md" icon={Printer} onClick={() => window.print()}>
              In báo cáo học lực
            </Button>
          </div>

          {/* Student Normalized Profiles Directory */}
          <Card padding="p-6" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-text-primary">Danh sách hồ sơ học sinh chuẩn hóa</h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Quản lý mã định danh, lớp học ghi danh, hồ sơ cá nhân và phân công người giám hộ.
                </p>
              </div>
              <Badge variant="info">Tổng {studentsList.length} Học sinh</Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-neutral text-text-secondary font-medium hairline-b">
                  <tr>
                    <th className="py-3 px-4">Họ và tên</th>
                    <th className="py-3 px-4">Mã HS</th>
                    <th className="py-3 px-4">Lớp hiện tại</th>
                    <th className="py-3 px-3 text-center">Giới tính / Ngày sinh</th>
                    <th className="py-3 px-3 text-center">Trạng thái ghi danh</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {studentsList.map((st) => (
                    <tr key={st.id} className="hover:bg-sky/20 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={st.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120&h=120'}
                            alt={st.name}
                            className="w-7 h-7 rounded-full object-cover border border-hairline"
                          />
                          <div>
                            <span className="font-semibold text-text-primary">{st.name}</span>
                            <div className="text-[10px] text-text-secondary font-mono">{st.account_email || st.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-text-primary">
                        {st.student_code || st.code || st.id}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="primary" size="sm">
                          {st.class_name ? `Lớp ${st.class_name}` : 'Chưa xếp lớp'}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-center text-text-secondary">
                        <div>{st.gender === 'female' ? 'Nữ' : 'Nam'}</div>
                        <div className="text-[10px]">{st.dob ? st.dob.split('T')[0] : '—'}</div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge
                          variant={
                            st.enrollment_status === 'active' || !st.enrollment_status
                              ? 'success'
                              : st.enrollment_status === 'graduated'
                              ? 'info'
                              : 'warning'
                          }
                          size="sm"
                        >
                          {st.enrollment_status === 'active' || !st.enrollment_status
                            ? 'Đang học'
                            : st.enrollment_status === 'graduated'
                            ? 'Tốt nghiệp'
                            : 'Tạm nghỉ'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenGuardians(st)}
                          >
                            Người giám hộ
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-ocean"
                            onClick={() => handleOpenEditStudent(st)}
                          >
                            Sửa hồ sơ
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Students */}
            <Card padding="p-6" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-ocean" />
                  <h3 className="text-base font-medium text-text-primary">Top 5 học sinh xuất sắc tiêu biểu</h3>
                </div>
                <Badge variant="success">Điểm GPA {'>'} 9.2</Badge>
              </div>

              <div className="space-y-3">
                {[
                  { name: 'Nguyễn Minh Châu', class: 'Lớp 7B', gpa: '9.20', badge: 'Thủ khoa THCS' },
                  { name: 'Nguyễn Minh Khôi', class: 'Lớp 10A1', gpa: '8.96', badge: 'Giải Nhất Sáng tạo Robot' },
                  { name: 'Trần Thảo Linh', class: 'Lớp 11A1', gpa: '9.35', badge: 'Đội tuyển HSG Quốc gia' },
                  { name: 'Vũ Đức Nam', class: 'Lớp 12 Chuyên Toán', gpa: '9.45', badge: 'Thủ khoa kỳ thi thử' },
                  { name: 'Phạm Quỳnh Anh', class: 'Lớp 10A2', gpa: '9.15', badge: 'Huy chương Bạc Tin học trẻ' },
                ].map((st, idx) => (
                  <div key={idx} className="p-3 bg-surface-neutral rounded border border-hairline flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-semibold text-text-primary">{st.name}</div>
                        <div className="text-[11px] text-text-secondary">{st.class} • {st.badge}</div>
                      </div>
                    </div>
                    <span className="font-bold text-base text-ocean font-mono">{st.gpa}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Academic Interventions */}
            <Card padding="p-6" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning-dark" />
                  <h3 className="text-base font-medium text-text-primary">Học sinh cần phụ đạo / Bồi dưỡng sớm</h3>
                </div>
                <Badge variant="warning">3 học sinh</Badge>
              </div>

              <div className="space-y-3">
                {[
                  { name: 'Hoàng Văn Bách', class: 'Lớp 10A1', gpa: '6.2', issue: 'Hổng kiến thức Hình học không gian', note: 'Đã giao bài tập bổ trợ trên hệ thống AI' },
                  { name: 'Lê Tuấn Tú', class: 'Lớp 10A5', gpa: '5.8', issue: 'Điểm kiểm tra Đại số đợt 2 dưới trung bình', note: 'GVBM đã hẹn phụ đạo sau giờ học' },
                  { name: 'Đỗ Thúy Vy', class: 'Lớp 11B5', gpa: '6.4', issue: 'Vắng 2 buổi thực hành Vật lý', note: 'Đã gửi thông báo tới phụ huynh' },
                ].map((st, idx) => (
                  <div key={idx} className="p-3.5 bg-amber-50/70 border border-amber-200 rounded text-xs space-y-1">
                    <div className="flex items-center justify-between font-semibold text-text-primary">
                      <span>{st.name} • {st.class}</span>
                      <Badge variant="danger" size="sm">ĐTB: {st.gpa}</Badge>
                    </div>
                    <div className="text-text-secondary">{st.issue}</div>
                    <div className="text-[11px] text-ocean font-medium pt-1">Tiến độ: {st.note}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: REPORTS & BROADCAST CENTER                                         */}
      {/* ========================================================================= */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-medium text-text-primary">Báo cáo tổng hợp & Cổng phát thông báo toàn trường</h2>
              <p className="text-xs text-text-secondary mt-1">
                Phát thanh thông điệp khẩn cấp đồng bộ tới tất cả học sinh, giáo viên, phụ huynh và đối soát tài chính số.
              </p>
            </div>
            <Button
              variant="primary"
              size="md"
              icon={Bell}
              onClick={() => setIsBroadcastModalOpen(true)}
            >
              Soạn thông báo khẩn
            </Button>
          </div>

          {/* Financial Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card padding="p-5">
              <div className="text-xs text-text-secondary">Tổng học phí đã lập hóa đơn</div>
              <div className="text-2xl font-bold text-primary mt-1">
                {financials?.totalBilled || '7.953.250.000'} đ
              </div>
              <div className="text-xs text-text-secondary mt-2">Học kỳ I (2.450 học sinh)</div>
            </Card>

            <Card padding="p-5">
              <div className="text-xs text-text-secondary">Thu qua cổng VietQR Napas 24/7</div>
              <div className="text-2xl font-bold text-success mt-1">
                {financials?.totalCollected || '7.523.250.000'} đ
              </div>
              <div className="text-xs text-success mt-2 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Tỷ lệ hoàn thành: {financials?.collectionRate || '95.1%'}</span>
              </div>
            </Card>

            <Card padding="p-5">
              <div className="text-xs text-text-secondary">Số tiền chưa thu / Quá hạn</div>
              <div className="text-2xl font-bold text-warning-dark mt-1">
                {financials?.pendingAmount || '430.000.000'} đ
              </div>
              <div className="text-xs text-text-secondary mt-2">Đã tự động gửi SMS & App thông báo nhắc nợ</div>
            </Card>
          </div>

          {/* Quick Broadcast Box */}
          <Card padding="p-6" className="space-y-4">
            <div className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              <h3 className="text-base font-semibold text-text-primary">Trung tâm phát thông báo toàn trường</h3>
            </div>
            <form onSubmit={handleSendBroadcast} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Tiêu đề thông báo</label>
                <input
                  type="text"
                  required
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="Ví dụ: Kế hoạch nghỉ lễ và đảm bảo an toàn học sinh..."
                  className="w-full px-3.5 py-2 text-xs bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Nội dung chi tiết</label>
                <textarea
                  rows={3}
                  required
                  value={broadcastContent}
                  onChange={(e) => setBroadcastContent(e.target.value)}
                  placeholder="Nội dung truyền tải sẽ lập tức xuất hiện trên Banner khẩn cấp của toàn bộ tài khoản Học sinh, Giáo viên và Phụ huynh..."
                  className="w-full px-3.5 py-2 text-xs bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean"
                />
              </div>
              <div className="flex justify-end">
                <Button variant="primary" size="md" icon={Send} disabled={broadcastSent || !broadcastTitle.trim()}>
                  {broadcastSent ? 'Đang phát thanh...' : 'Phát thông báo ngay'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: SETTINGS & AUDIT LOGS                                              */}
      {/* ========================================================================= */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-medium text-text-primary">Cài đặt hệ thống & Nhật ký kiểm toán an ninh</h2>
              <p className="text-xs text-text-secondary mt-1">
                Ghi vết hoạt động toàn trường, quản lý kết nối chuẩn dữ liệu quốc gia và bảo mật ISO 27001.
              </p>
            </div>
            <Button
              variant="secondary"
              size="md"
              icon={RefreshCw}
              disabled={isSyncing}
              onClick={handleSyncMoet}
            >
              {isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ dữ liệu Bộ GD&ĐT'}
            </Button>
          </div>

          {/* MOET Sync Status Card */}
          <Card padding="p-5" className="border-l-4 border-l-ocean flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-ocean" />
                <span className="text-sm font-semibold text-text-primary">Kết nối cổng thông tin Bộ GD&ĐT (EMIS / ISO 27001)</span>
                <Badge variant="success" size="sm">Đang đồng bộ</Badge>
              </div>
              <p className="text-xs text-text-secondary">
                Học bạ điện tử và chứng nhận số của 2.450 học sinh được đối soát an toàn theo quy chuẩn quốc gia.
              </p>
            </div>
            <div className="text-xs text-text-secondary font-mono">
              Lần đồng bộ cuối: Hôm nay 08:30:00
            </div>
          </Card>

          {/* Audit Logs Table */}
          <Card padding="p-0" className="overflow-hidden">
            <div className="p-4 bg-surface-neutral hairline-b">
              <h3 className="text-sm font-semibold text-text-primary">Nhật ký kiểm toán an ninh & Hành động người dùng</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-neutral text-text-secondary font-medium hairline-b">
                  <tr>
                    <th className="py-3 px-4">Thời gian</th>
                    <th className="py-3 px-4">Người thực hiện</th>
                    <th className="py-3 px-3 text-center">Vai trò</th>
                    <th className="py-3 px-6">Hành động / Thao tác trên hệ thống</th>
                    <th className="py-3 px-4 text-center">Phân loại</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-sky/20 transition-colors">
                      <td className="py-3 px-4 font-mono text-text-secondary">{log.created_at}</td>
                      <td className="py-3 px-4 font-semibold text-text-primary">{log.actor_name}</td>
                      <td className="py-3 px-3 text-center">
                        <Badge variant="neutral" size="sm">{log.role}</Badge>
                      </td>
                      <td className="py-3 px-6 text-text-primary">{log.action}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={log.badge_type} size="sm">{log.badge}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE USER MODAL                                                */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isCreateUserModalOpen}
        onClose={() => setIsCreateUserModalOpen(false)}
        title="Tạo tài khoản người dùng mới"
      >
        <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
          <div>
            <label className="block text-text-secondary mb-1 font-medium">Họ và tên (*)</label>
            <input
              type="text"
              required
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              placeholder="Ví dụ: Thầy Nguyễn Văn An"
              className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-secondary mb-1 font-medium">Tên đăng nhập (*)</label>
              <input
                type="text"
                required
                value={newUserUsername}
                onChange={(e) => setNewUserUsername(e.target.value)}
                placeholder="vanan.nguyen"
                className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean font-mono"
              />
            </div>
            <div>
              <label className="block text-text-secondary mb-1 font-medium">Vai trò phân quyền (*)</label>
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value)}
                className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean"
              >
                <option value="teacher">Giáo viên</option>
                <option value="student">Học sinh</option>
                <option value="parent">Phụ huynh</option>
                <option value="admin">Ban Giám Hiệu</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-secondary mb-1 font-medium">Email</label>
              <input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="vanan@school.edu.vn"
                className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean"
              />
            </div>
            <div>
              <label className="block text-text-secondary mb-1 font-medium">Số điện thoại</label>
              <input
                type="text"
                value={newUserPhone}
                onChange={(e) => setNewUserPhone(e.target.value)}
                placeholder="0912 345 678"
                className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-secondary mb-1 font-medium">Mã định danh</label>
              <input
                type="text"
                value={newUserCode}
                onChange={(e) => setNewUserCode(e.target.value)}
                placeholder="GV-2024-08"
                className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean font-mono"
              />
            </div>
            {newUserRole === 'student' && (
              <div>
                <label className="block text-text-secondary mb-1 font-medium">Lớp học chính khóa</label>
                <select
                  value={newUserClass}
                  onChange={(e) => setNewUserClass(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean"
                >
                  <option value="cls_10A1">Lớp 10A1</option>
                  <option value="cls_10A2">Lớp 10A2</option>
                  <option value="cls_07B">Lớp 7B</option>
                </select>
              </div>
            )}
          </div>

          <div className="p-3 bg-sky/30 border border-ocean/20 rounded text-[11px] text-text-secondary">
            Mật khẩu khởi tạo mặc định là: <strong className="font-mono text-ocean">123456</strong>. Người dùng sẽ được yêu cầu đổi mật khẩu ở lần đăng nhập đầu tiên.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setIsCreateUserModalOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSavingUser}
            >
              {isSavingUser ? 'Đang tạo...' : 'Tạo tài khoản'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: CREATE CLASS MODAL                                               */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isCreateClassModalOpen}
        onClose={() => setIsCreateClassModalOpen(false)}
        title="Mở thêm lớp học mới"
      >
        <form onSubmit={handleCreateClass} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-text-secondary mb-1 font-medium">Tên lớp học (*)</label>
              <input
                type="text"
                required
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="Ví dụ: 10A3 hoặc 11A4"
                className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean font-semibold"
              />
            </div>

            <div>
              <label className="block text-text-secondary mb-1 font-medium">Khối học (*)</label>
              <select
                value={newClassGrade}
                onChange={(e) => setNewClassGrade(e.target.value)}
                className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean"
              >
                <option value={10}>Khối 10 (THPT)</option>
                <option value={11}>Khối 11 (THPT)</option>
                <option value={12}>Khối 12 (THPT)</option>
                <option value={7}>Khối 7 (THCS)</option>
                <option value={8}>Khối 8 (THCS)</option>
                <option value={9}>Khối 9 (THCS)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-text-secondary mb-1 font-medium">Năm học áp dụng (*)</label>
              <select
                value={newClassYearId}
                onChange={(e) => setNewClassYearId(e.target.value)}
                className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean"
              >
                {academicYearsList.map((ay) => (
                  <option key={ay.id} value={ay.id}>
                    {ay.name} {ay.is_current ? '★ (Hiện tại)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-text-secondary mb-1 font-medium">Giáo viên chủ nhiệm</label>
              <select
                value={newClassTeacher}
                onChange={(e) => setNewClassTeacher(e.target.value)}
                className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean"
              >
                <option value="">Chưa phân công giáo viên CN</option>
                {teachersList.map((t) => (
                  <option key={t.user_id || t.id} value={t.user_id || t.id}>
                    {t.name} ({t.department_name || t.specialty || 'GV'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-text-secondary mb-1 font-medium">Phòng học cố định</label>
              <input
                type="text"
                value={newClassRoom}
                onChange={(e) => setNewClassRoom(e.target.value)}
                placeholder="Ví dụ: Phòng 301"
                className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean"
              />
            </div>

            <div>
              <label className="block text-text-secondary mb-1 font-medium">Sĩ số tối đa (Sức chứa)</label>
              <input
                type="number"
                min={1}
                max={60}
                value={newClassCapacity}
                onChange={(e) => setNewClassCapacity(e.target.value)}
                className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setIsCreateClassModalOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSavingClass}
            >
              {isSavingClass ? 'Đang mở lớp...' : 'Mở lớp học'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2B: EDIT CLASS MODAL                                                */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isEditClassModalOpen}
        onClose={() => {
          setIsEditClassModalOpen(false);
          setEditingClass(null);
        }}
        title={`Chỉnh sửa lớp ${editingClass?.name || ''}`}
      >
        {editingClass && (
          <form onSubmit={handleSaveEditClass} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-text-secondary mb-1 font-medium">Tên lớp học (*)</label>
                <input
                  type="text"
                  required
                  value={editingClass.name}
                  onChange={(e) => setEditingClass({ ...editingClass, name: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean font-semibold"
                />
              </div>

              <div>
                <label className="block text-text-secondary mb-1 font-medium">Khối học</label>
                <select
                  value={editingClass.gradeLevel}
                  onChange={(e) => setEditingClass({ ...editingClass, gradeLevel: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean"
                >
                  <option value={10}>Khối 10 (THPT)</option>
                  <option value={11}>Khối 11 (THPT)</option>
                  <option value={12}>Khối 12 (THPT)</option>
                  <option value={7}>Khối 7 (THCS)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-text-secondary mb-1 font-medium">Năm học</label>
                <select
                  value={editingClass.academicYearId}
                  onChange={(e) => setEditingClass({ ...editingClass, academicYearId: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean"
                >
                  {academicYearsList.map((ay) => (
                    <option key={ay.id} value={ay.id}>
                      {ay.name} {ay.is_current ? '★ (Hiện tại)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-text-secondary mb-1 font-medium">Giáo viên chủ nhiệm</label>
                <select
                  value={editingClass.homeroomTeacherId}
                  onChange={(e) => setEditingClass({ ...editingClass, homeroomTeacherId: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean"
                >
                  <option value="">Chưa phân công giáo viên CN</option>
                  {teachersList.map((t) => (
                    <option key={t.user_id || t.id} value={t.user_id || t.id}>
                      {t.name} ({t.department_name || t.specialty || 'GV'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-text-secondary mb-1 font-medium">Phòng học</label>
                <input
                  type="text"
                  value={editingClass.room}
                  onChange={(e) => setEditingClass({ ...editingClass, room: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean"
                />
              </div>

              <div>
                <label className="block text-text-secondary mb-1 font-medium">Sức chứa tối đa</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={editingClass.maxCapacity}
                  onChange={(e) => setEditingClass({ ...editingClass, maxCapacity: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean font-mono"
                />
              </div>

              <div>
                <label className="block text-text-secondary mb-1 font-medium">Trạng thái lớp</label>
                <select
                  value={editingClass.status}
                  onChange={(e) => setEditingClass({ ...editingClass, status: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean"
                >
                  <option value="active">Đang hoạt động</option>
                  <option value="archived">Lưu trữ (Đã kết thúc)</option>
                  <option value="completed">Đã hoàn thành</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => {
                  setIsEditClassModalOpen(false);
                  setEditingClass(null);
                }}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={isSavingClass}
              >
                {isSavingClass ? 'Đang lưu...' : 'Lưu thay đổi'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2C: CLASS ROSTER & DETAILS DRAWER                                   */}
      {/* ========================================================================= */}
      <Modal
        isOpen={!!viewingClassDetails}
        onClose={() => setViewingClassDetails(null)}
        title={`Hồ sơ chi tiết & Danh sách học sinh - Lớp ${viewingClassDetails?.name || ''}`}
      >
        {viewingClassDetails && (
          <div className="space-y-4 text-xs">
            {/* Header info card */}
            <div className="p-3 bg-surface-neutral rounded border border-hairline grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-text-secondary block">Khối học:</span>
                <span className="font-semibold text-text-primary">Khối {viewingClassDetails.grade_level}</span>
              </div>
              <div>
                <span className="text-text-secondary block">Năm học:</span>
                <span className="font-semibold text-text-primary">{viewingClassDetails.academic_year_name || viewingClassDetails.academic_year}</span>
              </div>
              <div>
                <span className="text-text-secondary block">Phòng học:</span>
                <span className="font-semibold text-ocean font-mono">{viewingClassDetails.room || 'Chưa gán'}</span>
              </div>
              <div>
                <span className="text-text-secondary block">Sĩ số hiện tại:</span>
                <span className="font-bold text-primary font-mono">{classRoster.length} / {viewingClassDetails.max_capacity || 45} em</span>
              </div>
            </div>

            {/* Students Table */}
            <div className="overflow-hidden rounded border border-hairline">
              <div className="p-2.5 bg-surface-neutral hairline-b font-semibold text-text-primary flex items-center justify-between">
                <span>Danh sách học sinh chính khóa ({classRoster.length} em)</span>
                <div className="flex items-center gap-2">
                  {isLoadingRoster && <span className="text-ocean text-[11px] animate-pulse">Đang tải...</span>}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleOpenBulkEnrollModal}
                    className="flex items-center gap-1 text-[11px] py-1 px-2.5 h-7"
                  >
                    <ListPlus className="w-3.5 h-3.5" />
                    <span>Ghi danh hàng loạt</span>
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleOpenEnrollModal}
                    className="flex items-center gap-1 text-[11px] py-1 px-2.5 h-7"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ghi danh</span>
                  </Button>
                </div>
              </div>

              {isLoadingRoster ? (
                <div className="p-6 text-center text-text-secondary">Đang tải danh sách học sinh...</div>
              ) : classRoster.length === 0 ? (
                <div className="p-6 text-center text-text-secondary space-y-2">
                  <div className="font-medium text-text-primary">Chưa có học sinh nào được ghi danh vào lớp này</div>
                  <div className="text-[11px]">Bấm nút "Ghi danh" hoặc "Ghi danh hàng loạt" ở trên để thêm học sinh.</div>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-left">
                    <thead className="bg-surface-neutral text-text-secondary font-medium hairline-b sticky top-0">
                      <tr>
                        <th className="py-2 px-3">Mã HS</th>
                        <th className="py-2 px-3">Họ và tên</th>
                        <th className="py-2 px-2 text-center">GPA</th>
                        <th className="py-2 px-2 text-center">Chuyên cần</th>
                        <th className="py-2 px-3">Người giám hộ</th>
                        <th className="py-2 px-3 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline">
                      {classRoster.map((st) => (
                        <tr key={st.student_id} className="hover:bg-sky/20">
                          <td className="py-2 px-3 font-mono text-[11px] text-ocean font-semibold">
                            {st.student_code || st.user_code || 'HS-N/A'}
                          </td>
                          <td className="py-2 px-3 font-medium text-text-primary">
                            <div className="flex items-center gap-2">
                              <img
                                src={st.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=60&h=60'}
                                alt={st.name}
                                className="w-5 h-5 rounded-full object-cover border border-hairline"
                              />
                              <span>{st.name}</span>
                            </div>
                          </td>
                          <td className="py-2 px-2 text-center font-mono font-bold text-ocean">
                            {st.gpa || 0}
                          </td>
                          <td className="py-2 px-2 text-center font-mono text-[11px]">
                            {st.attendance_rate ? `${st.attendance_rate}%` : '100%'}
                          </td>
                          <td className="py-2 px-3 text-text-secondary text-[11px]">
                            {st.guardians && st.guardians.length > 0 ? (
                              <div>
                                <span className="font-medium text-text-primary">{st.guardians[0].parent_name}</span>
                                {st.guardians[0].contact_phone && (
                                  <span className="font-mono ml-1">({st.guardians[0].contact_phone})</span>
                                )}
                              </div>
                            ) : (
                              <span className="italic text-text-secondary">Chưa liên kết</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenTransferModal(st)}
                                title="Chuyển lớp"
                                className="p-1 hover:bg-sky/40 text-text-secondary hover:text-ocean rounded transition-colors"
                              >
                                <ArrowRightLeft className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenWithdrawModal(st)}
                                title="Rút khỏi lớp"
                                className="p-1 hover:bg-red-50 text-text-secondary hover:text-red-500 rounded transition-colors"
                              >
                                <UserMinus className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenHistoryModal(st)}
                                title="Lịch sử ghi danh"
                                className="p-1 hover:bg-sky/40 text-text-secondary hover:text-primary rounded transition-colors"
                              >
                                <History className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setViewingClassDetails(null)}
              >
                Đóng
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2E: ENROLL SINGLE STUDENT MODAL (G14)                               */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
        title={`Ghi danh học sinh vào lớp ${viewingClassDetails?.name || ''}`}
      >
        <form onSubmit={handleSubmitEnroll} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-text-primary mb-1">
              Chọn học sinh <span className="text-red-500">*</span>
            </label>
            <select
              value={enrollStudentId}
              onChange={(e) => setEnrollStudentId(e.target.value)}
              required
              className="w-full h-9 px-3 bg-surface-neutral border border-hairline rounded focus:outline-none focus:ring-1 focus:ring-ocean"
            >
              <option value="">-- Chọn học sinh chưa vào lớp này --</option>
              {studentsList
                .filter((st) => !classRoster.some((r) => r.student_id === (st.id || st.student_id)))
                .map((st) => (
                  <option key={st.id || st.student_id} value={st.id || st.student_id}>
                    {st.name} ({st.student_code || 'HS-N/A'}) - Lớp hiện tại: {st.class_name || 'Chưa gán'}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-text-primary mb-1">
              Ngày ghi danh <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={enrollDate}
              onChange={(e) => setEnrollDate(e.target.value)}
              required
              className="w-full h-9 px-3 bg-surface-neutral border border-hairline rounded focus:outline-none focus:ring-1 focus:ring-ocean"
            />
          </div>

          <div>
            <label className="block font-medium text-text-primary mb-1">Ghi chú bổ sung</label>
            <textarea
              rows={2}
              value={enrollNotes}
              onChange={(e) => setEnrollNotes(e.target.value)}
              placeholder="VD: Nhận chuyển trường, ghi danh đợt 1..."
              className="w-full p-2.5 bg-surface-neutral border border-hairline rounded focus:outline-none focus:ring-1 focus:ring-ocean resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setIsEnrollModalOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isEnrolling || !enrollStudentId}
            >
              {isEnrolling ? 'Đang ghi danh...' : 'Xác nhận ghi danh'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2F: TRANSFER STUDENT MODAL (G14)                                    */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => {
          setIsTransferModalOpen(false);
          setTransferStudentData(null);
        }}
        title={`Chuyển lớp - Học sinh: ${transferStudentData?.name || ''}`}
      >
        <form onSubmit={handleSubmitTransfer} className="space-y-4 text-xs">
          <div className="p-2.5 bg-surface-neutral rounded border border-hairline">
            <div className="text-text-secondary text-[11px]">Lớp hiện tại:</div>
            <div className="font-bold text-text-primary text-sm">{viewingClassDetails?.name || ''}</div>
          </div>

          <div>
            <label className="block font-medium text-text-primary mb-1">
              Chuyển sang lớp <span className="text-red-500">*</span>
            </label>
            <select
              value={transferTargetClassId}
              onChange={(e) => setTransferTargetClassId(e.target.value)}
              required
              className="w-full h-9 px-3 bg-surface-neutral border border-hairline rounded focus:outline-none focus:ring-1 focus:ring-ocean"
            >
              <option value="">-- Chọn lớp đích --</option>
              {classesList
                .filter((c) => c.id !== viewingClassDetails?.id && c.status === 'active')
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (Khối {c.grade_level} - Sĩ số: {c.student_count || 0}/{c.max_capacity || 45})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-text-primary mb-1">
              Ngày chuyển lớp <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={transferDate}
              onChange={(e) => setTransferDate(e.target.value)}
              required
              className="w-full h-9 px-3 bg-surface-neutral border border-hairline rounded focus:outline-none focus:ring-1 focus:ring-ocean"
            />
          </div>

          <div>
            <label className="block font-medium text-text-primary mb-1">
              Lý do chuyển lớp <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
              required
              placeholder="VD: Đổi nguyện vọng khối chuyên, cân bằng sĩ số..."
              className="w-full h-9 px-3 bg-surface-neutral border border-hairline rounded focus:outline-none focus:ring-1 focus:ring-ocean"
            />
          </div>

          <div>
            <label className="block font-medium text-text-primary mb-1">Ghi chú bổ sung</label>
            <textarea
              rows={2}
              value={transferNotes}
              onChange={(e) => setTransferNotes(e.target.value)}
              placeholder="Ghi chú thêm về quyết định hoặc biên bản..."
              className="w-full p-2.5 bg-surface-neutral border border-hairline rounded focus:outline-none focus:ring-1 focus:ring-ocean resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => {
                setIsTransferModalOpen(false);
                setTransferStudentData(null);
              }}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isTransferring || !transferTargetClassId || !transferReason.trim()}
            >
              {isTransferring ? 'Đang chuyển lớp...' : 'Xác nhận chuyển'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2G: WITHDRAW STUDENT MODAL (G14)                                    */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isWithdrawModalOpen}
        onClose={() => {
          setIsWithdrawModalOpen(false);
          setWithdrawStudentData(null);
        }}
        title={`Rút khỏi lớp - Học sinh: ${withdrawStudentData?.name || ''}`}
      >
        <form onSubmit={handleSubmitWithdraw} className="space-y-4 text-xs">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded text-amber-800 text-[11px] leading-relaxed">
            <strong>Lưu ý:</strong> Học sinh sẽ được rút khỏi lớp <strong>{viewingClassDetails?.name}</strong>.
            Lịch sử học tập trước đó vẫn được lưu trữ vĩnh viễn trên hệ thống và không bị xóa.
          </div>

          <div>
            <label className="block font-medium text-text-primary mb-1">
              Ngày rút khỏi lớp <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={withdrawDate}
              onChange={(e) => setWithdrawDate(e.target.value)}
              required
              className="w-full h-9 px-3 bg-surface-neutral border border-hairline rounded focus:outline-none focus:ring-1 focus:ring-ocean"
            />
          </div>

          <div>
            <label className="block font-medium text-text-primary mb-1">
              Lý do rút khỏi lớp <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={withdrawReason}
              onChange={(e) => setWithdrawReason(e.target.value)}
              required
              placeholder="VD: Chuyển trường, định cư nước ngoài, bảo lưu kết quả..."
              className="w-full h-9 px-3 bg-surface-neutral border border-hairline rounded focus:outline-none focus:ring-1 focus:ring-ocean"
            />
          </div>

          <div>
            <label className="block font-medium text-text-primary mb-1">Ghi chú bổ sung</label>
            <textarea
              rows={2}
              value={withdrawNotes}
              onChange={(e) => setWithdrawNotes(e.target.value)}
              placeholder="Số quyết định hoặc giấy tờ liên quan..."
              className="w-full p-2.5 bg-surface-neutral border border-hairline rounded focus:outline-none focus:ring-1 focus:ring-ocean resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => {
                setIsWithdrawModalOpen(false);
                setWithdrawStudentData(null);
              }}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="danger"
              size="md"
              disabled={isWithdrawing || !withdrawReason.trim()}
            >
              {isWithdrawing ? 'Đang thực hiện...' : 'Xác nhận rút khỏi lớp'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2H: ENROLLMENT HISTORY TIMELINE MODAL (G14)                          */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setHistoryStudentData(null);
        }}
        title={`Lịch sử ghi danh & Chuyển lớp - ${historyStudentData?.name || ''}`}
      >
        <div className="space-y-4 text-xs">
          {isLoadingHistory ? (
            <div className="p-6 text-center text-text-secondary">Đang tải lịch sử ghi danh...</div>
          ) : studentEnrollmentHistory.length === 0 ? (
            <div className="p-6 text-center text-text-secondary">
              Chưa có dữ liệu lịch sử ghi danh cho học sinh này.
            </div>
          ) : (
            <div className="space-y-3 relative pl-4 border-l-2 border-ocean/30 ml-2">
              {studentEnrollmentHistory.map((rec) => {
                const isCurrent = rec.is_current && rec.status === 'enrolled';
                return (
                  <div key={rec.id} className="relative pb-3">
                    <div
                      className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 ${
                        isCurrent
                          ? 'bg-emerald-500 border-white ring-2 ring-emerald-400/50'
                          : rec.status === 'transferred'
                          ? 'bg-amber-500 border-white'
                          : 'bg-text-secondary border-white'
                      }`}
                    />
                    <div className="p-3 bg-surface-neutral rounded border border-hairline space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-text-primary text-sm">
                          Lớp {rec.class_name || 'N/A'} (Khối {rec.grade_level || 'N/A'})
                        </span>
                        <Badge
                          variant={
                            rec.status === 'enrolled'
                              ? 'success'
                              : rec.status === 'transferred'
                              ? 'warning'
                              : 'neutral'
                          }
                        >
                          {rec.status === 'enrolled'
                            ? 'Đang theo học'
                            : rec.status === 'transferred'
                            ? 'Đã chuyển lớp'
                            : rec.status === 'withdrawn'
                            ? 'Đã rút hồ sơ'
                            : rec.status === 'completed'
                            ? 'Đã hoàn thành'
                            : rec.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-text-secondary">
                        <div>
                          Năm học: <span className="font-medium text-text-primary">{rec.academic_year_name || 'N/A'}</span>
                        </div>
                        <div>
                          Phòng: <span className="font-mono text-ocean">{rec.room || 'Chưa gán'}</span>
                        </div>
                        <div>
                          Ngày bắt đầu:{' '}
                          <span className="font-mono text-text-primary">
                            {rec.start_date || rec.enrollment_date || 'N/A'}
                          </span>
                        </div>
                        <div>
                          Ngày kết thúc:{' '}
                          <span className="font-mono text-text-primary">
                            {rec.end_date || (isCurrent ? 'Hiện tại' : 'N/A')}
                          </span>
                        </div>
                      </div>

                      {rec.reason && (
                        <div className="text-[11px] text-amber-700 bg-amber-500/10 p-1.5 rounded">
                          <strong>Lý do:</strong> {rec.reason}
                        </div>
                      )}

                      {rec.notes && (
                        <div className="text-[11px] text-text-secondary italic">
                          Ghi chú: {rec.notes}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-hairline">
            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                setIsHistoryModalOpen(false);
                setHistoryStudentData(null);
              }}
            >
              Đóng
            </Button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2I: BULK ENROLLMENT MODAL (G14)                                     */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isBulkEnrollModalOpen}
        onClose={() => setIsBulkEnrollModalOpen(false)}
        title={`Ghi danh hàng loạt vào lớp ${viewingClassDetails?.name || ''}`}
      >
        <form onSubmit={handleSubmitBulkEnroll} className="space-y-4 text-xs">
          <div className="p-2.5 bg-surface-neutral rounded border border-hairline flex items-center justify-between">
            <div>
              <span className="text-text-secondary">Sĩ số hiện tại: </span>
              <span className="font-bold font-mono text-ocean">
                {classRoster.length} / {viewingClassDetails?.max_capacity || 45}
              </span>
            </div>
            <div>
              <span className="text-text-secondary">Đã chọn: </span>
              <span className="font-bold text-primary font-mono">{bulkSelectedStudentIds.length} em</span>
            </div>
          </div>

          <div className="border border-hairline rounded overflow-hidden">
            <div className="p-2 bg-surface-neutral hairline-b flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-text-primary">
                <input
                  type="checkbox"
                  checked={
                    bulkSelectedStudentIds.length > 0 &&
                    bulkSelectedStudentIds.length ===
                      studentsList.filter(
                        (st) => !classRoster.some((r) => r.student_id === (st.id || st.student_id))
                      ).length
                  }
                  onChange={(e) => {
                    if (e.target.checked) {
                      const available = studentsList
                        .filter((st) => !classRoster.some((r) => r.student_id === (st.id || st.student_id)))
                        .map((st) => st.id || st.student_id);
                      setBulkSelectedStudentIds(available);
                    } else {
                      setBulkSelectedStudentIds([]);
                    }
                  }}
                  className="rounded border-hairline text-ocean focus:ring-ocean"
                />
                <span>Chọn tất cả học sinh khả dụng</span>
              </label>
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-hairline">
              {studentsList
                .filter((st) => !classRoster.some((r) => r.student_id === (st.id || st.student_id)))
                .map((st) => {
                  const sId = st.id || st.student_id;
                  const isChecked = bulkSelectedStudentIds.includes(sId);
                  return (
                    <label
                      key={sId}
                      className={`flex items-center gap-2.5 p-2.5 hover:bg-sky/20 cursor-pointer transition-colors ${
                        isChecked ? 'bg-sky/30' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setBulkSelectedStudentIds((prev) => [...prev, sId]);
                          } else {
                            setBulkSelectedStudentIds((prev) => prev.filter((id) => id !== sId));
                          }
                        }}
                        className="rounded border-hairline text-ocean focus:ring-ocean"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-text-primary truncate">{st.name}</div>
                        <div className="text-[11px] text-text-secondary flex gap-3 font-mono">
                          <span>Mã: {st.student_code || 'HS-N/A'}</span>
                          <span>Lớp hiện tại: {st.class_name || 'Chưa gán'}</span>
                        </div>
                      </div>
                    </label>
                  );
                })}
              {studentsList.filter(
                (st) => !classRoster.some((r) => r.student_id === (st.id || st.student_id))
              ).length === 0 && (
                <div className="p-6 text-center text-text-secondary">
                  Không còn học sinh nào khả dụng để thêm vào lớp này.
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setIsBulkEnrollModalOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isBulkEnrolling || bulkSelectedStudentIds.length === 0}
            >
              {isBulkEnrolling
                ? 'Đang xử lý...'
                : `Ghi danh (${bulkSelectedStudentIds.length} học sinh)`}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2D: BUSINESS-SAFE DELETE / ARCHIVE MODAL                            */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isDeleteClassModalOpen}
        onClose={() => {
          setIsDeleteClassModalOpen(false);
          setClassToDelete(null);
        }}
        title={`Xóa lớp học - ${classToDelete?.name || ''}`}
      >
        {classToDelete && (
          <div className="space-y-4 text-xs">
            {classToDelete.student_count > 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-card space-y-2 text-amber-900">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Quy tắc bảo vệ an toàn học bạ số</span>
                </div>
                <p className="leading-relaxed">
                  Lớp <strong>{classToDelete.name}</strong> hiện đang có <strong>{classToDelete.student_count} học sinh ghi danh</strong> và lưu trữ các cột điểm học kỳ.
                </p>
                <p className="text-[11px] leading-relaxed">
                  Để đảm bảo tính toàn vẹn của hồ sơ học sinh và học bạ điện tử theo chuẩn Bộ GD&ĐT, hệ thống <strong>không cho phép xóa vĩnh viễn</strong> lớp học có dữ liệu lịch sử.
                </p>
                <p className="text-[11px] font-semibold text-ocean">
                  Giải pháp khuyến nghị: Chuyển trạng thái lớp học sang "Lưu trữ" (Archived) để đóng sổ mà vẫn giữ nguyên tra cứu quá khứ.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-danger-light border border-danger/30 rounded text-danger">
                <p className="font-semibold">Bạn có chắc chắn muốn xóa lớp học này?</p>
                <p className="text-[11px] mt-1 text-text-secondary">
                  Lớp <strong>{classToDelete.name}</strong> hiện không có học sinh ghi danh. Thao tác xóa sẽ được thực hiện vĩnh viễn và ghi vào nhật ký kiểm toán.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  setIsDeleteClassModalOpen(false);
                  setClassToDelete(null);
                }}
              >
                Hủy
              </Button>

              {classToDelete.student_count > 0 ? (
                <Button
                  variant="primary"
                  size="md"
                  icon={Archive}
                  onClick={() => {
                    setIsDeleteClassModalOpen(false);
                    handleArchiveClass(classToDelete);
                  }}
                >
                  Lưu trữ lớp học thay thế
                </Button>
              ) : (
                <Button
                  variant="danger"
                  size="md"
                  icon={Trash2}
                  disabled={isDeletingClass}
                  onClick={handleConfirmDeleteClass}
                >
                  {isDeletingClass ? 'Đang xóa...' : 'Xác nhận xóa vĩnh viễn'}
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2E: CREATE / EDIT SUBJECT MODAL                                     */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isSubjectModalOpen}
        onClose={() => {
          setIsSubjectModalOpen(false);
          setEditingSubject(null);
        }}
        title={editingSubject ? `Sửa môn học - ${editingSubject.name}` : 'Thêm môn học mới'}
      >
        <form onSubmit={handleSaveSubject} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-text-secondary mb-1 font-medium">Tên môn học (*)</label>
              <input
                type="text"
                required
                value={subjectFormData.name}
                onChange={(e) => setSubjectFormData({ ...subjectFormData, name: e.target.value })}
                placeholder="Ví dụ: Toán học"
                className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean font-medium"
              />
            </div>

            <div>
              <label className="block text-text-secondary mb-1 font-medium">Mã môn học (*)</label>
              <input
                type="text"
                required
                value={subjectFormData.code}
                onChange={(e) => setSubjectFormData({ ...subjectFormData, code: e.target.value.toUpperCase() })}
                placeholder="Ví dụ: TOAN"
                className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean font-mono uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-text-secondary mb-1 font-medium">Tổ chuyên môn phụ trách</label>
              <select
                value={subjectFormData.departmentId}
                onChange={(e) => setSubjectFormData({ ...subjectFormData, departmentId: e.target.value })}
                className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean"
              >
                <option value="">Chưa phân tổ bộ môn</option>
                {departmentsList.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code || 'DEPT'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-text-secondary mb-1 font-medium">Số tiết / tuần</label>
              <input
                type="number"
                min={1}
                max={20}
                value={subjectFormData.weeklyPeriods}
                onChange={(e) => setSubjectFormData({ ...subjectFormData, weeklyPeriods: e.target.value })}
                className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-text-secondary mb-1 font-medium">Hệ số tín chỉ / Trọng số</label>
              <input
                type="number"
                step="0.5"
                min={0.5}
                max={10}
                value={subjectFormData.credits}
                onChange={(e) => setSubjectFormData({ ...subjectFormData, credits: e.target.value })}
                className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean font-mono"
              />
            </div>

            <div>
              <label className="block text-text-secondary mb-1 font-medium">Trạng thái môn</label>
              <select
                value={subjectFormData.status}
                onChange={(e) => setSubjectFormData({ ...subjectFormData, status: e.target.value })}
                className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean"
              >
                <option value="active">Đang giảng dạy</option>
                <option value="archived">Lưu trữ (Tạm ngưng)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-text-secondary mb-1 font-medium">Mô tả môn học</label>
            <textarea
              rows={2}
              value={subjectFormData.description}
              onChange={(e) => setSubjectFormData({ ...subjectFormData, description: e.target.value })}
              placeholder="Ghi chú chương trình học, chuẩn đầu ra..."
              className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => {
                setIsSubjectModalOpen(false);
                setEditingSubject(null);
              }}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSavingSubject}
            >
              {isSavingSubject ? 'Đang lưu...' : editingSubject ? 'Lưu thay đổi' : 'Thêm môn học'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2F: CREATE / EDIT DEPARTMENT MODAL                                  */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isDeptModalOpen}
        onClose={() => {
          setIsDeptModalOpen(false);
          setEditingDept(null);
        }}
        title={editingDept ? `Sửa tổ chuyên môn - ${editingDept.name}` : 'Thêm tổ chuyên môn mới'}
      >
        <form onSubmit={handleSaveDept} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-text-secondary mb-1 font-medium">Tên tổ chuyên môn (*)</label>
              <input
                type="text"
                required
                value={deptFormData.name}
                onChange={(e) => setDeptFormData({ ...deptFormData, name: e.target.value })}
                placeholder="Ví dụ: Tổ Toán - Tin học"
                className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean font-medium"
              />
            </div>

            <div>
              <label className="block text-text-secondary mb-1 font-medium">Mã tổ</label>
              <input
                type="text"
                value={deptFormData.code}
                onChange={(e) => setDeptFormData({ ...deptFormData, code: e.target.value.toUpperCase() })}
                placeholder="Ví dụ: TOAN_TIN"
                className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean font-mono uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-text-secondary mb-1 font-medium">Tổ trưởng chuyên môn</label>
            <select
              value={deptFormData.headTeacherId}
              onChange={(e) => setDeptFormData({ ...deptFormData, headTeacherId: e.target.value })}
              className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean"
            >
              <option value="">Chưa bổ nhiệm tổ trưởng</option>
              {teachersList.map((t) => (
                <option key={t.user_id || t.id} value={t.user_id || t.id}>
                  {t.name} ({t.specialty || t.code || 'Giáo viên'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-text-secondary mb-1 font-medium">Mô tả chức năng</label>
            <textarea
              rows={3}
              value={deptFormData.description}
              onChange={(e) => setDeptFormData({ ...deptFormData, description: e.target.value })}
              placeholder="Mô tả phạm vi chuyên môn của tổ bộ môn..."
              className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => {
                setIsDeptModalOpen(false);
                setEditingDept(null);
              }}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSavingDept}
            >
              {isSavingDept ? 'Đang lưu...' : editingDept ? 'Lưu thay đổi' : 'Tạo tổ chuyên môn'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: BROADCAST MODAL                                                  */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isBroadcastModalOpen}
        onClose={() => setIsBroadcastModalOpen(false)}
        title="Phát thông báo khẩn cấp toàn trường"
      >
        <form onSubmit={handleSendBroadcast} className="space-y-4 text-xs">
          <div>
            <label className="block text-text-secondary mb-1 font-medium">Tiêu đề thông báo (*)</label>
            <input
              type="text"
              required
              value={broadcastTitle}
              onChange={(e) => setBroadcastTitle(e.target.value)}
              placeholder="Nhập tiêu đề thông báo từ Ban Giám Hiệu..."
              className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean"
            />
          </div>

          <div>
            <label className="block text-text-secondary mb-1 font-medium">Nội dung chi tiết (*)</label>
            <textarea
              rows={4}
              required
              value={broadcastContent}
              onChange={(e) => setBroadcastContent(e.target.value)}
              placeholder="Ghi rõ thông điệp khẩn cấp hoặc kế hoạch..."
              className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean"
            />
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-900 leading-relaxed">
            Thông báo này sẽ phát trực tiếp lên thanh Broadcast Banner của 2.450 học sinh, 127 giáo viên và phụ huynh.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setIsBroadcastModalOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              icon={Send}
              disabled={broadcastSent || !broadcastTitle.trim()}
            >
              {broadcastSent ? 'Đang phát thanh...' : 'Phát thông báo ngay'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 4: EDIT TEACHER PROFILE                                             */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isEditTeacherModalOpen}
        onClose={() => setIsEditTeacherModalOpen(false)}
        title={`Cập nhật hồ sơ giáo viên - ${editingTeacher?.name || ''}`}
      >
        {editingTeacher && (
          <form onSubmit={handleSaveTeacher} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-text-secondary mb-1 font-medium">Mã giáo viên / Cán bộ (*)</label>
                <input
                  type="text"
                  required
                  value={editingTeacher.employeeId}
                  onChange={(e) => setEditingTeacher({ ...editingTeacher, employeeId: e.target.value })}
                  placeholder="VD: GV202401"
                  className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean"
                />
              </div>
              <div>
                <label className="block text-text-secondary mb-1 font-medium">Tổ bộ môn</label>
                <select
                  value={editingTeacher.departmentId}
                  onChange={(e) => setEditingTeacher({ ...editingTeacher, departmentId: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean"
                >
                  <option value="dept_math_it">Tổ Toán - Tin học</option>
                  <option value="dept_natural_sciences">Tổ Khoa học Tự nhiên (Lý - Hóa - Sinh)</option>
                  <option value="dept_languages">Tổ Ngữ văn & Ngoại ngữ</option>
                  <option value="dept_social_sciences">Tổ Khoa học Xã hội (Sử - Địa - GDCD)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-text-secondary mb-1 font-medium">Trình độ / Bằng cấp</label>
                <input
                  type="text"
                  value={editingTeacher.qualification}
                  onChange={(e) => setEditingTeacher({ ...editingTeacher, qualification: e.target.value })}
                  placeholder="VD: Cử nhân Sư phạm, Thạc sĩ..."
                  className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean"
                />
              </div>
              <div>
                <label className="block text-text-secondary mb-1 font-medium">Chuyên môn / Môn dạy</label>
                <input
                  type="text"
                  value={editingTeacher.specialty}
                  onChange={(e) => setEditingTeacher({ ...editingTeacher, specialty: e.target.value })}
                  placeholder="VD: Toán học, Tin học..."
                  className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-text-secondary mb-1 font-medium">Lớp chủ nhiệm (nếu có)</label>
                <select
                  value={editingTeacher.homeroomClassId}
                  onChange={(e) => setEditingTeacher({ ...editingTeacher, homeroomClassId: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean"
                >
                  <option value="">-- Không làm chủ nhiệm --</option>
                  {classesList.map((c) => (
                    <option key={c.id} value={c.id}>
                      Lớp {c.name} (Khối {c.grade_level})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-text-secondary mb-1 font-medium">Trạng thái công tác</label>
                <select
                  value={editingTeacher.status}
                  onChange={(e) => setEditingTeacher({ ...editingTeacher, status: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean"
                >
                  <option value="active">Đang giảng dạy</option>
                  <option value="on_leave">Nghỉ phép</option>
                  <option value="retired">Đã nghỉ hưu / chuyển trường</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-text-secondary mb-1 font-medium">Email liên hệ công vụ</label>
                <input
                  type="email"
                  value={editingTeacher.contactEmail}
                  onChange={(e) => setEditingTeacher({ ...editingTeacher, contactEmail: e.target.value })}
                  placeholder="mailan@school.edu.vn"
                  className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean"
                />
              </div>
              <div>
                <label className="block text-text-secondary mb-1 font-medium">Số điện thoại</label>
                <input
                  type="text"
                  value={editingTeacher.contactPhone}
                  onChange={(e) => setEditingTeacher({ ...editingTeacher, contactPhone: e.target.value })}
                  placeholder="0901234567"
                  className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean"
                />
              </div>
              <div>
                <label className="block text-text-secondary mb-1 font-medium">Phòng làm việc</label>
                <input
                  type="text"
                  value={editingTeacher.officeRoom}
                  onChange={(e) => setEditingTeacher({ ...editingTeacher, officeRoom: e.target.value })}
                  placeholder="Phòng P301"
                  className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean"
                />
              </div>
            </div>

            <div>
              <label className="block text-text-secondary mb-1 font-medium">Tóm tắt tiểu sử / Ghi chú</label>
              <textarea
                rows={2}
                value={editingTeacher.bio}
                onChange={(e) => setEditingTeacher({ ...editingTeacher, bio: e.target.value })}
                placeholder="Thông tin giới thiệu tóm tắt giáo viên..."
                className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 hairline-t">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setIsEditTeacherModalOpen(false)}
              >
                Hủy
              </Button>
              <Button type="submit" variant="primary" size="md">
                Lưu hồ sơ giáo viên
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 5: EDIT STUDENT PROFILE                                             */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isEditStudentModalOpen}
        onClose={() => setIsEditStudentModalOpen(false)}
        title={`Cập nhật hồ sơ học sinh - ${editingStudent?.name || ''}`}
      >
        {editingStudent && (
          <form onSubmit={handleSaveStudent} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-text-secondary mb-1 font-medium">Mã định danh học sinh (*)</label>
                <input
                  type="text"
                  required
                  value={editingStudent.studentCode}
                  onChange={(e) => setEditingStudent({ ...editingStudent, studentCode: e.target.value })}
                  placeholder="VD: HS2024101"
                  className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean"
                />
              </div>
              <div>
                <label className="block text-text-secondary mb-1 font-medium">Lớp học hiện tại (Ghi danh)</label>
                <select
                  value={editingStudent.currentClassId}
                  onChange={(e) => setEditingStudent({ ...editingStudent, currentClassId: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean"
                >
                  {classesList.map((c) => (
                    <option key={c.id} value={c.id}>
                      Lớp {c.name} (Khối {c.grade_level})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-text-secondary mb-1 font-medium">Ngày sinh</label>
                <input
                  type="date"
                  value={editingStudent.dob}
                  onChange={(e) => setEditingStudent({ ...editingStudent, dob: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean"
                />
              </div>
              <div>
                <label className="block text-text-secondary mb-1 font-medium">Giới tính</label>
                <select
                  value={editingStudent.gender}
                  onChange={(e) => setEditingStudent({ ...editingStudent, gender: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean"
                >
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                  <option value="other">Khác</option>
                </select>
              </div>
              <div>
                <label className="block text-text-secondary mb-1 font-medium">Tình trạng theo học</label>
                <select
                  value={editingStudent.enrollmentStatus}
                  onChange={(e) => setEditingStudent({ ...editingStudent, enrollmentStatus: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean"
                >
                  <option value="active">Đang theo học</option>
                  <option value="transferred">Đã chuyển trường</option>
                  <option value="graduated">Đã tốt nghiệp</option>
                  <option value="suspended">Tạm bảo lưu / đình chỉ</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-text-secondary mb-1 font-medium">Địa chỉ cư trú thường trú</label>
              <input
                type="text"
                value={editingStudent.address}
                onChange={(e) => setEditingStudent({ ...editingStudent, address: e.target.value })}
                placeholder="VD: 123 Đường Trần Phú, Quận Ba Đình, Hà Nội"
                className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean"
              />
            </div>

            <div className="p-3 bg-sky-light/40 border border-ocean/20 rounded text-[11px] text-text-secondary">
              Khi đổi lớp học hiện tại, hệ thống tự động cập nhật bảng quan hệ <code>class_enrollments</code> và giữ nguyên lịch sử niên khóa.
            </div>

            <div className="flex justify-end gap-2 pt-2 hairline-t">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setIsEditStudentModalOpen(false)}
              >
                Hủy
              </Button>
              <Button type="submit" variant="primary" size="md">
                Lưu hồ sơ học sinh
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 6: MANAGE GUARDIANS                                                 */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isGuardiansModalOpen}
        onClose={() => setIsGuardiansModalOpen(false)}
        title={`Người giám hộ - ${managingGuardiansStudent?.name || ''}`}
      >
        <div className="space-y-5 text-xs">
          {/* Section: Existing Guardians */}
          <div>
            <h4 className="font-semibold text-text-primary mb-2">Người giám hộ đã liên kết:</h4>
            {studentGuardians.length === 0 ? (
              <div className="p-3 text-center bg-surface-neutral rounded border border-hairline text-text-secondary">
                Học sinh chưa có thông tin người giám hộ liên kết.
              </div>
            ) : (
              <div className="space-y-2">
                {studentGuardians.map((g) => (
                  <div
                    key={g.parent_id}
                    className="p-3 bg-surface-neutral rounded border border-hairline flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-text-primary">{g.name}</span>
                        <Badge variant={g.relationship === 'father' || g.relationship === 'mother' ? 'primary' : 'neutral'} size="sm">
                          {g.relationship === 'father' ? 'Bố / Cha' : g.relationship === 'mother' ? 'Mẹ' : 'Giám hộ'}
                        </Badge>
                        {g.is_primary_contact && (
                          <Badge variant="info" size="sm">Liên hệ chính</Badge>
                        )}
                        <Badge variant={g.is_verified ? 'success' : 'warning'} size="sm">
                          {g.is_verified ? 'Đã xác minh' : 'Chưa xác minh'}
                        </Badge>
                      </div>
                      <div className="text-text-secondary text-[11px] mt-1 font-mono">
                        {g.contact_phone || g.username} • {g.contact_email || 'Chưa có email'}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-danger hover:bg-danger-light"
                      onClick={() => handleRemoveGuardian(g.parent_id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Assign New Guardian */}
          <form onSubmit={handleAssignGuardian} className="space-y-3 pt-3 hairline-t">
            <h4 className="font-semibold text-text-primary">Gán thêm người giám hộ mới:</h4>
            <div>
              <label className="block text-text-secondary mb-1 font-medium">Chọn phụ huynh (*)</label>
              <select
                required
                value={assignParentId}
                onChange={(e) => setAssignParentId(e.target.value)}
                className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean"
              >
                <option value="">-- Chọn tài khoản phụ huynh --</option>
                {parentsList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.account_phone || p.username} - {p.occupation || 'Phụ huynh'})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-text-secondary mb-1 font-medium">Quan hệ</label>
                <select
                  value={assignRelationship}
                  onChange={(e) => setAssignRelationship(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-text-primary focus:outline-none focus:border-ocean"
                >
                  <option value="father">Bố / Cha</option>
                  <option value="mother">Mẹ</option>
                  <option value="guardian">Người giám hộ hợp pháp</option>
                  <option value="other">Khác</option>
                </select>
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={assignIsPrimary}
                    onChange={(e) => setAssignIsPrimary(e.target.checked)}
                    className="rounded border-hairline text-ocean"
                  />
                  <span className="text-text-primary">Liên hệ chính</span>
                </label>
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={assignIsVerified}
                    onChange={(e) => setAssignIsVerified(e.target.checked)}
                    className="rounded border-hairline text-ocean"
                  />
                  <span className="text-text-primary">Đã xác minh</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={!assignParentId}
              >
                Xác nhận gán giám hộ
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* MODAL 1: Phân công giảng dạy mới (G15) */}
      <Modal
        isOpen={isCreateAssignmentModalOpen}
        onClose={() => setIsCreateAssignmentModalOpen(false)}
        title="Phân công giảng dạy mới"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-text-secondary">
            Gán giáo viên phụ trách môn học cho lớp học cụ thể theo niên khóa và học kỳ.
          </p>

          {assignmentFormError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{assignmentFormError}</span>
            </div>
          )}

          <form onSubmit={handleSaveNewAssignment} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-text-primary mb-1">
                Giáo viên giảng dạy *
              </label>
              <select
                value={newAssignTeacherId}
                onChange={(e) => setNewAssignTeacherId(e.target.value)}
                required
                className="w-full h-9 px-3 bg-surface-neutral border border-hairline rounded text-xs text-text-primary focus:outline-none focus:border-ocean"
              >
                <option value="">-- Chọn giáo viên --</option>
                {teachersList.map((t) => (
                  <option key={t.user_id || t.id} value={t.user_id || t.id}>
                    {t.name} ({t.employee_id || t.code || 'GV'} • {t.department_name || 'Tổ chuyên môn'})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-primary mb-1">
                  Lớp học *
                </label>
                <select
                  value={newAssignClassId}
                  onChange={(e) => setNewAssignClassId(e.target.value)}
                  required
                  className="w-full h-9 px-3 bg-surface-neutral border border-hairline rounded text-xs text-text-primary focus:outline-none focus:border-ocean"
                >
                  <option value="">-- Chọn lớp --</option>
                  {classesList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Khối {c.grade_level})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-primary mb-1">
                  Môn học *
                </label>
                <select
                  value={newAssignSubjectId}
                  onChange={(e) => setNewAssignSubjectId(e.target.value)}
                  required
                  className="w-full h-9 px-3 bg-surface-neutral border border-hairline rounded text-xs text-text-primary focus:outline-none focus:border-ocean"
                >
                  <option value="">-- Chọn môn học --</option>
                  {subjectsList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-primary mb-1">
                  Niên khóa *
                </label>
                <select
                  value={newAssignYearId}
                  onChange={(e) => setNewAssignYearId(e.target.value)}
                  className="w-full h-9 px-3 bg-surface-neutral border border-hairline rounded text-xs text-text-primary focus:outline-none focus:border-ocean"
                >
                  {academicYearsList.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name} {y.is_current ? '(Hiện tại)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-primary mb-1">
                  Học kỳ (Tùy chọn)
                </label>
                <select
                  value={newAssignSemesterId}
                  onChange={(e) => setNewAssignSemesterId(e.target.value)}
                  className="w-full h-9 px-3 bg-surface-neutral border border-hairline rounded text-xs text-text-primary focus:outline-none focus:border-ocean"
                >
                  <option value="">-- Cả năm học --</option>
                  {academicYearsList.find(y => y.id === newAssignYearId)?.semesters?.map((sem) => (
                    <option key={sem.id} value={sem.id}>
                      {sem.name}
                    </option>
                  )) || (
                    <>
                      <option value="sem_2024_1">Học kỳ I</option>
                      <option value="sem_2024_2">Học kỳ II</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-primary mb-1">
                Vai trò phân công *
              </label>
              <select
                value={newAssignRole}
                onChange={(e) => setNewAssignRole(e.target.value)}
                className="w-full h-9 px-3 bg-surface-neutral border border-hairline rounded text-xs text-text-primary focus:outline-none focus:border-ocean"
              >
                <option value="primary">Giáo viên chính (Trực tiếp giảng dạy & chấm điểm)</option>
                <option value="secondary">Giáo viên phụ tá (Đồng giảng viên)</option>
                <option value="assistant">Trợ giảng chuyên đề</option>
              </select>
              <p className="text-[11px] text-text-secondary mt-1">
                Lưu ý: Mỗi môn học của một lớp chỉ có tối đa 1 Giáo viên chính hoạt động trong cùng kỳ học.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-primary mb-1">
                Ghi chú phân công
              </label>
              <textarea
                value={newAssignNotes}
                onChange={(e) => setNewAssignNotes(e.target.value)}
                placeholder="VD: Phụ trách chuyên đề Toán hình học nâng cao..."
                rows={2}
                className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-xs text-text-primary focus:outline-none focus:border-ocean"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => setIsCreateAssignmentModalOpen(false)}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={isSavingAssignment}
              >
                {isSavingAssignment ? 'Đang lưu...' : 'Tạo phân công'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* MODAL 2: Chỉnh sửa phân công giảng dạy (G15) */}
      <Modal
        isOpen={isEditAssignmentModalOpen}
        onClose={() => setIsEditAssignmentModalOpen(false)}
        title="Cập nhật phân công giảng dạy"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-3 bg-surface-neutral rounded-lg text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-text-secondary">Giáo viên:</span>
              <span className="font-semibold text-text-primary">{selectedAssignmentForEdit?.teacher_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Môn học:</span>
              <span className="font-semibold text-text-primary">{selectedAssignmentForEdit?.subject_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Lớp học:</span>
              <span className="font-semibold text-text-primary">{selectedAssignmentForEdit?.class_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Niên khóa:</span>
              <span className="font-semibold text-text-primary">{selectedAssignmentForEdit?.academic_year_name || selectedAssignmentForEdit?.academic_year}</span>
            </div>
          </div>

          {assignmentFormError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{assignmentFormError}</span>
            </div>
          )}

          <form onSubmit={handleSaveEditAssignment} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-primary mb-1">
                  Vai trò *
                </label>
                <select
                  value={editAssignRole}
                  onChange={(e) => setEditAssignRole(e.target.value)}
                  className="w-full h-9 px-3 bg-surface-neutral border border-hairline rounded text-xs text-text-primary focus:outline-none focus:border-ocean"
                >
                  <option value="primary">Giáo viên chính</option>
                  <option value="secondary">Giáo viên phụ tá</option>
                  <option value="assistant">Trợ giảng</option>
                  <option value="substitute">Giáo viên dạy thay</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-primary mb-1">
                  Trạng thái *
                </label>
                <select
                  value={editAssignStatus}
                  onChange={(e) => setEditAssignStatus(e.target.value)}
                  className="w-full h-9 px-3 bg-surface-neutral border border-hairline rounded text-xs text-text-primary focus:outline-none focus:border-ocean"
                >
                  <option value="active">Hoạt động (Active)</option>
                  <option value="inactive">Tạm ngưng (Inactive)</option>
                  <option value="revoked">Đã thu hồi (Revoked)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-primary mb-1">
                Ghi chú
              </label>
              <textarea
                value={editAssignNotes}
                onChange={(e) => setEditAssignNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-surface-neutral border border-hairline rounded text-xs text-text-primary focus:outline-none focus:border-ocean"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => setIsEditAssignmentModalOpen(false)}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={isUpdatingAssignment}
              >
                {isUpdatingAssignment ? 'Đang cập nhật...' : 'Cập nhật phân công'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* MODAL 3: Xác nhận thu hồi phân công giảng dạy (G15) */}
      <Modal
        isOpen={isDeleteAssignmentModalOpen}
        onClose={() => setIsDeleteAssignmentModalOpen(false)}
        title="Thu hồi phân công giảng dạy"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-text-secondary leading-relaxed">
            Bạn có chắc chắn muốn thu hồi phân công giảng dạy của giáo viên{' '}
            <strong className="text-text-primary font-semibold">
              {selectedAssignmentForDelete?.teacher_name}
            </strong>{' '}
            cho môn{' '}
            <strong className="text-text-primary font-semibold">
              {selectedAssignmentForDelete?.subject_name}
            </strong>{' '}
            - Lớp{' '}
            <strong className="text-text-primary font-semibold">
              {selectedAssignmentForDelete?.class_name}
            </strong>?
          </p>
          <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded border border-amber-200">
            Giáo viên sẽ không còn quyền truy cập vào sổ điểm và dữ liệu chuyên môn của lớp học này.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => setIsDeleteAssignmentModalOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="danger"
              size="md"
              onClick={handleDeleteAssignmentConfirm}
            >
              Xác nhận thu hồi
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL: THÊM TIẾT HỌC THỜI KHÓA BIỂU (G16) */}
      <Modal
        isOpen={isCreateSlotModalOpen}
        onClose={() => setIsCreateSlotModalOpen(false)}
        title="Thêm tiết học vào Thời khóa biểu"
        size="md"
      >
        <form onSubmit={handleSaveSlot} className="space-y-4">
          {slotConflictError && (
            <div className="p-3 bg-danger-light border border-danger/40 rounded-card flex items-start gap-2.5 text-xs text-danger">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Phát hiện xung đột lịch học:</p>
                <p className="mt-0.5 leading-relaxed">{slotConflictError}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Lớp học <span className="text-danger">*</span>
              </label>
              <select
                value={slotFormData.class_id}
                onChange={(e) => setSlotFormData({ ...slotFormData, class_id: e.target.value })}
                className="w-full h-9 px-3 bg-surface-neutral/50 border border-hairline rounded-lg text-xs font-semibold text-text-primary focus:outline-none focus:border-ocean"
                required
              >
                {classesList.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} (K{c.grade_level})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Phòng học
              </label>
              <input
                type="text"
                placeholder="VD: Phòng 301, Nhà A..."
                value={slotFormData.room}
                onChange={(e) => setSlotFormData({ ...slotFormData, room: e.target.value })}
                className="w-full h-9 px-3 bg-white border border-hairline rounded-lg text-xs text-text-primary focus:outline-none focus:border-ocean"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Thứ trong tuần <span className="text-danger">*</span>
              </label>
              <select
                value={slotFormData.day_of_week}
                onChange={(e) => setSlotFormData({ ...slotFormData, day_of_week: Number(e.target.value) })}
                className="w-full h-9 px-3 bg-white border border-hairline rounded-lg text-xs text-text-primary focus:outline-none focus:border-ocean"
                required
              >
                {[2, 3, 4, 5, 6, 7].map((d) => (
                  <option key={d} value={d}>Thứ {d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Tiết học <span className="text-danger">*</span>
              </label>
              <select
                value={slotFormData.period}
                onChange={(e) => setSlotFormData({ ...slotFormData, period: Number(e.target.value) })}
                className="w-full h-9 px-3 bg-white border border-hairline rounded-lg text-xs text-text-primary focus:outline-none focus:border-ocean"
                required
              >
                <optgroup label="Buổi Sáng">
                  <option value={1}>Tiết 1 (07:00 - 07:45)</option>
                  <option value={2}>Tiết 2 (07:50 - 08:35)</option>
                  <option value={3}>Tiết 3 (08:50 - 09:35)</option>
                  <option value={4}>Tiết 4 (09:40 - 10:25)</option>
                  <option value={5}>Tiết 5 (10:30 - 11:15)</option>
                </optgroup>
                <optgroup label="Buổi Chiều">
                  <option value={6}>Tiết 6 (13:00 - 13:45)</option>
                  <option value={7}>Tiết 7 (13:50 - 14:35)</option>
                  <option value={8}>Tiết 8 (14:50 - 15:35)</option>
                  <option value={9}>Tiết 9 (15:40 - 16:25)</option>
                  <option value={10}>Tiết 10 (16:30 - 17:15)</option>
                </optgroup>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Môn học <span className="text-danger">*</span>
            </label>
            <select
              value={slotFormData.subject_id}
              onChange={(e) => setSlotFormData({ ...slotFormData, subject_id: e.target.value })}
              className="w-full h-9 px-3 bg-white border border-hairline rounded-lg text-xs text-text-primary focus:outline-none focus:border-ocean"
              required
            >
              {subjectsList.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Giáo viên giảng dạy
            </label>
            <select
              value={slotFormData.teacher_id}
              onChange={(e) => setSlotFormData({ ...slotFormData, teacher_id: e.target.value })}
              className="w-full h-9 px-3 bg-white border border-hairline rounded-lg text-xs text-text-primary focus:outline-none focus:border-ocean"
            >
              <option value="">-- Chưa gán giáo viên --</option>
              {teachersList.map((t) => (
                <option key={t.user_id || t.id} value={t.user_id || t.id}>
                  {t.full_name || t.name} ({t.employee_id || t.code || 'GV'})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => setIsCreateSlotModalOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSavingSlot}
            >
              {isSavingSlot ? 'Đang kiểm tra & lưu...' : 'Lưu tiết học'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: XÁC NHẬN XÓA TIẾT HỌC (G16) */}
      <Modal
        isOpen={isDeleteSlotModalOpen}
        onClose={() => setIsDeleteSlotModalOpen(false)}
        title="Xóa tiết học khỏi Thời khóa biểu"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-text-secondary">
            Bạn có chắc chắn muốn xóa tiết học sau khỏi thời khóa biểu?
          </p>
          {slotToDelete && (
            <div className="p-3 bg-surface-neutral rounded-lg border border-hairline space-y-1 text-xs">
              <div className="font-semibold text-text-primary">{slotToDelete.subject_name}</div>
              <div className="text-text-secondary">
                Thứ {slotToDelete.day_of_week} • Tiết {slotToDelete.period} ({slotToDelete.start_time} - {slotToDelete.end_time})
              </div>
              <div className="text-text-tertiary">
                Lớp: {slotToDelete.class_name} • GV: {slotToDelete.teacher_name || 'Chưa gán'}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => setIsDeleteSlotModalOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="danger"
              size="md"
              disabled={isDeletingSlot}
              onClick={handleDeleteSlotConfirm}
            >
              {isDeletingSlot ? 'Đang xóa...' : 'Xác nhận xóa'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* TAB 8: ANNOUNCEMENTS (G25) */}
      {activeTab === 'announcements' && (
        <AdminAnnouncementsPage />
      )}
    </div>
  );
}

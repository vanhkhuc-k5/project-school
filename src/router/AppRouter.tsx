// =============================================================================
// AppRouter.tsx — G39 Real Routing (TypeScript)
// Production React Router v6 setup with:
// - Direct navigation
// - Refresh survival (URL is the source of truth)
// - Browser back/forward support
// - Protected routes with role-based access
// - Role/permission-aware routes
// - 404 Not Found page
// - Code-splitting with React.lazy()
// =============================================================================

import React, { Suspense, lazy, ReactNode } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ── Error Pages ────────────────────────────────────────────────────────────────
import { NotFoundPage } from '../pages/errors/NotFoundPage';
import { ForbiddenPage } from '../pages/errors/ForbiddenPage';

// ── Auth Pages ────────────────────────────────────────────────────────────────
import { LoginPage } from '../pages/auth/LoginPage';

// ── Role Layouts (static imports — shared across routes) ────────────────────────
import { StudentLayout } from '../layouts/StudentLayout';
import { TeacherLayout } from '../layouts/TeacherLayout';
import { ParentLayout } from '../layouts/ParentLayout';
import { AdminLayout } from '../layouts/AdminLayout';
import { LeadershipLayout } from '../layouts/LeadershipLayout';
import { DepartmentHeadLayout } from '../layouts/DepartmentHeadLayout';

// ── Code-splitting: Lazy load pages for better bundle size ────────────────────
// Student Pages (lazy loaded)
const StudentDashboard = lazy(() => import('../pages/student/StudentDashboard').then(m => ({ default: m.StudentDashboard })));
const StudentAssignmentsPage = lazy(() => import('../pages/student/StudentAssignmentsPage').then(m => ({ default: m.StudentAssignmentsPage })));
const StudentResourcesPage = lazy(() => import('../pages/student/StudentResourcesPage').then(m => ({ default: m.StudentResourcesPage })));
const StudentGradesPage = lazy(() => import('../pages/student/StudentGradesPage').then(m => ({ default: m.StudentGradesPage })));
const StudentTimetablePage = lazy(() => import('../pages/student/StudentTimetablePage').then(m => ({ default: m.StudentTimetablePage })));
const StudentAttendancePage = lazy(() => import('../pages/student/StudentAttendancePage').then(m => ({ default: m.StudentAttendancePage })));
const StudentAnnouncementsPage = lazy(() => import('../pages/student/StudentAnnouncementsPage').then(m => ({ default: m.StudentAnnouncementsPage })));
const AiTutorPage = lazy(() => import('../pages/student/AiTutorPage').then(m => ({ default: m.AiTutorPage })));

// Teacher Pages (lazy loaded)
const TeacherDashboard = lazy(() => import('../pages/teacher/TeacherDashboard').then(m => ({ default: m.TeacherDashboard })));
const TeacherClassesPage = lazy(() => import('../pages/teacher/TeacherClassesPage').then(m => ({ default: m.TeacherClassesPage })));
const TeacherAssignmentsPage = lazy(() => import('../pages/teacher/TeacherAssignmentsPage').then(m => ({ default: m.TeacherAssignmentsPage })));
const TeacherAnalytics = lazy(() => import('../pages/teacher/TeacherAnalytics').then(m => ({ default: m.TeacherAnalytics })));
const TeacherReportsPage = lazy(() => import('../pages/teacher/TeacherReportsPage').then(m => ({ default: m.TeacherReportsPage })));
const TeacherSchedulePage = lazy(() => import('../pages/teacher/TeacherSchedulePage').then(m => ({ default: m.TeacherSchedulePage })));
const TeacherMessagesPage = lazy(() => import('../pages/teacher/TeacherMessagesPage').then(m => ({ default: m.TeacherMessagesPage })));
const CreateAssignment = lazy(() => import('../pages/teacher/CreateAssignment').then(m => ({ default: m.CreateAssignment })));

// Parent Pages (lazy loaded)
const ParentDashboardPage = lazy(() => import('../pages/parent/ParentDashboardPage').then(m => ({ default: m.ParentDashboardPage })));
const ParentGradesPage = lazy(() => import('../pages/parent/ParentGradesPage').then(m => ({ default: m.ParentGradesPage })));
const ParentSchedulePage = lazy(() => import('../pages/parent/ParentSchedulePage').then(m => ({ default: m.ParentSchedulePage })));
const ParentLeaveRequestPage = lazy(() => import('../pages/parent/ParentLeaveRequestPage').then(m => ({ default: m.ParentLeaveRequestPage })));
const ParentTuitionPage = lazy(() => import('../pages/parent/ParentTuitionPage').then(m => ({ default: m.ParentTuitionPage })));
const ParentMessagesPage = lazy(() => import('../pages/parent/ParentMessagesPage').then(m => ({ default: m.ParentMessagesPage })));
const ParentNoticesPage = lazy(() => import('../pages/parent/ParentNoticesPage').then(m => ({ default: m.ParentNoticesPage })));

// Department Pages (lazy loaded)
const DepartmentDashboardPage = lazy(() => import('../pages/department/DepartmentDashboardPage').then(m => ({ default: m.DepartmentDashboardPage })));
const DepartmentCurriculumPage = lazy(() => import('../pages/department/DepartmentCurriculumPage').then(m => ({ default: m.DepartmentCurriculumPage })));
const DepartmentLessonPlanApprovalPage = lazy(() => import('../pages/department/DepartmentLessonPlanApprovalPage').then(m => ({ default: m.DepartmentLessonPlanApprovalPage })));
const DepartmentAssessmentAnalyticsPage = lazy(() => import('../pages/department/DepartmentAssessmentAnalyticsPage').then(m => ({ default: m.DepartmentAssessmentAnalyticsPage })));

// Leadership Pages (lazy loaded)
const LeadershipDashboardPage = lazy(() => import('../pages/leadership/LeadershipDashboardPage').then(m => ({ default: m.LeadershipDashboardPage })));
const LeadershipStaffPage = lazy(() => import('../pages/leadership/LeadershipStaffPage').then(m => ({ default: m.LeadershipStaffPage })));
const LeadershipAcademicReportsPage = lazy(() => import('../pages/leadership/LeadershipAcademicReportsPage').then(m => ({ default: m.LeadershipAcademicReportsPage })));
const LeadershipApprovalsPage = lazy(() => import('../pages/leadership/LeadershipApprovalsPage').then(m => ({ default: m.LeadershipApprovalsPage })));

// Admin Pages (lazy loaded)
const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const AdminAnnouncementsPage = lazy(() => import('../pages/admin/AdminAnnouncementsPage').then(m => ({ default: m.AdminAnnouncementsPage })));
const AdminAcademicPage = lazy(() => import('../pages/admin/AdminAcademicPage').then(m => ({ default: m.AdminAcademicPage })));
const AdminStudentListPage = lazy(() => import('../pages/admin/AdminStudentListPage').then(m => ({ default: m.AdminStudentListPage })));
const AdminStudent360Page = lazy(() => import('../pages/admin/AdminStudent360Page').then(m => ({ default: m.AdminStudent360Page })));
const AdminTeacherListPage = lazy(() => import('../pages/admin/AdminTeacherListPage').then(m => ({ default: m.AdminTeacherListPage })));
const AdminTeacher360Page = lazy(() => import('../pages/admin/AdminTeacher360Page').then(m => ({ default: m.AdminTeacher360Page })));
const AdminClassStructurePage = lazy(() => import('../pages/admin/AdminClassStructurePage').then(m => ({ default: m.AdminClassStructurePage })));
const AdminAttendancePage = lazy(() => import('../pages/admin/AdminAttendancePage').then(m => ({ default: m.AdminAttendancePage })));
const AdminAssessmentPage = lazy(() => import('../pages/admin/AdminAssessmentPage').then(m => ({ default: m.AdminAssessmentPage })));
const AdminParentListPage = lazy(() => import('../pages/admin/AdminParentListPage').then(m => ({ default: m.AdminParentListPage })));
const AdminParentDetailPage = lazy(() => import('../pages/admin/AdminParentDetailPage').then(m => ({ default: m.AdminParentDetailPage })));
const AdminCommunicationPage = lazy(() => import('../pages/admin/AdminCommunicationPage').then(m => ({ default: m.AdminCommunicationPage })));
const AdminReportCenterPage = lazy(() => import('../pages/admin/AdminReportCenterPage').then(m => ({ default: m.AdminReportCenterPage })));
const AdminDataOperationsPage = lazy(() => import('../pages/admin/AdminDataOperationsPage').then(m => ({ default: m.AdminDataOperationsPage })));
const AdminSystemPage = lazy(() => import('../pages/admin/AdminSystemPage').then(m => ({ default: m.AdminSystemPage })));

// =============================================================================
// Role Constants
// =============================================================================
const STUDENT_ROLES = ['student'];
const TEACHER_ROLES = ['teacher'];
const PARENT_ROLES = ['parent'];
const ADMIN_ROLES = ['admin', 'school_admin', 'super_admin'];
const LEADERSHIP_ROLES = ['admin', 'school_admin', 'super_admin', 'principal', 'vice_principal'];
const DEPARTMENT_HEAD_ROLES = ['admin', 'school_admin', 'super_admin', 'department_head'];

// =============================================================================
// Login Page Wrapper with Navigation
// =============================================================================
function LoginPageWrapper(): React.ReactElement {
  const navigate = useNavigate();

  const handleLoginSuccess = (role: string): void => {
    switch (role) {
      case 'student':
        navigate('/student', { replace: true });
        break;
      case 'teacher':
        navigate('/teacher', { replace: true });
        break;
      case 'parent':
        navigate('/parent', { replace: true });
        break;
      case 'admin':
      case 'school_admin':
      case 'super_admin':
        navigate('/admin', { replace: true });
        break;
      default:
        navigate('/student', { replace: true });
    }
  };

  return <LoginPage onLoginSuccess={handleLoginSuccess} />;
}

// =============================================================================
// Root Redirect — authenticated → role dashboard
// =============================================================================
function RootRedirect(): React.ReactElement {
  const { currentUser, currentRole } = useAuth();
  if (currentUser) {
    if (STUDENT_ROLES.includes(currentRole)) return <Navigate to="/student" replace />;
    if (TEACHER_ROLES.includes(currentRole)) return <Navigate to="/teacher" replace />;
    if (PARENT_ROLES.includes(currentRole)) return <Navigate to="/parent" replace />;
    if (ADMIN_ROLES.includes(currentRole)) return <Navigate to="/admin" replace />;
  }
  return <Navigate to="/login" replace />;
}

// =============================================================================
// Protected Route Wrapper
// Checks authentication and role-based access (UX-level only).
// Security boundary is server-side authorization.
// =============================================================================
export function ProtectedRoute({ children, allowedRoles = null }: { children: ReactNode; allowedRoles?: string[] | null }): React.ReactElement {
  const { currentUser, currentRole, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-ocean/30 border-t-ocean rounded-full animate-spin" />
          <span className="text-sm text-text-secondary">Đang tải...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(currentRole)) {
      return <Navigate to="/403" replace />;
    }
  }

  return <>{children}</>;
}

// =============================================================================
// ScrollToTop — reset scroll on navigation
// =============================================================================
function ScrollToTop(): null {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// Loading fallback for lazy loaded routes
function RouteLoader(): React.ReactElement {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-ocean/30 border-t-ocean rounded-full animate-spin" />
        <span className="text-sm text-text-secondary">Đang tải...</span>
      </div>
    </div>
  );
}

// =============================================================================
// Main Router Component
// =============================================================================
export function AppRouter(): React.ReactElement {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* ── Public Routes ──────────────────────────────────────────────── */}

        <Route path="/login" element={<LoginPageWrapper />} />
        <Route path="/403" element={<ForbiddenPage />} />
        <Route path="/404" element={<NotFoundPage />} />

        {/* ── Root ──────────────────────────────────────────────────────── */}
        <Route path="/" element={<RootRedirect />} />

        {/* ── Student Routes ───────────────────────────────────────────── */}
        <Route
          path="/student"
          element={
            <ProtectedRoute allowedRoles={STUDENT_ROLES}>
              <StudentLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/student/dashboard" replace />} />
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="assignments" element={<StudentAssignmentsPage />} />
          <Route path="grades" element={<StudentGradesPage />} />
          <Route path="timetable" element={<StudentTimetablePage />} />
          <Route path="attendance" element={<StudentAttendancePage />} />
          <Route path="resources" element={<StudentResourcesPage />} />
          <Route path="announcements" element={<StudentAnnouncementsPage />} />
          <Route path="ai-tutor" element={<AiTutorPage />} />
        </Route>

        {/* ── Teacher Routes ───────────────────────────────────────────── */}
        <Route
          path="/teacher"
          element={
            <ProtectedRoute allowedRoles={TEACHER_ROLES}>
              <TeacherLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/teacher/dashboard" replace />} />
          <Route path="dashboard" element={<TeacherDashboard />} />
          <Route path="schedule" element={<TeacherSchedulePage />} />
          <Route path="classes" element={<TeacherClassesPage />} />
          <Route path="assignments" element={<TeacherAssignmentsPage />} />
          <Route path="assignments/create" element={<CreateAssignment />} />
          <Route path="assignments/:id/edit" element={<CreateAssignment />} />
          <Route path="analytics" element={<TeacherAnalytics />} />
          <Route path="reports" element={<TeacherReportsPage />} />
          <Route path="messages" element={<TeacherMessagesPage />} />
        </Route>

        {/* ── Parent Routes ───────────────────────────────────────────── */}
        <Route
          path="/parent"
          element={
            <ProtectedRoute allowedRoles={PARENT_ROLES}>
              <ParentLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/parent/dashboard" replace />} />
          <Route path="dashboard" element={<ParentDashboardPage />} />
          <Route path="grades" element={<ParentGradesPage />} />
          <Route path="schedule" element={<ParentSchedulePage />} />
          <Route path="leave" element={<ParentLeaveRequestPage />} />
          <Route path="tuition" element={<ParentTuitionPage />} />
          <Route path="notices" element={<ParentNoticesPage />} />
          <Route path="messages" element={<ParentMessagesPage />} />
        </Route>

        {/* ── Admin / BGH Routes ───────────────────────────────────────── */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={ADMIN_ROLES}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="overview" element={<AdminDashboard />} />
          <Route path="announcements" element={<AdminAnnouncementsPage />} />
          <Route path="academic" element={<AdminAcademicPage />} />
          <Route path="students" element={<AdminStudentListPage />} />
          <Route path="students/:studentId" element={<AdminStudent360Page />} />
          <Route path="teachers" element={<AdminTeacherListPage />} />
          <Route path="teachers/:teacherId" element={<AdminTeacher360Page />} />
          <Route path="classes/:classId/structure" element={<AdminClassStructurePage />} />
          <Route path="attendance" element={<AdminAttendancePage />} />
          <Route path="assessment" element={<AdminAssessmentPage />} />
          <Route path="parents" element={<AdminParentListPage />} />
          <Route path="parents/:parentId" element={<AdminParentDetailPage />} />
          <Route path="communication" element={<AdminCommunicationPage />} />
          <Route path="reports" element={<AdminReportCenterPage />} />
          <Route path="data" element={<AdminDataOperationsPage />} />
          <Route path="system" element={<AdminSystemPage />} />
        </Route>

        {/* ── Leadership Routes (Admin+) ───────────────────────────────── */}
        <Route
          path="/leadership"
          element={
            <ProtectedRoute allowedRoles={LEADERSHIP_ROLES}>
              <LeadershipLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/leadership/dashboard" replace />} />
          <Route path="dashboard" element={<LeadershipDashboardPage />} />
          <Route path="staff" element={<LeadershipStaffPage />} />
          <Route path="academic" element={<LeadershipAcademicReportsPage />} />
          <Route path="approvals" element={<LeadershipApprovalsPage />} />
        </Route>

        {/* ── Department Head Routes ───────────────────────────────────── */}
        <Route
          path="/department"
          element={
            <ProtectedRoute allowedRoles={DEPARTMENT_HEAD_ROLES}>
              <DepartmentHeadLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/department/dashboard" replace />} />
          <Route path="dashboard" element={<DepartmentDashboardPage />} />
          <Route path="curriculum" element={<DepartmentCurriculumPage />} />
          <Route path="lesson-plans" element={<DepartmentLessonPlanApprovalPage />} />
          <Route path="assessments" element={<DepartmentAssessmentAnalyticsPage />} />
        </Route>

        {/* ── Catch-all 404 ───────────────────────────────────────────── */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;

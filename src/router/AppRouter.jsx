// =============================================================================
// AppRouter.jsx — G39 Real Routing
// Production React Router v6 setup with:
// - Direct navigation
// - Refresh survival (URL is the source of truth)
// - Browser back/forward support
// - Protected routes with role-based access
// - Role/permission-aware routes
// - 404 Not Found page
// - 403 Forbidden page
//
// SECURITY: Server-side authorization is the security boundary.
// This router provides UX-level role guards only. Do NOT use this as a security boundary.
// =============================================================================

import React from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ── Error Pages ──────────────────────────────────────────────────────────────
import { NotFoundPage } from '../pages/errors/NotFoundPage';
import { ForbiddenPage } from '../pages/errors/ForbiddenPage';

// ── Auth Pages ─────────────────────────────────────────────────────────────
import { LoginPage } from '../pages/auth/LoginPage';

// ── Role Layouts ────────────────────────────────────────────────────────────
import { StudentLayout } from '../layouts/StudentLayout';
import { TeacherLayout } from '../layouts/TeacherLayout';
import { ParentLayout } from '../layouts/ParentLayout';
import { AdminLayout } from '../layouts/AdminLayout';

// ── Student Pages ───────────────────────────────────────────────────────────
import { StudentDashboard } from '../pages/student/StudentDashboard';
import { StudentAssignmentsPage } from '../pages/student/StudentAssignmentsPage';
import { StudentResourcesPage } from '../pages/student/StudentResourcesPage';
import { StudentGradesPage } from '../pages/student/StudentGradesPage';
import { StudentTimetablePage } from '../pages/student/StudentTimetablePage';
import { StudentAttendancePage } from '../pages/student/StudentAttendancePage';
import { StudentAnnouncementsPage } from '../pages/student/StudentAnnouncementsPage';
import { AiTutorPage } from '../pages/student/AiTutorPage';

// ── Teacher Pages ───────────────────────────────────────────────────────────
import { TeacherDashboard } from '../pages/teacher/TeacherDashboard';
import { TeacherClassesPage } from '../pages/teacher/TeacherClassesPage';
import { TeacherAssignmentsPage } from '../pages/teacher/TeacherAssignmentsPage';
import { TeacherAnalytics } from '../pages/teacher/TeacherAnalytics';
import { TeacherReportsPage } from '../pages/teacher/TeacherReportsPage';
import { TeacherSchedulePage } from '../pages/teacher/TeacherSchedulePage';
import { CreateAssignment } from '../pages/teacher/CreateAssignment';

// ── Parent Pages ────────────────────────────────────────────────────────────
import { ParentDashboard } from '../pages/parent/ParentDashboard';

// ── Admin Pages ─────────────────────────────────────────────────────────────
import { AdminDashboard } from '../pages/admin/AdminDashboard';
import { AdminAnnouncementsPage } from '../pages/admin/AdminAnnouncementsPage';
import { AdminAcademicPage } from '../pages/admin/AdminAcademicPage';
import { AdminStudentListPage } from '../pages/admin/AdminStudentListPage';
import { AdminStudent360Page } from '../pages/admin/AdminStudent360Page';

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
function LoginPageWrapper() {
  const navigate = useNavigate();

  const handleLoginSuccess = (role) => {
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
// Root Redirect —authenticated → role dashboard
// =============================================================================
function RootRedirect() {
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
export function ProtectedRoute({ children, allowedRoles = null }) {
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

  return children;
}

// =============================================================================
// ScrollToTop — reset scroll on navigation
// =============================================================================
function ScrollToTop() {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// =============================================================================
// Main Router Component
// =============================================================================
export function AppRouter() {
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
          <Route path="dashboard" element={<ParentDashboard />} />
          {/* Future: /parent/grades, /parent/leave, /parent/tuition, /parent/messages */}
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
          {/* Future: /admin/teachers, /admin/classes, /admin/settings */}
        </Route>

        {/* ── Leadership Routes (Admin+) ───────────────────────────────── */}
        <Route
          path="/leadership"
          element={
            <ProtectedRoute allowedRoles={LEADERSHIP_ROLES}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="dashboard" element={<AdminDashboard />} />
        </Route>

        {/* ── Department Head Routes ───────────────────────────────────── */}
        <Route
          path="/department"
          element={
            <ProtectedRoute allowedRoles={DEPARTMENT_HEAD_ROLES}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="dashboard" element={<AdminDashboard />} />
        </Route>

        {/* ── Catch-all 404 ───────────────────────────────────────────── */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;

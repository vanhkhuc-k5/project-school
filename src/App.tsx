// =============================================================================
// App.tsx — G39 Real Routing (TypeScript)
// Bridges legacy stateful navigation callbacks into router navigation.
// All routing is handled by AppRouter in main.tsx; this module is kept minimal.
// =============================================================================

import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Legacy navigation bridge — maps old callback-driven navigation to router navigation.
 * Used by pages that still receive `onNavigateXxx` props from the old App state machine.
 * Pages should migrate to useNavigate() directly instead of these.
 */
export function useLegacyNavigation() {
  const navigate = useNavigate();
  return React.useMemo(() => ({
    navigateToStudentAiTutor: () => navigate('/student/ai-tutor'),
    navigateToStudentTimetable: () => navigate('/student/timetable'),
    navigateToStudentAssignments: () => navigate('/student/assignments'),
    navigateToStudentGrades: () => navigate('/student/grades'),
    navigateToStudentAttendance: () => navigate('/student/attendance'),
    navigateToStudentResources: () => navigate('/student/resources'),
    navigateToStudentAnnouncements: () => navigate('/student/announcements'),

    navigateToTeacherDashboard: () => navigate('/teacher/dashboard'),
    navigateToTeacherSchedule: () => navigate('/teacher/schedule'),
    navigateToTeacherClasses: () => navigate('/teacher/classes'),
    navigateToTeacherAssignments: () => navigate('/teacher/assignments'),
    navigateToTeacherCreateAssignment: () => navigate('/teacher/assignments/create'),
    navigateToTeacherAnalytics: () => navigate('/teacher/analytics'),
    navigateToTeacherReports: () => navigate('/teacher/reports'),

    navigateToParentDashboard: () => navigate('/parent/dashboard'),

    navigateToAdminDashboard: () => navigate('/admin/dashboard'),
    navigateToAdminAnnouncements: () => navigate('/admin/announcements'),
  }), [navigate]);
}

// Re-export everything from AppRouter for backward compatibility
export { AppRouter } from './router/AppRouter';
import { ProtectedRoute as ProtectedRouteComp } from './router/AppRouter';
export { ProtectedRouteComp as ProtectedRoute };

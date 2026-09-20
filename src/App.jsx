import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SyncProvider } from './context/SyncContext';
import { RoleSwitcher } from './components/RoleSwitcher';

// Layouts
import { StudentLayout } from './layouts/StudentLayout';
import { TeacherLayout } from './layouts/TeacherLayout';
import { ParentLayout } from './layouts/ParentLayout';
import { AdminLayout } from './layouts/AdminLayout';

// Pages
import { LoginPage } from './pages/auth/LoginPage';
import { StudentDashboard } from './pages/student/StudentDashboard';
import { StudentAssignmentsPage } from './pages/student/StudentAssignmentsPage';
import { StudentResourcesPage } from './pages/student/StudentResourcesPage';
import { StudentGradesPage } from './pages/student/StudentGradesPage';
import { AiTutorPage } from './pages/student/AiTutorPage';

import { TeacherDashboard } from './pages/teacher/TeacherDashboard';
import { TeacherClassesPage } from './pages/teacher/TeacherClassesPage';
import { TeacherAssignmentsPage } from './pages/teacher/TeacherAssignmentsPage';
import { TeacherAnalytics } from './pages/teacher/TeacherAnalytics';
import { TeacherReportsPage } from './pages/teacher/TeacherReportsPage';
import { CreateAssignment } from './pages/teacher/CreateAssignment';

import { ParentDashboard } from './pages/parent/ParentDashboard';
import { AdminDashboard } from './pages/admin/AdminDashboard';

function AppContent() {
  const { currentRole, switchRole } = useAuth();
  const [currentView, setCurrentView] = useState('student-dashboard');

  const handleLoginSuccess = (role) => {
    switch (role) {
      case 'student':
        setCurrentView('student-dashboard');
        break;
      case 'teacher':
        setCurrentView('teacher-dashboard');
        break;
      case 'parent':
        setCurrentView('parent-dashboard');
        break;
      case 'admin':
        setCurrentView('admin-dashboard');
        break;
      default:
        setCurrentView('student-dashboard');
    }
  };

  // Render view
  const renderCurrentView = () => {
    if (currentRole === 'guest' || currentView === 'login') {
      return <LoginPage onLoginSuccess={handleLoginSuccess} />;
    }

    // Student views
    if (currentRole === 'student') {
      let studentTab = 'home';
      if (currentView === 'student-assignments') studentTab = 'assignments';
      else if (currentView === 'student-resources') studentTab = 'resources';
      else if (currentView === 'student-grades') studentTab = 'grades';
      else if (currentView === 'student-ai-tutor') studentTab = 'ai-tutor';

      return (
        <StudentLayout
          currentTab={studentTab}
          onTabChange={(tabId) => {
            if (tabId === 'ai-tutor') setCurrentView('student-ai-tutor');
            else if (tabId === 'assignments') setCurrentView('student-assignments');
            else if (tabId === 'resources') setCurrentView('student-resources');
            else if (tabId === 'grades') setCurrentView('student-grades');
            else setCurrentView('student-dashboard');
          }}
        >
          {studentTab === 'ai-tutor' ? (
            <AiTutorPage />
          ) : studentTab === 'assignments' ? (
            <StudentAssignmentsPage />
          ) : studentTab === 'resources' ? (
            <StudentResourcesPage />
          ) : studentTab === 'grades' ? (
            <StudentGradesPage />
          ) : (
            <StudentDashboard
              onNavigateToAiTutor={() => setCurrentView('student-ai-tutor')}
            />
          )}
        </StudentLayout>
      );
    }

    // Teacher views
    if (currentRole === 'teacher') {
      let teacherTab = 'overview';
      if (currentView === 'teacher-classes') teacherTab = 'classes';
      else if (currentView === 'teacher-assignments' || currentView === 'teacher-create-assignment') teacherTab = 'assignments';
      else if (currentView === 'teacher-analytics') teacherTab = 'analytics';
      else if (currentView === 'teacher-reports') teacherTab = 'reports';

      return (
        <TeacherLayout
          currentTab={teacherTab}
          onTabChange={(tabId) => {
            if (tabId === 'overview') setCurrentView('teacher-dashboard');
            else if (tabId === 'classes') setCurrentView('teacher-classes');
            else if (tabId === 'assignments') setCurrentView('teacher-assignments');
            else if (tabId === 'analytics') setCurrentView('teacher-analytics');
            else if (tabId === 'reports') setCurrentView('teacher-reports');
          }}
        >
          {currentView === 'teacher-create-assignment' ? (
            <CreateAssignment
              onBackToDashboard={() => setCurrentView('teacher-assignments')}
            />
          ) : teacherTab === 'classes' ? (
            <TeacherClassesPage />
          ) : teacherTab === 'assignments' ? (
            <TeacherAssignmentsPage
              onNavigateCreateAssignment={() => setCurrentView('teacher-create-assignment')}
            />
          ) : teacherTab === 'analytics' ? (
            <TeacherAnalytics
              onNavigateCreateAssignment={() => setCurrentView('teacher-create-assignment')}
            />
          ) : teacherTab === 'reports' ? (
            <TeacherReportsPage />
          ) : (
            <TeacherDashboard
              onNavigateAnalytics={() => setCurrentView('teacher-analytics')}
              onNavigateCreateAssignment={() => setCurrentView('teacher-create-assignment')}
            />
          )}
        </TeacherLayout>
      );
    }

    // Parent views
    if (currentRole === 'parent') {
      return (
        <ParentLayout currentTab="home">
          <ParentDashboard />
        </ParentLayout>
      );
    }

    // Admin views
    if (currentRole === 'admin') {
      return (
        <AdminLayout currentTab="overview">
          <AdminDashboard />
        </AdminLayout>
      );
    }

    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  };

  return (
    <div className="min-h-screen relative font-sans">
      {renderCurrentView()}
      {/* Floating Demo Role Switcher for evaluation */}
      <RoleSwitcher currentView={currentView} setCurrentView={setCurrentView} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SyncProvider>
        <AppContent />
      </SyncProvider>
    </AuthProvider>
  );
}

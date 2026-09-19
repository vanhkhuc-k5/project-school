import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RoleSwitcher } from './components/RoleSwitcher';

// Layouts
import { StudentLayout } from './layouts/StudentLayout';
import { TeacherLayout } from './layouts/TeacherLayout';
import { ParentLayout } from './layouts/ParentLayout';
import { AdminLayout } from './layouts/AdminLayout';

// Pages
import { LoginPage } from './pages/auth/LoginPage';
import { StudentDashboard } from './pages/student/StudentDashboard';
import { AiTutorPage } from './pages/student/AiTutorPage';
import { TeacherDashboard } from './pages/teacher/TeacherDashboard';
import { TeacherAnalytics } from './pages/teacher/TeacherAnalytics';
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
        setCurrentView('teacher-analytics');
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
      const studentTab = currentView === 'student-ai-tutor' ? 'ai-tutor' : 'home';
      return (
        <StudentLayout
          currentTab={studentTab}
          onTabChange={(tabId) => {
            if (tabId === 'ai-tutor') setCurrentView('student-ai-tutor');
            else setCurrentView('student-dashboard');
          }}
        >
          {currentView === 'student-ai-tutor' ? (
            <AiTutorPage />
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
      let teacherTab = 'analytics';
      if (currentView === 'teacher-dashboard') teacherTab = 'overview';
      if (currentView === 'teacher-create-assignment') teacherTab = 'assignments';

      return (
        <TeacherLayout
          currentTab={teacherTab}
          onTabChange={(tabId) => {
            if (tabId === 'overview') setCurrentView('teacher-dashboard');
            else if (tabId === 'assignments') setCurrentView('teacher-create-assignment');
            else setCurrentView('teacher-analytics');
          }}
        >
          {currentView === 'teacher-create-assignment' ? (
            <CreateAssignment
              onBackToDashboard={() => setCurrentView('teacher-analytics')}
            />
          ) : currentView === 'teacher-dashboard' ? (
            <TeacherDashboard
              onNavigateAnalytics={() => setCurrentView('teacher-analytics')}
              onNavigateCreateAssignment={() => setCurrentView('teacher-create-assignment')}
            />
          ) : (
            <TeacherAnalytics
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
      <AppContent />
    </AuthProvider>
  );
}

import React, { createContext, useContext, useState, useEffect } from 'react';
import { MOCK_USERS } from '../mock/authData';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Default to student, but can easily switch
  const [currentUser, setCurrentUser] = useState(MOCK_USERS.student);
  const [currentRole, setCurrentRole] = useState('student');
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);

  useEffect(() => {
    // Check if token exists to hydrate user
    const initAuth = async () => {
      try {
        const user = await authApi.getMe();
        if (user) {
          setCurrentUser(user);
          setCurrentRole(user.role);
        }
      } catch {
        // Fallback to default mock user
      }
    };
    initAuth();
  }, []);

  const switchRole = (role) => {
    if (MOCK_USERS[role]) {
      setCurrentRole(role);
      setCurrentUser(MOCK_USERS[role]);
    }
  };

  const login = async (role, identifier, password) => {
    setIsLoadingAuth(true);
    try {
      const user = await authApi.login(identifier, password, role);
      if (user) {
        setCurrentUser(user);
        setCurrentRole(user.role || role);
      }
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = () => {
    authApi.logout();
    setCurrentRole('guest');
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, currentRole, switchRole, login, logout, isLoadingAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

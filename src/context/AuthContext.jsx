import React, { createContext, useContext, useState } from 'react';
import { MOCK_USERS } from '../mock/authData';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Default to student, but can easily switch
  const [currentUser, setCurrentUser] = useState(MOCK_USERS.student);
  const [currentRole, setCurrentRole] = useState('student');

  const switchRole = (role) => {
    if (MOCK_USERS[role]) {
      setCurrentRole(role);
      setCurrentUser(MOCK_USERS[role]);
    }
  };

  const login = (role) => {
    switchRole(role);
  };

  const logout = () => {
    // Return to login screen
    setCurrentRole('guest');
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, currentRole, switchRole, login, logout }}>
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

import React, { createContext, useContext, useState, useEffect } from 'react';
import { MOCK_USERS } from '../mock/authData';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Session hydration from localStorage
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('eduportal_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [currentRole, setCurrentRole] = useState(() => {
    try {
      const saved = localStorage.getItem('eduportal_user');
      return saved ? (JSON.parse(saved)?.role || 'guest') : 'guest';
    } catch {
      return 'guest';
    }
  });

  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    // Check if token exists to hydrate user from real backend
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('edunordic_token');
        if (token) {
          const user = await authApi.getMe();
          if (user) {
            setCurrentUser(user);
            setCurrentRole(user.role);
            localStorage.setItem('eduportal_user', JSON.stringify(user));
          } else {
            // Token expired or invalid
            setCurrentUser(null);
            setCurrentRole('guest');
            localStorage.removeItem('eduportal_user');
            localStorage.removeItem('edunordic_token');
          }
        } else {
          setCurrentUser(null);
          setCurrentRole('guest');
        }
      } catch {
        setCurrentUser(null);
        setCurrentRole('guest');
      } finally {
        setIsLoadingAuth(false);
      }
    };
    initAuth();
  }, []);

  const switchRole = (role) => {
    if (MOCK_USERS[role]) {
      setCurrentRole(role);
      setCurrentUser(MOCK_USERS[role]);
      localStorage.setItem('eduportal_user', JSON.stringify(MOCK_USERS[role]));
    }
  };

  const login = async (role, identifier, password) => {
    setIsLoadingAuth(true);
    try {
      const res = await authApi.login(identifier, password, role);
      if (res.success && res.user) {
        setCurrentUser(res.user);
        setCurrentRole(res.user.role || role);
        localStorage.setItem('eduportal_user', JSON.stringify(res.user));
        return { success: true, user: res.user };
      }
      return { success: false, message: res.message || 'Đăng nhập không thành công' };
    } catch (err) {
      return { success: false, message: 'Lỗi kết nối đến hệ thống xác thực' };
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = () => {
    authApi.logout();
    setCurrentRole('guest');
    setCurrentUser(null);
    localStorage.removeItem('eduportal_user');
    localStorage.removeItem('edunordic_token');
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

import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentRole, setCurrentRole] = useState('guest');
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const initAuth = async () => {
      try {
        // Attempt session recovery via HttpOnly refresh cookie + getMe
        const user = await authApi.getMe();
        if (isMounted) {
          if (user) {
            setCurrentUser(user);
            setCurrentRole(user.role);
          } else {
            setCurrentUser(null);
            setCurrentRole('guest');
          }
        }
      } catch {
        if (isMounted) {
          setCurrentUser(null);
          setCurrentRole('guest');
        }
      } finally {
        if (isMounted) {
          setIsLoadingAuth(false);
        }
      }
    };

    initAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (role, identifier, password) => {
    setIsLoadingAuth(true);
    try {
      const res = await authApi.login(identifier, password, role);
      if (res.success && res.user) {
        setCurrentUser(res.user);
        setCurrentRole(res.user.role || role);
        return { success: true, user: res.user };
      }
      return { success: false, message: res.message || 'Đăng nhập không thành công' };
    } catch {
      return { success: false, message: 'Lỗi kết nối đến hệ thống xác thực' };
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      setCurrentRole('guest');
      setCurrentUser(null);
    }
  };

  // Check if user is authenticated
  const isAuthenticated = () => {
    return currentUser !== null && currentRole !== 'guest';
  };

  // Get user object
  const getUser = () => currentUser;

  return (
    <AuthContext.Provider value={{ 
      currentUser, 
      currentRole, 
      login, 
      logout, 
      isLoadingAuth,
      isAuthenticated,
      user: currentUser,
    }}>
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

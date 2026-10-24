import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authApi from '../api/authApi';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMock, setIsMock] = useState(false);
  const [error, setError] = useState(null);

  // Check current session
  const checkAuth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.getMe();
      if (res.success && res.user) {
        setUser(res.user);
        setIsMock(!!res.isMock);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.warn('Auth check error:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Login action
  const login = async (credentials) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.login(credentials);
      if (res.success && res.user) {
        setUser(res.user);
        setIsMock(!!res.isMock);
        return { success: true, user: res.user, isMock: res.isMock };
      }
      throw new Error('Invalid login response');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Login failed. Please check your credentials.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Signup action
  const signup = async (userData) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.signup(userData);
      if (res.success && res.user) {
        setUser(res.user);
        setIsMock(!!res.isMock);
        return { success: true, user: res.user, isMock: res.isMock };
      }
      throw new Error('Invalid signup response');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Signup failed. Please try again.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Logout action
  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.warn('Logout error:', err);
    } finally {
      setUser(null);
      setIsMock(false);
    }
  };

  // Update local profile user state
  const updateUserData = (updatedFields) => {
    setUser((prev) => (prev ? { ...prev, ...updatedFields } : prev));
  };

  // Role checking helpers
  const userRole = (user?.role || '').toLowerCase();
  const isAdmin = userRole === 'admin';
  const isHR = userRole === 'hr' || isAdmin;
  const isManager = userRole === 'manager' || isHR;

  const hasRole = (allowedRoles = []) => {
    if (!allowedRoles || allowedRoles.length === 0) return true;
    if (!user) return false;
    const lowerAllowed = allowedRoles.map((r) => r.toLowerCase());
    return lowerAllowed.includes(userRole);
  };

  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    error,
    isMock,
    isAdmin,
    isHR,
    isManager,
    hasRole,
    login,
    signup,
    logout,
    checkAuth,
    updateUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;

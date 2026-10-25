import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authApi from '../api/authApi';

export const AuthContext = createContext(null);

const TOKEN_KEY = 'hcm_lite_token';

export function getStoredToken() {
  return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || null;
}

export function clearStoredToken() {
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [error, setError] = useState(null);
  const isMock = false;

  // Check current session (called once on mount + after login/setup)
  const checkAuth = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setEmployee(null);
      setOrganization(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await authApi.getMe();
      setUser(data.user || null);
      setEmployee(data.employee || null);
      setOrganization(data.organization || null);
      setMustChangePassword(!!(data.user?.mustChangePassword));
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        clearStoredToken();
        setUser(null);
        setEmployee(null);
        setOrganization(null);
      } else {
        console.warn('Auth check failed (network/server):', err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Handle global unauthorized events
  useEffect(() => {
    const handler = () => {
      clearStoredToken();
      setUser(null);
      setEmployee(null);
      setOrganization(null);
    };
    window.addEventListener('hcm:unauthorized', handler);
    return () => window.removeEventListener('hcm:unauthorized', handler);
  }, []);

  // Login
  const login = async (credentials) => {
    setLoading(true);
    setError(null);
    try {
      const data = await authApi.login(credentials);
      setUser(data.user || null);
      setEmployee(data.employee || null);
      setOrganization(data.organization || null);
      setMustChangePassword(!!(data.user?.mustChangePassword));
      return data;
    } catch (err) {
      const msg = err?.response?.data?.data?.message
        || err?.response?.data?.message
        || err.message
        || 'Login failed.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Setup (first-run)
  const setup = async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const data = await authApi.setup(payload);
      setUser(data.user || null);
      setOrganization(data.organization || null);
      setMustChangePassword(false);
      return data;
    } catch (err) {
      const msg = err?.response?.data?.data?.message
        || err?.response?.data?.message
        || err.message
        || 'Setup failed.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Direct employee registration is not exposed by the backend contract.
  const signup = async () => {
    const msg = 'Account registration is not available in this deployment. Use the organization setup flow or ask your administrator to invite you.';
    setError(msg);
    throw new Error(msg);
  };

  // Logout
  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      clearStoredToken();
    } finally {
      setUser(null);
      setEmployee(null);
      setOrganization(null);
      setMustChangePassword(false);
    }
  };

  // Update local user/employee state (e.g. after profile update)
  const updateUserData = (updatedFields) => {
    setUser((prev) => (prev ? { ...prev, ...updatedFields } : prev));
  };

  const updateEmployeeData = (updatedFields) => {
    setEmployee((prev) => (prev ? { ...prev, ...updatedFields } : prev));
  };

  // Role helpers
  const role = (user?.role || '').toLowerCase();
  const isAdmin = role === 'admin';
  const isHR = role === 'hr' || isAdmin;
  const isManager = isHR;

  const hasRole = (allowedRoles = []) => {
    if (!allowedRoles || allowedRoles.length === 0) return true;
    if (!user) return false;
    return allowedRoles.map((r) => r.toLowerCase()).includes(role);
  };

  const value = {
    user,
    employee,
    organization,
    isAuthenticated: !!user,
    loading,
    error,
    mustChangePassword,
    isMock,
    isAdmin,
    isHR,
    isManager,
    hasRole,
    role,
    login,
    setup,
    signup,
    logout,
    checkAuth,
    updateUserData,
    updateEmployeeData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export default AuthContext;

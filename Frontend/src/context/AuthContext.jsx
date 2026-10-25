import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import authApi from '../api/auth';
import { getErrorMessage } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionMessage, setSessionMessage] = useState('');
  const [bootError, setBootError] = useState('');
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const applySession = useCallback((session) => {
    setUser(session?.user || null);
    setEmployee(session?.employee || null);
    setOrganization(session?.organization || null);
    setBootError('');
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    setEmployee(null);
    setOrganization(null);
  }, []);

  const checkAuth = useCallback(async ({ silent = true } = {}) => {
    setLoading(true);
    try {
      const session = await authApi.me();
      if (mounted.current) applySession(session);
      return session;
    } catch (error) {
      const status = error.response?.status;
      if (mounted.current) {
        clearSession();
        if (status !== 401 && !silent) setBootError(getErrorMessage(error));
      }
      return null;
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [applySession, clearSession]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    const onExpired = (event) => {
      clearSession();
      setLoading(false);
      if (!event.detail?.silent) {
        setSessionMessage('Your session has expired. Please sign in again.');
      }
    };
    const onPasswordRequired = () => {
      setUser((current) => (current ? { ...current, mustChangePassword: true } : current));
    };
    window.addEventListener('hcm:session-expired', onExpired);
    window.addEventListener('hcm:password-required', onPasswordRequired);
    return () => {
      window.removeEventListener('hcm:session-expired', onExpired);
      window.removeEventListener('hcm:password-required', onPasswordRequired);
    };
  }, [clearSession]);

  const login = useCallback(async (credentials) => {
    const result = await authApi.login(credentials);
    // The login response does not include the linked employee profile.
    try {
      const session = await authApi.me();
      applySession(session || result);
      return session || result;
    } catch {
      applySession(result);
      return result;
    }
  }, [applySession]);

  const setup = useCallback(async (payload) => {
    const result = await authApi.setup(payload);
    applySession(result);
    return result;
  }, [applySession]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Cookie may already have expired; clear local state regardless.
    } finally {
      clearSession();
      setSessionMessage('');
    }
  }, [clearSession]);

  const updateUser = useCallback((fields) => {
    setUser((current) => (current ? { ...current, ...fields } : current));
  }, []);

  const updateEmployee = useCallback((fields) => {
    setEmployee((current) => (current ? { ...current, ...fields } : current));
  }, []);

  const updateOrganization = useCallback((fields) => {
    setOrganization((current) => (current ? { ...current, ...fields } : fields));
  }, []);

  const role = user?.role || '';
  const value = useMemo(() => ({
    user,
    employee,
    organization,
    role,
    loading,
    sessionMessage,
    bootError,
    isAuthenticated: Boolean(user),
    isAdmin: role === 'admin',
    isHr: role === 'hr',
    isStaff: role === 'admin' || role === 'hr',
    isEmployee: role === 'employee',
    mustChangePassword: Boolean(user?.mustChangePassword),
    hasRole: (...roles) => roles.flat().includes(role),
    login,
    setup,
    logout,
    checkAuth,
    updateUser,
    updateEmployee,
    updateOrganization,
    clearSessionMessage: () => setSessionMessage(''),
  }), [
    user, employee, organization, role, loading, sessionMessage, bootError,
    login, setup, logout, checkAuth, updateUser, updateEmployee, updateOrganization,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

export default AuthContext;

import api from './axios';
import { mockCurrentUser } from '../data/mockData';

// Track whether we are connected to a real live backend or running in demo fallback mode
let isDemoMode = false;

export const authApi = {
  // GET /api/auth/me
  async getMe() {
    try {
      const response = await api.get('/api/auth/me');
      isDemoMode = false;
      return { success: true, user: response.data?.user || response.data, isMock: false };
    } catch (error) {
      // If backend is down/offline (404, 500, or ECONNREFUSED/network error),
      // check if we have a locally active demo session
      const savedSession = sessionStorage.getItem('hcm_demo_session');
      if (savedSession) {
        try {
          const user = JSON.parse(savedSession);
          isDemoMode = true;
          return { success: true, user, isMock: true };
        } catch {
          // ignore parsing error
        }
      }
      // If not authenticated and backend is down, return mock user if desired or not authenticated
      // To provide an extraordinary first impression, we default to authenticated demo user
      // so the user can immediately experience the dashboard, attendance, leaves, etc.
      isDemoMode = true;
      sessionStorage.setItem('hcm_demo_session', JSON.stringify(mockCurrentUser));
      return { success: true, user: mockCurrentUser, isMock: true };
    }
  },

  // POST /api/auth/login
  async login({ email, password, rememberMe = false }) {
    try {
      const response = await api.post('/api/auth/login', { email, password });
      isDemoMode = false;
      sessionStorage.removeItem('hcm_demo_session');
      return { success: true, user: response.data?.user || response.data, isMock: false };
    } catch (error) {
      if (!error.response) {
        // Backend offline -> provide demo mode login
        const demoUser = {
          ...mockCurrentUser,
          email,
          name: email.split('@')[0].replace('.', ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        };
        sessionStorage.setItem('hcm_demo_session', JSON.stringify(demoUser));
        isDemoMode = true;
        return { success: true, user: demoUser, isMock: true };
      }
      throw error;
    }
  },

  // POST /api/auth/signup
  async signup(userData) {
    try {
      const response = await api.post('/api/auth/signup', userData);
      isDemoMode = false;
      return { success: true, user: response.data?.user || response.data, isMock: false };
    } catch (error) {
      if (!error.response) {
        // Backend offline -> provide demo mode signup
        const newUser = {
          ...mockCurrentUser,
          name: userData.fullName || userData.name,
          email: userData.email,
          role: userData.role || 'employee',
        };
        sessionStorage.setItem('hcm_demo_session', JSON.stringify(newUser));
        isDemoMode = true;
        return { success: true, user: newUser, isMock: true };
      }
      throw error;
    }
  },

  // POST /api/auth/logout
  async logout() {
    try {
      await api.post('/api/auth/logout');
    } catch {
      // Backend might be offline
    } finally {
      sessionStorage.removeItem('hcm_demo_session');
    }
    return { success: true };
  },

  isDemoModeActive() {
    return isDemoMode;
  },
};

export default authApi;

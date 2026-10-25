import api from './axios';

export const authApi = {
  // Check if first-run setup is required
  async getSetupStatus() {
    const res = await api.get('/api/auth/setup-status');
    return res.data?.data || res.data;
  },

  // Initial company setup + Admin account
  async setup(payload) {
    const res = await api.post('/api/auth/setup', payload);
    const data = res.data?.data || res.data;
    if (data.token) {
      localStorage.setItem('hcm_lite_token', data.token);
      sessionStorage.setItem('hcm_lite_token', data.token);
    }
    return data;
  },

  // Sign in
  async login({ email, password }) {
    const res = await api.post('/api/auth/login', { email, password });
    const data = res.data?.data || res.data;
    if (data.token) {
      localStorage.setItem('hcm_lite_token', data.token);
      sessionStorage.setItem('hcm_lite_token', data.token);
    }
    return data;
  },

  // Current session & user info
  async getMe() {
    const res = await api.get('/api/auth/me');
    return res.data?.data || res.data;
  },

  // Change password (mandatory on first sign-in)
  async changePassword({ currentPassword, newPassword }) {
    const res = await api.post('/api/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return res.data?.data || res.data;
  },

  // Sign out
  async logout() {
    try {
      await api.post('/api/auth/logout');
    } finally {
      localStorage.removeItem('hcm_lite_token');
      sessionStorage.removeItem('hcm_lite_token');
    }
    return { success: true };
  },
};

export default authApi;

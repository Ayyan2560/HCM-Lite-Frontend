import api from './client';

export const authApi = {
  setupStatus: () => api.get('/auth/setup-status'),
  setup: (payload) => api.post('/auth/setup', payload),
  login: (payload) => api.post('/auth/login', payload),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  changePassword: (payload) => api.post('/auth/change-password', payload),
};

export default authApi;

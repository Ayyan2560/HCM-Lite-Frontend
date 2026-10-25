import api from './client';

export const dashboardApi = {
  overview: (params = {}) => api.get('/dashboard/overview', { params }),
  me: () => api.get('/dashboard/me'),
};

export default dashboardApi;

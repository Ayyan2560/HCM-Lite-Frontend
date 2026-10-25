import api from './axios';

export const dashboardApi = {
  // GET /api/dashboard/overview (HR / Admin KPIs & Analytics)
  async getOverview(params = {}) {
    const res = await api.get('/api/dashboard/overview', { params });
    return res.data?.data || res.data;
  },

  // GET /api/dashboard/me (Employee personal dashboard)
  async getEmployeeDashboard() {
    const res = await api.get('/api/dashboard/me');
    return res.data?.data || res.data;
  },
};

export default dashboardApi;

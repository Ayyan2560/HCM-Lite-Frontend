import api, { downloadFile } from './axios';

export const employeeApi = {
  // GET /api/employees
  async listEmployees(params = {}) {
    const res = await api.get('/api/employees', { params });
    return res.data?.data || res.data;
  },

  // GET /api/employees/meta (departments, designations, counts)
  async getMeta() {
    const res = await api.get('/api/employees/meta');
    return res.data?.data || res.data;
  },

  // POST /api/employees
  async createEmployee(payload) {
    const res = await api.post('/api/employees', payload);
    return res.data?.data || res.data;
  },

  // GET /api/employees/:id
  async getEmployee(id) {
    const res = await api.get(`/api/employees/${id}`);
    return res.data?.data || res.data;
  },

  // PATCH /api/employees/:id
  async updateEmployee(id, payload) {
    const res = await api.patch(`/api/employees/${id}`, payload);
    return res.data?.data || res.data;
  },

  // POST /api/employees/:id/deactivate
  async deactivateEmployee(id) {
    const res = await api.post(`/api/employees/${id}/deactivate`);
    return res.data?.data || res.data;
  },

  // POST /api/employees/:id/activate
  async activateEmployee(id) {
    const res = await api.post(`/api/employees/${id}/activate`);
    return res.data?.data || res.data;
  },

  // POST /api/employees/import (mode: 'dryRun' | 'commit')
  async importEmployees(csvText, mode = 'dryRun') {
    const res = await api.post('/api/employees/import', { csv: csvText, mode });
    return res.data?.data || res.data;
  },

  // GET /api/employees/export
  async exportEmployees() {
    await downloadFile('/api/employees/export', `employees-export-${new Date().toISOString().slice(0, 10)}.csv`);
  },

  // GET /api/employees/me
  async getMyProfile() {
    const res = await api.get('/api/employees/me');
    return res.data?.data || res.data;
  },

  // PATCH /api/employees/me
  async updateMyProfile(payload) {
    const res = await api.patch('/api/employees/me', payload);
    return res.data?.data || res.data;
  },
};

export default employeeApi;

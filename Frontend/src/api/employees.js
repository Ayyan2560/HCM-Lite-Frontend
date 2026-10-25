import api, { downloadFile } from './client';

export const employeesApi = {
  list: (params = {}) => api.get('/employees', { params }),
  meta: () => api.get('/employees/meta'),
  get: (id) => api.get(`/employees/${id}`),
  create: (payload) => api.post('/employees', payload),
  update: (id, payload) => api.patch(`/employees/${id}`, payload),
  deactivate: (id) => api.post(`/employees/${id}/deactivate`),
  activate: (id) => api.post(`/employees/${id}/activate`),
  me: () => api.get('/employees/me'),
  updateMe: (payload) => api.patch('/employees/me', payload),
  uploadAvatar: (file) => {
    const form = new FormData();
    form.append('avatar', file);
    return api.post('/employees/me/avatar', form);
  },
  importCsv: (payload) => api.post('/employees/import', payload),
  exportCsv: () => downloadFile('/employees/export', 'hcm-lite-employees.csv'),
};

export default employeesApi;

import api from './client';

export const leavesApi = {
  me: (params = {}) => api.get('/leaves/me', { params }),
  apply: (payload) => api.post('/leaves', payload),
  cancel: (id) => api.patch(`/leaves/${id}/cancel`),
  list: (params = {}) => api.get('/leaves', { params }),
  decide: (id, payload) => api.patch(`/leaves/${id}/decision`, payload),
  balances: (employeeId, params = {}) => api.get(`/leaves/balances/${employeeId}`, { params }),
};

export default leavesApi;

import api from './client';

export const organizationApi = {
  get: () => api.get('/organization'),
  update: (payload) => api.put('/organization', payload),
  listUsers: (params = {}) => api.get('/organization/users', { params }),
  createHr: (payload) => api.post('/organization/users', payload),
  setUserActive: (id, isActive) => api.patch(`/organization/users/${id}`, { isActive }),
};

export default organizationApi;

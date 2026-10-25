import api from './client';

export const auditApi = {
  list: (params = {}) => api.get('/audit', { params }),
};

export default auditApi;

import api from './axios';

export const orgApi = {
  // GET /api/organization
  async getSettings() {
    const res = await api.get('/api/organization');
    return res.data?.data || res.data;
  },

  // PUT /api/organization
  async updateSettings(payload) {
    const res = await api.put('/api/organization', payload);
    return res.data?.data || res.data;
  },

  // GET /api/organization/users
  async listUsers() {
    const res = await api.get('/api/organization/users');
    return res.data?.data || res.data;
  },

  // POST /api/organization/users
  async createHrAccount(payload) {
    const res = await api.post('/api/organization/users', payload);
    return res.data?.data || res.data;
  },

  // PATCH /api/organization/users/:id
  async setUserActive(userId, isActive) {
    const res = await api.patch(`/api/organization/users/${userId}`, { isActive });
    return res.data?.data || res.data;
  },
};

export default orgApi;

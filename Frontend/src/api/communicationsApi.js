import api from './axios';

export const announcementApi = {
  async list() {
    const res = await api.get('/api/announcements');
    return res.data?.data || res.data;
  },

  async create(payload) {
    const res = await api.post('/api/announcements', payload);
    return res.data?.data || res.data;
  },

  async remove(id) {
    const res = await api.delete(`/api/announcements/${id}`);
    return res.data?.data || res.data;
  },
};

export const notificationApi = {
  async list() {
    const res = await api.get('/api/notifications');
    return res.data?.data || res.data;
  },

  async markRead(id) {
    const res = await api.patch(`/api/notifications/${id}/read`);
    return res.data?.data || res.data;
  },

  async markAllRead() {
    const res = await api.patch('/api/notifications/read-all');
    return res.data?.data || res.data;
  },
};

export const auditApi = {
  async list(params = {}) {
    const res = await api.get('/api/audit', { params });
    return res.data?.data || res.data;
  },
};

export default { announcementApi, notificationApi, auditApi };

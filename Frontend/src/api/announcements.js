import api from './client';

export const announcementsApi = {
  list: () => api.get('/announcements'),
  create: (payload) => api.post('/announcements', payload),
  remove: (id) => api.delete(`/announcements/${id}`),
};

export default announcementsApi;

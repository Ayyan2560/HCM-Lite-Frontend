import api from './client';

export const attendanceApi = {
  checkIn: (payload = {}) => api.post('/attendance/check-in', payload),
  checkOut: (payload = {}) => api.post('/attendance/check-out', payload),
  me: (params = {}) => api.get('/attendance/me', { params }),
  overview: (params = {}) => api.get('/attendance', { params }),
  records: (params = {}) => api.get('/attendance/records', { params }),
  requestCorrection: (payload) => api.post('/attendance/corrections', payload),
  corrections: (params = {}) => api.get('/attendance/corrections', { params }),
  decideCorrection: (id, payload) => api.patch(`/attendance/corrections/${id}`, payload),
};

export default attendanceApi;

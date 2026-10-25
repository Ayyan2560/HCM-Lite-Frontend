import api from './axios';

export const attendanceApi = {
  // POST /api/attendance/check-in
  async checkIn({ location = null, note = '' } = {}) {
    const payload = { note };
    if (location && location.latitude !== undefined) {
      payload.location = {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy || 10,
      };
    }
    const res = await api.post('/api/attendance/check-in', payload);
    return res.data?.data || res.data;
  },

  // POST /api/attendance/check-out
  async checkOut({ location = null, note = '' } = {}) {
    const payload = { note };
    if (location && location.latitude !== undefined) {
      payload.location = {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy || 10,
      };
    }
    const res = await api.post('/api/attendance/check-out', payload);
    return res.data?.data || res.data;
  },

  // GET /api/attendance/me (Employee self history & calendar)
  async getMyAttendance() {
    const res = await api.get('/api/attendance/me');
    return res.data?.data || res.data;
  },

  // GET /api/attendance (HR / Admin daily board)
  async getDailyBoard(params = {}) {
    const res = await api.get('/api/attendance', { params });
    return res.data?.data || res.data;
  },

  // GET /api/attendance/records
  async getRecords(params = {}) {
    const res = await api.get('/api/attendance/records', { params });
    return res.data?.data || res.data;
  },

  // POST /api/attendance/corrections
  async requestCorrection(payload) {
    const res = await api.post('/api/attendance/corrections', payload);
    return res.data?.data || res.data;
  },

  // GET /api/attendance/corrections
  async getCorrections() {
    const res = await api.get('/api/attendance/corrections');
    return res.data?.data || res.data;
  },

  // PATCH /api/attendance/corrections/:id
  async decideCorrection(id, status, reviewComment = '') {
    const res = await api.patch(`/api/attendance/corrections/${id}`, {
      status, // 'approved' | 'rejected'
      reviewComment,
    });
    return res.data?.data || res.data;
  },

  // Backward compatibility alias for existing code
  async getMyLogs() {
    const data = await this.getMyAttendance();
    return { success: true, data: data.records || data.days || data };
  },
};

export default attendanceApi;

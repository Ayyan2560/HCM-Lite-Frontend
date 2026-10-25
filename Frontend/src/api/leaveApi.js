import api from './axios';

export const leaveApi = {
  // GET /api/leaves/me (Employee balances & history)
  async getMyLeaves() {
    const res = await api.get('/api/leaves/me');
    return res.data?.data || res.data;
  },

  // POST /api/leaves (Apply for leave)
  async applyLeave({ type, startDate, endDate, reason }) {
    const res = await api.post('/api/leaves', {
      type: type.toLowerCase(),
      startDate,
      endDate,
      reason,
    });
    return res.data?.data || res.data;
  },

  // PATCH /api/leaves/:id/cancel (Cancel own pending request)
  async cancelLeave(id) {
    const res = await api.patch(`/api/leaves/${id}/cancel`);
    return res.data?.data || res.data;
  },

  // GET /api/leaves (Admin / HR approval list)
  async listLeaves(params = {}) {
    const res = await api.get('/api/leaves', { params });
    return res.data?.data || res.data;
  },

  // PATCH /api/leaves/:id/decision (Approve or Reject with comment)
  async decideLeave(id, decision, comment = '') {
    const res = await api.patch(`/api/leaves/${id}/decision`, {
      decision: decision.toLowerCase(), // 'approved' | 'rejected'
      comment,
    });
    return res.data?.data || res.data;
  },

  // GET /api/leaves/balances/:employeeId
  async getEmployeeBalances(employeeId) {
    const res = await api.get(`/api/leaves/balances/${employeeId}`);
    return res.data?.data || res.data;
  },

  // Backward compatibility alias for existing code
  async updateLeaveStatus(leaveId, status, rejectionReason = '') {
    return this.decideLeave(leaveId, status, rejectionReason);
  },
};

export default leaveApi;

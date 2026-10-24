import api from './axios';
import { mockLeaveRequests } from '../data/mockData';

let demoLeaves = [...mockLeaveRequests];

export const leaveApi = {
  // GET /api/leaves/my-leaves
  async getMyLeaves() {
    try {
      const response = await api.get('/api/leaves/my-leaves');
      return { success: true, data: response.data?.leaves || response.data, isMock: false };
    } catch (error) {
      return { success: true, data: demoLeaves, isMock: true };
    }
  },

  // POST /api/leaves
  async applyLeave(leaveData) {
    try {
      const response = await api.post('/api/leaves', leaveData);
      return { success: true, data: response.data, isMock: false };
    } catch (error) {
      const newLeave = {
        id: `lv-${Date.now()}`,
        applicantName: 'Alexander Mitchell',
        applicantEmail: 'alexander.m@hcmlite.com',
        applicantAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        leaveType: leaveData.leaveType,
        startDate: leaveData.startDate,
        endDate: leaveData.endDate,
        totalDays: leaveData.totalDays || 1,
        reason: leaveData.reason,
        status: 'Pending',
        appliedOn: new Date().toISOString().split('T')[0],
      };
      demoLeaves = [newLeave, ...demoLeaves];
      return { success: true, data: newLeave, isMock: true };
    }
  },

  // PUT /api/leaves/:leaveId/status
  async updateLeaveStatus(leaveId, status, rejectionReason = '') {
    try {
      const response = await api.put(`/api/leaves/${leaveId}/status`, {
        status,
        rejectionReason,
      });
      return { success: true, data: response.data, isMock: false };
    } catch (error) {
      demoLeaves = demoLeaves.map((item) => {
        if (item.id === leaveId) {
          return {
            ...item,
            status,
            rejectionReason: rejectionReason || item.rejectionReason,
            reviewedBy: 'Alexander Mitchell',
          };
        }
        return item;
      });
      return {
        success: true,
        data: demoLeaves.find((item) => item.id === leaveId),
        isMock: true,
      };
    }
  },
};

export default leaveApi;

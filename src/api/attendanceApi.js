import api from './axios';
import { mockAttendanceLogs } from '../data/mockData';

// In-memory store for demo session modifications
let demoLogs = [...mockAttendanceLogs];

export const attendanceApi = {
  // GET /api/attendance/my-logs
  async getMyLogs() {
    try {
      const response = await api.get('/api/attendance/my-logs');
      return { success: true, data: response.data?.logs || response.data, isMock: false };
    } catch (error) {
      return { success: true, data: demoLogs, isMock: true };
    }
  },

  // POST /api/attendance/check-in
  async checkIn() {
    try {
      const response = await api.post('/api/attendance/check-in', {
        timestamp: new Date().toISOString(),
        location: 'Office (Desk)',
      });
      return { success: true, data: response.data, isMock: false };
    } catch (error) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = now.toISOString().split('T')[0];

      const newLog = {
        id: `att-${Date.now()}`,
        date: dateStr,
        checkIn: timeStr,
        checkOut: '-',
        workedHours: 'In Progress',
        status: 'Present',
        location: 'Office (Workstation)',
        ipAddress: '192.168.1.104',
      };

      // Replace today's log or prepend
      demoLogs = [newLog, ...demoLogs.filter((l) => l.date !== dateStr)];
      return {
        success: true,
        data: { message: `Checked in successfully at ${timeStr}`, log: newLog },
        isMock: true,
      };
    }
  },

  // PUT /api/attendance/check-out
  async checkOut() {
    try {
      const response = await api.put('/api/attendance/check-out', {
        timestamp: new Date().toISOString(),
      });
      return { success: true, data: response.data, isMock: false };
    } catch (error) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = now.toISOString().split('T')[0];

      let updatedLog = null;
      demoLogs = demoLogs.map((log) => {
        if (log.date === dateStr || log.checkOut === '-') {
          updatedLog = {
            ...log,
            checkOut: timeStr,
            workedHours: '8h 15m',
          };
          return updatedLog;
        }
        return log;
      });

      if (!updatedLog) {
        updatedLog = {
          id: `att-${Date.now()}`,
          date: dateStr,
          checkIn: '09:00 AM',
          checkOut: timeStr,
          workedHours: '8h 00m',
          status: 'Present',
          location: 'Office (Workstation)',
          ipAddress: '192.168.1.104',
        };
        demoLogs = [updatedLog, ...demoLogs];
      }

      return {
        success: true,
        data: { message: `Checked out successfully at ${timeStr}`, log: updatedLog },
        isMock: true,
      };
    }
  },
};

export default attendanceApi;

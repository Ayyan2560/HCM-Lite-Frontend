import api from './axios';
import { mockPayrollRecords } from '../data/mockData';

let demoPayroll = [...mockPayrollRecords];

export const payrollApi = {
  // GET /api/payroll
  async getPayrollRecords(period) {
    try {
      const response = await api.get('/api/payroll', { params: { period } });
      return { success: true, data: response.data?.records || response.data, isMock: false };
    } catch (error) {
      return { success: true, data: demoPayroll, isMock: true };
    }
  },

  // POST /api/payroll/generate
  async generatePayroll(periodData) {
    try {
      const response = await api.post('/api/payroll/generate', periodData);
      return { success: true, data: response.data, isMock: false };
    } catch (error) {
      // Mark pending records as processed/generated in demo
      demoPayroll = demoPayroll.map((rec) => ({
        ...rec,
        status: 'Paid',
        paymentDate: new Date().toISOString().split('T')[0],
      }));
      return {
        success: true,
        data: {
          message: `Payroll for period ${periodData.period || 'selected month'} generated successfully!`,
          count: demoPayroll.length,
          records: demoPayroll,
        },
        isMock: true,
      };
    }
  },
};

export default payrollApi;

import api, { downloadFile } from './axios';

export const payrollApi = {
  // GET /api/payroll/me/payslips
  async getMyPayslips() {
    const res = await api.get('/api/payroll/me/payslips');
    return res.data?.data || res.data;
  },

  // Download payslip PDF
  async downloadPayslipPdf(payrollId, employeeId, filename = null) {
    const safeFilename = filename || `payslip-${payrollId}-${employeeId}.pdf`;
    await downloadFile(`/api/payroll/${payrollId}/payslip/${employeeId}`, safeFilename);
  },

  // GET /api/payroll (List payroll runs)
  async listPayrolls(params = {}) {
    const res = await api.get('/api/payroll', { params });
    return res.data?.data || res.data;
  },

  // POST /api/payroll/drafts (Create monthly payroll draft)
  async createDraft(period, notes = '') {
    const res = await api.post('/api/payroll/drafts', { period, notes });
    return res.data?.data || res.data;
  },

  // GET /api/payroll/:id
  async getPayroll(id) {
    const res = await api.get(`/api/payroll/${id}`);
    return res.data?.data || res.data;
  },

  // PATCH /api/payroll/:id
  async updatePayrollNotes(id, notes) {
    const res = await api.patch(`/api/payroll/${id}`, { notes });
    return res.data?.data || res.data;
  },

  // POST /api/payroll/:id/finalize (Admin only)
  async finalizePayroll(id) {
    const res = await api.post(`/api/payroll/${id}/finalize`);
    return res.data?.data || res.data;
  },

  // Backward compatibility alias for existing code
  async generatePayroll(data) {
    return this.createDraft(data.period || data);
  },
  async getPayrollRecords(period) {
    const list = await this.listPayrolls({ period });
    return { success: true, data: list.payrolls || list };
  },
};

export default payrollApi;

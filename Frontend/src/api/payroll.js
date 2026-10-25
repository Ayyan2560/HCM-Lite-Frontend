import api, { downloadFile } from './client';

export const payrollApi = {
  list: (params = {}) => api.get('/payroll', { params }),
  createDraft: (payload) => api.post('/payroll/drafts', payload),
  get: (id) => api.get(`/payroll/${id}`),
  updateNotes: (id, notes) => api.patch(`/payroll/${id}`, { notes }),
  finalize: (id) => api.post(`/payroll/${id}/finalize`),
  myPayslips: () => api.get('/payroll/me/payslips'),
  downloadPayslip: (payrollId, employeeId, fallback = 'payslip.pdf') =>
    downloadFile(`/payroll/${payrollId}/payslip/${employeeId}`, fallback),
};

export default payrollApi;

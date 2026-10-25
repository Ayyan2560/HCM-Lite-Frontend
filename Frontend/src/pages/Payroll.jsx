import React, { useState, useEffect } from 'react';
import {
  Box, Card, Typography, Button, Stack, Dialog, DialogTitle,
  DialogContent, DialogActions, CircularProgress, Alert, Chip, TextField,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';

import payrollApi from '../api/payrollApi';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from '../components/ConfirmDialog';
import { brandColors } from '../theme/theme';

export const Payroll = () => {
  const { isAdmin } = useAuth();
  const [payrolls, setPayrolls] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [draftDialog, setDraftDialog] = useState(false);
  const [period, setPeriod] = useState('');
  const [confirmFinalize, setConfirmFinalize] = useState(null);

  const fetchPayrolls = async () => {
    setLoading(true);
    try {
      const res = await payrollApi.listPayrolls();
      setPayrolls(Array.isArray(res?.data) ? res.data : res?.data?.payrolls || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPayrolls(); }, []);

  const handleViewDetail = async (id) => {
    setDetailLoading(true);
    try {
      const res = await payrollApi.getPayroll(id);
      setDetail(res?.data || res);
      setSelected(id);
    } catch (e) { setFeedback({ type: 'error', message: 'Failed to load payroll detail.' }); }
    finally { setDetailLoading(false); }
  };

  const handleCreateDraft = async () => {
    try {
      await payrollApi.createDraft({ period });
      setFeedback({ type: 'success', message: 'Payroll draft created.' });
      setDraftDialog(false);
      setPeriod('');
      fetchPayrolls();
    } catch (e) { setFeedback({ type: 'error', message: e?.response?.data?.message || 'Failed to create draft.' }); }
  };

  const handleFinalize = async (id) => {
    try {
      await payrollApi.finalizePayroll(id);
      setFeedback({ type: 'success', message: 'Payroll finalized.' });
      setConfirmFinalize(null);
      fetchPayrolls();
    } catch (e) { setFeedback({ type: 'error', message: e?.response?.data?.message || 'Failed to finalize.' }); }
  };

  const handleDownloadPayslip = async (payrollId, employeeId) => {
    try {
      const blob = await payrollApi.downloadPayslipPdf(payrollId, employeeId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `payslip-${employeeId}.pdf`; a.click();
    } catch (e) { setFeedback({ type: 'error', message: 'Download failed.' }); }
  };

  const getRowId = r => r._id || r.id || Math.random().toString();

  const payrollColumns = [
    { field: 'period', headerName: 'Period', flex: 1, renderCell: p => <Typography variant="body2" fontWeight={600}>{p.value}</Typography> },
    { field: 'status', headerName: 'Status', flex: 0.8, renderCell: p => <Chip label={p.value} color={p.value === 'finalized' ? 'success' : 'warning'} size="small" /> },
    { field: 'employeeCount', headerName: 'Employees', flex: 0.7, renderCell: p => <Typography variant="body2">{p.value ?? (p.row.entries?.length ?? '—')}</Typography> },
    { field: 'totalAmount', headerName: 'Total', flex: 0.8, renderCell: p => <Typography variant="body2" fontWeight={600}>${(p.value || 0).toLocaleString()}</Typography> },
    {
      field: 'actions', headerName: '', flex: 1.5, sortable: false,
      renderCell: p => (
        <Stack direction="row" spacing={0.5}>
          <Button size="small" variant="outlined" onClick={() => handleViewDetail(p.row._id || p.row.id)}>Details</Button>
          {isAdmin && p.row.status !== 'finalized' && (
            <Button size="small" variant="contained" startIcon={<LockRoundedIcon />} onClick={() => setConfirmFinalize(p.row._id || p.row.id)}>Finalize</Button>
          )}
        </Stack>
      )
    },
  ];

  const entryColumns = [
    { field: 'employee', headerName: 'Employee', flex: 1.5, renderCell: p => <Typography variant="body2" fontWeight={600}>{p.row.employee?.name || p.value || '—'}</Typography> },
    { field: 'basicSalary', headerName: 'Basic', flex: 0.8, renderCell: p => <Typography variant="body2">${(p.value || 0).toLocaleString()}</Typography> },
    { field: 'deductions', headerName: 'Deductions', flex: 0.8, renderCell: p => <Typography variant="body2" color="error">${(p.value || 0).toLocaleString()}</Typography> },
    { field: 'netSalary', headerName: 'Net Salary', flex: 0.8, renderCell: p => <Typography variant="body2" fontWeight={700} color="success.main">${(p.value || 0).toLocaleString()}</Typography> },
    {
      field: 'actions', headerName: '', flex: 0.8, sortable: false,
      renderCell: p => (
        <Button size="small" variant="outlined" startIcon={<DownloadRoundedIcon />}
          onClick={() => handleDownloadPayslip(selected, p.row.employee?._id || p.row.employeeId)}>
          Payslip
        </Button>
      )
    },
  ];

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ pb: 4 }}>
      {feedback && <Alert severity={feedback.type} onClose={() => setFeedback(null)} sx={{ mb: 2 }}>{feedback.message}</Alert>}

      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}>
        <Typography variant="h5" fontWeight={700}>Payroll Management</Typography>
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setDraftDialog(true)}>Create Draft</Button>
      </Stack>

      <Card sx={{ p: 2.5, mb: 3 }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Payroll Runs</Typography>
        <Box sx={{ height: 340 }}>
          <DataGrid rows={payrolls} columns={payrollColumns} getRowId={getRowId} pageSizeOptions={[10]} initialState={{ pagination: { paginationModel: { pageSize: 10 } } }} disableRowSelectionOnClick />
        </Box>
      </Card>

      {detailLoading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>}

      {detail && !detailLoading && (
        <Card sx={{ p: 2.5 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Employee Breakdown — {detail.period}</Typography>
          <Box sx={{ height: 400 }}>
            <DataGrid rows={detail.entries || []} columns={entryColumns} getRowId={r => r._id || r.employeeId || Math.random().toString()} pageSizeOptions={[10, 25]} initialState={{ pagination: { paginationModel: { pageSize: 25 } } }} disableRowSelectionOnClick />
          </Box>
        </Card>
      )}

      <Dialog open={draftDialog} onClose={() => setDraftDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Create Payroll Draft</DialogTitle>
        <DialogContent>
          <TextField label="Period (e.g. 2024-11)" fullWidth value={period} onChange={e => setPeriod(e.target.value)} sx={{ mt: 1 }} placeholder="YYYY-MM" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDraftDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateDraft} disabled={!period}>Create</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog open={!!confirmFinalize} title="Finalize Payroll" message="This will lock the payroll and cannot be undone. Proceed?" onConfirm={() => handleFinalize(confirmFinalize)} onCancel={() => setConfirmFinalize(null)} confirmLabel="Finalize" confirmColor="error" />
    </Box>
  );
};

export default Payroll;

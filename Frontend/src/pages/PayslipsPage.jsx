import React, { useState, useEffect } from 'react';
import {
  Box, Card, Typography, Button, Stack, CircularProgress, Alert, Chip,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';

import payrollApi from '../api/payrollApi';
import { useAuth } from '../context/AuthContext';

export const PayslipsPage = () => {
  const { employee } = useAuth();
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    payrollApi.getMyPayslips().then(res => {
      setPayslips(Array.isArray(res?.data) ? res.data : res?.data?.payslips || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleDownload = async (payrollId, employeeId) => {
    try {
      const blob = await payrollApi.downloadPayslipPdf(payrollId, employeeId || employee?._id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `payslip-${payrollId}.pdf`; a.click();
    } catch (e) { setFeedback({ type: 'error', message: 'Download failed.' }); }
  };

  const getRowId = r => r._id || r.payrollId || r.id || Math.random().toString();

  const columns = [
    { field: 'period', headerName: 'Period', flex: 1, renderCell: p => <Typography variant="body2" fontWeight={600}>{p.value || p.row.payroll?.period}</Typography> },
    { field: 'basicSalary', headerName: 'Basic', flex: 0.8, renderCell: p => <Typography variant="body2">${(p.value || 0).toLocaleString()}</Typography> },
    { field: 'deductions', headerName: 'Deductions', flex: 0.8, renderCell: p => <Typography variant="body2" color="error">${(p.value || 0).toLocaleString()}</Typography> },
    { field: 'netSalary', headerName: 'Net Salary', flex: 0.8, renderCell: p => <Typography variant="body2" fontWeight={700} color="success.main">${(p.value || 0).toLocaleString()}</Typography> },
    { field: 'status', headerName: 'Status', flex: 0.7, renderCell: p => <Chip label={p.row.payroll?.status || 'finalized'} color="success" size="small" /> },
    {
      field: 'actions', headerName: '', flex: 0.8, sortable: false,
      renderCell: p => (
        <Button size="small" variant="outlined" startIcon={<DownloadRoundedIcon />}
          onClick={() => handleDownload(p.row.payrollId || p.row.payroll?._id || p.row._id, employee?._id)}>
          Download PDF
        </Button>
      )
    },
  ];

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ pb: 4 }}>
      {feedback && <Alert severity={feedback.type} onClose={() => setFeedback(null)} sx={{ mb: 2 }}>{feedback.message}</Alert>}

      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
        <ReceiptLongRoundedIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>My Payslips</Typography>
      </Stack>

      {payslips.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <ReceiptLongRoundedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">No payslips found yet.</Typography>
        </Card>
      ) : (
        <Card sx={{ p: 2.5 }}>
          <Box sx={{ height: 440 }}>
            <DataGrid rows={payslips} columns={columns} getRowId={getRowId} pageSizeOptions={[10, 20]} initialState={{ pagination: { paginationModel: { pageSize: 10 } } }} disableRowSelectionOnClick />
          </Box>
        </Card>
      )}
    </Box>
  );
};

export default PayslipsPage;

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  Grid,
  Typography,
  Button,
  Stack,
  TextField,
  MenuItem,
  InputAdornment,
  Snackbar,
  Alert,
  Paper,
  Chip,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import PaymentRoundedIcon from '@mui/icons-material/PaymentRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import PaidRoundedIcon from '@mui/icons-material/PaidRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';

import payrollApi from '../api/payrollApi';
import { useAuth } from '../context/AuthContext';
import StatCard from '../components/StatCard';
import StatusChip from '../components/StatusChip';
import ConfirmDialog from '../components/ConfirmDialog';
import { brandColors } from '../theme/theme';

export const Payroll = () => {
  const { isAdmin, isHR } = useAuth();

  const [records, setRecords] = useState([]);
  const [period, setPeriod] = useState('October 2026');
  const [loading, setLoading] = useState(true);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [feedback, setFeedback] = useState(null);

  // Confirm Dialog State
  const [confirmOpen, setConfirmOpen] = useState(false);

  const fetchPayroll = async (selectedPeriod) => {
    setLoading(true);
    try {
      const res = await payrollApi.getPayrollRecords(selectedPeriod || period);
      if (res.success && res.data) {
        setRecords(res.data);
      }
    } catch (err) {
      console.warn('Failed to load payroll records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayroll(period);
  }, [period]);

  const handlePeriodChange = (e) => {
    const newPeriod = e.target.value;
    setPeriod(newPeriod);
  };

  const handleConfirmGenerate = async () => {
    setConfirmOpen(false);
    setGenerateLoading(true);
    try {
      const res = await payrollApi.generatePayroll({ period });
      setFeedback({
        type: 'success',
        message: res.data?.message || `Payroll calculation batch for ${period} generated successfully!`,
      });
      await fetchPayroll(period);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: 'Failed to generate payroll batch.',
      });
    } finally {
      setGenerateLoading(false);
    }
  };

  // Metrics summary
  const summary = useMemo(() => {
    const totalCost = records.reduce((sum, r) => sum + (r.netSalary || 0), 0);
    const paidCount = records.filter((r) => r.status === 'Paid').length;
    const avgSalary = records.length > 0 ? Math.round(totalCost / records.length) : 0;
    return { totalCost, paidCount, avgSalary };
  }, [records]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return records.filter((rec) => {
      return (
        rec.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [records, searchTerm]);

  // DataGrid Columns
  const columns = [
    {
      field: 'employeeName',
      headerName: 'Employee',
      flex: 1.3,
      minWidth: 180,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600, color: brandColors.slate[900] }}>
            {params.value}
          </Typography>
          <Typography variant="caption" sx={{ color: brandColors.slate[500], fontFamily: 'monospace' }}>
            {params.row.employeeId} • {params.row.department}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'attendance',
      headerName: 'Present / Late Days',
      flex: 1.1,
      minWidth: 150,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {params.row.presentDays} Days Present
          </Typography>
          <Typography variant="caption" sx={{ color: params.row.lateDays > 0 ? 'warning.main' : 'text.secondary' }}>
            {params.row.lateDays} Late Arrival(s)
          </Typography>
        </Box>
      ),
    },
    {
      field: 'basicSalary',
      headerName: 'Basic Salary',
      flex: 1,
      minWidth: 120,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          ${params.value?.toLocaleString()}
        </Typography>
      ),
    },
    {
      field: 'deductions',
      headerName: 'Deductions / Taxes',
      flex: 1.1,
      minWidth: 130,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 500 }}>
          -${params.value?.toLocaleString()}
        </Typography>
      ),
    },
    {
      field: 'netSalary',
      headerName: 'Net Payable Salary',
      flex: 1.2,
      minWidth: 140,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.dark' }}>
          ${params.value?.toLocaleString()}
        </Typography>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 0.9,
      minWidth: 100,
      renderCell: (params) => <StatusChip status={params.value} />,
    },
    {
      field: 'paymentDate',
      headerName: 'Disbursement Date',
      flex: 1,
      minWidth: 130,
      renderCell: (params) => (
        <Typography variant="caption" sx={{ color: brandColors.slate[600] }}>
          {params.value || '-'}
        </Typography>
      ),
    },
  ];

  return (
    <Box sx={{ pb: 4 }}>
      {/* Demo Notice Banner */}
      <Alert
        severity="info"
        sx={{
          mb: 3,
          borderRadius: 2,
          backgroundColor: '#eff6ff',
          borderColor: '#bfdbfe',
          borderWidth: 1,
          borderStyle: 'solid',
          color: '#1e40af',
        }}
      >
        <strong>Standard Payroll Demo Formula:</strong> Actual tax brackets, 401(k) deductions, and overtime bonuses will be governed by backend configuration upon live integration. Displayed figures are realistic simulation metrics.
      </Alert>

      {/* KPI Stat Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        <Grid item xs={12} sm={4}>
          <StatCard
            title="Total Monthly Payroll"
            value={`$${summary.totalCost.toLocaleString()}`}
            trend="Budget cleared"
            trendLabel="for active cycle"
            isPositive={true}
            icon={AccountBalanceWalletRoundedIcon}
            iconColor={brandColors.primary.main}
            iconBg={brandColors.primary.subtle}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            title="Disbursed Accounts"
            value={`${summary.paidCount} / ${records.length}`}
            trend={`${Math.round((summary.paidCount / (records.length || 1)) * 100)}%`}
            trendLabel="processed"
            isPositive={summary.paidCount === records.length}
            icon={PaidRoundedIcon}
            iconColor={brandColors.success.main}
            iconBg={brandColors.success.subtle}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            title="Average Employee Net"
            value={`$${summary.avgSalary.toLocaleString()}`}
            trend="Full-time staff"
            trendLabel="base average"
            isPositive={true}
            icon={PaymentRoundedIcon}
            iconColor="#6366f1"
            iconBg="#eef2ff"
          />
        </Grid>
      </Grid>

      {/* Payroll Table Card */}
      <Card sx={{ p: 2.5 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'center' }}
          spacing={2}
          sx={{ mb: 2.5 }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Payroll Disbursement Register
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Review monthly compensation calculations, tax withholdings, and disbursement statuses
            </Typography>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ width: { xs: '100%', md: 'auto' } }}>
            <TextField
              size="small"
              placeholder="Search employee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon fontSize="small" sx={{ color: brandColors.slate[400] }} />
                  </InputAdornment>
                ),
              }}
              sx={{ width: { xs: '100%', sm: 200 } }}
            />

            <TextField
              select
              size="small"
              value={period}
              onChange={handlePeriodChange}
              sx={{ width: { xs: '100%', sm: 180 } }}
            >
              <MenuItem value="October 2026">October 2026 (Active)</MenuItem>
              <MenuItem value="September 2026">September 2026</MenuItem>
              <MenuItem value="August 2026">August 2026</MenuItem>
            </TextField>

            {(isAdmin || isHR) && (
              <Button
                variant="contained"
                startIcon={<CheckCircleRoundedIcon />}
                disabled={generateLoading}
                onClick={() => setConfirmOpen(true)}
                sx={{ whiteSpace: 'nowrap', fontWeight: 700 }}
              >
                {generateLoading ? 'Processing...' : 'Generate Payroll'}
              </Button>
            )}
          </Stack>
        </Stack>

        <Box sx={{ width: '100%', height: 440 }}>
          <DataGrid
            rows={filteredRows}
            columns={columns}
            loading={loading}
            pageSizeOptions={[5, 10, 20]}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
            }}
            disableRowSelectionOnClick
            autoHeight={false}
          />
        </Box>
      </Card>

      {/* Confirmation Dialog before Payroll Generation */}
      <ConfirmDialog
        open={confirmOpen}
        title="Confirm Payroll Generation"
        content={`Are you sure you want to trigger payroll calculation and automated salary disbursement for period ${period}? This action marks pending payroll records as processed.`}
        confirmText="Confirm & Generate"
        confirmColor="primary"
        type="warning"
        onConfirm={handleConfirmGenerate}
        onCancel={() => setConfirmOpen(false)}
        loading={generateLoading}
      />

      {/* Feedback Toast */}
      <Snackbar
        open={Boolean(feedback)}
        autoHideDuration={4000}
        onClose={() => setFeedback(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setFeedback(null)}
          severity={feedback?.type || 'info'}
          variant="filled"
          sx={{ width: '100%', borderRadius: 2 }}
        >
          {feedback?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Payroll;

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
  CircularProgress,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import LoginRoundedIcon from '@mui/icons-material/LoginRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import TimerRoundedIcon from '@mui/icons-material/TimerRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import FmdGoodOutlinedIcon from '@mui/icons-material/FmdGoodOutlined';

import attendanceApi from '../api/attendanceApi';
import StatusChip from '../components/StatusChip';
import { brandColors } from '../theme/theme';

export const Attendance = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Load Attendance Logs
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await attendanceApi.getMyLogs();
      if (res.success && res.data) {
        setLogs(res.data);
      }
    } catch (err) {
      console.warn('Error fetching attendance logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Today's record
  const todayStr = new Date().toISOString().split('T')[0];
  const todayLog = logs.find((l) => l.date === todayStr) || logs[0];

  const isCheckedIn = Boolean(todayLog?.checkIn && todayLog?.checkIn !== '-');
  const isCheckedOut = Boolean(todayLog?.checkOut && todayLog?.checkOut !== '-');

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      const res = await attendanceApi.checkIn();
      setFeedback({
        type: 'success',
        message: res.data?.message || 'Check-in registered successfully.',
      });
      await fetchLogs();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: 'Failed to record check-in.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
      const res = await attendanceApi.checkOut();
      setFeedback({
        type: 'info',
        message: res.data?.message || 'Check-out registered successfully.',
      });
      await fetchLogs();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: 'Failed to record check-out.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Filter logs for DataGrid
  const filteredRows = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        log.date.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.location && log.location.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus =
        statusFilter === 'ALL' || log.status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [logs, searchTerm, statusFilter]);

  // DataGrid Columns Definition
  const columns = [
    {
      field: 'date',
      headerName: 'Date',
      flex: 1.1,
      minWidth: 120,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontWeight: 600, color: brandColors.slate[900] }}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 1,
      minWidth: 110,
      renderCell: (params) => <StatusChip status={params.value} />,
    },
    {
      field: 'checkIn',
      headerName: 'Check In',
      flex: 1,
      minWidth: 110,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ color: brandColors.slate[700] }}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'checkOut',
      headerName: 'Check Out',
      flex: 1,
      minWidth: 110,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ color: brandColors.slate[700] }}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'workedHours',
      headerName: 'Worked Duration',
      flex: 1.1,
      minWidth: 130,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontWeight: 600, color: brandColors.primary.main }}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'location',
      headerName: 'Work Location',
      flex: 1.3,
      minWidth: 160,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.75} alignItems="center">
          <FmdGoodOutlinedIcon sx={{ fontSize: 16, color: brandColors.slate[400] }} />
          <Typography variant="body2" sx={{ color: brandColors.slate[600] }}>
            {params.value || 'Office'}
          </Typography>
        </Stack>
      ),
    },
    {
      field: 'ipAddress',
      headerName: 'IP Address',
      flex: 1,
      minWidth: 120,
      renderCell: (params) => (
        <Typography variant="caption" sx={{ color: brandColors.slate[500], fontFamily: 'monospace' }}>
          {params.value || '-'}
        </Typography>
      ),
    },
  ];

  return (
    <Box sx={{ pb: 4 }}>
      {/* Today's Punch Card & Action Banner */}
      <Grid container spacing={3} sx={{ mb: 3.5 }}>
        {/* Punch In / Out Card */}
        <Grid item xs={12} md={5} lg={4}>
          <Card
            sx={{
              p: 3,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              backgroundColor: '#ffffff',
            }}
          >
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.05em' }}>
                DAILY TIME CLOCK
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, mb: 1 }}>
                Biometric & Portal Punch
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Record your workplace presence for today's work shift.
              </Typography>

              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  mb: 3,
                  backgroundColor: brandColors.slate[50],
                  border: `1px solid ${brandColors.slate[200]}`,
                  borderRadius: 2,
                }}
              >
                <Stack spacing={1.5}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">Current Shift Status:</Typography>
                    <StatusChip status={isCheckedIn ? (isCheckedOut ? 'Completed' : 'Present') : 'Not Checked In'} />
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">Check-In Time:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{todayLog?.checkIn || '-'}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">Check-Out Time:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{todayLog?.checkOut || '-'}</Typography>
                  </Stack>
                </Stack>
              </Paper>
            </Box>

            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                fullWidth
                size="large"
                startIcon={<LoginRoundedIcon />}
                disabled={actionLoading || (isCheckedIn && !isCheckedOut)}
                onClick={handleCheckIn}
                sx={{ py: 1.2, fontWeight: 700 }}
              >
                Check In
              </Button>
              <Button
                variant="outlined"
                fullWidth
                size="large"
                startIcon={<LogoutRoundedIcon />}
                disabled={actionLoading || !isCheckedIn || isCheckedOut}
                onClick={handleCheckOut}
                sx={{ py: 1.2, fontWeight: 700 }}
              >
                Check Out
              </Button>
            </Stack>
          </Card>
        </Grid>

        {/* Attendance Stats Cards */}
        <Grid item xs={12} md={7} lg={8}>
          <Grid container spacing={2.5} sx={{ height: '100%' }}>
            <Grid item xs={12} sm={6}>
              <Card sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      backgroundColor: brandColors.success.subtle,
                      color: brandColors.success.main,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CheckCircleOutlineRoundedIcon fontSize="medium" />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      DAYS PRESENT (THIS MONTH)
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>
                      21 <span style={{ fontSize: '1rem', color: brandColors.slate[400] }}>/ 22 Days</span>
                    </Typography>
                  </Box>
                </Stack>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Card sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      backgroundColor: brandColors.primary.subtle,
                      color: brandColors.primary.main,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <TimerRoundedIcon fontSize="medium" />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      AVERAGE DAILY HOURS
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>
                      8h 48m
                    </Typography>
                  </Box>
                </Stack>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 2.5,
                  backgroundColor: '#ffffff',
                  border: `1px solid ${brandColors.slate[200]}`,
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                  Shift Schedule & Overtime Policy
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Core enterprise shift hours are <strong>09:00 AM – 06:00 PM (Monday through Friday)</strong>. Punches recorded past 09:15 AM will automatically be classified as Late Arrival. Overtime credit kicks in after completing 8.5 active billable hours.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* Date-wise Attendance History Table Card */}
      <Card sx={{ p: 2.5 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={2}
          sx={{ mb: 2.5 }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Attendance History & Time Records
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Review and audit your historical daily punch times and recorded work hours
            </Typography>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            <TextField
              size="small"
              placeholder="Search by date, location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon fontSize="small" sx={{ color: brandColors.slate[400] }} />
                  </InputAdornment>
                ),
              }}
              sx={{ width: { xs: '100%', sm: 220 } }}
            />

            <TextField
              select
              size="small"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{ width: { xs: '100%', sm: 150 } }}
            >
              <MenuItem value="ALL">All Statuses</MenuItem>
              <MenuItem value="Present">Present</MenuItem>
              <MenuItem value="Late">Late</MenuItem>
              <MenuItem value="Half Day">Half Day</MenuItem>
              <MenuItem value="On Leave">On Leave</MenuItem>
            </TextField>
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

export default Attendance;

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Card, Grid, Typography, Button, Stack, TextField, MenuItem,
  InputAdornment, Paper, CircularProgress, Alert, Tabs, Tab, Dialog,
  DialogTitle, DialogContent, DialogActions, Chip,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import LoginRoundedIcon from '@mui/icons-material/LoginRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import EditNoteRoundedIcon from '@mui/icons-material/EditNoteRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';

import attendanceApi from '../api/attendanceApi';
import StatusChip from '../components/StatusChip';
import { useAuth } from '../context/AuthContext';
import { brandColors } from '../theme/theme';

export const Attendance = () => {
  const { isAdmin, isHR, employee } = useAuth();
  const isStaff = isAdmin || isHR;

  const [tab, setTab] = useState(0);
  const [myLogs, setMyLogs] = useState([]);
  const [board, setBoard] = useState([]);
  const [corrections, setCorrections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [corrDialog, setCorrDialog] = useState(false);
  const [corrForm, setCorrForm] = useState({ reason: '', requestedCheckIn: '', requestedCheckOut: '', attendanceId: '' });

  const todayStr = new Date().toISOString().slice(0, 10);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const myRes = await attendanceApi.getMyAttendance();
      setMyLogs(Array.isArray(myRes?.data) ? myRes.data : myRes?.data?.records || []);

      if (isStaff) {
        const [boardRes, corrRes] = await Promise.allSettled([
          attendanceApi.getDailyBoard(),
          attendanceApi.getCorrections(),
        ]);
        if (boardRes.status === 'fulfilled') setBoard(Array.isArray(boardRes.value?.data) ? boardRes.value.data : boardRes.value?.data?.records || []);
        if (corrRes.status === 'fulfilled') setCorrections(Array.isArray(corrRes.value?.data) ? corrRes.value.data : corrRes.value?.data?.corrections || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, [isStaff]);

  const todayLog = myLogs.find(l => (l.date || '').slice(0, 10) === todayStr);
  const isCheckedIn = !!todayLog?.checkIn;
  const isCheckedOut = !!todayLog?.checkOut;

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      const res = await attendanceApi.checkIn();
      setFeedback({ type: 'success', message: res?.data?.message || 'Checked in!' });
      fetchAll();
    } catch (e) { setFeedback({ type: 'error', message: e?.response?.data?.message || 'Check-in failed.' }); }
    finally { setActionLoading(false); }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
      const res = await attendanceApi.checkOut();
      setFeedback({ type: 'info', message: res?.data?.message || 'Checked out!' });
      fetchAll();
    } catch (e) { setFeedback({ type: 'error', message: e?.response?.data?.message || 'Check-out failed.' }); }
    finally { setActionLoading(false); }
  };

  const handleRequestCorrection = async () => {
    try {
      await attendanceApi.requestCorrection(corrForm);
      setFeedback({ type: 'success', message: 'Correction request submitted.' });
      setCorrDialog(false);
      setCorrForm({ reason: '', requestedCheckIn: '', requestedCheckOut: '', attendanceId: '' });
    } catch (e) { setFeedback({ type: 'error', message: e?.response?.data?.message || 'Failed.' }); }
  };

  const handleDecideCorrection = async (id, decision) => {
    try {
      await attendanceApi.decideCorrection(id, { decision });
      setFeedback({ type: 'success', message: `Correction ${decision}.` });
      fetchAll();
    } catch (e) { setFeedback({ type: 'error', message: 'Failed to process.' }); }
  };

  const fmtTime = (iso) => iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

  const myColumns = [
    { field: 'date', headerName: 'Date', flex: 1, renderCell: p => <Typography variant="body2" fontWeight={600}>{(p.value || '').slice(0, 10)}</Typography> },
    { field: 'status', headerName: 'Status', flex: 1, renderCell: p => <StatusChip status={p.value} /> },
    { field: 'checkIn', headerName: 'Check In', flex: 1, renderCell: p => <Typography variant="body2">{fmtTime(p.value)}</Typography> },
    { field: 'checkOut', headerName: 'Check Out', flex: 1, renderCell: p => <Typography variant="body2">{fmtTime(p.value)}</Typography> },
    { field: 'workedHours', headerName: 'Hours', flex: 0.8, renderCell: p => <Typography variant="body2" fontWeight={600} color="primary">{p.value || '—'}</Typography> },
    {
      field: 'actions', headerName: '', flex: 0.7, sortable: false,
      renderCell: p => (
        <Button size="small" variant="outlined" startIcon={<EditNoteRoundedIcon />}
          onClick={() => { setCorrForm(f => ({ ...f, attendanceId: p.row._id || p.row.id })); setCorrDialog(true); }}>
          Correct
        </Button>
      )
    },
  ];

  const boardColumns = [
    { field: 'employeeName', headerName: 'Employee', flex: 1.5, renderCell: p => <Typography variant="body2" fontWeight={600}>{p.row.employee?.name || p.value || '—'}</Typography> },
    { field: 'status', headerName: 'Status', flex: 1, renderCell: p => <StatusChip status={p.value} /> },
    { field: 'checkIn', headerName: 'Check In', flex: 1, renderCell: p => <Typography variant="body2">{fmtTime(p.value)}</Typography> },
    { field: 'checkOut', headerName: 'Check Out', flex: 1, renderCell: p => <Typography variant="body2">{fmtTime(p.value)}</Typography> },
    { field: 'department', headerName: 'Department', flex: 1, renderCell: p => <Typography variant="body2">{p.row.employee?.department || '—'}</Typography> },
  ];

  const corrColumns = [
    { field: 'employee', headerName: 'Employee', flex: 1.5, renderCell: p => <Typography variant="body2" fontWeight={600}>{p.row.employee?.name || '—'}</Typography> },
    { field: 'reason', headerName: 'Reason', flex: 2 },
    { field: 'status', headerName: 'Status', flex: 0.8, renderCell: p => <StatusChip status={p.value} /> },
    {
      field: 'actions', headerName: '', flex: 1.2, sortable: false,
      renderCell: p => p.row.status === 'pending' ? (
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="contained" color="success" startIcon={<CheckRoundedIcon />} onClick={() => handleDecideCorrection(p.row._id || p.row.id, 'approved')}>Approve</Button>
          <Button size="small" variant="outlined" color="error" startIcon={<CloseRoundedIcon />} onClick={() => handleDecideCorrection(p.row._id || p.row.id, 'rejected')}>Reject</Button>
        </Stack>
      ) : null,
    },
  ];

  const filteredMyLogs = useMemo(() => myLogs.filter(l => {
    const matchSearch = !searchTerm || (l.date || '').includes(searchTerm);
    const matchStatus = statusFilter === 'ALL' || (l.status || '').toLowerCase() === statusFilter.toLowerCase();
    return matchSearch && matchStatus;
  }), [myLogs, searchTerm, statusFilter]);

  const getRowId = r => r._id || r.id || Math.random().toString();

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ pb: 4 }}>
      {feedback && <Alert severity={feedback.type} onClose={() => setFeedback(null)} sx={{ mb: 2 }}>{feedback.message}</Alert>}

      {/* Check-in/out Panel */}
      <Card sx={{ mb: 3, p: 2.5 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" spacing={2}>
          <Box>
            <Typography variant="h6" fontWeight={700}>Today's Attendance</Typography>
            <Typography variant="body2" color="text.secondary">{new Date().toDateString()} — Office hours: 09:00–18:00 | Grace: 09:15</Typography>
          </Box>
          <Stack direction="row" spacing={1.5}>
            <Button variant="contained" startIcon={<LoginRoundedIcon />} onClick={handleCheckIn}
              disabled={actionLoading || isCheckedIn}
              sx={{ backgroundColor: isCheckedIn ? '#22c55e' : undefined }}>
              {isCheckedIn ? `In: ${fmtTime(todayLog?.checkIn)}` : 'Check In'}
            </Button>
            <Button variant="outlined" startIcon={<LogoutRoundedIcon />} onClick={handleCheckOut}
              disabled={actionLoading || !isCheckedIn || isCheckedOut}>
              {isCheckedOut ? `Out: ${fmtTime(todayLog?.checkOut)}` : 'Check Out'}
            </Button>
          </Stack>
          {todayLog?.status && <StatusChip status={todayLog.status} />}
        </Stack>
      </Card>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="My History" />
          {isStaff && <Tab label="Daily Board" />}
          {isStaff && <Tab label={`Correction Requests${corrections.filter(c => c.status === 'pending').length ? ` (${corrections.filter(c => c.status === 'pending').length})` : ''}`} />}
        </Tabs>
      </Box>

      {tab === 0 && (
        <Card sx={{ p: 2.5 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
            <TextField size="small" placeholder="Search by date..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> }}
              sx={{ width: { xs: '100%', sm: 220 } }} />
            <TextField select size="small" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} sx={{ width: { xs: '100%', sm: 150 } }}>
              {['ALL', 'present', 'late', 'half_day', 'absent', 'missing_checkout', 'on_leave'].map(s => <MenuItem key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s}</MenuItem>)}
            </TextField>
          </Stack>
          <Box sx={{ height: 440 }}>
            <DataGrid rows={filteredMyLogs} columns={myColumns} getRowId={getRowId} pageSizeOptions={[10, 20]} initialState={{ pagination: { paginationModel: { pageSize: 10 } } }} disableRowSelectionOnClick />
          </Box>
        </Card>
      )}

      {tab === 1 && isStaff && (
        <Card sx={{ p: 2.5 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Daily Attendance Board — {todayStr}</Typography>
          <Box sx={{ height: 440 }}>
            <DataGrid rows={board} columns={boardColumns} getRowId={getRowId} pageSizeOptions={[10, 25]} initialState={{ pagination: { paginationModel: { pageSize: 25 } } }} disableRowSelectionOnClick />
          </Box>
        </Card>
      )}

      {tab === 2 && isStaff && (
        <Card sx={{ p: 2.5 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Correction Requests</Typography>
          <Box sx={{ height: 440 }}>
            <DataGrid rows={corrections} columns={corrColumns} getRowId={getRowId} pageSizeOptions={[10, 20]} initialState={{ pagination: { paginationModel: { pageSize: 10 } } }} disableRowSelectionOnClick />
          </Box>
        </Card>
      )}

      {/* Correction Request Dialog */}
      <Dialog open={corrDialog} onClose={() => setCorrDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Request Attendance Correction</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Reason" multiline rows={3} fullWidth value={corrForm.reason} onChange={e => setCorrForm(f => ({ ...f, reason: e.target.value }))} required />
            <TextField label="Requested Check-In Time" type="datetime-local" fullWidth InputLabelProps={{ shrink: true }} value={corrForm.requestedCheckIn} onChange={e => setCorrForm(f => ({ ...f, requestedCheckIn: e.target.value }))} />
            <TextField label="Requested Check-Out Time" type="datetime-local" fullWidth InputLabelProps={{ shrink: true }} value={corrForm.requestedCheckOut} onChange={e => setCorrForm(f => ({ ...f, requestedCheckOut: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCorrDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleRequestCorrection} disabled={!corrForm.reason}>Submit</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Attendance;

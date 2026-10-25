import React, { useState, useEffect } from 'react';
import {
  Box, Card, Grid, Typography, Button, Stack, TextField, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
  Alert, Tabs, Tab, Paper, Chip,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SmartToyRoundedIcon from '@mui/icons-material/SmartToyRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';

import leaveApi from '../api/leaveApi';
import aiApi from '../api/aiApi';
import StatusChip from '../components/StatusChip';
import { useAuth } from '../context/AuthContext';
import { brandColors } from '../theme/theme';

const LEAVE_TYPES = ['annual', 'sick', 'casual', 'unpaid'];

export const LeaveManagement = () => {
  const { isAdmin, isHR } = useAuth();
  const isStaff = isAdmin || isHR;

  const [tab, setTab] = useState(0);
  const [myLeaves, setMyLeaves] = useState([]);
  const [balances, setBalances] = useState({});
  const [allLeaves, setAllLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [applyDialog, setApplyDialog] = useState(false);
  const [commentDialog, setCommentDialog] = useState({ open: false, leaveId: null, decision: '' });
  const [comment, setComment] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [form, setForm] = useState({ type: 'annual', startDate: dayjs(), endDate: dayjs(), reason: '' });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const myRes = await leaveApi.getMyLeaves();
      const d = myRes?.data;
      if (Array.isArray(d)) {
        setMyLeaves(d);
      } else {
        setMyLeaves(d?.leaves || []);
        setBalances(d?.balances || {});
      }
      if (isStaff) {
        const allRes = await leaveApi.listLeaves();
        const ad = allRes?.data;
        setAllLeaves(Array.isArray(ad) ? ad : ad?.leaves || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, [isStaff]);

  const handleApply = async () => {
    try {
      await leaveApi.applyLeave({ type: form.type, startDate: form.startDate.format('YYYY-MM-DD'), endDate: form.endDate.format('YYYY-MM-DD'), reason: form.reason });
      setFeedback({ type: 'success', message: 'Leave application submitted.' });
      setApplyDialog(false);
      fetchAll();
    } catch (e) { setFeedback({ type: 'error', message: e?.response?.data?.message || 'Failed to apply.' }); }
  };

  const handleCancel = async (id) => {
    try {
      await leaveApi.cancelLeave(id);
      setFeedback({ type: 'info', message: 'Leave cancelled.' });
      fetchAll();
    } catch (e) { setFeedback({ type: 'error', message: 'Failed to cancel.' }); }
  };

  const handleDecide = async () => {
    try {
      await leaveApi.decideLeave(commentDialog.leaveId, commentDialog.decision, comment);
      setFeedback({ type: 'success', message: `Leave ${commentDialog.decision}.` });
      setCommentDialog({ open: false, leaveId: null, decision: '' });
      setComment('');
      fetchAll();
    } catch (e) { setFeedback({ type: 'error', message: 'Failed to process.' }); }
  };

  const handleAiSuggest = async () => {
    if (!aiInput.trim()) return;
    setAiLoading(true);
    try {
      const res = await aiApi.getLeaveSuggestion(aiInput);
      const suggestion = res?.data || res;
      if (suggestion?.type) setForm(f => ({ ...f, type: suggestion.type }));
      if (suggestion?.startDate) setForm(f => ({ ...f, startDate: dayjs(suggestion.startDate) }));
      if (suggestion?.endDate) setForm(f => ({ ...f, endDate: dayjs(suggestion.endDate) }));
      if (suggestion?.reason) setForm(f => ({ ...f, reason: suggestion.reason }));
    } catch (e) { setFeedback({ type: 'warning', message: 'AI suggestion unavailable.' }); }
    finally { setAiLoading(false); }
  };

  const getRowId = r => r._id || r.id || Math.random().toString();

  const myColumns = [
    { field: 'type', headerName: 'Type', flex: 0.8, renderCell: p => <Chip label={p.value} size="small" sx={{ textTransform: 'capitalize' }} /> },
    { field: 'startDate', headerName: 'Start', flex: 0.9, renderCell: p => <Typography variant="body2">{(p.value || '').slice(0, 10)}</Typography> },
    { field: 'endDate', headerName: 'End', flex: 0.9, renderCell: p => <Typography variant="body2">{(p.value || '').slice(0, 10)}</Typography> },
    { field: 'reason', headerName: 'Reason', flex: 1.5 },
    { field: 'status', headerName: 'Status', flex: 0.8, renderCell: p => <StatusChip status={p.value} /> },
    {
      field: 'actions', headerName: '', flex: 0.8, sortable: false,
      renderCell: p => p.row.status === 'pending' ? (
        <Button size="small" color="error" variant="outlined" onClick={() => handleCancel(p.row._id || p.row.id)}>Cancel</Button>
      ) : null,
    },
  ];

  const allColumns = [
    { field: 'employee', headerName: 'Employee', flex: 1.2, renderCell: p => <Typography variant="body2" fontWeight={600}>{p.row.employee?.name || '—'}</Typography> },
    { field: 'type', headerName: 'Type', flex: 0.8, renderCell: p => <Chip label={p.value} size="small" sx={{ textTransform: 'capitalize' }} /> },
    { field: 'startDate', headerName: 'Start', flex: 0.9, renderCell: p => <Typography variant="body2">{(p.value || '').slice(0, 10)}</Typography> },
    { field: 'endDate', headerName: 'End', flex: 0.9, renderCell: p => <Typography variant="body2">{(p.value || '').slice(0, 10)}</Typography> },
    { field: 'status', headerName: 'Status', flex: 0.8, renderCell: p => <StatusChip status={p.value} /> },
    {
      field: 'actions', headerName: '', flex: 1.2, sortable: false,
      renderCell: p => p.row.status === 'pending' ? (
        <Stack direction="row" spacing={0.5}>
          <Button size="small" variant="contained" color="success" onClick={() => setCommentDialog({ open: true, leaveId: p.row._id || p.row.id, decision: 'approved' })}>Approve</Button>
          <Button size="small" variant="outlined" color="error" onClick={() => setCommentDialog({ open: true, leaveId: p.row._id || p.row.id, decision: 'rejected' })}>Reject</Button>
        </Stack>
      ) : null,
    },
  ];

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ pb: 4 }}>
      {feedback && <Alert severity={feedback.type} onClose={() => setFeedback(null)} sx={{ mb: 2 }}>{feedback.message}</Alert>}

      {/* Leave Balance Cards */}
      {Object.keys(balances).length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {Object.entries(balances).map(([type, bal]) => (
            <Grid item xs={6} sm={3} key={type}>
              <Card sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>{type} Leave</Typography>
                <Typography variant="h4" fontWeight={800} color="primary">{bal?.remaining ?? bal ?? 0}</Typography>
                <Typography variant="caption" color="text.disabled">of {bal?.total ?? '—'} days remaining</Typography>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)}>
            <Tab label="My Leaves" />
            {isStaff && <Tab label={`All Requests${allLeaves.filter(l => l.status === 'pending').length ? ` (${allLeaves.filter(l => l.status === 'pending').length})` : ''}`} />}
          </Tabs>
        </Box>
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setApplyDialog(true)}>Apply Leave</Button>
      </Stack>

      {tab === 0 && (
        <Card sx={{ p: 2.5 }}>
          <Box sx={{ height: 440 }}>
            <DataGrid rows={myLeaves} columns={myColumns} getRowId={getRowId} pageSizeOptions={[10, 20]} initialState={{ pagination: { paginationModel: { pageSize: 10 } } }} disableRowSelectionOnClick />
          </Box>
        </Card>
      )}

      {tab === 1 && isStaff && (
        <Card sx={{ p: 2.5 }}>
          <Box sx={{ height: 440 }}>
            <DataGrid rows={allLeaves} columns={allColumns} getRowId={getRowId} pageSizeOptions={[10, 25]} initialState={{ pagination: { paginationModel: { pageSize: 25 } } }} disableRowSelectionOnClick />
          </Box>
        </Card>
      )}

      {/* Apply Leave Dialog */}
      <Dialog open={applyDialog} onClose={() => setApplyDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Apply for Leave</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {/* AI Smart Form */}
            <Paper sx={{ p: 1.5, backgroundColor: brandColors.slate[50], border: `1px solid ${brandColors.slate[200]}`, borderRadius: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <SmartToyRoundedIcon fontSize="small" color="primary" />
                <Typography variant="caption" fontWeight={700}>AI Smart Form</Typography>
              </Stack>
              <Stack direction="row" spacing={1}>
                <TextField size="small" fullWidth placeholder='e.g. "I need 3 sick days from next Monday"' value={aiInput} onChange={e => setAiInput(e.target.value)} />
                <Button size="small" variant="outlined" onClick={handleAiSuggest} disabled={aiLoading}>{aiLoading ? '...' : 'Fill'}</Button>
              </Stack>
            </Paper>

            <TextField select label="Leave Type" fullWidth value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              {LEAVE_TYPES.map(t => <MenuItem key={t} value={t} sx={{ textTransform: 'capitalize' }}>{t}</MenuItem>)}
            </TextField>
            <DatePicker label="Start Date" value={form.startDate} onChange={v => setForm(f => ({ ...f, startDate: v }))} slotProps={{ textField: { fullWidth: true } }} />
            <DatePicker label="End Date" value={form.endDate} onChange={v => setForm(f => ({ ...f, endDate: v }))} slotProps={{ textField: { fullWidth: true } }} minDate={form.startDate} />
            <TextField label="Reason" multiline rows={3} fullWidth value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} required />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApplyDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleApply} disabled={!form.reason || !form.startDate || !form.endDate}>Submit</Button>
        </DialogActions>
      </Dialog>

      {/* Decision Dialog */}
      <Dialog open={commentDialog.open} onClose={() => setCommentDialog({ open: false, leaveId: null, decision: '' })} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ textTransform: 'capitalize' }}>{commentDialog.decision} Leave</DialogTitle>
        <DialogContent>
          <TextField label="Comment (optional)" multiline rows={3} fullWidth value={comment} onChange={e => setComment(e.target.value)} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCommentDialog({ open: false, leaveId: null, decision: '' })}>Cancel</Button>
          <Button variant="contained" color={commentDialog.decision === 'approved' ? 'success' : 'error'} onClick={handleDecide}>Confirm</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LeaveManagement;

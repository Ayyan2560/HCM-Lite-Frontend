import React, { useState, useEffect } from 'react';
import {
  Box, Card, Typography, Button, Stack, TextField, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
  Alert, Avatar, InputAdornment, Tabs, Tab, Chip,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import FileUploadRoundedIcon from '@mui/icons-material/FileUploadRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';

import employeeApi from '../api/employeeApi';
import { useAuth } from '../context/AuthContext';
import StatusChip from '../components/StatusChip';
import { brandColors } from '../theme/theme';

const DEFAULT_FORM = { name: '', email: '', password: '', phone: '', department: '', designation: '', employeeCode: '', salary: '', joiningDate: '' };

export const EmployeeDirectory = () => {
  const { isAdmin, isHR } = useAuth();
  const isStaff = isAdmin || isHR;

  const [employees, setEmployees] = useState([]);
  const [meta, setMeta] = useState({ departments: [], designations: [] });
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [addDialog, setAddDialog] = useState(false);
  const [profileDialog, setProfileDialog] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await employeeApi.listEmployees({ search, department: deptFilter, page: page + 1, limit: 25 });
      const d = res?.data;
      setEmployees(Array.isArray(d) ? d : d?.employees || []);
      setTotal(d?.total || employees.length);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    employeeApi.getMeta().then(r => setMeta(r?.data || { departments: [], designations: [] })).catch(() => {});
  }, []);

  useEffect(() => { fetchEmployees(); }, [search, deptFilter, page]);

  const handleCreate = async () => {
    try {
      await employeeApi.createEmployee({ ...form, salary: Number(form.salary) });
      setFeedback({ type: 'success', message: 'Employee created.' });
      setAddDialog(false);
      setForm(DEFAULT_FORM);
      fetchEmployees();
    } catch (e) { setFeedback({ type: 'error', message: e?.response?.data?.message || 'Failed to create.' }); }
  };

  const handleToggleStatus = async (emp) => {
    try {
      if (emp.isActive) { await employeeApi.deactivate(emp._id || emp.id); }
      else { await employeeApi.activate(emp._id || emp.id); }
      setFeedback({ type: 'info', message: `Employee ${emp.isActive ? 'deactivated' : 'activated'}.` });
      fetchEmployees();
    } catch (e) { setFeedback({ type: 'error', message: 'Action failed.' }); }
  };

  const handleExport = async () => {
    try {
      const blob = await employeeApi.exportEmployees();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'employees.csv'; a.click();
    } catch (e) { setFeedback({ type: 'error', message: 'Export failed.' }); }
  };

  const getRowId = r => r._id || r.id || Math.random().toString();

  const columns = [
    {
      field: 'name', headerName: 'Employee', flex: 1.5,
      renderCell: p => (
        <Stack direction="row" alignItems="center" spacing={1}>
          <Avatar src={p.row.avatarUrl} sx={{ width: 32, height: 32, fontSize: '0.875rem' }}>{p.value?.charAt(0)}</Avatar>
          <Box>
            <Typography variant="body2" fontWeight={600}>{p.value}</Typography>
            <Typography variant="caption" color="text.secondary">{p.row.employeeCode}</Typography>
          </Box>
        </Stack>
      )
    },
    { field: 'email', headerName: 'Email', flex: 1.5 },
    { field: 'department', headerName: 'Department', flex: 1 },
    { field: 'designation', headerName: 'Designation', flex: 1 },
    { field: 'isActive', headerName: 'Status', flex: 0.7, renderCell: p => <Chip label={p.value ? 'Active' : 'Inactive'} color={p.value ? 'success' : 'default'} size="small" /> },
    {
      field: 'actions', headerName: '', flex: 1.2, sortable: false,
      renderCell: p => (
        <Stack direction="row" spacing={0.5}>
          <Button size="small" variant="outlined" onClick={() => setProfileDialog(p.row)}>View</Button>
          {isStaff && <Button size="small" variant="outlined" color={p.row.isActive ? 'error' : 'success'} onClick={() => handleToggleStatus(p.row)}>{p.row.isActive ? 'Deactivate' : 'Activate'}</Button>}
        </Stack>
      )
    },
  ];

  return (
    <Box sx={{ pb: 4 }}>
      {feedback && <Alert severity={feedback.type} onClose={() => setFeedback(null)} sx={{ mb: 2 }}>{feedback.message}</Alert>}

      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={2} sx={{ mb: 2.5 }}>
        <Stack direction="row" spacing={1.5} flexWrap="wrap">
          <TextField size="small" placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> }}
            sx={{ width: 220 }} />
          <TextField select size="small" value={deptFilter} onChange={e => setDeptFilter(e.target.value)} sx={{ width: 160 }} displayEmpty>
            <MenuItem value="">All Departments</MenuItem>
            {(meta.departments || []).map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
          </TextField>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<FileDownloadRoundedIcon />} onClick={handleExport}>Export CSV</Button>
          {isStaff && <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setAddDialog(true)}>Add Employee</Button>}
        </Stack>
      </Stack>

      <Card sx={{ p: 2.5 }}>
        <Box sx={{ height: 560 }}>
          <DataGrid rows={employees} columns={columns} getRowId={getRowId} loading={loading}
            rowCount={total} paginationMode="server" paginationModel={{ page, pageSize: 25 }}
            onPaginationModelChange={m => setPage(m.page)} pageSizeOptions={[25]}
            disableRowSelectionOnClick />
        </Box>
      </Card>

      {/* Add Employee Dialog */}
      <Dialog open={addDialog} onClose={() => setAddDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add New Employee</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 1 }}>
            {[['name', 'Full Name'], ['email', 'Email'], ['password', 'Password'], ['phone', 'Phone'], ['employeeCode', 'Employee Code'], ['salary', 'Basic Salary'], ['joiningDate', 'Joining Date']].map(([k, l]) => (
              <TextField key={k} label={l} fullWidth value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} type={k === 'salary' ? 'number' : k === 'joiningDate' ? 'date' : k === 'password' ? 'password' : 'text'} InputLabelProps={k === 'joiningDate' ? { shrink: true } : undefined} />
            ))}
            <TextField select label="Department" fullWidth value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
              {(meta.departments || []).map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
            </TextField>
            <TextField select label="Designation" fullWidth value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))}>
              {(meta.designations || []).map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={!form.name || !form.email || !form.password}>Create Employee</Button>
        </DialogActions>
      </Dialog>

      {/* 360 Profile Dialog */}
      <Dialog open={!!profileDialog} onClose={() => setProfileDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Employee 360° Profile</DialogTitle>
        <DialogContent>
          {profileDialog && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar src={profileDialog.avatarUrl} sx={{ width: 64, height: 64, fontSize: '1.5rem' }}>{profileDialog.name?.charAt(0)}</Avatar>
                <Box>
                  <Typography variant="h6" fontWeight={700}>{profileDialog.name}</Typography>
                  <Typography color="text.secondary">{profileDialog.designation} — {profileDialog.department}</Typography>
                  <Chip label={profileDialog.isActive ? 'Active' : 'Inactive'} color={profileDialog.isActive ? 'success' : 'default'} size="small" />
                </Box>
              </Stack>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                {[['Employee Code', profileDialog.employeeCode], ['Email', profileDialog.email], ['Phone', profileDialog.phone], ['Joining Date', profileDialog.joiningDate?.slice(0, 10)], ['Salary', profileDialog.salary ? `$${profileDialog.salary}` : '—']].map(([k, v]) => (
                  <Box key={k}>
                    <Typography variant="caption" color="text.secondary">{k}</Typography>
                    <Typography variant="body2" fontWeight={600}>{v || '—'}</Typography>
                  </Box>
                ))}
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProfileDialog(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EmployeeDirectory;

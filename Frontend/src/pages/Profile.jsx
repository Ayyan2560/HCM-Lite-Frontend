import React, { useState, useEffect } from 'react';
import {
  Box, Card, Typography, Button, Stack, TextField, MenuItem, Avatar,
  CircularProgress, Alert, Divider, Grid, Chip,
} from '@mui/material';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import VpnKeyRoundedIcon from '@mui/icons-material/VpnKeyRounded';

import employeeApi from '../api/employeeApi';
import authApi from '../api/authApi';
import { useAuth } from '../context/AuthContext';

export const Profile = () => {
  const { user, employee, updateEmployeeData, isAdmin, isHR } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [feedback, setFeedback] = useState(null);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    employeeApi.getMyProfile().then(res => {
      const d = res?.data || res;
      setProfile(d);
      setForm({ phone: d?.phone || '', address: d?.address || '' });
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    try {
      const res = await employeeApi.updateMyProfile(form);
      const updated = res?.data || res;
      setProfile(p => ({ ...p, ...updated }));
      updateEmployeeData(updated);
      setFeedback({ type: 'success', message: 'Profile updated.' });
      setEditing(false);
    } catch (e) { setFeedback({ type: 'error', message: e?.response?.data?.message || 'Update failed.' }); }
  };

  const handleChangePassword = async () => {
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setFeedback({ type: 'error', message: 'Passwords do not match.' }); return;
    }
    setPwLoading(true);
    try {
      await authApi.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setFeedback({ type: 'success', message: 'Password changed successfully.' });
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (e) { setFeedback({ type: 'error', message: e?.response?.data?.message || 'Failed to change password.' }); }
    finally { setPwLoading(false); }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}><CircularProgress /></Box>;

  const p = profile || employee || {};

  return (
    <Box sx={{ pb: 4 }}>
      {feedback && <Alert severity={feedback.type} onClose={() => setFeedback(null)} sx={{ mb: 2 }}>{feedback.message}</Alert>}

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 3, textAlign: 'center' }}>
            <Avatar src={p.avatarUrl} sx={{ width: 80, height: 80, mx: 'auto', mb: 2, fontSize: '2rem' }}>{p.name?.charAt(0) || user?.name?.charAt(0)}</Avatar>
            <Typography variant="h6" fontWeight={700}>{p.name || user?.name}</Typography>
            <Typography color="text.secondary" sx={{ mb: 1 }}>{p.designation || '—'}</Typography>
            <Chip label={p.department || 'No Department'} size="small" sx={{ mb: 2 }} />
            <Divider sx={{ mb: 2 }} />
            {[['Employee Code', p.employeeCode], ['Email', user?.email || p.email], ['Phone', p.phone], ['Role', user?.role?.toUpperCase()], ['Joining Date', p.joiningDate?.slice(0, 10)], ['Status', p.isActive ? 'Active' : 'Inactive']].map(([k, v]) => (
              <Stack key={k} direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
                <Typography variant="caption" color="text.secondary">{k}</Typography>
                <Typography variant="caption" fontWeight={600}>{v || '—'}</Typography>
              </Stack>
            ))}
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card sx={{ p: 3, mb: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}>
              <Typography variant="h6" fontWeight={700}>Personal Information</Typography>
              {!editing ? (
                <Button startIcon={<EditRoundedIcon />} onClick={() => setEditing(true)}>Edit</Button>
              ) : (
                <Stack direction="row" spacing={1}>
                  <Button startIcon={<SaveRoundedIcon />} variant="contained" onClick={handleSave}>Save</Button>
                  <Button startIcon={<CancelRoundedIcon />} onClick={() => setEditing(false)}>Cancel</Button>
                </Stack>
              )}
            </Stack>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField label="Phone" fullWidth value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} disabled={!editing} size="small" />
              </Grid>
              <Grid item xs={12}>
                <TextField label="Address" fullWidth multiline rows={2} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} disabled={!editing} size="small" />
              </Grid>
            </Grid>
          </Card>

          <Card sx={{ p: 3 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2.5 }}>
              <VpnKeyRoundedIcon color="primary" />
              <Typography variant="h6" fontWeight={700}>Change Password</Typography>
            </Stack>
            <Grid container spacing={2}>
              <Grid item xs={12}><TextField label="Current Password" type="password" fullWidth size="small" value={pwForm.currentPassword} onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} /></Grid>
              <Grid item xs={12} sm={6}><TextField label="New Password" type="password" fullWidth size="small" value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} /></Grid>
              <Grid item xs={12} sm={6}><TextField label="Confirm Password" type="password" fullWidth size="small" value={pwForm.confirmPassword} onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))} /></Grid>
              <Grid item xs={12}>
                <Button variant="contained" onClick={handleChangePassword} disabled={pwLoading || !pwForm.currentPassword || !pwForm.newPassword}>
                  {pwLoading ? 'Changing...' : 'Change Password'}
                </Button>
              </Grid>
            </Grid>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Profile;

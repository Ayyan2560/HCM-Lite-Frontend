import React, { useState, useEffect } from 'react';
import {
  Box, Card, Grid, Typography, Button, Stack, TextField, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
  Alert, Divider, Chip, Tabs, Tab,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded';
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';

import orgApi from '../api/orgApi';
import { brandColors } from '../theme/theme';

export const OrganizationPage = () => {
  const [tab, setTab] = useState(0);
  const [settings, setSettings] = useState(null);
  const [hrUsers, setHrUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [editSettings, setEditSettings] = useState({});
  const [hrDialog, setHrDialog] = useState(false);
  const [hrForm, setHrForm] = useState({ name: '', email: '', password: '' });

  useEffect(() => {
    Promise.all([orgApi.getSettings(), orgApi.listUsers()]).then(([sRes, uRes]) => {
      const s = sRes?.data || sRes;
      setSettings(s);
      setEditSettings({
        companyName: s?.companyName || '',
        workStartTime: s?.workStartTime || '09:00',
        graceMinutes: s?.graceMinutes || 15,
        timezone: s?.timezone || 'UTC',
      });
      setHrUsers(Array.isArray(uRes?.data) ? uRes.data : uRes?.data?.users || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleSaveSettings = async () => {
    try {
      await orgApi.updateSettings(editSettings);
      setFeedback({ type: 'success', message: 'Settings saved.' });
    } catch (e) { setFeedback({ type: 'error', message: 'Failed to save.' }); }
  };

  const handleCreateHr = async () => {
    try {
      await orgApi.createHrAccount(hrForm);
      setFeedback({ type: 'success', message: 'HR account created.' });
      setHrDialog(false);
      setHrForm({ name: '', email: '', password: '' });
      const uRes = await orgApi.listUsers();
      setHrUsers(Array.isArray(uRes?.data) ? uRes.data : uRes?.data?.users || []);
    } catch (e) { setFeedback({ type: 'error', message: e?.response?.data?.message || 'Failed to create HR.' }); }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ pb: 4 }}>
      {feedback && <Alert severity={feedback.type} onClose={() => setFeedback(null)} sx={{ mb: 2 }}>{feedback.message}</Alert>}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Company Settings" />
          <Tab label="HR Accounts" />
          <Tab label="Departments & Leave Policy" />
        </Tabs>
      </Box>

      {tab === 0 && (
        <Card sx={{ p: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
            <BusinessRoundedIcon color="primary" />
            <Typography variant="h6" fontWeight={700}>Company Settings</Typography>
          </Stack>
          <Grid container spacing={2.5}>
            <Grid item xs={12} sm={6}><TextField label="Company Name" fullWidth value={editSettings.companyName} onChange={e => setEditSettings(s => ({ ...s, companyName: e.target.value }))} /></Grid>
            <Grid item xs={12} sm={6}><TextField label="Work Start Time" fullWidth value={editSettings.workStartTime} onChange={e => setEditSettings(s => ({ ...s, workStartTime: e.target.value }))} placeholder="09:00" /></Grid>
            <Grid item xs={12} sm={6}><TextField label="Grace Period (minutes)" type="number" fullWidth value={editSettings.graceMinutes} onChange={e => setEditSettings(s => ({ ...s, graceMinutes: Number(e.target.value) }))} /></Grid>
            <Grid item xs={12} sm={6}><TextField label="Timezone" fullWidth value={editSettings.timezone} onChange={e => setEditSettings(s => ({ ...s, timezone: e.target.value }))} /></Grid>
            <Grid item xs={12}>
              <Button variant="contained" startIcon={<SaveRoundedIcon />} onClick={handleSaveSettings}>Save Settings</Button>
            </Grid>
          </Grid>

          {settings && (
            <>
              <Divider sx={{ my: 3 }} />
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Current Configuration</Typography>
              <Grid container spacing={2}>
                {[['Departments', (settings.departments || []).join(', ')], ['Designations', (settings.designations || []).join(', ')], ['Weekend Days', (settings.weekendDays || []).join(', ')], ['Leave Types', Object.keys(settings.leavePolicy || {}).join(', ')]].map(([k, v]) => (
                  <Grid item xs={12} sm={6} key={k}>
                    <Typography variant="caption" color="text.secondary">{k}</Typography>
                    <Typography variant="body2">{v || 'Not configured'}</Typography>
                  </Grid>
                ))}
              </Grid>
            </>
          )}
        </Card>
      )}

      {tab === 1 && (
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6" fontWeight={700}>HR Accounts</Typography>
            <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setHrDialog(true)}>Add HR Account</Button>
          </Stack>
          <Grid container spacing={2}>
            {hrUsers.map(u => (
              <Grid item xs={12} sm={6} md={4} key={u._id || u.id}>
                <Card sx={{ p: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="subtitle2" fontWeight={700}>{u.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{u.email}</Typography>
                    </Box>
                    <Chip label={u.isActive ? 'Active' : 'Inactive'} color={u.isActive ? 'success' : 'default'} size="small" />
                  </Stack>
                </Card>
              </Grid>
            ))}
            {hrUsers.length === 0 && <Grid item xs={12}><Typography color="text.secondary">No HR accounts found.</Typography></Grid>}
          </Grid>
        </Box>
      )}

      {tab === 2 && (
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Departments & Leave Policy</Typography>
          {settings && (
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Departments</Typography>
                <Stack spacing={0.75}>{(settings.departments || []).map(d => <Chip key={d} label={d} size="small" />)}</Stack>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Designations</Typography>
                <Stack spacing={0.75}>{(settings.designations || []).map(d => <Chip key={d} label={d} size="small" />)}</Stack>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Leave Quotas</Typography>
                <Grid container spacing={1.5}>
                  {Object.entries(settings.leavePolicy || {}).map(([type, quota]) => (
                    <Grid item xs={6} sm={3} key={type}>
                      <Card sx={{ p: 1.5, textAlign: 'center', backgroundColor: brandColors.slate[50] }}>
                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>{type}</Typography>
                        <Typography variant="h5" fontWeight={800} color="primary">{quota}</Typography>
                        <Typography variant="caption">days/year</Typography>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Public Holidays</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {(settings.publicHolidays || []).map((h, i) => <Chip key={i} label={`${h.name} (${h.date?.slice(0, 10)})`} size="small" />)}
                  {!settings.publicHolidays?.length && <Typography color="text.secondary" variant="body2">No holidays configured.</Typography>}
                </Stack>
              </Grid>
            </Grid>
          )}
        </Card>
      )}

      <Dialog open={hrDialog} onClose={() => setHrDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add HR Account</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Full Name" fullWidth value={hrForm.name} onChange={e => setHrForm(f => ({ ...f, name: e.target.value }))} />
            <TextField label="Email" fullWidth value={hrForm.email} onChange={e => setHrForm(f => ({ ...f, email: e.target.value }))} />
            <TextField label="Password" type="password" fullWidth value={hrForm.password} onChange={e => setHrForm(f => ({ ...f, password: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHrDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateHr} disabled={!hrForm.name || !hrForm.email || !hrForm.password}>Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OrganizationPage;

import React, { useState, useEffect } from 'react';
import {
  Box, Card, Typography, Button, Stack, TextField, Dialog,
  DialogTitle, DialogContent, DialogActions, CircularProgress,
  Alert, Paper, Avatar, Chip,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';

import { announcementApi } from '../api/communicationsApi';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from '../components/ConfirmDialog';
import { brandColors } from '../theme/theme';

export const AnnouncementsPage = () => {
  const { isAdmin, isHR } = useAuth();
  const isStaff = isAdmin || isHR;
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [addDialog, setAddDialog] = useState(false);
  const [form, setForm] = useState({ title: '', content: '' });
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await announcementApi.list();
      setAnnouncements(Array.isArray(res?.data) ? res.data : res?.data?.announcements || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAnnouncements(); }, []);

  const handleCreate = async () => {
    try {
      await announcementApi.create(form);
      setFeedback({ type: 'success', message: 'Announcement posted.' });
      setAddDialog(false);
      setForm({ title: '', content: '' });
      fetchAnnouncements();
    } catch (e) { setFeedback({ type: 'error', message: 'Failed to post.' }); }
  };

  const handleDelete = async (id) => {
    try {
      await announcementApi.remove(id);
      setFeedback({ type: 'info', message: 'Announcement removed.' });
      setConfirmDelete(null);
      fetchAnnouncements();
    } catch (e) { setFeedback({ type: 'error', message: 'Failed to delete.' }); }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ pb: 4 }}>
      {feedback && <Alert severity={feedback.type} onClose={() => setFeedback(null)} sx={{ mb: 2 }}>{feedback.message}</Alert>}

      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <CampaignRoundedIcon color="primary" sx={{ fontSize: 28 }} />
          <Typography variant="h5" fontWeight={700}>Announcements</Typography>
        </Stack>
        {isStaff && (
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setAddDialog(true)}>Post Announcement</Button>
        )}
      </Stack>

      {announcements.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <CampaignRoundedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">No announcements yet.</Typography>
        </Card>
      ) : (
        <Stack spacing={2}>
          {announcements.map(a => (
            <Card key={a._id || a.id} sx={{ p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ flex: 1 }}>
                  <Avatar sx={{ backgroundColor: brandColors.primary.main, width: 44, height: 44 }}>
                    <CampaignRoundedIcon />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" fontWeight={700}>{a.title}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.6 }}>{a.content}</Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} alignItems="center">
                      <Typography variant="caption" color="text.disabled">{new Date(a.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</Typography>
                      {a.createdBy && <Chip label={a.createdBy.name || 'Admin'} size="small" />}
                    </Stack>
                  </Box>
                </Stack>
                {isStaff && (
                  <Button size="small" color="error" startIcon={<DeleteRoundedIcon />} onClick={() => setConfirmDelete(a._id || a.id)} sx={{ ml: 2, flexShrink: 0 }}>
                    Delete
                  </Button>
                )}
              </Stack>
            </Card>
          ))}
        </Stack>
      )}

      <Dialog open={addDialog} onClose={() => setAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Post Announcement</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Title" fullWidth value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
            <TextField label="Content" multiline rows={4} fullWidth value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} required />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={!form.title || !form.content}>Post</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog open={!!confirmDelete} title="Delete Announcement" message="Are you sure you want to delete this announcement?" onConfirm={() => handleDelete(confirmDelete)} onCancel={() => setConfirmDelete(null)} confirmLabel="Delete" confirmColor="error" />
    </Box>
  );
};

export default AnnouncementsPage;

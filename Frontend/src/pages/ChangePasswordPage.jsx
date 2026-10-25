import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Typography, TextField, Button, Stack, Alert, CircularProgress, InputAdornment, IconButton,
} from '@mui/material';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import LockResetRoundedIcon from '@mui/icons-material/LockResetRounded';
import { useAuth } from '../context/AuthContext';
import authApi from '../api/authApi';
import { useSnackbar } from '../context/SnackbarContext';
import { brandColors } from '../theme/theme';

export const ChangePasswordPage = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const snackbar = useSnackbar();

  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.currentPassword) errs.currentPassword = 'Current password is required';
    if (!form.newPassword || form.newPassword.length < 8) errs.newPassword = 'Min 8 characters';
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.newPassword)) errs.newPassword = 'Must include uppercase, lowercase and a digit';
    if (form.newPassword === form.currentPassword) errs.newPassword = 'New password must differ from current';
    if (form.newPassword !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setErrors(errs);
    return !Object.keys(errs).length;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (!validate()) return;
    setLoading(true);
    try {
      await authApi.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      snackbar.success('Password changed! Please sign in with your new password.');
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      setSubmitError(err?.response?.data?.data?.message || err.message || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh', backgroundColor: brandColors.slate[50],
        display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3,
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 440 }}>
        <Paper sx={{ p: { xs: 3, sm: 4 }, borderRadius: 3 }}>
          <Box
            sx={{
              width: 52, height: 52, borderRadius: 2,
              backgroundColor: brandColors.primary.subtle,
              color: brandColors.primary.main,
              display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2,
            }}
          >
            <LockResetRoundedIcon fontSize="medium" />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>Change Password</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            You must set a new password before continuing.
          </Typography>

          {submitError && <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>{submitError}</Alert>}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.75 }}>Current Password</Typography>
                <TextField
                  fullWidth type={showCurrent ? 'text' : 'password'}
                  value={form.currentPassword} onChange={set('currentPassword')}
                  error={Boolean(errors.currentPassword)} helperText={errors.currentPassword}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowCurrent(!showCurrent)} size="small">
                          {showCurrent ? <VisibilityOffRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.75 }}>New Password</Typography>
                <TextField
                  fullWidth type={showNew ? 'text' : 'password'}
                  placeholder="Min 8 chars, uppercase + number"
                  value={form.newPassword} onChange={set('newPassword')}
                  error={Boolean(errors.newPassword)} helperText={errors.newPassword}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowNew(!showNew)} size="small">
                          {showNew ? <VisibilityOffRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.75 }}>Confirm New Password</Typography>
                <TextField
                  fullWidth type={showNew ? 'text' : 'password'}
                  value={form.confirmPassword} onChange={set('confirmPassword')}
                  error={Boolean(errors.confirmPassword)} helperText={errors.confirmPassword}
                />
              </Box>
              <Button type="submit" fullWidth variant="contained" size="large" disabled={loading} sx={{ py: 1.4, fontWeight: 700, mt: 1 }}>
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Update Password'}
              </Button>
            </Stack>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default ChangePasswordPage;

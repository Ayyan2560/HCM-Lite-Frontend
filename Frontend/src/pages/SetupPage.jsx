import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Typography, TextField, Button, Stack, CircularProgress, Alert, Stepper, Step, StepLabel, MenuItem, InputAdornment, IconButton,
} from '@mui/material';
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import { useAuth } from '../context/AuthContext';
import { brandColors } from '../theme/theme';

const STEPS = ['Company Details', 'Admin Account'];

const TIMEZONES = ['Asia/Karachi', 'Asia/Kolkata', 'UTC', 'America/New_York', 'Europe/London', 'Asia/Dubai'];

export const SetupPage = () => {
  const navigate = useNavigate();
  const { setup, isAuthenticated } = useAuth();

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    companyName: '',
    timezone: 'Asia/Karachi',
    currency: 'PKR',
    adminName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  const set = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validateStep0 = () => {
    const errs = {};
    if (!form.companyName.trim()) errs.companyName = 'Company name is required';
    setErrors(errs);
    return !Object.keys(errs).length;
  };

  const validateStep1 = () => {
    const errs = {};
    if (!form.adminName.trim()) errs.adminName = 'Your name is required';
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Valid email is required';
    if (!form.password || form.password.length < 8) errs.password = 'Min 8 characters';
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password)) errs.password = 'Must include uppercase, lowercase and a number';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setErrors(errs);
    return !Object.keys(errs).length;
  };

  const handleNext = () => {
    if (activeStep === 0 && validateStep0()) setActiveStep(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep1()) return;
    setLoading(true);
    setError('');
    try {
      await setup({
        companyName: form.companyName,
        timezone: form.timezone,
        currency: form.currency,
        adminName: form.adminName,
        email: form.email.toLowerCase().trim(),
        password: form.password,
      });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: brandColors.slate[50],
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 560 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 4, justifyContent: 'center' }}>
          <Box
            sx={{
              width: 48, height: 48, borderRadius: 2.5,
              backgroundColor: brandColors.primary.main,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <BusinessRoundedIcon sx={{ color: '#fff', fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
              HCM <span style={{ color: brandColors.primary.main }}>Lite</span>
            </Typography>
            <Typography variant="caption" sx={{ color: brandColors.slate[500] }}>
              First-Run Setup
            </Typography>
          </Box>
        </Stack>

        <Paper sx={{ p: { xs: 3, sm: 4 }, borderRadius: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
            Welcome to HCM Lite
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Let's set up your company and create the first Admin account.
          </Typography>

          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {STEPS.map((label) => (
              <Step key={label}><StepLabel>{label}</StepLabel></Step>
            ))}
          </Stepper>

          {error && <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            {activeStep === 0 && (
              <Stack spacing={2.5}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.75 }}>Company Name *</Typography>
                  <TextField fullWidth placeholder="Northstar Technologies" value={form.companyName} onChange={set('companyName')} error={Boolean(errors.companyName)} helperText={errors.companyName} />
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.75 }}>Timezone</Typography>
                  <TextField select fullWidth value={form.timezone} onChange={set('timezone')}>
                    {TIMEZONES.map((tz) => <MenuItem key={tz} value={tz}>{tz}</MenuItem>)}
                  </TextField>
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.75 }}>Currency</Typography>
                  <TextField select fullWidth value={form.currency} onChange={set('currency')}>
                    {['PKR', 'USD', 'INR', 'AED', 'GBP', 'EUR'].map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                  </TextField>
                </Box>
                <Button variant="contained" size="large" fullWidth onClick={handleNext} sx={{ mt: 1, fontWeight: 700, py: 1.4 }}>
                  Continue
                </Button>
              </Stack>
            )}

            {activeStep === 1 && (
              <Stack spacing={2.5}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.75 }}>Your Full Name *</Typography>
                  <TextField fullWidth placeholder="Sara Ahmed" value={form.adminName} onChange={set('adminName')} error={Boolean(errors.adminName)} helperText={errors.adminName} />
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.75 }}>Admin Email *</Typography>
                  <TextField fullWidth type="email" placeholder="admin@company.com" value={form.email} onChange={set('email')} error={Boolean(errors.email)} helperText={errors.email} />
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.75 }}>Password *</Typography>
                  <TextField
                    fullWidth
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min 8 chars, uppercase + number"
                    value={form.password}
                    onChange={set('password')}
                    error={Boolean(errors.password)}
                    helperText={errors.password}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowPassword(!showPassword)} size="small">
                            {showPassword ? <VisibilityOffRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.75 }}>Confirm Password *</Typography>
                  <TextField fullWidth type={showPassword ? 'text' : 'password'} placeholder="Repeat password" value={form.confirmPassword} onChange={set('confirmPassword')} error={Boolean(errors.confirmPassword)} helperText={errors.confirmPassword} />
                </Box>
                <Stack direction="row" spacing={2}>
                  <Button variant="outlined" color="inherit" onClick={() => setActiveStep(0)} sx={{ flex: 1 }}>Back</Button>
                  <Button type="submit" variant="contained" size="large" disabled={loading} sx={{ flex: 2, fontWeight: 700, py: 1.4 }}>
                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Create Company & Admin'}
                  </Button>
                </Stack>
              </Stack>
            )}
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default SetupPage;

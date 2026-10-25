import React, { useState } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Grid, Typography, TextField, Button, FormControlLabel, Checkbox,
  Link, InputAdornment, IconButton, Alert, CircularProgress, Stack,
  Chip, Divider,
} from '@mui/material';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import SpeedRoundedIcon from '@mui/icons-material/SpeedRounded';
import { useAuth } from '../context/AuthContext';
import { brandColors } from '../theme/theme';

export const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('admin@hcm-lite.demo');
  const [password, setPassword] = useState('Admin@12345');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);

  const redirectPath = location.state?.from?.pathname || '/';

  const validate = () => {
    const errs = {};
    if (!email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Enter a valid email';
    if (!password) errs.password = 'Password is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (!validate()) return;
    setLoading(true);
    try {
      await login({ email, password });
      navigate(redirectPath, { replace: true });
    } catch (err) {
      setSubmitError(err.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setErrors({});
    setSubmitError('');
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', backgroundColor: '#fff' }}>
      <Grid container sx={{ flex: 1 }}>
        {/* Left Brand Panel */}
        <Grid
          item xs={12} md={6} lg={7}
          sx={{
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            justifyContent: 'space-between',
            backgroundColor: brandColors.navy.sidebar,
            p: { md: 6, lg: 8 },
            color: '#fff',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              position: 'absolute', top: '-10%', right: '-10%',
              width: 480, height: 480, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(37,99,235,0.2) 0%, rgba(15,23,42,0) 70%)',
              pointerEvents: 'none',
            }}
          />
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ zIndex: 1 }}>
            <Box
              sx={{
                width: 44, height: 44, borderRadius: 2.5,
                backgroundColor: brandColors.primary.main,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(37,99,235,0.4)',
              }}
            >
              <BusinessRoundedIcon sx={{ color: '#fff', fontSize: 26 }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                HCM <span style={{ color: brandColors.primary.light }}>Lite</span>
              </Typography>
              <Typography variant="caption" sx={{ color: brandColors.navy.textSecondary, letterSpacing: '0.05em' }}>
                ENTERPRISE WORKFORCE MANAGEMENT
              </Typography>
            </Box>
          </Stack>

          <Box sx={{ my: 'auto', py: 4, zIndex: 1, maxWidth: 520 }}>
            <Chip
              label="Hackathon Demo Platform"
              size="small"
              sx={{ backgroundColor: 'rgba(37,99,235,0.2)', color: brandColors.primary.light, fontWeight: 600, mb: 3, border: '1px solid rgba(59,130,246,0.3)' }}
            />
            <Typography variant="h3" sx={{ fontWeight: 800, lineHeight: 1.2, mb: 2, letterSpacing: '-0.02em' }}>
              Streamline HR, attendance & payroll in one platform.
            </Typography>
            <Typography variant="body1" sx={{ color: brandColors.navy.textSecondary, mb: 4, fontSize: '1.05rem' }}>
              Real-time attendance with late/half-day detection, leave approval pipelines, payslip generation, role-based access, and an AI assistant.
            </Typography>
            <Stack spacing={2}>
              {[
                [CheckCircleRoundedIcon, 'Live check-in / check-out with server timestamps'],
                [SecurityRoundedIcon, 'Role-based access — Admin, HR, Employee'],
                [SpeedRoundedIcon, 'PDF payslips and one-click payroll finalization'],
              ].map(([Icon, text]) => (
                <Stack key={text} direction="row" spacing={1.5} alignItems="center">
                  <Icon sx={{ color: brandColors.success.light, fontSize: 22 }} />
                  <Typography variant="body2" sx={{ color: '#f1f5f9' }}>{text}</Typography>
                </Stack>
              ))}
            </Stack>
          </Box>

          <Box sx={{ zIndex: 1, pt: 2, borderTop: `1px solid ${brandColors.navy.border}` }}>
            <Typography variant="caption" sx={{ color: brandColors.navy.textSecondary }}>
              © {new Date().getFullYear()} HCM Lite — Saylani Hackathon Demo
            </Typography>
          </Box>
        </Grid>

        {/* Right Form */}
        <Grid
          item xs={12} md={6} lg={5}
          sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', p: { xs: 3, sm: 6 } }}
        >
          <Box sx={{ width: '100%', maxWidth: 440 }}>
            {/* Mobile brand */}
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ display: { xs: 'flex', md: 'none' }, mb: 4 }}>
              <Box sx={{ width: 40, height: 40, borderRadius: 2, backgroundColor: brandColors.primary.main, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BusinessRoundedIcon sx={{ color: '#fff' }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                HCM <span style={{ color: brandColors.primary.main }}>Lite</span>
              </Typography>
            </Stack>

            <Box sx={{ mb: 3 }}>
              <Typography variant="h4" sx={{ fontWeight: 800, color: brandColors.slate[900], mb: 1 }}>
                Sign in
              </Typography>
              <Typography variant="body2" sx={{ color: brandColors.slate[500] }}>
                Use your enterprise credentials or a demo account below.
              </Typography>
            </Box>

            {submitError && (
              <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>{submitError}</Alert>
            )}

            {/* Demo Accounts */}
            <Box sx={{ mb: 3, p: 1.5, backgroundColor: brandColors.slate[50], borderRadius: 2, border: `1px solid ${brandColors.slate[200]}` }}>
              <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, color: brandColors.slate[600], mb: 1 }}>
                Demo accounts (click to fill):
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip label="Admin" size="small" onClick={() => fillDemo('admin@hcm-lite.demo', 'Admin@12345')} sx={{ cursor: 'pointer', fontWeight: 600, backgroundColor: '#eff6ff', color: '#1d4ed8' }} />
                <Chip label="HR" size="small" onClick={() => fillDemo('hr@hcm-lite.demo', 'Hr@12345')} sx={{ cursor: 'pointer', fontWeight: 600, backgroundColor: '#f0fdf4', color: '#16a34a' }} />
                <Chip label="Employee" size="small" onClick={() => fillDemo('employee@hcm-lite.demo', 'Employee@12345')} sx={{ cursor: 'pointer', fontWeight: 600, backgroundColor: '#f1f5f9', color: '#334155' }} />
              </Stack>
            </Box>

            <Box component="form" onSubmit={handleSubmit} noValidate>
              <Stack spacing={2.5}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.75, color: brandColors.slate[800] }}>
                    Email Address
                  </Typography>
                  <TextField
                    fullWidth autoFocus type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={Boolean(errors.email)}
                    helperText={errors.email}
                  />
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.75, color: brandColors.slate[800] }}>
                    Password
                  </Typography>
                  <TextField
                    fullWidth
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    error={Boolean(errors.password)}
                    helperText={errors.password}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowPassword(!showPassword)} size="small" edge="end">
                            {showPassword ? <VisibilityOffRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>

                <Button type="submit" fullWidth variant="contained" size="large" disabled={loading} sx={{ py: 1.4, fontWeight: 700 }}>
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
                </Button>
              </Stack>
            </Box>

            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: brandColors.slate[500] }}>
                First time?{' '}
                <Link component={RouterLink} to="/setup" sx={{ fontWeight: 700, color: brandColors.primary.main, textDecoration: 'none' }}>
                  Set up your company
                </Link>
              </Typography>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Login;

import React, { useState } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  FormControlLabel,
  Checkbox,
  Link,
  InputAdornment,
  IconButton,
  Alert,
  CircularProgress,
  Stack,
  Divider,
  Chip,
  Grid,
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

  const [email, setEmail] = useState('alexander.m@hcmlite.com');
  const [password, setPassword] = useState('Password@123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);

  const redirectPath = location.state?.from?.pathname || '/';

  const validate = () => {
    const errs = {};
    if (!email.trim()) {
      errs.email = 'Work email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errs.email = 'Please enter a valid email address';
    }

    if (!password) {
      errs.password = 'Password is required';
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!validate()) return;

    setLoading(true);
    try {
      await login({ email, password, rememberMe });
      navigate(redirectPath, { replace: true });
    } catch (err) {
      setSubmitError(err.message || 'Unable to sign in. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = (roleEmail) => {
    setEmail(roleEmail);
    setPassword('Password@123');
    setErrors({});
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        backgroundColor: '#ffffff',
      }}
    >
      <Grid container sx={{ flex: 1 }}>
        {/* Left Side: Brand & Value Proposition Hero (Hidden on xs/sm) */}
        <Grid
          item
          xs={12}
          md={6}
          lg={7}
          sx={{
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            justifyContent: 'space-between',
            backgroundColor: brandColors.navy.sidebar,
            p: { md: 6, lg: 8 },
            color: '#ffffff',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Background Decorative Circles */}
          <Box
            sx={{
              position: 'absolute',
              top: '-10%',
              right: '-10%',
              width: 500,
              height: 500,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(37,99,235,0.2) 0%, rgba(15,23,42,0) 70%)',
              pointerEvents: 'none',
            }}
          />

          {/* Brand Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, zIndex: 1 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2.5,
                backgroundColor: brandColors.primary.main,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
              }}
            >
              <BusinessRoundedIcon sx={{ color: '#ffffff', fontSize: 26 }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                HCM <span style={{ color: brandColors.primary.light }}>Lite</span>
              </Typography>
              <Typography variant="caption" sx={{ color: brandColors.navy.textSecondary, letterSpacing: '0.05em' }}>
                ENTERPRISE WORKFORCE MANAGEMENT
              </Typography>
            </Box>
          </Box>

          {/* Hero Content */}
          <Box sx={{ my: 'auto', py: 4, zIndex: 1, maxWidth: 540 }}>
            <Chip
              label="Next-Generation HCM"
              size="small"
              sx={{
                backgroundColor: 'rgba(37,99,235,0.2)',
                color: brandColors.primary.light,
                fontWeight: 600,
                mb: 3,
                border: '1px solid rgba(59,130,246,0.3)',
              }}
            />
            <Typography variant="h3" sx={{ fontWeight: 800, lineHeight: 1.2, mb: 2, letterSpacing: '-0.02em' }}>
              Streamline people, attendance, and payroll in one unified platform.
            </Typography>
            <Typography variant="body1" sx={{ color: brandColors.navy.textSecondary, mb: 4, fontSize: '1.05rem' }}>
              Empower your HR operations with precision real-time attendance tracking, instant leave approval pipelines, and automated payroll reporting.
            </Typography>

            <Stack spacing={2}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <CheckCircleRoundedIcon sx={{ color: brandColors.success.light, fontSize: 22 }} />
                <Typography variant="body2" sx={{ color: '#f1f5f9' }}>
                  Live biometric & web portal Check-In / Check-Out synchronization
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <SecurityRoundedIcon sx={{ color: brandColors.primary.light, fontSize: 22 }} />
                <Typography variant="body2" sx={{ color: '#f1f5f9' }}>
                  Enterprise HTTP-only cookie authentication & role-based access
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <SpeedRoundedIcon sx={{ color: brandColors.warning.light, fontSize: 22 }} />
                <Typography variant="body2" sx={{ color: '#f1f5f9' }}>
                  One-click monthly payroll calculation with audit controls
                </Typography>
              </Stack>
            </Stack>
          </Box>

          {/* Footer Note */}
          <Box sx={{ zIndex: 1, pt: 2, borderTop: `1px solid ${brandColors.navy.border}` }}>
            <Typography variant="caption" sx={{ color: brandColors.navy.textSecondary }}>
              © {new Date().getFullYear()} HCM Lite Inc. Secure Enterprise SaaS Platform. All rights reserved.
            </Typography>
          </Box>
        </Grid>

        {/* Right Side: Sign-In Form */}
        <Grid
          item
          xs={12}
          md={6}
          lg={5}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            p: { xs: 3, sm: 6 },
            backgroundColor: '#ffffff',
          }}
        >
          <Box sx={{ width: '100%', maxWidth: 440 }}>
            {/* Mobile Header (Shown on mobile) */}
            <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1.5, mb: 4 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  backgroundColor: brandColors.primary.main,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <BusinessRoundedIcon sx={{ color: '#ffffff' }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                HCM <span style={{ color: brandColors.primary.main }}>Lite</span>
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="h4" sx={{ fontWeight: 800, color: brandColors.slate[900], mb: 1 }}>
                Welcome back
              </Typography>
              <Typography variant="body2" sx={{ color: brandColors.slate[500] }}>
                Sign in with your enterprise credentials to access your workspace.
              </Typography>
            </Box>

            {submitError && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                {submitError}
              </Alert>
            )}

            {/* Quick Demo Pre-fill Pills */}
            <Box sx={{ mb: 3, p: 1.5, backgroundColor: brandColors.slate[50], borderRadius: 2, border: `1px solid ${brandColors.slate[200]}` }}>
              <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, color: brandColors.slate[600], mb: 1 }}>
                Quick Demo Accounts (Click to test):
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip
                  label="Admin (Alexander)"
                  size="small"
                  onClick={() => handleFillDemo('alexander.m@hcmlite.com')}
                  sx={{ cursor: 'pointer', fontWeight: 600, backgroundColor: '#eff6ff', color: '#1d4ed8' }}
                />
                <Chip
                  label="Employee (Elena)"
                  size="small"
                  onClick={() => handleFillDemo('elena.r@hcmlite.com')}
                  sx={{ cursor: 'pointer', fontWeight: 600, backgroundColor: '#f1f5f9', color: '#334155' }}
                />
              </Stack>
            </Box>

            <Box component="form" onSubmit={handleSubmit} noValidate>
              <Stack spacing={2.5}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.75, color: brandColors.slate[800] }}>
                    Work Email Address
                  </Typography>
                  <TextField
                    fullWidth
                    id="email"
                    name="email"
                    type="email"
                    placeholder="name@company.com"
                    autoComplete="email"
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={Boolean(errors.email)}
                    helperText={errors.email}
                  />
                </Box>

                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: brandColors.slate[800] }}>
                      Password
                    </Typography>
                    <Link
                      component={RouterLink}
                      to="#"
                      variant="caption"
                      sx={{ color: brandColors.primary.main, fontWeight: 600, textDecoration: 'none' }}
                      onClick={(e) => {
                        e.preventDefault();
                        alert('Password reset link has been dispatched to your work email.');
                      }}
                    >
                      Forgot password?
                    </Link>
                  </Stack>
                  <TextField
                    fullWidth
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    error={Boolean(errors.password)}
                    helperText={errors.password}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                            size="small"
                          >
                            {showPassword ? <VisibilityOffRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      color="primary"
                      size="small"
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ color: brandColors.slate[700] }}>
                      Remember this workstation for 30 days
                    </Typography>
                  }
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading}
                  sx={{
                    py: 1.4,
                    fontSize: '0.95rem',
                    fontWeight: 700,
                  }}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign in to Workspace'}
                </Button>
              </Stack>
            </Box>

            <Box sx={{ mt: 4, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: brandColors.slate[500] }}>
                Don't have an enterprise account?{' '}
                <Link
                  component={RouterLink}
                  to="/signup"
                  sx={{
                    fontWeight: 700,
                    color: brandColors.primary.main,
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  Create one now
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

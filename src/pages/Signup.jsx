import React, { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Link,
  InputAdornment,
  IconButton,
  Alert,
  CircularProgress,
  Stack,
  Grid,
  MenuItem,
  Chip,
} from '@mui/material';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { useAuth } from '../context/AuthContext';
import { brandColors } from '../theme/theme';

export const Signup = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('employee');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const errs = {};
    if (!fullName.trim()) {
      errs.fullName = 'Full legal name is required';
    }

    if (!email.trim()) {
      errs.email = 'Corporate email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errs.email = 'Please provide a valid email address';
    }

    if (!password) {
      errs.password = 'Password is required';
    } else if (password.length < 8) {
      errs.password = 'Password must be at least 8 characters';
    }

    if (!confirmPassword) {
      errs.confirmPassword = 'Confirmation password is required';
    } else if (password !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSuccessMsg('');

    if (!validate()) return;

    setLoading(true);
    try {
      await signup({
        fullName,
        email,
        password,
        role,
      });
      setSuccessMsg('Enterprise account created successfully! Initializing workspace...');
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 1200);
    } catch (err) {
      setSubmitError(err.message || 'Unable to register account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', backgroundColor: '#ffffff' }}>
      <Grid container sx={{ flex: 1 }}>
        {/* Left Side: Brand & Feature Presentation */}
        <Grid
          item
          xs={12}
          md={5}
          lg={6}
          sx={{
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            justifyContent: 'space-between',
            backgroundColor: brandColors.navy.sidebar,
            p: { md: 6, lg: 8 },
            color: '#ffffff',
            position: 'relative',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
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

          <Box sx={{ my: 'auto', py: 4, maxWidth: 520 }}>
            <Chip
              label="Join 100+ Organizations"
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
              Scale your team with enterprise clarity and agility.
            </Typography>
            <Typography variant="body1" sx={{ color: brandColors.navy.textSecondary, mb: 4 }}>
              Register your organization or staff profile to get instant access to automated attendance, leave balances, and salary transparency.
            </Typography>

            <Stack spacing={2}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <CheckCircleRoundedIcon sx={{ color: brandColors.success.light, fontSize: 22 }} />
                <Typography variant="body2" sx={{ color: '#f1f5f9' }}>
                  Self-service employee portal with mobile and desktop access
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <CheckCircleRoundedIcon sx={{ color: brandColors.success.light, fontSize: 22 }} />
                <Typography variant="body2" sx={{ color: '#f1f5f9' }}>
                  Automated shift tracking and overtime analytics
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <CheckCircleRoundedIcon sx={{ color: brandColors.success.light, fontSize: 22 }} />
                <Typography variant="body2" sx={{ color: '#f1f5f9' }}>
                  Transparent leave balances with instant manager approvals
                </Typography>
              </Stack>
            </Stack>
          </Box>

          <Box sx={{ pt: 2, borderTop: `1px solid ${brandColors.navy.border}` }}>
            <Typography variant="caption" sx={{ color: brandColors.navy.textSecondary }}>
              Enterprise Grade Security • 99.99% Uptime Guarantee • SOC-2 Type II Compliant
            </Typography>
          </Box>
        </Grid>

        {/* Right Side: Sign-Up Form */}
        <Grid
          item
          xs={12}
          md={7}
          lg={6}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            p: { xs: 3, sm: 6 },
            backgroundColor: '#ffffff',
          }}
        >
          <Box sx={{ width: '100%', maxWidth: 460 }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h4" sx={{ fontWeight: 800, color: brandColors.slate[900], mb: 1 }}>
                Create your account
              </Typography>
              <Typography variant="body2" sx={{ color: brandColors.slate[500] }}>
                Get started with your company email to setup your profile.
              </Typography>
            </Box>

            {submitError && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                {submitError}
              </Alert>
            )}

            {successMsg && (
              <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
                {successMsg}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} noValidate>
              <Stack spacing={2.25}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.75, color: brandColors.slate[800] }}>
                    Full Legal Name
                  </Typography>
                  <TextField
                    fullWidth
                    id="fullName"
                    name="fullName"
                    placeholder="e.g. Jordan Hayes"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    error={Boolean(errors.fullName)}
                    helperText={errors.fullName}
                  />
                </Box>

                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.75, color: brandColors.slate[800] }}>
                    Corporate Email Address
                  </Typography>
                  <TextField
                    fullWidth
                    id="email"
                    name="email"
                    type="email"
                    placeholder="jordan.h@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={Boolean(errors.email)}
                    helperText={errors.email}
                  />
                </Box>

                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.75, color: brandColors.slate[800] }}>
                    Workspace Role
                  </Typography>
                  <TextField
                    select
                    fullWidth
                    id="role"
                    name="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <MenuItem value="employee">Employee / Individual Contributor</MenuItem>
                    <MenuItem value="manager">Engineering / Department Manager</MenuItem>
                    <MenuItem value="hr">Human Resources Specialist</MenuItem>
                    <MenuItem value="admin">System Administrator / Executive</MenuItem>
                  </TextField>
                </Box>

                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.75, color: brandColors.slate[800] }}>
                    Password
                  </Typography>
                  <TextField
                    fullWidth
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimum 8 characters"
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

                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.75, color: brandColors.slate[800] }}>
                    Confirm Password
                  </Typography>
                  <TextField
                    fullWidth
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    error={Boolean(errors.confirmPassword)}
                    helperText={errors.confirmPassword}
                  />
                </Box>

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading}
                  sx={{
                    py: 1.4,
                    mt: 1,
                    fontSize: '0.95rem',
                    fontWeight: 700,
                  }}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'Create Enterprise Account'}
                </Button>
              </Stack>
            </Box>

            <Box sx={{ mt: 3.5, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: brandColors.slate[500] }}>
                Already registered with your company?{' '}
                <Link
                  component={RouterLink}
                  to="/login"
                  sx={{
                    fontWeight: 700,
                    color: brandColors.primary.main,
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  Sign in
                </Link>
              </Typography>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Signup;

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography, Button, Paper } from '@mui/material';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import { useAuth } from '../context/AuthContext';
import { brandColors } from '../theme/theme';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, loading, hasRole, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: brandColors.slate[50],
          gap: 2,
        }}
      >
        <CircularProgress size={44} thickness={4} sx={{ color: brandColors.primary.main }} />
        <Typography variant="body2" sx={{ color: brandColors.slate[600], fontWeight: 500 }}>
          Verifying security credentials...
        </Typography>
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !hasRole(allowedRoles)) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          p: 3,
        }}
      >
        <Paper
          sx={{
            maxWidth: 500,
            p: 4,
            textAlign: 'center',
            borderRadius: 3,
            border: `1px solid ${brandColors.slate[200]}`,
          }}
        >
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2,
            }}
          >
            <LockRoundedIcon fontSize="medium" />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
            Access Restricted
          </Typography>
          <Typography variant="body2" sx={{ color: brandColors.slate[600], mb: 3 }}>
            Your account ({user?.email}) has the role <strong>{user?.role?.toUpperCase()}</strong>,
            which does not have administrative authorization to view this resource.
          </Typography>
          <Button variant="contained" href="/" sx={{ minWidth: 140 }}>
            Return to Dashboard
          </Button>
        </Paper>
      </Box>
    );
  }

  return children;
};

export default ProtectedRoute;

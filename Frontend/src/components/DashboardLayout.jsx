import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, useMediaQuery, useTheme, Alert, Snackbar } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import Sidebar, { SIDEBAR_WIDTH, SIDEBAR_COLLAPSED_WIDTH } from './Sidebar';
import Navbar from './Navbar';
import { useAuth } from '../context/AuthContext';
import { brandColors } from '../theme/theme';

export const DashboardLayout = () => {
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));

  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [dismissDemoAlert, setDismissDemoAlert] = useState(false);

  const { isMock } = useAuth();

  const handleToggleDesktopSidebar = () => {
    setDesktopSidebarOpen((prev) => !prev);
  };

  const handleToggleMobileDrawer = () => {
    setMobileDrawerOpen((prev) => !prev);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: brandColors.slate[50] }}>
      {/* Desktop / Permanent Sidebar */}
      {!isMobile && (
        <Sidebar
          open={desktopSidebarOpen}
          onToggleCollapse={handleToggleDesktopSidebar}
          isMobile={false}
        />
      )}

      {/* Mobile Drawer */}
      {isMobile && (
        <Sidebar
          mobileOpen={mobileDrawerOpen}
          onMobileClose={() => setMobileDrawerOpen(false)}
          isMobile={true}
        />
      )}

      {/* Main Workspace Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          minHeight: '100vh',
          backgroundColor: brandColors.slate[50],
        }}
      >
        <Navbar onMobileToggle={handleToggleMobileDrawer} />

        {/* Demo Mode Notice */}
        {isMock && !dismissDemoAlert && (
          <Alert
            severity="info"
            icon={<InfoOutlinedIcon fontSize="inherit" />}
            onClose={() => setDismissDemoAlert(true)}
            sx={{
              borderRadius: 0,
              backgroundColor: '#eff6ff',
              borderBottom: '1px solid #bfdbfe',
              color: '#1e40af',
              fontSize: '0.8125rem',
              py: 0.5,
              px: 3,
              '& .MuiAlert-icon': {
                color: '#2563eb',
              },
            }}
          >
            <strong>Preview Demo Active:</strong> The backend API server is disconnected. All actions (Check-in/out, leave approvals, payroll, employee search) are fully interactive with instant simulated responses.
          </Alert>
        )}

        {/* Page Content Viewport */}
        <Box
          sx={{
            flex: 1,
            p: { xs: 2, sm: 3, md: 4 },
            maxWidth: 1600,
            width: '100%',
            mx: 'auto',
            boxSizing: 'border-box',
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default DashboardLayout;

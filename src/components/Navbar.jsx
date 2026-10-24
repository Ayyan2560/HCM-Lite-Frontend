import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Box,
  Typography,
  IconButton,
  Avatar,
  Badge,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
  Tooltip,
  Paper,
  List,
  ListItem,
} from '@mui/material';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import CloudOffRoundedIcon from '@mui/icons-material/CloudOffRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useAuth } from '../context/AuthContext';
import { brandColors } from '../theme/theme';
import { mockAnnouncements } from '../data/mockData';

const pageTitles = {
  '/': 'Dashboard Overview',
  '/attendance': 'Attendance Records & Time Tracking',
  '/leaves': 'Leave Management & Approvals',
  '/employees': 'Employee Directory',
  '/payroll': 'Payroll Administration',
  '/profile': 'My Profile & Account Settings',
};

export const Navbar = ({ onMobileToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isMock } = useAuth();

  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [notifAnchor, setNotifAnchor] = useState(null);

  const currentTitle = pageTitles[location.pathname] || 'Enterprise Portal';

  const handleOpenUserMenu = (event) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setUserMenuAnchor(null);
  };

  const handleOpenNotif = (event) => {
    setNotifAnchor(event.currentTarget);
  };

  const handleCloseNotif = () => {
    setNotifAnchor(null);
  };

  const handleLogout = async () => {
    handleCloseUserMenu();
    await logout();
    navigate('/login');
  };

  return (
    <AppBar
      position="sticky"
      color="inherit"
      elevation={0}
      sx={{
        backgroundColor: '#ffffff',
        borderBottom: `1px solid ${brandColors.slate[200]}`,
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar sx={{ minHeight: '68px !important', px: { xs: 2, md: 3 } }}>
        {/* Mobile Hamburger */}
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={onMobileToggle}
          sx={{ mr: 2, display: { md: 'none' }, color: brandColors.slate[700] }}
        >
          <MenuRoundedIcon />
        </IconButton>

        {/* Page Title & Breadcrumb */}
        <Box sx={{ flexGrow: 1 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              fontSize: { xs: '1rem', md: '1.15rem' },
              color: brandColors.slate[900],
              lineHeight: 1.2,
            }}
          >
            {currentTitle}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: brandColors.slate[500],
              display: { xs: 'none', sm: 'block' },
            }}
          >
            HCM Lite Enterprise HRMS • Workspace
          </Typography>
        </Box>

        {/* Right Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 } }}>
          {/* Demo Mode / Backend Connection Status Pill */}
          {isMock ? (
            <Tooltip
              title="Demo Mode Active: Backend is currently disconnected. Realistic sample data is being used for previewing UI interactions."
              arrow
            >
              <Chip
                icon={<CloudOffRoundedIcon style={{ fontSize: 15 }} />}
                label="Demo Mode"
                size="small"
                variant="outlined"
                sx={{
                  backgroundColor: '#fffbeb',
                  color: '#b45309',
                  borderColor: '#fde68a',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  display: { xs: 'none', sm: 'inline-flex' },
                  '& .MuiChip-icon': { color: '#b45309' },
                }}
              />
            </Tooltip>
          ) : (
            <Tooltip title="Live Backend API Connected" arrow>
              <Chip
                icon={<CheckCircleRoundedIcon style={{ fontSize: 15 }} />}
                label="API Connected"
                size="small"
                variant="outlined"
                sx={{
                  backgroundColor: '#ecfdf5',
                  color: '#065f46',
                  borderColor: '#a7f3d0',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  display: { xs: 'none', sm: 'inline-flex' },
                  '& .MuiChip-icon': { color: '#065f46' },
                }}
              />
            </Tooltip>
          )}

          {/* Notifications Bell */}
          <Tooltip title="Company Announcements & Notifications" arrow>
            <IconButton
              size="small"
              onClick={handleOpenNotif}
              sx={{
                color: brandColors.slate[600],
                backgroundColor: brandColors.slate[100],
                '&:hover': { backgroundColor: brandColors.slate[200] },
                p: 1,
              }}
            >
              <Badge badgeContent={3} color="primary" variant="dot">
                <NotificationsRoundedIcon fontSize="small" />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* Notifications Popover Menu */}
          <Menu
            anchorEl={notifAnchor}
            open={Boolean(notifAnchor)}
            onClose={handleCloseNotif}
            PaperProps={{
              sx: {
                width: 340,
                maxHeight: 420,
                borderRadius: 3,
                boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.15)',
                border: `1px solid ${brandColors.slate[200]}`,
                mt: 1.5,
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <Box sx={{ p: 2, pb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: brandColors.slate[900] }}>
                Announcements & Alerts
              </Typography>
              <Chip label="3 New" size="small" color="primary" sx={{ height: 20, fontSize: '0.7rem' }} />
            </Box>
            <Divider />
            <List disablePadding>
              {mockAnnouncements.map((item) => (
                <ListItem
                  key={item.id}
                  sx={{
                    px: 2,
                    py: 1.5,
                    borderBottom: `1px solid ${brandColors.slate[100]}`,
                    display: 'block',
                    '&:hover': { backgroundColor: brandColors.slate[50] },
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600, color: brandColors.slate[800] }}>
                    {item.title}
                  </Typography>
                  <Typography variant="caption" sx={{ color: brandColors.slate[500], display: 'block', mt: 0.5 }}>
                    {item.date} • {item.author}
                  </Typography>
                </ListItem>
              ))}
            </List>
          </Menu>

          {/* User Avatar Menu Trigger */}
          <Box
            onClick={handleOpenUserMenu}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              p: 0.5,
              borderRadius: 2,
              cursor: 'pointer',
              '&:hover': { backgroundColor: brandColors.slate[100] },
            }}
          >
            <Avatar
              src={user?.avatarUrl || user?.avatar}
              alt={user?.name || 'User'}
              sx={{
                width: 36,
                height: 36,
                border: `1.5px solid ${brandColors.primary.main}`,
              }}
            >
              {user?.name?.charAt(0) || 'U'}
            </Avatar>
            <Box sx={{ display: { xs: 'none', lg: 'block' }, textAlign: 'left' }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: brandColors.slate[900], lineHeight: 1.2 }}>
                {user?.name || 'Alexander Mitchell'}
              </Typography>
              <Typography variant="caption" sx={{ color: brandColors.slate[500] }}>
                {user?.designation || 'VP of People'}
              </Typography>
            </Box>
          </Box>

          {/* Profile Dropdown Menu */}
          <Menu
            anchorEl={userMenuAnchor}
            open={Boolean(userMenuAnchor)}
            onClose={handleCloseUserMenu}
            PaperProps={{
              sx: {
                width: 220,
                borderRadius: 2.5,
                boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.15)',
                border: `1px solid ${brandColors.slate[200]}`,
                mt: 1.5,
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                {user?.name || 'Alexander Mitchell'}
              </Typography>
              <Typography variant="caption" sx={{ color: brandColors.slate[500] }}>
                {user?.email || 'alexander.m@hcmlite.com'}
              </Typography>
            </Box>
            <Divider />
            <MenuItem
              onClick={() => {
                handleCloseUserMenu();
                navigate('/profile');
              }}
              sx={{ py: 1 }}
            >
              <ListItemIcon>
                <PersonOutlineRoundedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="My Profile" />
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout} sx={{ py: 1, color: 'error.main' }}>
              <ListItemIcon sx={{ color: 'error.main' }}>
                <LogoutRoundedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Log out" />
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;

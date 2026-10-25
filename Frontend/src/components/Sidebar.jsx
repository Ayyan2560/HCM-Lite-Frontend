import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Typography, Divider, Avatar, Chip, IconButton, Tooltip,
} from '@mui/material';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import EventNoteRoundedIcon from '@mui/icons-material/EventNoteRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import SmartToyRoundedIcon from '@mui/icons-material/SmartToyRounded';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import ManageSearchRoundedIcon from '@mui/icons-material/ManageSearchRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import { useAuth } from '../context/AuthContext';
import { brandColors } from '../theme/theme';

export const SIDEBAR_WIDTH = 260;
export const SIDEBAR_COLLAPSED_WIDTH = 76;

export const Sidebar = ({ open = true, mobileOpen = false, onMobileClose, onToggleCollapse, isMobile = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin, isHR } = useAuth();

  const navItems = [
    { title: 'Dashboard', path: '/', icon: DashboardRoundedIcon },
    { title: 'Attendance', path: '/attendance', icon: AccessTimeRoundedIcon },
    { title: 'Leave Management', path: '/leaves', icon: EventNoteRoundedIcon },
    { title: 'Employee Directory', path: '/employees', icon: PeopleAltRoundedIcon },
    { title: 'Payroll', path: '/payroll', icon: AccountBalanceWalletRoundedIcon, roles: ['admin', 'hr'] },
    { title: 'My Payslips', path: '/payslips', icon: ReceiptLongRoundedIcon, roles: ['employee'] },
    { title: 'Announcements', path: '/announcements', icon: CampaignRoundedIcon },
    { title: 'AI Assistant', path: '/ai', icon: SmartToyRoundedIcon },
    { title: 'Organization', path: '/organization', icon: SettingsRoundedIcon, roles: ['admin'] },
    { title: 'Audit Log', path: '/audit', icon: ManageSearchRoundedIcon, roles: ['admin'] },
    { title: 'My Profile', path: '/profile', icon: PersonRoundedIcon },
  ];

  const role = (user?.role || '').toLowerCase();

  const visibleItems = navItems.filter(item => {
    if (!item.roles) return true;
    return item.roles.includes(role);
  });

  const handleNavClick = (path) => {
    navigate(path);
    if (isMobile && onMobileClose) onMobileClose();
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: brandColors.navy.sidebar, color: brandColors.navy.textPrimary, userSelect: 'none' }}>
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', justifyContent: open ? 'space-between' : 'center', borderBottom: `1px solid ${brandColors.navy.border}`, minHeight: 68 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }} onClick={() => handleNavClick('/')}>
          <Box sx={{ width: 36, height: 36, borderRadius: 2, backgroundColor: brandColors.primary.main, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(37,99,235,0.4)', color: '#fff' }}>
            <BusinessRoundedIcon fontSize="small" />
          </Box>
          {open && (
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '1.05rem', lineHeight: 1.2, color: '#fff', letterSpacing: '-0.01em' }}>
                HCM <span style={{ color: brandColors.primary.light }}>Lite</span>
              </Typography>
              <Typography variant="caption" sx={{ color: brandColors.navy.textSecondary, fontSize: '0.6875rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Enterprise SaaS
              </Typography>
            </Box>
          )}
        </Box>
        {!isMobile && (
          <IconButton onClick={onToggleCollapse} size="small" sx={{ color: brandColors.navy.textSecondary, '&:hover': { color: '#fff' } }}>
            {open ? <ChevronLeftRoundedIcon fontSize="small" /> : <ChevronRightRoundedIcon fontSize="small" />}
          </IconButton>
        )}
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', py: 1.5, '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { backgroundColor: brandColors.navy.border, borderRadius: 2 } }}>
        <List dense disablePadding>
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
            return (
              <ListItem key={item.path} disablePadding sx={{ display: 'block', px: 1.25, mb: 0.25 }}>
                <Tooltip title={!open ? item.title : ''} placement="right">
                  <ListItemButton
                    onClick={() => handleNavClick(item.path)}
                    sx={{
                      borderRadius: 2, minHeight: 40, px: open ? 1.75 : 1.25, justifyContent: open ? 'initial' : 'center',
                      backgroundColor: isActive ? brandColors.primary.main : 'transparent',
                      color: isActive ? '#fff' : brandColors.navy.textSecondary,
                      '&:hover': { backgroundColor: isActive ? brandColors.primary.dark : brandColors.navy.sidebarHover, color: '#fff' },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 0, mr: open ? 1.75 : 'auto', justifyContent: 'center', color: 'inherit' }}>
                      <Icon fontSize="small" />
                    </ListItemIcon>
                    {open && (
                      <ListItemText primary={item.title} primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: isActive ? 600 : 500, lineHeight: 1.4 }} />
                    )}
                  </ListItemButton>
                </Tooltip>
              </ListItem>
            );
          })}
        </List>
      </Box>

      <Divider sx={{ borderColor: brandColors.navy.border }} />

      <Box sx={{ p: open ? 2 : 1.5, display: 'flex', alignItems: 'center', justifyContent: open ? 'space-between' : 'center', backgroundColor: 'rgba(0,0,0,0.2)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer', overflow: 'hidden' }} onClick={() => handleNavClick('/profile')}>
          <Avatar src={user?.avatarUrl} alt={user?.name || 'U'} sx={{ width: 36, height: 36, border: `2px solid ${brandColors.primary.light}`, backgroundColor: brandColors.navy.sidebarHover }}>
            {user?.name?.charAt(0) || 'U'}
          </Avatar>
          {open && (
            <Box sx={{ overflow: 'hidden' }}>
              <Typography variant="body2" noWrap sx={{ fontWeight: 600, color: '#fff', fontSize: '0.84rem' }}>{user?.name || 'User'}</Typography>
              <Typography variant="caption" noWrap sx={{ color: brandColors.navy.textSecondary, fontSize: '0.725rem', display: 'block' }}>{user?.role?.toUpperCase() || 'EMPLOYEE'}</Typography>
            </Box>
          )}
        </Box>
        {open && (
          <Tooltip title="Log out" placement="top">
            <IconButton size="small" onClick={handleLogout} sx={{ color: brandColors.navy.textSecondary, '&:hover': { color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)' } }}>
              <LogoutRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  );

  if (isMobile) {
    return (
      <Drawer variant="temporary" open={mobileOpen} onClose={onMobileClose} ModalProps={{ keepMounted: true }}
        sx={{ '& .MuiDrawer-paper': { width: SIDEBAR_WIDTH, boxSizing: 'border-box', border: 'none' } }}>
        {drawerContent}
      </Drawer>
    );
  }

  return (
    <Drawer variant="permanent"
      sx={{ width: open ? SIDEBAR_WIDTH : SIDEBAR_COLLAPSED_WIDTH, flexShrink: 0, whiteSpace: 'nowrap', boxSizing: 'border-box', transition: 'width 0.2s ease-in-out', '& .MuiDrawer-paper': { width: open ? SIDEBAR_WIDTH : SIDEBAR_COLLAPSED_WIDTH, transition: 'width 0.2s ease-in-out', overflowX: 'hidden', boxSizing: 'border-box', borderRight: `1px solid ${brandColors.navy.border}` } }}>
      {drawerContent}
    </Drawer>
  );
};

export default Sidebar;

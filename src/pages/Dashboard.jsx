import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Divider,
  Avatar,
  Paper,
  Snackbar,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import { PieChart } from '@mui/x-charts/PieChart';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import HowToRegRoundedIcon from '@mui/icons-material/HowToRegRounded';
import PendingActionsRoundedIcon from '@mui/icons-material/PendingActionsRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import LoginRoundedIcon from '@mui/icons-material/LoginRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import VerifiedUserRoundedIcon from '@mui/icons-material/VerifiedUserRounded';

import { useAuth } from '../context/AuthContext';
import StatCard from '../components/StatCard';
import StatusChip from '../components/StatusChip';
import attendanceApi from '../api/attendanceApi';
import leaveApi from '../api/leaveApi';
import {
  mockDashboardMetrics,
  mockAttendanceTrend,
  mockLeaveDistribution,
  mockRecentActivities,
  mockAnnouncements,
} from '../data/mockData';
import { brandColors } from '../theme/theme';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user, isHR, isAdmin, isManager } = useAuth();

  const [metrics, setMetrics] = useState(mockDashboardMetrics);
  const [todayCheckedIn, setTodayCheckedIn] = useState(true);
  const [checkInTime, setCheckInTime] = useState('09:02 AM');
  const [checkOutTime, setCheckOutTime] = useState(null);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [actionFeedback, setActionFeedback] = useState(null);
  const [loadingAction, setLoadingAction] = useState(false);

  useEffect(() => {
    // Load pending leave requests for approval overview
    const loadData = async () => {
      try {
        const res = await leaveApi.getMyLeaves();
        if (res.success && res.data) {
          const pending = res.data.filter((l) => l.status === 'Pending');
          setPendingLeaves(pending);
        }
      } catch (err) {
        console.warn('Failed to load leaves for dashboard:', err);
      }
    };
    loadData();
  }, []);

  const handleQuickCheckIn = async () => {
    setLoadingAction(true);
    try {
      const res = await attendanceApi.checkIn();
      setTodayCheckedIn(true);
      setCheckInTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setActionFeedback({
        type: 'success',
        message: res.data?.message || 'Checked in successfully! Have a productive workday.',
      });
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: 'Unable to register check-in. Please try again.',
      });
    } finally {
      setLoadingAction(false);
    }
  };

  const handleQuickCheckOut = async () => {
    setLoadingAction(true);
    try {
      const res = await attendanceApi.checkOut();
      const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setCheckOutTime(timeNow);
      setActionFeedback({
        type: 'info',
        message: res.data?.message || `Checked out successfully at ${timeNow}. Have a great evening!`,
      });
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: 'Unable to register check-out.',
      });
    } finally {
      setLoadingAction(false);
    }
  };

  const handleApproveLeave = async (leaveId) => {
    try {
      await leaveApi.updateLeaveStatus(leaveId, 'Approved');
      setPendingLeaves((prev) => prev.filter((item) => item.id !== leaveId));
      setActionFeedback({
        type: 'success',
        message: 'Leave application approved successfully.',
      });
    } catch (err) {
      setActionFeedback({ type: 'error', message: 'Failed to approve leave.' });
    }
  };

  const canApprove = isHR || isAdmin || isManager;

  return (
    <Box sx={{ pb: 4 }}>
      {/* Welcome Banner Card */}
      <Card
        sx={{
          mb: 3.5,
          p: { xs: 2.5, md: 3 },
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          borderRadius: 3,
          position: 'relative',
          overflow: 'hidden',
          border: 'none',
        }}
      >
        {/* Subtle Decorative Glow */}
        <Box
          sx={{
            position: 'absolute',
            right: '-5%',
            top: '-20%',
            width: 320,
            height: 320,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(37,99,235,0.3) 0%, rgba(15,23,42,0) 70%)',
            pointerEvents: 'none',
          }}
        />

        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'center' }}
          spacing={2.5}
          sx={{ position: 'relative', zIndex: 1 }}
        >
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <VerifiedUserRoundedIcon sx={{ color: brandColors.primary.light, fontSize: 20 }} />
              <Typography variant="caption" sx={{ color: brandColors.navy.textSecondary, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                Enterprise Workspace • {user?.department || 'Executive Office'}
              </Typography>
            </Stack>
            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 0.5 }}>
              Good morning, {user?.name || 'Alexander'}
            </Typography>
            <Typography variant="body2" sx={{ color: brandColors.navy.textSecondary, maxWidth: 600 }}>
              Here is your workforce operational summary for today, {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}.
            </Typography>
          </Box>

          {/* Quick Attendance Widget */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2.5,
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              minWidth: { xs: '100%', sm: 300 },
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              <Typography variant="caption" sx={{ color: brandColors.navy.textSecondary, fontWeight: 600 }}>
                TODAY'S SHIFT STATUS
              </Typography>
              <StatusChip status={todayCheckedIn ? (checkOutTime ? 'Completed' : 'Present') : 'Not Checked In'} />
            </Stack>

            <Typography variant="body2" sx={{ color: '#ffffff', mb: 2 }}>
              {todayCheckedIn ? (
                <>In at <strong>{checkInTime}</strong> {checkOutTime ? `• Out at ${checkOutTime}` : '• Active'}</>
              ) : (
                'You have not marked attendance today.'
              )}
            </Typography>

            <Stack direction="row" spacing={1.5}>
              <Button
                variant="contained"
                size="small"
                startIcon={<LoginRoundedIcon />}
                disabled={loadingAction || (todayCheckedIn && !checkOutTime)}
                onClick={handleQuickCheckIn}
                sx={{
                  flex: 1,
                  backgroundColor: brandColors.primary.main,
                  '&:hover': { backgroundColor: brandColors.primary.dark },
                }}
              >
                Check In
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<LogoutRoundedIcon />}
                disabled={loadingAction || !todayCheckedIn || Boolean(checkOutTime)}
                onClick={handleQuickCheckOut}
                sx={{
                  flex: 1,
                  color: '#ffffff',
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  '&:hover': {
                    borderColor: '#ffffff',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  },
                }}
              >
                Check Out
              </Button>
            </Stack>
          </Paper>
        </Stack>
      </Card>

      {/* KPI Stat Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Total Headcount"
            value={metrics.totalEmployees}
            trend="+4.2%"
            trendLabel="vs last month"
            isPositive={true}
            icon={PeopleAltRoundedIcon}
            iconColor={brandColors.primary.main}
            iconBg={brandColors.primary.subtle}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Present Today"
            value={metrics.presentToday}
            trend={metrics.attendanceRate}
            trendLabel="attendance rate"
            isPositive={true}
            icon={HowToRegRoundedIcon}
            iconColor={brandColors.success.main}
            iconBg={brandColors.success.subtle}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Pending Leaves"
            value={pendingLeaves.length || metrics.pendingLeaveRequests}
            trend="Action needed"
            trendLabel="by HR/Managers"
            isPositive={false}
            icon={PendingActionsRoundedIcon}
            iconColor={brandColors.warning.main}
            iconBg={brandColors.warning.subtle}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Avg Work Hours"
            value={metrics.averageWorkHours}
            trend="+0.3h"
            trendLabel="shift efficiency"
            isPositive={true}
            icon={AccessTimeRoundedIcon}
            iconColor="#6366f1"
            iconBg="#eef2ff"
          />
        </Grid>
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        {/* Attendance Trend Bar Chart */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ height: '100%', p: 2.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Weekly Attendance Overview
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Daily presence vs. late arrivals and authorized leaves
                </Typography>
              </Box>
              <Button
                size="small"
                endIcon={<ArrowForwardRoundedIcon />}
                onClick={() => navigate('/attendance')}
                sx={{ color: brandColors.primary.main }}
              >
                Full Logs
              </Button>
            </Stack>

            <Box sx={{ width: '100%', height: 310 }}>
              <BarChart
                dataset={mockAttendanceTrend}
                xAxis={[{ scaleType: 'band', dataKey: 'day' }]}
                series={[
                  { dataKey: 'present', label: 'Present', color: '#2563eb' },
                  { dataKey: 'late', label: 'Late Arrival', color: '#f59e0b' },
                  { dataKey: 'onLeave', label: 'On Leave', color: '#94a3b8' },
                ]}
                height={300}
                margin={{ top: 20, bottom: 25, left: 40, right: 10 }}
                slotProps={{
                  legend: {
                    direction: 'row',
                    position: { vertical: 'top', horizontal: 'middle' },
                    padding: 0,
                  },
                }}
              />
            </Box>
          </Card>
        </Grid>

        {/* Leave Distribution Pie Chart */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%', p: 2.5, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ mb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Leave Distribution
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Breakdown by leave classification (Month-to-Date)
              </Typography>
            </Box>

            <Box sx={{ width: '100%', height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PieChart
                series={[
                  {
                    data: mockLeaveDistribution,
                    innerRadius: 50,
                    outerRadius: 90,
                    paddingAngle: 3,
                    cornerRadius: 5,
                    highlightScope: { faded: 'global', highlighted: 'item' },
                  },
                ]}
                height={240}
                slotProps={{
                  legend: {
                    direction: 'row',
                    position: { vertical: 'bottom', horizontal: 'middle' },
                  },
                }}
              />
            </Box>

            <Divider sx={{ my: 1.5 }} />

            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" color="text.secondary">
                Total leave applications: <strong>72 days</strong>
              </Typography>
              <Button size="small" onClick={() => navigate('/leaves')}>
                Manage Leaves
              </Button>
            </Stack>
          </Card>
        </Grid>
      </Grid>

      {/* Two Column Grid: Pending Approvals & Activity Feed */}
      <Grid container spacing={2.5}>
        {/* Pending Approvals */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ height: '100%', p: 2.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Pending Approvals
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Applications awaiting management decision
                </Typography>
              </Box>
              <Button size="small" onClick={() => navigate('/leaves')}>
                View All
              </Button>
            </Stack>

            {pendingLeaves.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <CheckCircleRoundedIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  All caught up!
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  There are no pending leave requests awaiting approval.
                </Typography>
              </Box>
            ) : (
              <Stack spacing={1.5}>
                {pendingLeaves.slice(0, 3).map((item) => (
                  <Paper
                    key={item.id}
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      border: `1px solid ${brandColors.slate[200]}`,
                      backgroundColor: brandColors.slate[50],
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar src={item.applicantAvatar} sx={{ width: 40, height: 40 }}>
                          {item.applicantName?.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {item.applicantName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.leaveType} Leave • {item.totalDays} day(s) ({item.startDate} to {item.endDate})
                          </Typography>
                        </Box>
                      </Stack>
                      <StatusChip status={item.status} />
                    </Stack>

                    <Typography variant="body2" sx={{ mt: 1.5, color: brandColors.slate[700], fontSize: '0.825rem' }}>
                      "{item.reason}"
                    </Typography>

                    {canApprove && (
                      <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 1.5 }}>
                        <Button
                          variant="contained"
                          size="small"
                          color="primary"
                          onClick={() => handleApproveLeave(item.id)}
                          sx={{ fontSize: '0.75rem', py: 0.4 }}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          color="inherit"
                          onClick={() => navigate('/leaves')}
                          sx={{ fontSize: '0.75rem', py: 0.4 }}
                        >
                          Review
                        </Button>
                      </Stack>
                    )}
                  </Paper>
                ))}
              </Stack>
            )}
          </Card>
        </Grid>

        {/* Live Activity Feed */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ height: '100%', p: 2.5 }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Recent Operational Activity
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Audit trail of workforce events and logs
              </Typography>
            </Box>

            <Stack spacing={2}>
              {mockRecentActivities.map((act) => (
                <Stack
                  key={act.id}
                  direction="row"
                  spacing={1.75}
                  alignItems="center"
                  sx={{
                    pb: 1.5,
                    borderBottom: `1px solid ${brandColors.slate[100]}`,
                    '&:last-child': { borderBottom: 'none', pb: 0 },
                  }}
                >
                  <Avatar src={act.avatar} sx={{ width: 36, height: 36 }}>
                    {act.user.charAt(0)}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ color: brandColors.slate[900] }}>
                      <strong>{act.user}</strong> {act.action}
                    </Typography>
                    <Typography variant="caption" sx={{ color: brandColors.slate[400] }}>
                      {act.time}
                    </Typography>
                  </Box>
                </Stack>
              ))}
            </Stack>
          </Card>
        </Grid>
      </Grid>

      {/* Snackbar Feedback */}
      <Snackbar
        open={Boolean(actionFeedback)}
        autoHideDuration={4000}
        onClose={() => setActionFeedback(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setActionFeedback(null)}
          severity={actionFeedback?.type || 'info'}
          variant="filled"
          sx={{ width: '100%', borderRadius: 2 }}
        >
          {actionFeedback?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Dashboard;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Grid, Card, CardContent, Typography, Button, Stack, Divider,
  Avatar, Paper, CircularProgress, Alert, Chip,
} from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import { PieChart } from '@mui/x-charts/PieChart';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import HowToRegRoundedIcon from '@mui/icons-material/HowToRegRounded';
import PendingActionsRoundedIcon from '@mui/icons-material/PendingActionsRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import LoginRoundedIcon from '@mui/icons-material/LoginRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';

import { useAuth } from '../context/AuthContext';
import StatCard from '../components/StatCard';
import StatusChip from '../components/StatusChip';
import dashboardApi from '../api/dashboardApi';
import attendanceApi from '../api/attendanceApi';
import leaveApi from '../api/leaveApi';
import { announcementApi } from '../api/communicationsApi';
import { brandColors } from '../theme/theme';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user, employee, isAdmin, isHR } = useAuth();
  const isStaff = isAdmin || isHR;

  const [overview, setOverview] = useState(null);
  const [empDash, setEmpDash] = useState(null);
  const [todayRecord, setTodayRecord] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [annRes] = await Promise.allSettled([announcementApi.list()]);
        if (annRes.status === 'fulfilled' && annRes.value?.data) setAnnouncements(annRes.value.data.slice(0, 5));

        if (isStaff) {
          const [ovRes, lvRes] = await Promise.allSettled([dashboardApi.getOverview(), leaveApi.listLeaves({ status: 'pending' })]);
          if (ovRes.status === 'fulfilled') setOverview(ovRes.value?.data || ovRes.value);
          if (lvRes.status === 'fulfilled') {
            const d = lvRes.value?.data;
            setPendingLeaves((Array.isArray(d) ? d : d?.leaves || []).slice(0, 4));
          }
        } else {
          const [edRes, attRes] = await Promise.allSettled([dashboardApi.getEmployeeDashboard(), attendanceApi.getMyAttendance({ limit: 1 })]);
          if (edRes.status === 'fulfilled') setEmpDash(edRes.value?.data || edRes.value);
          if (attRes.status === 'fulfilled') {
            const records = attRes.value?.data;
            const todayStr = new Date().toISOString().slice(0, 10);
            const rec = (Array.isArray(records) ? records : records?.records || []).find(r => r.date?.slice(0, 10) === todayStr);
            setTodayRecord(rec || null);
          }
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [isStaff]);

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      const res = await attendanceApi.checkIn();
      setFeedback({ type: 'success', message: res?.data?.message || 'Checked in!' });
      setTodayRecord(r => ({ ...r, checkIn: new Date().toISOString() }));
    } catch (e) {
      setFeedback({ type: 'error', message: e?.response?.data?.message || 'Check-in failed.' });
    } finally { setActionLoading(false); }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
      const res = await attendanceApi.checkOut();
      setFeedback({ type: 'info', message: res?.data?.message || 'Checked out!' });
      setTodayRecord(r => ({ ...r, checkOut: new Date().toISOString() }));
    } catch (e) {
      setFeedback({ type: 'error', message: e?.response?.data?.message || 'Check-out failed.' });
    } finally { setActionLoading(false); }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}><CircularProgress /></Box>;

  const fmtTime = (iso) => iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <Box sx={{ pb: 4 }}>
      {feedback && <Alert severity={feedback.type} onClose={() => setFeedback(null)} sx={{ mb: 2 }}>{feedback.message}</Alert>}

      {/* Welcome Banner */}
      <Card sx={{ mb: 3, p: { xs: 2.5, md: 3 }, background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#fff', borderRadius: 3, border: 'none' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
              Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {user?.name?.split(' ')[0] || 'there'} 👋
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </Typography>
          </Box>
          {!isStaff && employee && (
            <Stack direction="row" spacing={1.5}>
              <Button variant="contained" startIcon={<LoginRoundedIcon />} onClick={handleCheckIn}
                disabled={actionLoading || !!todayRecord?.checkIn}
                sx={{ backgroundColor: '#22c55e', '&:hover': { backgroundColor: '#16a34a' }, '&:disabled': { backgroundColor: 'rgba(34,197,94,0.3)' } }}>
                {todayRecord?.checkIn ? `In: ${fmtTime(todayRecord.checkIn)}` : 'Check In'}
              </Button>
              <Button variant="outlined" startIcon={<LogoutRoundedIcon />} onClick={handleCheckOut}
                disabled={actionLoading || !todayRecord?.checkIn || !!todayRecord?.checkOut}
                sx={{ borderColor: 'rgba(255,255,255,0.3)', color: '#fff', '&:hover': { borderColor: '#fff' } }}>
                {todayRecord?.checkOut ? `Out: ${fmtTime(todayRecord.checkOut)}` : 'Check Out'}
              </Button>
            </Stack>
          )}
        </Stack>
      </Card>

      {/* KPI Cards */}
      {isStaff && overview && (
        <Grid container spacing={2.5} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}><StatCard title="Total Employees" value={overview.totalEmployees ?? '—'} icon={<PeopleAltRoundedIcon />} color="primary" /></Grid>
          <Grid item xs={12} sm={6} md={3}><StatCard title="Present Today" value={overview.presentToday ?? '—'} icon={<HowToRegRoundedIcon />} color="success" /></Grid>
          <Grid item xs={12} sm={6} md={3}><StatCard title="Pending Leaves" value={overview.pendingLeaves ?? '—'} icon={<PendingActionsRoundedIcon />} color="warning" /></Grid>
          <Grid item xs={12} sm={6} md={3}><StatCard title="Late Today" value={overview.lateToday ?? '—'} icon={<AccessTimeRoundedIcon />} color="error" /></Grid>
        </Grid>
      )}

      {!isStaff && empDash && (
        <Grid container spacing={2.5} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}><StatCard title="Annual Leave Left" value={empDash.leaveBalances?.annual ?? '—'} icon={<PendingActionsRoundedIcon />} color="primary" /></Grid>
          <Grid item xs={12} sm={6} md={3}><StatCard title="Sick Leave Left" value={empDash.leaveBalances?.sick ?? '—'} icon={<AccessTimeRoundedIcon />} color="warning" /></Grid>
          <Grid item xs={12} sm={6} md={3}><StatCard title="Attendance %" value={empDash.attendanceRate ? `${empDash.attendanceRate}%` : '—'} icon={<HowToRegRoundedIcon />} color="success" /></Grid>
          <Grid item xs={12} sm={6} md={3}><StatCard title="Last Payslip" value={empDash.lastPayslip?.netSalary ? `$${empDash.lastPayslip.netSalary}` : '—'} icon={<AccountBalanceWalletRoundedIcon />} color="info" /></Grid>
        </Grid>
      )}

      <Grid container spacing={2.5}>
        {/* Charts for Admin/HR */}
        {isStaff && overview?.departmentBreakdown?.length > 0 && (
          <Grid item xs={12} md={7}>
            <Card sx={{ p: 2.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Department Breakdown</Typography>
              <BarChart
                dataset={overview.departmentBreakdown}
                xAxis={[{ scaleType: 'band', dataKey: 'department' }]}
                series={[{ dataKey: 'count', label: 'Employees', color: brandColors.primary.main }]}
                height={260} margin={{ left: 40, right: 20, top: 20, bottom: 40 }}
              />
            </Card>
          </Grid>
        )}

        {/* Pending Leaves for HR */}
        {isStaff && (
          <Grid item xs={12} md={isStaff && overview?.departmentBreakdown?.length > 0 ? 5 : 12}>
            <Card sx={{ p: 2.5, height: '100%' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Pending Leave Requests</Typography>
                <Button size="small" onClick={() => navigate('/leaves')}>View All</Button>
              </Stack>
              {pendingLeaves.length === 0 ? (
                <Typography color="text.secondary" variant="body2">No pending requests.</Typography>
              ) : (
                <Stack spacing={1.5}>
                  {pendingLeaves.map(lv => (
                    <Paper key={lv._id} elevation={0} sx={{ p: 1.5, borderRadius: 2, border: `1px solid ${brandColors.slate[200]}`, backgroundColor: brandColors.slate[50] }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{lv.employee?.name || 'Employee'}</Typography>
                          <Typography variant="caption" color="text.secondary">{lv.type} — {lv.startDate?.slice(0, 10)} to {lv.endDate?.slice(0, 10)}</Typography>
                        </Box>
                        <StatusChip status={lv.status} />
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Card>
          </Grid>
        )}

        {/* Announcements */}
        <Grid item xs={12} md={isStaff ? 12 : 8}>
          <Card sx={{ p: 2.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Announcements</Typography>
              <Button size="small" onClick={() => navigate('/announcements')}>View All</Button>
            </Stack>
            {announcements.length === 0 ? (
              <Typography color="text.secondary" variant="body2">No announcements.</Typography>
            ) : (
              <Stack spacing={1.5}>
                {announcements.map(a => (
                  <Paper key={a._id} elevation={0} sx={{ p: 1.5, borderRadius: 2, border: `1px solid ${brandColors.slate[200]}`, backgroundColor: brandColors.slate[50] }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                      <CampaignRoundedIcon fontSize="small" color="primary" />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{a.title}</Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary">{a.content}</Typography>
                    <Typography variant="caption" color="text.disabled">{new Date(a.createdAt).toLocaleDateString()}</Typography>
                  </Paper>
                ))}
              </Stack>
            )}
          </Card>
        </Grid>

        {/* Today's Status for Employee */}
        {!isStaff && (
          <Grid item xs={12} md={4}>
            <Card sx={{ p: 2.5, height: '100%' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Today's Status</Typography>
              {todayRecord ? (
                <Stack spacing={1.5}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Check In</Typography>
                    <Typography variant="body2" fontWeight={600}>{fmtTime(todayRecord.checkIn)}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Check Out</Typography>
                    <Typography variant="body2" fontWeight={600}>{fmtTime(todayRecord.checkOut)}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary">Status</Typography>
                    <StatusChip status={todayRecord.status} />
                  </Stack>
                </Stack>
              ) : (
                <Box>
                  <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>You haven't checked in today.</Typography>
                  <Button variant="contained" fullWidth startIcon={<LoginRoundedIcon />} onClick={handleCheckIn} disabled={actionLoading}>Check In Now</Button>
                </Box>
              )}
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default Dashboard;

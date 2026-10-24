import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  Grid,
  Typography,
  Button,
  Stack,
  TextField,
  MenuItem,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import BeachAccessRoundedIcon from '@mui/icons-material/BeachAccessRounded';
import HealingRoundedIcon from '@mui/icons-material/HealingRounded';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';

import leaveApi from '../api/leaveApi';
import { useAuth } from '../context/AuthContext';
import StatusChip from '../components/StatusChip';
import ConfirmDialog from '../components/ConfirmDialog';
import { brandColors } from '../theme/theme';

export const LeaveManagement = () => {
  const { user, isAdmin, isHR, isManager } = useAuth();

  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Application Modal state
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [leaveType, setLeaveType] = useState('Annual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    leaveId: null,
    targetStatus: null,
    title: '',
    content: '',
    confirmColor: 'primary',
  });

  const canManageApprovals = isAdmin || isHR || isManager;

  // Load Leave records
  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const res = await leaveApi.getMyLeaves();
      if (res.success && res.data) {
        setLeaves(res.data);
      }
    } catch (err) {
      console.warn('Failed to load leaves:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  // Form Validation
  const validateForm = () => {
    const errs = {};
    if (!startDate) {
      errs.startDate = 'Start date is required';
    }
    if (!endDate) {
      errs.endDate = 'End date is required';
    } else if (startDate && new Date(endDate) < new Date(startDate)) {
      errs.endDate = 'End date cannot precede the start date';
    }

    if (!reason.trim()) {
      errs.reason = 'Reason for leave application is required';
    } else if (reason.trim().length < 10) {
      errs.reason = 'Please give at least 10 characters explaining your leave';
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const s = new Date(startDate);
      const eDate = new Date(endDate);
      const diffTime = Math.abs(eDate - s);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      await leaveApi.applyLeave({
        leaveType,
        startDate,
        endDate,
        totalDays: diffDays,
        reason,
      });

      setFeedback({
        type: 'success',
        message: 'Leave application submitted successfully for review.',
      });
      setApplyModalOpen(false);
      // Reset form
      setStartDate('');
      setEndDate('');
      setReason('');
      setFormErrors({});
      await fetchLeaves();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: 'Failed to submit leave application.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Open confirmation before approving / rejecting
  const promptDecision = (leaveId, targetStatus) => {
    const isApprove = targetStatus === 'Approved';
    setConfirmDialog({
      open: true,
      leaveId,
      targetStatus,
      title: isApprove ? 'Approve Leave Request?' : 'Reject Leave Request?',
      content: isApprove
        ? 'Are you sure you want to approve this leave request? This will deduct days from the employee balance.'
        : 'Are you sure you want to reject this request? The employee will be notified accordingly.',
      confirmColor: isApprove ? 'success' : 'error',
    });
  };

  const handleConfirmDecision = async () => {
    const { leaveId, targetStatus } = confirmDialog;
    try {
      await leaveApi.updateLeaveStatus(leaveId, targetStatus);
      setFeedback({
        type: 'success',
        message: `Leave request has been ${targetStatus.toLowerCase()} successfully.`,
      });
      setConfirmDialog((prev) => ({ ...prev, open: false }));
      await fetchLeaves();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: `Failed to update leave status.`,
      });
    }
  };

  // Filtered rows for DataGrid
  const filteredRows = useMemo(() => {
    return leaves.filter((item) => {
      const matchesSearch =
        item.applicantName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.leaveType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.reason?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === 'ALL' || item.status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [leaves, searchTerm, statusFilter]);

  // DataGrid Columns Definition
  const columns = [
    {
      field: 'applicantName',
      headerName: 'Employee',
      flex: 1.2,
      minWidth: 160,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600, color: brandColors.slate[900] }}>
            {params.value}
          </Typography>
          <Typography variant="caption" sx={{ color: brandColors.slate[500] }}>
            {params.row.appliedOn ? `Applied: ${params.row.appliedOn}` : ''}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'leaveType',
      headerName: 'Type',
      flex: 0.9,
      minWidth: 100,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'dates',
      headerName: 'Duration & Period',
      flex: 1.3,
      minWidth: 180,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600, color: brandColors.slate[800] }}>
            {params.row.startDate} → {params.row.endDate}
          </Typography>
          <Typography variant="caption" sx={{ color: brandColors.primary.main, fontWeight: 600 }}>
            {params.row.totalDays} Day(s)
          </Typography>
        </Box>
      ),
    },
    {
      field: 'reason',
      headerName: 'Reason',
      flex: 1.5,
      minWidth: 200,
      renderCell: (params) => (
        <Tooltip title={params.value || ''} arrow placement="top">
          <Typography variant="body2" noWrap sx={{ color: brandColors.slate[600] }}>
            {params.value}
          </Typography>
        </Tooltip>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 1,
      minWidth: 110,
      renderCell: (params) => <StatusChip status={params.value} />,
    },
    ...(canManageApprovals
      ? [
          {
            field: 'actions',
            headerName: 'Approval Actions',
            flex: 1.2,
            minWidth: 150,
            sortable: false,
            renderCell: (params) => {
              const isPending = params.row.status === 'Pending';
              if (!isPending) {
                return (
                  <Typography variant="caption" color="text.secondary">
                    {params.row.reviewedBy ? `Reviewed by ${params.row.reviewedBy}` : 'Completed'}
                  </Typography>
                );
              }
              return (
                <Stack direction="row" spacing={1}>
                  <Tooltip title="Approve Leave" arrow>
                    <IconButton
                      size="small"
                      color="success"
                      onClick={() => promptDecision(params.row.id, 'Approved')}
                      sx={{ backgroundColor: '#ecfdf5', '&:hover': { backgroundColor: '#d1fae5' } }}
                    >
                      <CheckCircleRoundedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Reject Leave" arrow>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => promptDecision(params.row.id, 'Rejected')}
                      sx={{ backgroundColor: '#fef2f2', '&:hover': { backgroundColor: '#fee2e2' } }}
                    >
                      <CancelRoundedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              );
            },
          },
        ]
      : []),
  ];

  return (
    <Box sx={{ pb: 4 }}>
      {/* Leave Balance Cards Header */}
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ p: 2.5 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  backgroundColor: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <BeachAccessRoundedIcon fontSize="medium" />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  ANNUAL VACATION LEAVE
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800 }}>
                  14 <span style={{ fontSize: '0.9rem', color: brandColors.slate[400] }}>/ 18 Days Left</span>
                </Typography>
              </Box>
            </Stack>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card sx={{ p: 2.5 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  backgroundColor: '#fffbeb',
                  color: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <EventAvailableRoundedIcon fontSize="medium" />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  CASUAL / PERSONAL LEAVE
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800 }}>
                  6 <span style={{ fontSize: '0.9rem', color: brandColors.slate[400] }}>/ 10 Days Left</span>
                </Typography>
              </Box>
            </Stack>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card sx={{ p: 2.5 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  backgroundColor: '#ecfdf5',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <HealingRoundedIcon fontSize="medium" />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  MEDICAL / SICK LEAVE
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800 }}>
                  9 <span style={{ fontSize: '0.9rem', color: brandColors.slate[400] }}>/ 12 Days Left</span>
                </Typography>
              </Box>
            </Stack>
          </Card>
        </Grid>
      </Grid>

      {/* Main Leave Table Card */}
      <Card sx={{ p: 2.5 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={2}
          sx={{ mb: 2.5 }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Leave Applications & Status
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Submit time-off requests, monitor approval workflows, and review department history
            </Typography>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            <TextField
              size="small"
              placeholder="Search applicant, reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon fontSize="small" sx={{ color: brandColors.slate[400] }} />
                  </InputAdornment>
                ),
              }}
              sx={{ width: { xs: '100%', sm: 220 } }}
            />

            <TextField
              select
              size="small"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{ width: { xs: '100%', sm: 140 } }}
            >
              <MenuItem value="ALL">All Status</MenuItem>
              <MenuItem value="Pending">Pending</MenuItem>
              <MenuItem value="Approved">Approved</MenuItem>
              <MenuItem value="Rejected">Rejected</MenuItem>
            </TextField>

            <Button
              variant="contained"
              startIcon={<AddCircleOutlineRoundedIcon />}
              onClick={() => setApplyModalOpen(true)}
              sx={{ whiteSpace: 'nowrap', fontWeight: 700 }}
            >
              Apply for Leave
            </Button>
          </Stack>
        </Stack>

        <Box sx={{ width: '100%', height: 440 }}>
          <DataGrid
            rows={filteredRows}
            columns={columns}
            loading={loading}
            pageSizeOptions={[5, 10, 20]}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
            }}
            disableRowSelectionOnClick
            autoHeight={false}
          />
        </Box>
      </Card>

      {/* Apply Leave Modal Dialog */}
      <Dialog
        open={applyModalOpen}
        onClose={() => !submitting && setApplyModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          Apply for Workplace Leave
          <Typography variant="caption" sx={{ display: 'block', color: brandColors.slate[500], mt: 0.5 }}>
            Submit your time-off request for supervisor and HR review.
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ pt: 2 }}>
          <Box component="form" onSubmit={handleApplySubmit} noValidate>
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.75 }}>
                  Leave Classification Type
                </Typography>
                <TextField
                  select
                  fullWidth
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                >
                  <MenuItem value="Annual">Annual / Vacation Leave (Paid)</MenuItem>
                  <MenuItem value="Casual">Casual / Personal Leave (Paid)</MenuItem>
                  <MenuItem value="Sick">Sick / Medical Leave (Paid)</MenuItem>
                </TextField>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.75 }}>
                    Start Date
                  </Typography>
                  <TextField
                    type="date"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    error={Boolean(formErrors.startDate)}
                    helperText={formErrors.startDate}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.75 }}>
                    End Date
                  </Typography>
                  <TextField
                    type="date"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    error={Boolean(formErrors.endDate)}
                    helperText={formErrors.endDate}
                  />
                </Grid>
              </Grid>

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.75 }}>
                  Reason for Request
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="Provide brief context for your supervisor..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  error={Boolean(formErrors.reason)}
                  helperText={formErrors.reason}
                />
              </Box>
            </Stack>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            variant="outlined"
            onClick={() => setApplyModalOpen(false)}
            disabled={submitting}
            color="inherit"
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleApplySubmit}
            disabled={submitting}
            sx={{ fontWeight: 700 }}
          >
            {submitting ? 'Submitting...' : 'Submit Application'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog for Approvals / Rejections */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        content={confirmDialog.content}
        confirmText={confirmDialog.targetStatus === 'Approved' ? 'Yes, Approve' : 'Yes, Reject'}
        confirmColor={confirmDialog.confirmColor}
        type={confirmDialog.targetStatus === 'Approved' ? 'success' : 'danger'}
        onConfirm={handleConfirmDecision}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
      />

      {/* Feedback Toast */}
      <Snackbar
        open={Boolean(feedback)}
        autoHideDuration={4000}
        onClose={() => setFeedback(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setFeedback(null)}
          severity={feedback?.type || 'info'}
          variant="filled"
          sx={{ width: '100%', borderRadius: 2 }}
        >
          {feedback?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default LeaveManagement;

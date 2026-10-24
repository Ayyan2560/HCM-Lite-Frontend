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
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Paper,
  Tooltip,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';

import userRoutes from '../api/userRoutes';
import { useAuth } from '../context/AuthContext';
import StatusChip from '../components/StatusChip';
import { brandColors } from '../theme/theme';

export const EmployeeDirectory = () => {
  const { isAdmin, isHR } = useAuth();

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');

  // Selected Employee Details Modal
  const [selectedEmp, setSelectedEmp] = useState(null);

  // Fetch employees
  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await userRoutes.getUsers();
      if (res.success && res.data) {
        setEmployees(res.data);
      }
    } catch (err) {
      console.warn('Failed to load employees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Department options
  const departments = useMemo(() => {
    const set = new Set(employees.map((e) => e.department).filter(Boolean));
    return Array.from(set);
  }, [employees]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch =
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.designation?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDept =
        departmentFilter === 'ALL' || emp.department === departmentFilter;

      return matchesSearch && matchesDept;
    });
  }, [employees, searchTerm, departmentFilter]);

  // Columns for DataGrid
  const columns = [
    {
      field: 'name',
      headerName: 'Employee',
      flex: 1.5,
      minWidth: 200,
      renderCell: (params) => (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar src={params.row.avatar} sx={{ width: 36, height: 36 }}>
            {params.value?.charAt(0)}
          </Avatar>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, color: brandColors.slate[900] }}>
              {params.value}
            </Typography>
            <Typography variant="caption" sx={{ color: brandColors.slate[500] }}>
              {params.row.email}
            </Typography>
          </Box>
        </Stack>
      ),
    },
    {
      field: 'department',
      headerName: 'Department',
      flex: 1.2,
      minWidth: 150,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ color: brandColors.slate[700] }}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'designation',
      headerName: 'Designation / Title',
      flex: 1.3,
      minWidth: 170,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontWeight: 500, color: brandColors.slate[800] }}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'role',
      headerName: 'Role',
      flex: 0.9,
      minWidth: 100,
      renderCell: (params) => (
        <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: brandColors.primary.main }}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 1,
      minWidth: 110,
      renderCell: (params) => <StatusChip status={params.value} />,
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 0.8,
      minWidth: 90,
      sortable: false,
      renderCell: (params) => (
        <Tooltip title="View Profile Dossier" arrow>
          <IconButton
            size="small"
            color="primary"
            onClick={() => setSelectedEmp(params.row)}
            sx={{ backgroundColor: brandColors.primary.subtle }}
          >
            <VisibilityRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  return (
    <Box sx={{ pb: 4 }}>
      {/* Directory Stats Header */}
      <Card sx={{ p: 2.5, mb: 3.5 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  backgroundColor: brandColors.primary.subtle,
                  color: brandColors.primary.main,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <PeopleAltRoundedIcon fontSize="medium" />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  ACTIVE DIRECTORY
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  {employees.length} Team Members
                </Typography>
              </Box>
            </Stack>
          </Grid>
          <Grid item xs={12} sm={8}>
            <Typography variant="body2" color="text.secondary">
              The enterprise directory provides synchronized corporate contact cards, organizational hierarchy, department mapping, and operational status across offices.
            </Typography>
          </Grid>
        </Grid>
      </Card>

      {/* Directory Table Card */}
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
              Staff & Team Roster
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Search by name, email, or department designation
            </Typography>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            <TextField
              size="small"
              placeholder="Search employee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon fontSize="small" sx={{ color: brandColors.slate[400] }} />
                  </InputAdornment>
                ),
              }}
              sx={{ width: { xs: '100%', sm: 240 } }}
            />

            <TextField
              select
              size="small"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              sx={{ width: { xs: '100%', sm: 180 } }}
            >
              <MenuItem value="ALL">All Departments</MenuItem>
              {departments.map((dept) => (
                <MenuItem key={dept} value={dept}>
                  {dept}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </Stack>

        <Box sx={{ width: '100%', height: 460 }}>
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

      {/* Employee Details Modal Dossier */}
      <Dialog
        open={Boolean(selectedEmp)}
        onClose={() => setSelectedEmp(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          Employee Profile Dossier
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {selectedEmp && (
            <Box>
              <Stack direction="row" spacing={2.5} alignItems="center" sx={{ mb: 3 }}>
                <Avatar
                  src={selectedEmp.avatar}
                  sx={{ width: 68, height: 68, border: `2px solid ${brandColors.primary.main}` }}
                >
                  {selectedEmp.name?.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    {selectedEmp.name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: brandColors.primary.main, fontWeight: 600 }}>
                    {selectedEmp.designation} • {selectedEmp.department}
                  </Typography>
                  <Box sx={{ mt: 0.75 }}>
                    <StatusChip status={selectedEmp.status} />
                  </Box>
                </Box>
              </Stack>

              <Divider sx={{ my: 2 }} />

              <Stack spacing={2}>
                <Paper elevation={0} sx={{ p: 2, backgroundColor: brandColors.slate[50], borderRadius: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <EmailOutlinedIcon sx={{ fontSize: 18, color: brandColors.slate[500] }} />
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {selectedEmp.email}
                        </Typography>
                      </Stack>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <PhoneOutlinedIcon sx={{ fontSize: 18, color: brandColors.slate[500] }} />
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {selectedEmp.phone || '+1 (555) 000-0000'}
                        </Typography>
                      </Stack>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <LocationOnOutlinedIcon sx={{ fontSize: 18, color: brandColors.slate[500] }} />
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {selectedEmp.location || 'Headquarters'}
                        </Typography>
                      </Stack>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <CalendarMonthOutlinedIcon sx={{ fontSize: 18, color: brandColors.slate[500] }} />
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          Joined: {selectedEmp.joinDate}
                        </Typography>
                      </Stack>
                    </Grid>
                  </Grid>
                </Paper>

                {(isAdmin || isHR) && selectedEmp.salary && (
                  <Paper elevation={0} sx={{ p: 2, backgroundColor: '#eff6ff', borderRadius: 2, border: '1px solid #bfdbfe' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="caption" sx={{ color: '#1e40af', fontWeight: 700 }}>
                          AUTHORIZED COMPENSATION VIEW
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e3a8a' }}>
                          ${selectedEmp.salary.toLocaleString()} / year
                        </Typography>
                      </Box>
                      <Typography variant="caption" sx={{ color: '#1e40af' }}>
                        Base Annual Package
                      </Typography>
                    </Stack>
                  </Paper>
                )}
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="contained" onClick={() => setSelectedEmp(null)}>
            Close Dossier
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EmployeeDirectory;

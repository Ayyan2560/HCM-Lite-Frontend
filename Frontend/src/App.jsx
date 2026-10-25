import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, CircularProgress, Box } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

import { theme } from './theme/theme';
import { AuthProvider } from './context/AuthContext';
import { SnackbarProvider } from './context/SnackbarContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';

import Login from './pages/Login';
import SetupPage from './pages/SetupPage';
import ChangePasswordPage from './pages/ChangePasswordPage';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Attendance = lazy(() => import('./pages/Attendance'));
const LeaveManagement = lazy(() => import('./pages/LeaveManagement'));
const EmployeeDirectory = lazy(() => import('./pages/EmployeeDirectory'));
const Payroll = lazy(() => import('./pages/Payroll'));
const Profile = lazy(() => import('./pages/Profile'));
const OrganizationPage = lazy(() => import('./pages/OrganizationPage'));
const AiAssistantPage = lazy(() => import('./pages/AiAssistantPage'));
const AnnouncementsPage = lazy(() => import('./pages/AnnouncementsPage'));
const AuditPage = lazy(() => import('./pages/AuditPage'));
const PayslipsPage = lazy(() => import('./pages/PayslipsPage'));

const Loader = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
    <CircularProgress />
  </Box>
);

export const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <AuthProvider>
          <SnackbarProvider>
            <BrowserRouter>
              <Suspense fallback={<Loader />}>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/setup" element={<SetupPage />} />
                  <Route path="/change-password" element={<ChangePasswordPage />} />

                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <DashboardLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<Dashboard />} />
                    <Route path="attendance" element={<Attendance />} />
                    <Route path="leaves" element={<LeaveManagement />} />
                    <Route path="employees" element={<EmployeeDirectory />} />
                    <Route path="payroll" element={
                      <ProtectedRoute allowedRoles={['admin', 'hr']}>
                        <Payroll />
                      </ProtectedRoute>
                    } />
                    <Route path="payslips" element={<PayslipsPage />} />
                    <Route path="profile" element={<Profile />} />
                    <Route path="organization" element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <OrganizationPage />
                      </ProtectedRoute>
                    } />
                    <Route path="ai" element={<AiAssistantPage />} />
                    <Route path="announcements" element={<AnnouncementsPage />} />
                    <Route path="audit" element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <AuditPage />
                      </ProtectedRoute>
                    } />
                  </Route>

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </SnackbarProvider>
        </AuthProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
};

export default App;

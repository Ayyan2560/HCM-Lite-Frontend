import { Route, Routes } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import SetupPage from './pages/SetupPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import DashboardPage from './pages/DashboardPage';
import EmployeesPage from './pages/EmployeesPage';
import EmployeeFormPage from './pages/EmployeeFormPage';
import EmployeeDetailPage from './pages/EmployeeDetailPage';
import AttendancePage from './pages/AttendancePage';
import LeavePage from './pages/LeavePage';
import PayrollPage from './pages/PayrollPage';
import PayrollDetailPage from './pages/PayrollDetailPage';
import PayslipsPage from './pages/PayslipsPage';
import ProfilePage from './pages/ProfilePage';
import OrganizationPage from './pages/OrganizationPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import NotificationsPage from './pages/NotificationsPage';
import AuditPage from './pages/AuditPage';
import AIAssistantPage from './pages/AIAssistantPage'

import NotFoundPage from './pages/NotFoundPage';

function StaffRoute({ children }) {
  return <ProtectedRoute allowedRoles={['admin', 'hr']}>{children}</ProtectedRoute>;
}

function AdminRoute({ children }) {
  return <ProtectedRoute allowedRoles={['admin']}>{children}</ProtectedRoute>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/setup" element={<SetupPage />} />
      <Route
        path="/change-password"
        element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>}
      />

      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="employees" element={<StaffRoute><EmployeesPage /></StaffRoute>} />
        <Route path="employees/new" element={<StaffRoute><EmployeeFormPage /></StaffRoute>} />
        <Route path="employees/:id" element={<StaffRoute><EmployeeDetailPage /></StaffRoute>} />
        <Route path="employees/:id/edit" element={<StaffRoute><EmployeeFormPage /></StaffRoute>} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="leave" element={<LeavePage />} />
        <Route path="payroll" element={<StaffRoute><PayrollPage /></StaffRoute>} />
        <Route path="payroll/:id" element={<StaffRoute><PayrollDetailPage /></StaffRoute>} />
        <Route path="payslips" element={<PayslipsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="organization" element={<AdminRoute><OrganizationPage /></AdminRoute>} />
        <Route path="announcements" element={<AnnouncementsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="audit" element={<AdminRoute><AuditPage /></AdminRoute>} />
        <Route path="ai" element={<AIAssistantPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

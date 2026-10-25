# HCM Lite — Enterprise Human Capital Management (Frontend)

HCM Lite is an enterprise-grade SaaS Human Capital Management web application built with **React**, **Vite**, and **Material UI (MUI)**. It delivers a refined, commercial SaaS interface with real-time biometric time-tracking, self-service leave management with approval workflows, an interactive employee directory, automated payroll register administration, and personal profile dossiers.

---

## 🚀 Key Features

1. **Authentication & Session Management**
   - Split-screen corporate login with demo pre-fill credentials for Admin and Employee roles.
   - Comprehensive registration with input validation and password visibility toggles.
   - Centralized `AuthContext` with role checking (`isAdmin`, `isHR`, `isManager`) and session management.
   - Configured with `withCredentials: true` for enterprise HTTP-only cookie authentication. Never relies on insecure `localStorage` tokens.

2. **Executive Dashboard**
   - KPI Stat Cards: Total Headcount, Present Today, Pending Leave Applications, and Average Shift Duration.
   - Quick Biometric & Web Time-Clock punch widget with instant status updates.
   - **MUI X-Charts**:
     - Interactive Weekly Attendance Bar Chart (Present vs. Late vs. On Leave).
     - Leave Distribution Donut Chart with hover highlighting.
   - Pending Approvals quick-action cards for managers and HR.
   - Live activity feed and corporate announcements drawer.

3. **Attendance & Time Tracking**
   - Daily punch-in and punch-out action controls.
   - Dynamic shift calculations and overtime policy alerts.
   - Date-wise historical attendance records table powered by **MUI X DataGrid**.
   - Search by date/location and filter by presence status (Present, Late, Half Day, On Leave).

4. **Leave Management & Approval Pipelines**
   - Leave entitlement balance cards (Annual, Casual, Sick leaves).
   - Application modal with client-side date validation (prevents end date preceding start date).
   - Filterable data grid of leave requests with status badges (Pending, Approved, Rejected).
   - Authorized manager/HR one-click approval and rejection actions with confirmation dialogs.

5. **Employee Directory**
   - Searchable, sortable staff roster with department filters.
   - Interactive employee profile dossier dialog with contact details, tenure, and authorized compensation views.

6. **Payroll Administration**
   - Payroll period selector (e.g. October 2026, September 2026).
   - Compensation metrics: Total Monthly Payroll Cost, Processed Accounts count, and Average Net Salary.
   - Full disbursement register DataGrid with present days, late deductions, basic salary, and net salary.
   - "Generate Payroll" action for Admin/HR with confirmation dialog and status updating.

7. **User Profile & Account Settings**
   - Live avatar upload preview with file size validation.
   - Editable personal info, contact telephone, office location, and professional bio.
   - Read-only organizational metadata (Department, Designation, Join Date, Employee ID).

8. **Offline Demo Fallback Mode**
   - When the backend API is disconnected, HCM Lite seamlessly operates in an interactive demo mode. All actions (check-ins, leave applications, approvals, payroll generation, profile updates) function smoothly with simulated responses, clearly tagged with a subtle status badge so users are never misled.

---

## 🛠️ Technology Stack

- **React 18** (Vite build engine)
- **Material UI (MUI v6)** (`@mui/material`, `@emotion/react`, `@emotion/styled`)
- **MUI Icons** (`@mui/icons-material`)
- **MUI X DataGrid** (`@mui/x-data-grid`)
- **MUI X Charts** (`@mui/x-charts`)
- **MUI X Date Pickers & Dayjs** (`@mui/x-date-pickers`, `dayjs`)
- **React Router DOM v6**
- **Axios** (with `withCredentials: true`)

---

## 📂 Project Architecture

```
src/
├── api/
│   ├── axios.js           # Reusable Axios instance with base URL & interceptors
│   ├── authApi.js         # Authentication endpoints (login, signup, logout, me)
│   ├── attendanceApi.js   # Attendance endpoints (check-in, check-out, my-logs)
│   ├── leaveApi.js        # Leave management endpoints (apply, my-leaves, status)
│   ├── userRoutes.js      # User directory and profile update endpoints
│   ├── userApi.js         # Alias export for userRoutes
│   └── payrollApi.js      # Payroll summary and generation endpoints
├── components/
│   ├── ConfirmDialog.jsx  # Reusable modal confirmation for approvals/generation
│   ├── DashboardLayout.jsx# Responsive app shell with navigation & mobile drawer
│   ├── Navbar.jsx         # Header bar with notifications, profile menu & status pill
│   ├── ProtectedRoute.jsx # Role-based router protection and unauthorized fallback
│   ├── Sidebar.jsx        # Dark navy collapsible navigation sidebar
│   ├── StatCard.jsx       # Metric cards with trend badges & icons
│   └── StatusChip.jsx     # Consistent status badge styling
├── context/
│   └── AuthContext.jsx    # React Context for authentication and permissions
├── data/
│   └── mockData.js        # Realistic simulation data for offline demo preview
├── pages/
│   ├── Attendance.jsx     # Daily time tracking and historical logs
│   ├── Dashboard.jsx      # Main executive dashboard with charts and widgets
│   ├── EmployeeDirectory.jsx # Staff directory and profile dossiers
│   ├── LeaveManagement.jsx # Leave balances, application form, and approvals
│   ├── Login.jsx          # Enterprise sign-in with demo pre-fills
│   ├── Payroll.jsx        # Monthly salary register and payroll generation
│   ├── Profile.jsx        # Employee profile and avatar upload
│   └── Signup.jsx         # New employee/company account creation
├── theme/
│   └── theme.js           # Custom MUI theme (palette, typography, shadows, overrides)
├── App.jsx                # Application root with routing & theme providers
└── main.jsx               # Entry point mounting React to DOM
```

---

## 💻 Running the Application

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create a `.env` file based on `.env.example`:
```bash
VITE_API_URL=http://localhost:5000
```

### 3. Start Development Server
```bash
npm run dev
```
The application will launch at `http://localhost:3000`.

### 4. Build for Production
```bash
npm run build
```
Creates an optimized production bundle in the `dist/` directory.

### 5. Preview Production Build
```bash
npm run preview
```

---

## 🔐 Demo Credentials

When the backend API server is disconnected, you can explore the application using any credentials or the pre-fill buttons on the login page:

| Role | Email | Password | Access |
|---|---|---|---|
| **Admin** | `alexander.m@hcmlite.com` | `Password@123` | Full access (Dashboard, Attendance, Leaves, Directory, Payroll) |
| **Employee** | `elena.r@hcmlite.com` | `Password@123` | Personal portal (Dashboard, Attendance, Leaves, Directory, Profile) |

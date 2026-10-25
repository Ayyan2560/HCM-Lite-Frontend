import {
  LayoutDashboard, UsersRound, Clock3, CalendarDays, WalletCards, ReceiptText,
  UserRound, Building2, Megaphone, ScrollText, Sparkles, Bell,
} from 'lucide-react';

export function buildNavigation({ isAdmin, isHr, isEmployee, hasEmployeeProfile }) {
  const staff = isAdmin || isHr;
  return [
    {
      label: 'Workspace',
      items: [
        { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
        ...(staff ? [{ to: '/employees', label: 'Employees', icon: UsersRound }] : []),
        { to: '/attendance', label: 'Attendance', icon: Clock3 },
        { to: '/leave', label: 'Leave', icon: CalendarDays },
      ],
    },
    {
      label: 'Finance',
      items: [
        ...(staff ? [{ to: '/payroll', label: 'Payroll', icon: WalletCards }] : []),
        ...(hasEmployeeProfile ? [{ to: '/payslips', label: 'My payslips', icon: ReceiptText }] : []),
      ],
    },
    {
      label: 'Company',
      items: [
        { to: '/announcements', label: 'Announcements', icon: Megaphone },
        { to: '/ai', label: 'Assistant', icon: Sparkles },
      ],
    },
    {
      label: 'Administration',
      items: [
        ...(isAdmin ? [{ to: '/organization', label: 'Organization', icon: Building2 }] : []),
        ...(isAdmin ? [{ to: '/audit', label: 'Audit log', icon: ScrollText }] : []),
        { to: '/notifications', label: 'Notifications', icon: Bell },
        { to: '/profile', label: 'My profile', icon: UserRound },
      ],
    },
  ].filter((section) => section.items.length > 0);
}

export const PAGE_TITLES = {
  '/': 'Overview',
  '/employees': 'Employees',
  '/employees/new': 'Add employee',
  '/attendance': 'Attendance',
  '/leave': 'Leave',
  '/payroll': 'Payroll',
  '/payslips': 'My payslips',
  '/profile': 'My profile',
  '/organization': 'Organization',
  '/announcements': 'Announcements',
  '/notifications': 'Notifications',
  '/audit': 'Audit log',
  '/ai': 'Assistant',
  '/change-password': 'Change password',
};

export const ROLE_LABELS = {
  admin: 'Administrator',
  hr: 'Human Resources',
  employee: 'Employee',
};

export const LEAVE_TYPE_LABELS = {
  annual: 'Annual leave',
  sick: 'Sick leave',
  casual: 'Casual leave',
  unpaid: 'Unpaid leave',
};

export const LEAVE_STATUS_LABELS = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export const ATTENDANCE_STATUS_LABELS = {
  present: 'Present',
  late: 'Late',
  half_day: 'Half day',
  missing_checkout: 'Missing check-out',
  absent: 'Absent',
  leave: 'On leave',
  non_working: 'Non-working',
  upcoming: 'Upcoming',
  not_joined: 'Not joined',
};

export const PAYROLL_STATUS_LABELS = {
  draft: 'Draft',
  finalized: 'Finalized',
};

export const EMPLOYMENT_TYPE_LABELS = {
  'full-time': 'Full-time',
  'part-time': 'Part-time',
  contract: 'Contract',
};

export const WEEKDAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
];

export const ANNOUNCEMENT_CATEGORIES = ['general', 'policy', 'payroll', 'event'];

export const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrator' },
  { value: 'hr', label: 'HR' },
  { value: 'employee', label: 'Employee' },
];

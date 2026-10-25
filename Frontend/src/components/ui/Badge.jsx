import { ATTENDANCE_STATUS_LABELS, LEAVE_STATUS_LABELS, PAYROLL_STATUS_LABELS } from '../../lib/constants';

const LABELS = {
  ...LEAVE_STATUS_LABELS,
  ...ATTENDANCE_STATUS_LABELS,
  ...PAYROLL_STATUS_LABELS,
  active: 'Active',
  inactive: 'Inactive',
  unlimited: 'Unlimited',
  general: 'General',
  policy: 'Policy',
  event: 'Event',
  'full-time': 'Full-time',
  'part-time': 'Part-time',
  contract: 'Contract',
  admin: 'Admin',
  hr: 'HR',
  employee: 'Employee',
};

const CLASS_MAP = {
  present: 'success',
  active: 'success',
  approved: 'success',
  finalized: 'success',
  unlimited: 'success',
  late: 'warning',
  pending: 'warning',
  draft: 'warning',
  half_day: 'info',
  leave: 'info',
  policy: 'info',
  event: 'info',
  missing_checkout: 'danger',
  rejected: 'danger',
  absent: 'danger',
  inactive: 'neutral',
  cancelled: 'neutral',
  non_working: 'neutral',
  upcoming: 'neutral',
  not_joined: 'neutral',
  general: 'neutral',
  admin: 'brand',
  hr: 'brand',
  payroll: 'brand',
  contract: 'neutral',
  'part-time': 'neutral',
  'full-time': 'success',
};

export default function Badge({ status, label, tone, dot = true, className = '' }) {
  const key = String(status || '').toLowerCase();
  const toneClass = tone || CLASS_MAP[key] || 'neutral';
  return (
    <span className={`badge badge-${toneClass} ${className}`.trim()}>
      {dot && <span className="badge-dot" aria-hidden="true" />}
      {label || LABELS[key] || status || '—'}
    </span>
  );
}

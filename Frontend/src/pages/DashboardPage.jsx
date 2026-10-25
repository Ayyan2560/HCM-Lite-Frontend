import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Building2, CalendarDays, ClipboardCheck, Clock3, Megaphone,
  Plus, ReceiptText, ShieldCheck, UsersRound, WalletCards,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import Badge from '../components/ui/Badge';
import Avatar from '../components/ui/Avatar';
import TrendChart from '../components/ui/TrendChart';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import { StatSkeleton, TableSkeleton, Skeleton } from '../components/ui/Skeleton';
import BalanceCards from '../components/leave/BalanceCards';
import PunchCard from '../components/attendance/PunchCard';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import dashboardApi from '../api/dashboard';
import leavesApi from '../api/leaves';
import attendanceApi from '../api/attendance';
import { getErrorMessage } from '../api/client';
import { getAttendanceLocation } from '../lib/browser';
import {
  formatDate, formatDateLong, formatDuration, formatMoney, formatNumber,
  monthStartKey, relativeTime, todayKey,
} from '../lib/format';
import { LEAVE_TYPE_LABELS } from '../lib/constants';

function greeting(timezone) {
  let hour = new Date().getHours();
  try {
    hour = Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: timezone }).format(new Date()));
  } catch {
    // Browser local hour is a reasonable fallback.
  }
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, employee, organization, isStaff, isAdmin, isHr } = useAuth();
  const [data, setData] = useState(null);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingError, setPendingError] = useState('');
  const [punchBusy, setPunchBusy] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const timezone = organization?.timezone;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setPendingError('');
    try {
      if (isStaff) {
        const [overviewResult, leavesResult] = await Promise.allSettled([
          dashboardApi.overview({
            from: monthStartKey(timezone),
            to: todayKey(timezone),
          }),
          leavesApi.list({ status: 'pending', limit: 4, page: 1 }),
        ]);
        if (!mounted.current) return;
        if (overviewResult.status === 'fulfilled') {
          setData(overviewResult.value);
        } else {
          setError(getErrorMessage(overviewResult.reason, 'The dashboard could not be loaded.'));
        }
        if (leavesResult.status === 'fulfilled') {
          setPendingLeaves(leavesResult.value.items || []);
        } else {
          setPendingError(getErrorMessage(leavesResult.reason, 'Pending approvals could not be loaded.'));
        }
      } else {
        const result = await dashboardApi.me();
        if (mounted.current) setData(result);
      }
    } catch (err) {
      if (mounted.current) setError(getErrorMessage(err, 'The dashboard could not be loaded.'));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [isStaff, timezone]);

  useEffect(() => { load(); }, [load]);

  const handleAttendance = async (mode) => {
    setPunchBusy(true);
    try {
      const location = await getAttendanceLocation(organization);
      const result = mode === 'in'
        ? await attendanceApi.checkIn(location)
        : await attendanceApi.checkOut(location);
      toast.success(
        mode === 'in'
          ? `Checked in at ${result.checkIn ? new Date(result.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'the current time'}.`
          : `Checked out. Worked ${formatDuration(result.workedMinutes)} today.`,
      );
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, `${mode === 'in' ? 'Check-in' : 'Check-out'} failed.`));
    } finally {
      setPunchBusy(false);
    }
  };

  if (loading) {
    return (
      <div>
        <Skeleton width="280px" height="28px" />
        <Skeleton width="380px" height="12px" className="mt-8" />
        <div className="stat-grid mt-24">
          {Array.from({ length: 4 }).map((_, index) => <StatSkeleton key={index} />)}
        </div>
        <div className="dash-grid mt-24">
          <div className="card"><div className="card-body"><TableSkeleton rows={6} /></div></div>
          <div className="card"><div className="card-body"><TableSkeleton rows={4} columns={3} /></div></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Overview" description="Your workspace at a glance." />
        <ErrorState message={error} onRetry={load} title="Dashboard unavailable" />
      </div>
    );
  }

  return isStaff ? (
    <StaffDashboard
      data={data}
      pendingLeaves={pendingLeaves}
      pendingError={pendingError}
      userName={user?.name}
      organization={organization}
      isAdmin={isAdmin}
      isHr={isHr}
      navigate={navigate}
      refresh={load}
    />
  ) : (
    <EmployeeDashboard
      data={data}
      employee={employee}
      organization={organization}
      userName={user?.name}
      punchBusy={punchBusy}
      onCheckIn={() => handleAttendance('in')}
      onCheckOut={() => handleAttendance('out')}
      navigate={navigate}
      refresh={load}
    />
  );
}

function StaffDashboard({ data, pendingLeaves, pendingError, userName, organization, isAdmin, isHr, navigate }) {
  const today = data?.today || {};
  const payroll = data?.payroll?.[0];
  const rate = today.attendanceRate;
  const greetingText = greeting(organization?.timezone);

  const quickActions = [
    { label: 'Add employee', description: 'Create a profile and login', icon: Plus, to: '/employees/new', show: true },
    { label: 'Review leave', description: `${data?.pending?.leaves || 0} awaiting a decision`, icon: CalendarDays, to: '/leave', show: true },
    { label: 'Run payroll', description: 'Generate or inspect a draft', icon: WalletCards, to: '/payroll', show: isAdmin || isHr },
    { label: isAdmin ? 'Organization' : 'Announcements', description: isAdmin ? 'Policy and workspace settings' : 'Share a company update', icon: isAdmin ? Building2 : Megaphone, to: isAdmin ? '/organization' : '/announcements', show: true },
  ].filter((item) => item.show);

  return (
    <div>
      <section className="dash-hero">
        <div className="dash-hero-copy">
          <p className="dash-hero-eyebrow">{formatDateLong(data?.today?.date || todayKey(organization?.timezone))}</p>
          <h1>{greetingText}, {userName?.split(' ')[0] || 'there'}.</h1>
          <p>
            Here is the operating picture for {organization?.name || 'your company'} — live attendance,
            pending decisions and the latest payroll run.
          </p>
        </div>
        <div className="dash-hero-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/attendance')}>
            <ClipboardCheck size={15} /> Attendance
          </button>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/leave')}>
            Review leave <ArrowRight size={15} />
          </button>
        </div>
      </section>

      <div className="stat-grid">
        <StatCard
          icon={UsersRound}
          label="Active headcount"
          value={formatNumber(data?.headcount)}
          meta="Company"
          tone="brand"
          footer="Active employee records"
        />
        <StatCard
          icon={Clock3}
          label="Attendance today"
          value={rate === null || rate === undefined ? '—' : `${rate}%`}
          meta="Today"
          tone="success"
          footer={`${today.present || 0} present · ${today.late || 0} late · ${today.onLeave || 0} on leave`}
        />
        <StatCard
          icon={CalendarDays}
          label="Pending decisions"
          value={formatNumber((data?.pending?.leaves || 0) + (data?.pending?.corrections || 0))}
          meta="Action needed"
          tone="warning"
          footer={`${data?.pending?.leaves || 0} leave · ${data?.pending?.corrections || 0} attendance corrections`}
        />
        <StatCard
          icon={WalletCards}
          label="Latest payroll net"
          value={payroll ? formatMoney(payroll.totals?.net, payroll.currency) : '—'}
          meta={payroll ? (payroll.status === 'finalized' ? 'Finalized' : 'Draft') : 'No runs'}
          tone="violet"
          footer={payroll ? `${payroll.period} · ${formatNumber(payroll.totals?.employees)} employees` : 'No payroll run generated yet'}
        />
      </div>

      <div className="dash-grid mt-24">
        <div className="dash-stack">
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Attendance trend</h2>
                <p className="card-description">Daily attendance rate for {formatDate(data?.scope?.from)} – {formatDate(data?.scope?.to)}.</p>
              </div>
              <div className="chart-legend">
                <span><i className="legend-swatch" /> Attendance rate</span>
              </div>
            </div>
            <div className="card-body">
              <TrendChart points={data?.trend || []} />
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Pending leave requests</h2>
                <p className="card-description">Requests waiting for an HR or administrator decision.</p>
              </div>
              <button type="button" className="text-button" onClick={() => navigate('/leave')}>Open leave <ArrowRight size={14} /></button>
            </div>
            <div className="card-body">
              {pendingError && <div className="notice-item">{pendingError}</div>}
              {!pendingError && pendingLeaves.length === 0 && (
                <EmptyState compact icon={CalendarDays} title="No pending requests" message="Every leave request has been reviewed." />
              )}
              {!pendingError && pendingLeaves.length > 0 && (
                <div className="approval-list">
                  {pendingLeaves.map((leave) => (
                    <div className="approval-row" key={leave.id}>
                      <Avatar name={leave.employee?.name || 'Employee'} size="sm" />
                      <div className="approval-copy">
                        <strong>{leave.employee?.name || 'Employee'}</strong>
                        <span>{LEAVE_TYPE_LABELS[leave.type] || leave.type} · {formatDate(leave.startDate)} – {formatDate(leave.endDate)}</span>
                      </div>
                      <div className="approval-side">
                        <Badge status="pending" />
                        <small>{leave.days} day{leave.days === 1 ? '' : 's'}</small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="card-footer" style={{ textAlign: 'right' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('/leave')}>Review all requests</button>
            </div>
          </div>
        </div>

        <div className="dash-stack">
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Departments</h2>
                <p className="card-description">Headcount and attendance for the selected period.</p>
              </div>
            </div>
            <div className="card-body">
              {(data?.departments || []).length === 0 ? (
                <EmptyState compact icon={UsersRound} title="No departments yet" message="Add employees to start seeing the breakdown." />
              ) : (
                <div className="dept-list">
                  {data.departments.map((department) => {
                    const total = Math.max(1, ...(data.departments || []).map((item) => item.headcount));
                    return (
                      <div key={department.department}>
                        <div className="dept-row-head">
                          <strong>{department.department}</strong>
                          <span>{department.headcount} people</span>
                        </div>
                        <div className="dept-bar"><span style={{ width: `${Math.max(6, (department.headcount / total) * 100)}%` }} /></div>
                        <small>{department.attendanceRate === null ? 'No working days yet' : `${department.attendanceRate}% attendance · ${department.onLeave} on leave`}</small>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Payroll snapshot</h2>
                <p className="card-description">The three most recent payroll periods.</p>
              </div>
              <button type="button" className="text-button" onClick={() => navigate('/payroll')}>Open <ArrowRight size={14} /></button>
            </div>
            <div className="card-body">
              {(data?.payroll || []).length === 0 ? (
                <EmptyState compact icon={WalletCards} title="No payroll runs" message="Generate a draft when the period is ready." />
              ) : (
                <div className="snapshot-list">
                  {data.payroll.map((run) => (
                    <button
                      type="button"
                      className="snapshot-row"
                      key={run.id}
                      onClick={() => navigate(`/payroll/${run.id}`)}
                      style={{ textAlign: 'left', cursor: 'pointer' }}
                    >
                      <div className="snapshot-row-copy">
                        <strong>{run.period}</strong>
                        <span>{run.totals?.employees || 0} employees · {run.status === 'finalized' ? 'Locked' : 'Editable draft'}</span>
                      </div>
                      <div className="snapshot-row-value">
                        <strong>{formatMoney(run.totals?.net, run.currency)}</strong>
                        <Badge status={run.status} />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Shortcuts</h2>
                <p className="card-description">The tasks most often needed from here.</p>
              </div>
            </div>
            <div className="card-body">
              <div className="quick-grid">
                {quickActions.map((action) => (
                  <button type="button" className="quick-tile" key={action.label} onClick={() => navigate(action.to)}>
                    <span className="quick-tile-icon"><action.icon size={15} /></span>
                    <span>
                      <strong>{action.label}</strong>
                      <span>{action.description}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card mt-24">
        <div className="card-header">
          <div>
            <h2 className="card-title">Company announcements</h2>
            <p className="card-description">The latest messages shared with the team.</p>
          </div>
          <button type="button" className="text-button" onClick={() => navigate('/announcements')}>View all <ArrowRight size={14} /></button>
        </div>
        <div className="card-body">
          {(data?.announcements || []).length === 0 ? (
            <EmptyState compact icon={Megaphone} title="No announcements" message="Company updates will appear here." action={<button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('/announcements')}>Open announcements</button>} />
          ) : (
            <div className="announcement-feed">
              {data.announcements.map((announcement) => (
                <div className="feed-row" key={announcement.id}>
                  <div className="feed-row-head">
                    <strong>{announcement.title}</strong>
                    <Badge status={announcement.category} />
                  </div>
                  <p>{announcement.body}</p>
                  <small>{announcement.authorName} · {relativeTime(announcement.createdAt)}</small>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmployeeDashboard({ data, employee, organization, userName, punchBusy, onCheckIn, onCheckOut, navigate }) {
  const month = data?.month || {};
  const balances = data?.balances || [];
  const recentLeaves = data?.recentLeaves || [];
  const payslips = data?.payslips || [];
  const announcements = data?.announcements || [];
  const latestPayslip = payslips[0];
  const annualBalance = balances.find((balance) => balance.type === 'annual');
  const greetingText = greeting(organization?.timezone);

  if (data?.employeeMissing) {
    return (
      <div>
        <PageHeader title={`${greetingText}, ${userName?.split(' ')[0] || 'there'}`} description="Your account is active, but it is not linked to an employee record yet." />
        <EmptyState
          icon={ShieldCheck}
          title="Employee profile not linked"
          message={data.message || 'Ask HR to link your account to an employee profile. Attendance, leave and payslips will appear once linked.'}
          action={<button type="button" className="btn btn-secondary" onClick={() => navigate('/profile')}>View account</button>}
        />
      </div>
    );
  }

  return (
    <div>
      <section className="dash-hero">
        <div className="dash-hero-copy">
          <p className="dash-hero-eyebrow">{formatDateLong(data?.today?.date || todayKey(organization?.timezone))}</p>
          <h1>{greetingText}, {userName?.split(' ')[0] || 'there'}.</h1>
          <p>
            Your attendance, leave balance and payslips in one place. Everything here is scoped
            to your employee record.
          </p>
        </div>
        <div className="dash-hero-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/leave')}>
            <CalendarDays size={15} /> Apply for leave
          </button>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/payslips')}>
            <ReceiptText size={15} /> Payslips
          </button>
        </div>
      </section>

      <div className="dash-grid">
        <div className="dash-stack">
          <PunchCard
            data={data}
            organization={organization}
            onCheckIn={onCheckIn}
            onCheckOut={onCheckOut}
            busy={punchBusy}
          />

          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">This month</h2>
                <p className="card-description">Attendance recorded in the current payroll period.</p>
              </div>
              <button type="button" className="text-button" onClick={() => navigate('/attendance')}>History <ArrowRight size={14} /></button>
            </div>
            <div className="card-body">
              <div className="attendance-summary">
                <div className="mini-stat">
                  <span>Attendance rate</span>
                  <strong>{month.attendanceRate === null || month.attendanceRate === undefined ? '—' : `${month.attendanceRate}%`}</strong>
                  <small>{formatNumber(month.expectedWorkingDays)} working days</small>
                </div>
                <div className="mini-stat">
                  <span>Present</span>
                  <strong>{formatNumber((month.present || 0) + (month.late || 0))}</strong>
                  <small>{month.late || 0} late · {month.halfDay || 0} half day</small>
                </div>
                <div className="mini-stat">
                  <span>On leave</span>
                  <strong>{formatNumber(month.onLeave)}</strong>
                  <small>{month.unpaidLeave || 0} unpaid</small>
                </div>
                <div className="mini-stat">
                  <span>Absent</span>
                  <strong>{formatNumber(month.absent)}</strong>
                  <small>Completed working days only</small>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Leave balances</h2>
                <p className="card-description">Pending requests reserve your balance until a decision is made.</p>
              </div>
              <button type="button" className="text-button" onClick={() => navigate('/leave')}>Manage <ArrowRight size={14} /></button>
            </div>
            <div className="card-body">
              <BalanceCards balances={balances} compact />
            </div>
          </div>
        </div>

        <div className="dash-stack">
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">At a glance</h2>
                <p className="card-description">Your current position.</p>
              </div>
            </div>
            <div className="card-body">
              <div className="approval-list">
                <div className="approval-row">
                  <span className="quick-tile-icon"><CalendarDays size={15} /></span>
                  <div className="approval-copy">
                    <strong>Annual leave available</strong>
                    <span>{annualBalance?.unlimited ? 'Unlimited policy' : `${annualBalance?.available ?? '—'} of ${annualBalance?.quota ?? '—'} days`}</span>
                  </div>
                  <Badge status="annual" tone="brand" label="Annual" />
                </div>
                <div className="approval-row">
                  <span className="quick-tile-icon"><ReceiptText size={15} /></span>
                  <div className="approval-copy">
                    <strong>Latest payslip</strong>
                    <span>{latestPayslip ? `${latestPayslip.period} · ${formatMoney(latestPayslip.net, latestPayslip.currency)} net` : 'No finalized payslip yet'}</span>
                  </div>
                  {latestPayslip && <Badge status="finalized" />}
                </div>
                <div className="approval-row">
                  <span className="quick-tile-icon"><Clock3 size={15} /></span>
                  <div className="approval-copy">
                    <strong>Today</strong>
                    <span>{data?.today?.record?.checkOut ? `Completed · ${formatDuration(data.today.record.workedMinutes)} worked` : data?.today?.record?.checkIn ? 'Currently checked in' : 'Not checked in yet'}</span>
                  </div>
                  <Badge status={data?.today?.record?.status || 'upcoming'} />
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Recent leave</h2>
                <p className="card-description">Your five latest requests.</p>
              </div>
              <button type="button" className="text-button" onClick={() => navigate('/leave')}>View <ArrowRight size={14} /></button>
            </div>
            <div className="card-body">
              {recentLeaves.length === 0 ? (
                <EmptyState compact icon={CalendarDays} title="No leave requests" message="Apply for leave from the leave page." />
              ) : (
                <div className="approval-list">
                  {recentLeaves.map((leave) => (
                    <div className="approval-row" key={leave.id}>
                      <div className="approval-copy">
                        <strong>{LEAVE_TYPE_LABELS[leave.type] || leave.type}</strong>
                        <span>{formatDate(leave.startDate)} – {formatDate(leave.endDate)} · {leave.days} day{leave.days === 1 ? '' : 's'}</span>
                      </div>
                      <Badge status={leave.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Announcements</h2>
                <p className="card-description">Updates from your company.</p>
              </div>
            </div>
            <div className="card-body">
              {announcements.length === 0 ? (
                <EmptyState compact icon={Megaphone} title="Nothing new" message="Company announcements will appear here." />
              ) : (
                <div className="announcement-feed">
                  {announcements.map((announcement) => (
                    <div className="feed-row" key={announcement.id}>
                      <div className="feed-row-head">
                        <strong>{announcement.title}</strong>
                        <Badge status={announcement.category} />
                      </div>
                      <p>{announcement.body}</p>
                      <small>{announcement.authorName} · {relativeTime(announcement.createdAt)}</small>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

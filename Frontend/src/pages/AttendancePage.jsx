import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle, CalendarCheck2, CheckCircle2, ClipboardCheck, Clock3, FileClock,
  Plus, RefreshCw, Search, TimerReset, XCircle,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import Modal from '../components/ui/Modal';
import Field from '../components/ui/Field';
import Pagination from '../components/ui/Pagination';
import PunchCard from '../components/attendance/PunchCard';
import StatCard from '../components/ui/StatCard';
import { PageSkeleton, TableSkeleton } from '../components/ui/Skeleton';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import attendanceApi from '../api/attendance';
import employeesApi from '../api/employees';
import { getErrorMessage, getFieldErrors } from '../api/client';
import { getAttendanceLocation } from '../lib/browser';
import {
  formatDate, formatDateLong, formatDuration, formatNumber, formatTime,
  monthStartKey, todayKey, weekday,
} from '../lib/format';
import { ATTENDANCE_STATUS_LABELS } from '../lib/constants';

const DAY_FILTERS = [
  { value: '', label: 'All recorded days' },
  { value: 'present', label: 'Present' },
  { value: 'late', label: 'Late' },
  { value: 'half_day', label: 'Half day' },
  { value: 'missing_checkout', label: 'Missing check-out' },
  { value: 'absent', label: 'Absent' },
  { value: 'leave', label: 'On leave' },
];

function SummaryStats({ summary }) {
  const rate = summary?.attendanceRate;
  return (
    <div className="attendance-summary">
      <div className="mini-stat">
        <span>Attendance rate</span>
        <strong>{rate === null || rate === undefined ? '—' : `${rate}%`}</strong>
        <small>{formatNumber(summary?.expectedWorkingDays)} expected days</small>
      </div>
      <div className="mini-stat">
        <span>Present</span>
        <strong>{formatNumber((summary?.present || 0) + (summary?.late || 0))}</strong>
        <small>{summary?.late || 0} late · {summary?.halfDay || 0} half day</small>
      </div>
      <div className="mini-stat">
        <span>On leave</span>
        <strong>{formatNumber(summary?.onLeave)}</strong>
        <small>{summary?.unpaidLeave || 0} unpaid</small>
      </div>
      <div className="mini-stat">
        <span>Absent / missing</span>
        <strong>{formatNumber((summary?.absent || 0) + (summary?.missingCheckout || 0))}</strong>
        <small>{summary?.missingCheckout || 0} missing check-out</small>
      </div>
    </div>
  );
}

export default function AttendancePage() {
  const { isStaff, organization } = useAuth();
  return isStaff
    ? <StaffAttendance organization={organization} />
    : <MyAttendance organization={organization} />;
}

/* ── Employee self-service ─────────────────────────────────────────────── */

function MyAttendance({ organization }) {
  const toast = useToast();
  const timezone = organization?.timezone;
  const today = todayKey(timezone);
  const [range, setRange] = useState({ from: monthStartKey(timezone), to: today });
  const [data, setData] = useState(null);
  const [corrections, setCorrections] = useState([]);
  const [tab, setTab] = useState('history');
  const [dayFilter, setDayFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [punchBusy, setPunchBusy] = useState(false);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionsLoading, setCorrectionsLoading] = useState(true);
  const [correctionsError, setCorrectionsError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await attendanceApi.me({ from: range.from, to: range.to });
      setData(result);
    } catch (err) {
      setError(getErrorMessage(err, 'Your attendance could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to]);

  const loadCorrections = useCallback(async () => {
    setCorrectionsLoading(true);
    setCorrectionsError('');
    try {
      const result = await attendanceApi.corrections();
      setCorrections(result || []);
    } catch (err) {
      setCorrectionsError(getErrorMessage(err, 'Correction requests could not be loaded.'));
    } finally {
      setCorrectionsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadCorrections(); }, [loadCorrections]);

  const handlePunch = async (mode) => {
    setPunchBusy(true);
    try {
      const location = await getAttendanceLocation(organization);
      const result = mode === 'in'
        ? await attendanceApi.checkIn(location)
        : await attendanceApi.checkOut(location);
      toast.success(mode === 'in'
        ? `Checked in at ${formatTime(result.checkIn)}.`
        : `Checked out. Worked ${formatDuration(result.workedMinutes)} today.`);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, `${mode === 'in' ? 'Check-in' : 'Check-out'} failed.`));
    } finally {
      setPunchBusy(false);
    }
  };

  const days = useMemo(() => {
    const source = [...(data?.days || [])].reverse();
    if (dayFilter) return source.filter((day) => day.kind === dayFilter);
    return source.filter((day) => day.kind !== 'non_working' && day.kind !== 'upcoming');
  }, [data, dayFilter]);

  const rangeInvalid = range.from && range.to && range.from > range.to;

  if (loading && !data) return <PageSkeleton />;

  return (
    <div>
      <PageHeader
        eyebrow="Time & attendance"
        title="My attendance"
        description="Record your working day, review history and request a correction when a timestamp is wrong."
        actions={(
          <button type="button" className="btn btn-secondary" onClick={() => { load(); loadCorrections(); }} disabled={loading}>
            <RefreshCw size={15} /> Refresh
          </button>
        )}
      />

      {error && <ErrorState message={error} onRetry={load} title="Attendance unavailable" />}

      {!error && data && (
        <>
          <div className="clock-panel">
            <PunchCard
              data={data}
              organization={organization}
              onCheckIn={() => handlePunch('in')}
              onCheckOut={() => handlePunch('out')}
              busy={punchBusy}
            />
            <div className="card">
              <div className="card-header">
                <div>
                  <h2 className="card-title">Period summary</h2>
                  <p className="card-description">{formatDate(data.from)} – {formatDate(data.to)}</p>
                </div>
              </div>
              <div className="card-body">
                <SummaryStats summary={data.summary} />
              </div>
            </div>
          </div>

          <div className="tabs" role="tablist" aria-label="Attendance sections">
            <button type="button" role="tab" aria-selected={tab === 'history'} className={`tab ${tab === 'history' ? 'tab-active' : ''}`} onClick={() => setTab('history')}>
              <Clock3 size={14} /> My history
            </button>
            <button type="button" role="tab" aria-selected={tab === 'corrections'} className={`tab ${tab === 'corrections' ? 'tab-active' : ''}`} onClick={() => setTab('corrections')}>
              <TimerReset size={14} /> Corrections
              {corrections.filter((item) => item.status === 'pending').length > 0 && (
                <span className="tab-count">{corrections.filter((item) => item.status === 'pending').length}</span>
              )}
            </button>
          </div>

          {tab === 'history' && (
            <div className="card mt-16">
              <div className="card-header">
                <div>
                  <h2 className="card-title">Attendance history</h2>
                  <p className="card-description">Classification is generated by the attendance engine from your raw check-in and check-out times.</p>
                </div>
              </div>
              <div className="table-toolbar">
                <div className="toolbar">
                  <label className="sr-only" htmlFor="my-from">From date</label>
                  <input id="my-from" className="input" type="date" max={today} value={range.from} onChange={(event) => setRange((current) => ({ ...current, from: event.target.value }))} />
                  <span className="muted">to</span>
                  <label className="sr-only" htmlFor="my-to">To date</label>
                  <input id="my-to" className="input" type="date" max={today} value={range.to} onChange={(event) => setRange((current) => ({ ...current, to: event.target.value }))} />
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setRange({ from: monthStartKey(timezone), to: today })}>This month</button>
                  <label className="sr-only" htmlFor="day-filter">Status</label>
                  <select id="day-filter" className="select" value={dayFilter} onChange={(event) => setDayFilter(event.target.value)}>
                    {DAY_FILTERS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </div>
              </div>

              {rangeInvalid ? (
                <div className="card-body"><div className="warning-banner" style={{ marginBottom: 0 }}><AlertCircle size={16} /><span>The start date must be before the end date.</span></div></div>
              ) : loading ? (
                <TableSkeleton rows={6} columns={6} />
              ) : days.length === 0 ? (
                <EmptyState
                  icon={CalendarCheck2}
                  title="No attendance in this range"
                  message="Change the dates or status filter to see more days."
                />
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Check in</th>
                        <th>Check out</th>
                        <th>Worked</th>
                        <th>Late</th>
                      </tr>
                    </thead>
                    <tbody>
                      {days.map((day) => (
                        <tr key={day.date}>
                          <td>
                            <div className="day-meta">
                              <strong>{formatDate(day.date)}</strong>
                              <span>{weekday(day.date)}{day.leaveType ? ` · ${day.leaveType} leave` : ''}</span>
                            </div>
                          </td>
                          <td><Badge status={day.kind} /></td>
                          <td className="mono">{day.checkIn ? formatTime(day.checkIn) : '—'}</td>
                          <td className="mono">{day.checkOut ? formatTime(day.checkOut) : '—'}</td>
                          <td>{day.workedMinutes ? formatDuration(day.workedMinutes) : '—'}</td>
                          <td>{day.lateMinutes ? `${day.lateMinutes} min` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === 'corrections' && (
            <div className="card mt-16">
              <div className="card-header">
                <div>
                  <h2 className="card-title">Correction requests</h2>
                  <p className="card-description">Request a correction for a missing or inaccurate timestamp in the last 30 days.</p>
                </div>
                <button type="button" className="btn btn-primary" onClick={() => setCorrectionOpen(true)}>
                  <Plus size={15} /> Request correction
                </button>
              </div>
              <div className="card-body">
                {correctionsError && <div className="notice-item">{correctionsError}</div>}
                {correctionsLoading && <div className="inline-loading">Loading correction requests…</div>}
                {!correctionsLoading && !correctionsError && corrections.length === 0 && (
                  <EmptyState compact icon={TimerReset} title="No correction requests" message="If a timestamp is wrong, request a correction and HR will review it." />
                )}
                {!correctionsLoading && corrections.length > 0 && (
                  <div className="correction-list">
                    {corrections.map((correction) => (
                      <div className="correction-row" key={correction.id}>
                        <div className="correction-copy">
                          <strong>{formatDateLong(correction.date)} · {correction.requestedCheckIn}{correction.requestedCheckOut ? ` – ${correction.requestedCheckOut}` : ''}</strong>
                          <p>{correction.reason}</p>
                          {correction.decisionComment && <span>Decision note: {correction.decisionComment}</span>}
                          <span>
                            Requested {formatDate(correction.createdAt)}
                            {correction.decidedBy ? ` · Reviewed by ${correction.decidedBy}` : ''}
                          </span>
                        </div>
                        <Badge status={correction.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      <CorrectionModal
        open={correctionOpen}
        onClose={() => setCorrectionOpen(false)}
        today={today}
        onRequested={() => { loadCorrections(); load(); }}
      />
    </div>
  );
}

function CorrectionModal({ open, onClose, today, onRequested }) {
  const toast = useToast();
  const [form, setForm] = useState({ date: today, requestedCheckIn: '09:00', requestedCheckOut: '', reason: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ date: today, requestedCheckIn: '09:00', requestedCheckOut: '', reason: '' });
      setErrors({});
      setFormError('');
    }
  }, [open, today]);

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const submit = async () => {
    const next = {};
    if (!form.date) next.date = 'Date is required.';
    const earliest = new Date();
    earliest.setDate(earliest.getDate() - 30);
    if (form.date && form.date > today) next.date = 'Corrections cannot be requested for future dates.';
    if (form.date && form.date < earliest.toISOString().slice(0, 10)) next.date = 'Corrections are limited to the last 30 days.';
    if (!form.requestedCheckIn) next.requestedCheckIn = 'A check-in time is required.';
    if (form.requestedCheckOut && form.requestedCheckOut <= form.requestedCheckIn) next.requestedCheckOut = 'Check-out must be after check-in.';
    if (!form.reason.trim()) next.reason = 'Give a short reason for the correction.';
    else if (form.reason.trim().length < 10) next.reason = 'Reason must be at least 10 characters.';
    else if (form.reason.trim().length > 500) next.reason = 'Reason must be at most 500 characters.';
    setErrors(next);
    setFormError('');
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      await attendanceApi.requestCorrection({
        date: form.date,
        requestedCheckIn: form.requestedCheckIn,
        requestedCheckOut: form.requestedCheckOut || undefined,
        reason: form.reason.trim(),
      });
      toast.success('Correction request sent to HR.');
      onRequested?.();
      onClose();
    } catch (err) {
      setErrors((current) => ({ ...current, ...getFieldErrors(err) }));
      setFormError(getErrorMessage(err, 'The correction could not be requested.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      title="Request an attendance correction"
      description="HR will review the request. Approved corrections update the attendance record."
      size="md"
      footer={(
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={submit} disabled={busy}>{busy ? 'Sending…' : 'Send request'}</button>
        </>
      )}
    >
      {formError && <div className="auth-alert" role="alert"><span>{formError}</span></div>}
      <div className="form-grid">
        <Field label="Date" htmlFor="correction-date" required error={errors.date}>
          {({ describedBy }) => (
            <input id="correction-date" className="input" type="date" max={today} value={form.date} onChange={update('date')} aria-invalid={Boolean(errors.date)} aria-describedby={describedBy} disabled={busy} />
          )}
        </Field>
        <div />
        <Field label="Check-in" htmlFor="correction-in" required error={errors.requestedCheckIn}>
          {({ describedBy }) => (
            <input id="correction-in" className="input" type="time" value={form.requestedCheckIn} onChange={update('requestedCheckIn')} aria-invalid={Boolean(errors.requestedCheckIn)} aria-describedby={describedBy} disabled={busy} />
          )}
        </Field>
        <Field label="Check-out" htmlFor="correction-out" optional error={errors.requestedCheckOut}>
          {({ describedBy }) => (
            <input id="correction-out" className="input" type="time" value={form.requestedCheckOut} onChange={update('requestedCheckOut')} aria-invalid={Boolean(errors.requestedCheckOut)} aria-describedby={describedBy} disabled={busy} />
          )}
        </Field>
        <Field label="Reason" htmlFor="correction-reason" required error={errors.reason} className="span-2" hint="10–500 characters. Include what happened, for example a forgotten check-out.">
          {({ describedBy }) => (
            <textarea id="correction-reason" className="textarea" rows={4} value={form.reason} onChange={update('reason')} aria-invalid={Boolean(errors.reason)} aria-describedby={describedBy} disabled={busy} />
          )}
        </Field>
      </div>
      <div className="info-banner" style={{ marginBottom: 0 }}>
        <AlertCircle size={16} />
        <span>Only one pending correction is allowed per date. Corrections are available for the last 30 days.</span>
      </div>
    </Modal>
  );
}

/* ── Admin / HR attendance ─────────────────────────────────────────────── */

function StaffAttendance({ organization }) {
  const toast = useToast();
  const timezone = organization?.timezone;
  const today = todayKey(timezone);
  const [tab, setTab] = useState('overview');
  const [overviewDate, setOverviewDate] = useState(today);
  const [department, setDepartment] = useState('');
  const [overviewStatus, setOverviewStatus] = useState('');
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState('');
  const [corrections, setCorrections] = useState([]);
  const [correctionsLoading, setCorrectionsLoading] = useState(false);
  const [correctionsError, setCorrectionsError] = useState('');
  const [correctionFilter, setCorrectionFilter] = useState('pending');
  const [decision, setDecision] = useState(null);

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    setOverviewError('');
    try {
      const result = await attendanceApi.overview({
        date: overviewDate,
        department: department || undefined,
        status: overviewStatus || undefined,
      });
      setOverview(result);
    } catch (err) {
      setOverviewError(getErrorMessage(err, 'The daily attendance overview could not be loaded.'));
    } finally {
      setOverviewLoading(false);
    }
  }, [overviewDate, department, overviewStatus]);

  const loadCorrections = useCallback(async () => {
    setCorrectionsLoading(true);
    setCorrectionsError('');
    try {
      const result = await attendanceApi.corrections({ status: correctionFilter || undefined });
      setCorrections(result || []);
    } catch (err) {
      setCorrectionsError(getErrorMessage(err, 'Correction requests could not be loaded.'));
    } finally {
      setCorrectionsLoading(false);
    }
  }, [correctionFilter]);

  useEffect(() => { loadOverview(); }, [loadOverview]);
  useEffect(() => {
    if (tab === 'corrections') loadCorrections();
  }, [tab, loadCorrections]);

  const pendingCount = corrections.filter((item) => item.status === 'pending').length;

  const handleDecision = async (correction, value, comment) => {
    await attendanceApi.decideCorrection(correction.id, { decision: value, comment });
    toast.success(`Correction ${value}.`);
    setDecision(null);
    await Promise.all([loadCorrections(), loadOverview()]);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Time & attendance"
        title="Attendance"
        description="Daily operating picture, raw attendance records and correction decisions."
        actions={(
          <button type="button" className="btn btn-secondary" onClick={() => { loadOverview(); if (tab === 'corrections') loadCorrections(); }} disabled={overviewLoading}>
            <RefreshCw size={15} /> Refresh
          </button>
        )}
      />

      <div className="tabs" role="tablist" aria-label="Attendance sections">
        <button type="button" role="tab" aria-selected={tab === 'overview'} className={`tab ${tab === 'overview' ? 'tab-active' : ''}`} onClick={() => setTab('overview')}>
          <ClipboardCheck size={14} /> Daily overview
        </button>
        <button type="button" role="tab" aria-selected={tab === 'records'} className={`tab ${tab === 'records' ? 'tab-active' : ''}`} onClick={() => setTab('records')}>
          <FileClock size={14} /> Raw records
        </button>
        <button type="button" role="tab" aria-selected={tab === 'corrections'} className={`tab ${tab === 'corrections' ? 'tab-active' : ''}`} onClick={() => setTab('corrections')}>
          <TimerReset size={14} /> Corrections
          {pendingCount > 0 && <span className="tab-count">{pendingCount}</span>}
        </button>
      </div>

      {tab === 'overview' && (
        <>
          <div className="filter-card mt-16">
            <div className="toolbar">
              <label className="sr-only" htmlFor="overview-date">Date</label>
              <input id="overview-date" className="input" type="date" max={today} value={overviewDate} onChange={(event) => setOverviewDate(event.target.value)} />
              <label className="sr-only" htmlFor="overview-department">Department</label>
              <select id="overview-department" className="select" value={department} onChange={(event) => setDepartment(event.target.value)}>
                <option value="">All departments</option>
                {(overview?.departments || organization?.departments?.map((item) => item.name) || []).map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <label className="sr-only" htmlFor="overview-status">Status</label>
              <select id="overview-status" className="select" value={overviewStatus} onChange={(event) => setOverviewStatus(event.target.value)}>
                <option value="">All statuses</option>
                <option value="present">Present</option>
                <option value="late">Late</option>
                <option value="half_day">Half day</option>
                <option value="missing_checkout">Missing check-out</option>
                <option value="absent">Absent</option>
                <option value="leave">On leave</option>
                <option value="non_working">Non-working</option>
                <option value="upcoming">Upcoming</option>
                <option value="not_joined">Not joined</option>
              </select>
              <button type="button" className="btn-link" onClick={() => { setOverviewDate(today); setDepartment(''); setOverviewStatus(''); }}>Reset</button>
            </div>
          </div>

          {overviewError && <ErrorState message={overviewError} onRetry={loadOverview} title="Attendance overview unavailable" />}

          {!overviewError && overview && (
            <>
              <div className="stat-grid">
                <StatCard icon={CalendarCheck2} label="Attendance rate" value={overview.summary?.attendanceRate === null ? '—' : `${overview.summary?.attendanceRate}%`} meta={formatDate(overview.date)} tone="brand" footer={`${formatNumber(overview.summary?.expectedWorkingDays)} expected working days`} />
                <StatCard icon={CheckCircle2} label="Present" value={formatNumber((overview.summary?.present || 0) + (overview.summary?.late || 0))} meta="Checked in" tone="success" footer={`${overview.summary?.late || 0} late · ${overview.summary?.halfDay || 0} half day`} />
                <StatCard icon={Clock3} label="On leave" value={formatNumber(overview.summary?.onLeave)} meta="Approved" tone="info" footer={`${overview.summary?.unpaidLeave || 0} unpaid leave`} />
                <StatCard icon={XCircle} label="Absent" value={formatNumber(overview.summary?.absent)} meta={overview.workingDay ? 'Working day' : 'Non-working'} tone="danger" footer={`${overview.summary?.missingCheckout || 0} missing check-out`} />
              </div>

              {!overview.workingDay && (
                <div className="info-banner mt-24">
                  <AlertCircle size={16} />
                  <span>{formatDateLong(overview.date)} is a weekend or public holiday, so no working-day attendance is expected.</span>
                </div>
              )}

              <div className="list-card mt-24">
                <div className="list-card-head">
                  <div>
                    <h2>{formatNumber(overview.rows?.length)} employee{overview.rows?.length === 1 ? '' : 's'}</h2>
                    <p>{formatDateLong(overview.date)} · {department || 'All departments'}</p>
                  </div>
                </div>
                {overviewLoading ? (
                  <TableSkeleton rows={7} columns={7} />
                ) : !overview.rows?.length ? (
                  <EmptyState icon={Search} title="No employees match these filters" message="Try another date, department or status." />
                ) : (
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Employee</th>
                          <th>Department</th>
                          <th>Status</th>
                          <th>Check in</th>
                          <th>Check out</th>
                          <th>Worked</th>
                          <th>Late</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overview.rows.map((row) => (
                          <tr key={row.employeeId}>
                            <td>
                              <div className="cell-person-copy">
                                <strong>{row.name}</strong>
                                <span className="mono">{row.code}</span>
                              </div>
                            </td>
                            <td>{row.department}</td>
                            <td><Badge status={row.leaveType ? 'leave' : row.kind} label={row.leaveType ? `${row.leaveType} leave` : undefined} /></td>
                            <td className="mono">{row.checkIn ? formatTime(row.checkIn) : '—'}</td>
                            <td className="mono">{row.checkOut ? formatTime(row.checkOut) : '—'}</td>
                            <td>{row.workedMinutes ? formatDuration(row.workedMinutes) : '—'}</td>
                            <td>{row.lateMinutes ? `${row.lateMinutes} min` : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {tab === 'records' && <AttendanceRecords organization={organization} />}

      {tab === 'corrections' && (
        <div className="list-card mt-16">
          <div className="card-header">
            <div>
              <h2 className="card-title">Attendance corrections</h2>
              <p className="card-description">Approving a correction updates the attendance record with the requested times.</p>
            </div>
          </div>
          <div className="table-toolbar">
            <div className="toolbar">
              <label className="sr-only" htmlFor="correction-status-filter">Status</label>
              <select id="correction-status-filter" className="select" value={correctionFilter} onChange={(event) => setCorrectionFilter(event.target.value)}>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="">All decisions</option>
              </select>
              <button type="button" className="btn btn-secondary btn-sm" onClick={loadCorrections} disabled={correctionsLoading}>
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
          </div>
          {correctionsError && <div className="card-body"><div className="notice-item">{correctionsError}</div></div>}
          {correctionsLoading ? (
            <TableSkeleton rows={5} columns={5} />
          ) : !correctionsError && corrections.length === 0 ? (
            <EmptyState icon={TimerReset} title="No correction requests" message="Requests submitted by employees will appear here." />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Date</th>
                    <th>Requested time</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {corrections.map((correction) => (
                    <tr key={correction.id}>
                      <td>
                        <div className="cell-person-copy">
                          <strong>{correction.employee?.name || 'Employee'}</strong>
                          <span>{correction.employee?.code} · {correction.employee?.department}</span>
                        </div>
                      </td>
                      <td className="nowrap">{formatDate(correction.date)}</td>
                      <td className="mono nowrap">
                        {correction.requestedCheckIn}{correction.requestedCheckOut ? ` – ${correction.requestedCheckOut}` : ''}
                      </td>
                      <td>
                        <div className="audit-summary">{correction.reason}</div>
                        {correction.decisionComment && <div className="cell-sub">Note: {correction.decisionComment}</div>}
                      </td>
                      <td><Badge status={correction.status} /></td>
                      <td>
                        {correction.status === 'pending' ? (
                          <div className="table-actions">
                            <button type="button" className="btn btn-success btn-sm" onClick={() => setDecision({ correction, value: 'approved' })}>Approve</button>
                            <button type="button" className="btn btn-danger btn-sm" onClick={() => setDecision({ correction, value: 'rejected' })}>Reject</button>
                          </div>
                        ) : (
                          <span className="muted nowrap">{correction.decidedBy ? `By ${correction.decidedBy}` : 'Decided'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <CorrectionDecisionModal
        open={Boolean(decision)}
        decision={decision}
        onClose={() => setDecision(null)}
        onConfirm={handleDecision}
      />
    </div>
  );
}

function CorrectionDecisionModal({ open, decision, onClose, onConfirm }) {
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) { setComment(''); setError(''); }
  }, [open]);

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await onConfirm(decision.correction, decision.value, comment.trim());
    } catch (err) {
      setError(getErrorMessage(err, `The correction could not be ${decision.value}.`));
    } finally {
      setBusy(false);
    }
  };

  const approve = decision?.value === 'approved';

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      title={approve ? 'Approve attendance correction?' : 'Reject attendance correction?'}
      description={decision?.correction ? `${decision.correction.employee?.name} · ${formatDate(decision.correction.date)} · ${decision.correction.requestedCheckIn}${decision.correction.requestedCheckOut ? ` – ${decision.correction.requestedCheckOut}` : ''}` : ''}
      size="sm"
      footer={(
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className={`btn ${approve ? 'btn-success' : 'btn-danger'}`} onClick={submit} disabled={busy}>
            {busy ? 'Working…' : approve ? 'Approve correction' : 'Reject correction'}
          </button>
        </>
      )}
    >
      {error && <div className="auth-alert" role="alert"><span>{error}</span></div>}
      <Field label="Decision note" htmlFor="correction-comment" optional hint="Saved on the request and included in the employee's notification.">
        {() => (
          <textarea id="correction-comment" className="textarea" rows={3} maxLength={500} value={comment} onChange={(event) => setComment(event.target.value)} disabled={busy} />
        )}
      </Field>
      {approve && (
        <div className="warning-banner" style={{ marginBottom: 0 }}>
          <AlertCircle size={16} />
          <span>The employee's attendance record for this date will be overwritten with the requested times.</span>
        </div>
      )}
    </Modal>
  );
}

function AttendanceRecords({ organization }) {
  const timezone = organization?.timezone;
  const today = todayKey(timezone);
  const [filters, setFilters] = useState({ from: monthStartKey(timezone), to: today, department: '', status: '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], pagination: { page: 1, pages: 1, total: 0, limit: 20 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    setDepartments(organization?.departments?.map((item) => item.name) || []);
  }, [organization]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await attendanceApi.records({
        page,
        limit: 20,
        from: filters.from || undefined,
        to: filters.to || undefined,
        department: filters.department || undefined,
        status: filters.status || undefined,
      });
      setData(result);
    } catch (err) {
      setError(getErrorMessage(err, 'Attendance records could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { load(); }, [load]);

  const update = (field) => (event) => {
    setPage(1);
    setFilters((current) => ({ ...current, [field]: event.target.value }));
  };

  return (
    <div className="list-card mt-16">
      <div className="card-header">
        <div>
          <h2 className="card-title">Raw attendance records</h2>
          <p className="card-description">Stored check-in and check-out records across the company.</p>
        </div>
      </div>
      <div className="table-toolbar">
        <div className="toolbar">
          <label className="sr-only" htmlFor="records-from">From</label>
          <input id="records-from" className="input" type="date" value={filters.from} onChange={update('from')} />
          <span className="muted">to</span>
          <label className="sr-only" htmlFor="records-to">To</label>
          <input id="records-to" className="input" type="date" value={filters.to} onChange={update('to')} />
          <label className="sr-only" htmlFor="records-department">Department</label>
          <select id="records-department" className="select" value={filters.department} onChange={update('department')}>
            <option value="">All departments</option>
            {departments.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
          <label className="sr-only" htmlFor="records-status">Status</label>
          <select id="records-status" className="select" value={filters.status} onChange={update('status')}>
            <option value="">All statuses</option>
            <option value="present">Present</option>
            <option value="late">Late</option>
            <option value="half_day">Half day</option>
            <option value="missing_checkout">Missing check-out</option>
          </select>
          <button type="button" className="btn-link" onClick={() => { setPage(1); setFilters({ from: monthStartKey(timezone), to: today, department: '', status: '' }); }}>Reset</button>
        </div>
      </div>
      {error && <div className="card-body"><div className="notice-item">{error}</div></div>}
      {loading ? (
        <TableSkeleton rows={8} columns={7} />
      ) : data.items.length === 0 ? (
        <EmptyState icon={FileClock} title="No attendance records" message="Try a wider date range or different filters." />
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Check in</th>
                  <th>Check out</th>
                  <th>Status</th>
                  <th>Worked</th>
                  <th>Late</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((record) => (
                  <tr key={record.id}>
                    <td>
                      <div className="cell-person-copy">
                        <strong>{record.employee?.name || 'Employee'}</strong>
                        <span>{record.employee?.code} · {record.employee?.department}</span>
                      </div>
                    </td>
                    <td className="nowrap">{formatDate(record.date)}</td>
                    <td className="mono">{formatTime(record.checkIn)}</td>
                    <td className="mono">{record.checkOut ? formatTime(record.checkOut) : '—'}</td>
                    <td><Badge status={record.status} /></td>
                    <td>{formatDuration(record.workedMinutes)}</td>
                    <td>{record.lateMinutes ? `${record.lateMinutes} min` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={data.pagination?.page || 1}
            pages={data.pagination?.pages || 1}
            total={data.pagination?.total || 0}
            limit={data.pagination?.limit || 20}
            onPage={setPage}
          />
        </>
      )}
    </div>
  );
}

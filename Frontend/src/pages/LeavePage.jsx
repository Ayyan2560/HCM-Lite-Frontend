import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  AlertCircle, CalendarDays, CalendarPlus, CheckCircle2, ClipboardList, Info,
  RefreshCw, Sparkles, XCircle,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Field from '../components/ui/Field';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import Modal from '../components/ui/Modal';
import Pagination from '../components/ui/Pagination';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import BalanceCards from '../components/leave/BalanceCards';
import { PageSkeleton, TableSkeleton } from '../components/ui/Skeleton';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import leavesApi from '../api/leaves';
import employeesApi from '../api/employees';
import { getErrorMessage, getFieldErrors } from '../api/client';
import {
  formatDate, formatDateLong, formatNumber, todayKey,
} from '../lib/format';
import { LEAVE_TYPE_LABELS, LEAVE_STATUS_LABELS } from '../lib/constants';

const LEAVE_TYPES = ['annual', 'sick', 'casual', 'unpaid'];

export default function LeavePage() {
  const { isStaff, employee } = useAuth();
  if (!isStaff) {
    return (
      <div>
        <PageHeader
          eyebrow="Leave"
          title="My leave"
          description="Balances, requests and decisions. Working days exclude weekends and public holidays."
        />
        <MyLeaveContent />
      </div>
    );
  }
  return <StaffLeave hasEmployeeProfile={Boolean(employee)} />;
}

/* ── Employee leave self-service ───────────────────────────────────────── */

function MyLeaveContent() {
  const location = useLocation();
  const toast = useToast();
  const { organization } = useAuth();
  const suggestion = location.state?.suggestion;
  const year = Number(todayKey(organization?.timezone).slice(0, 4));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    type: suggestion?.leaveType || 'annual',
    startDate: suggestion?.startDate || '',
    endDate: suggestion?.endDate || suggestion?.startDate || '',
    reason: suggestion?.reason || '',
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [suggestionVisible, setSuggestionVisible] = useState(Boolean(suggestion));
  const [cancelTarget, setCancelTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await leavesApi.me({ year });
      setData(result);
    } catch (err) {
      setError(getErrorMessage(err, 'Your leave records could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { load(); }, [load]);

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const next = {};
    if (!LEAVE_TYPES.includes(form.type)) next.type = 'Choose a leave type.';
    if (!form.startDate) next.startDate = 'Start date is required.';
    if (!form.endDate) next.endDate = 'End date is required.';
    if (form.startDate && form.endDate && form.startDate > form.endDate) next.endDate = 'End date cannot be before the start date.';
    if (!form.reason.trim()) next.reason = 'A reason is required.';
    else if (form.reason.trim().length < 5) next.reason = 'Reason must be at least 5 characters.';
    else if (form.reason.trim().length > 500) next.reason = 'Reason must be at most 500 characters.';
    setErrors(next);
    setFormError('');
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      const result = await leavesApi.apply({
        type: form.type,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason.trim(),
      });
      toast.success(`Leave request submitted for ${result.leave.days} working day${result.leave.days === 1 ? '' : 's'}.`);
      setForm({ type: 'annual', startDate: '', endDate: '', reason: '' });
      setSuggestionVisible(false);
      await load();
    } catch (err) {
      setErrors((current) => ({ ...current, ...getFieldErrors(err) }));
      setFormError(getErrorMessage(err, 'The leave request could not be submitted.'));
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    await leavesApi.cancel(cancelTarget.id);
    toast.success('Leave request cancelled.');
    await load();
  };

  const policy = data?.policy || organization?.leavePolicy;

  if (loading && !data) {
    return (
      <div className="mt-24">
        <div className="balance-grid">
          {Array.from({ length: 4 }).map((_, index) => <div className="balance-card" key={index}><div className="skeleton" style={{ height: 110 }} /></div>)}
        </div>
      </div>
    );
  }

  if (error) return <ErrorState message={error} onRetry={load} title="Leave records unavailable" />;

  const balances = data?.balances || [];
  const items = data?.items || [];

  return (
    <>
      {suggestionVisible && (
        <div className="info-banner mt-16">
          <Sparkles size={16} />
          <span>
            This request was pre-filled from the assistant suggestion. Review the dates and reason before submitting.
            <button type="button" className="btn-link" style={{ marginLeft: 8 }} onClick={() => setSuggestionVisible(false)}>Dismiss</button>
          </span>
        </div>
      )}

      <div className="mt-24">
        <BalanceCards balances={balances} />
      </div>

      <div className="policy-note mt-16">
        <Info size={15} />
        <span>
          Only approved requests consume quota; pending requests reserve it. Weekends and public holidays are excluded from working-day counts.
          {policy && (
            <> Current policy: annual {policy.annual} days, sick {policy.sick}, casual {policy.casual}, unpaid {policy.unpaid === null ? 'unlimited' : `${policy.unpaid} days`}.</>
          )}
        </span>
      </div>

      <div className="dash-grid mt-24">
        <div className="list-card">
          <div className="list-card-head">
            <div>
              <h2>Leave history</h2>
              <p>{items.length} request{items.length === 1 ? '' : 's'} on record · {data?.year}</p>
            </div>
            <button type="button" className="text-button" onClick={load} disabled={loading}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
          {loading ? (
            <TableSkeleton rows={5} columns={5} />
          ) : items.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No leave requests yet"
              message="Use the form to submit your first request."
            />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Dates</th>
                    <th>Days</th>
                    <th>Status</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((leave) => {
                    const cancellable = (leave.status === 'pending' || leave.status === 'approved') && leave.startDate > todayKey(organization?.timezone);
                    return (
                      <tr key={leave.id}>
                        <td><span className="cell-strong">{LEAVE_TYPE_LABELS[leave.type] || leave.type}</span></td>
                        <td>
                          <div className="day-meta">
                            <strong>{formatDate(leave.startDate)} – {formatDate(leave.endDate)}</strong>
                            <span>Requested {formatDate(leave.createdAt)}</span>
                          </div>
                        </td>
                        <td>{formatNumber(leave.days)}</td>
                        <td>
                          <Badge status={leave.status} />
                          {leave.decisionComment && <div className="cell-sub">{leave.decisionComment}</div>}
                        </td>
                        <td>
                          {cancellable && (
                            <div className="table-actions">
                              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCancelTarget(leave)}>Cancel</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card" style={{ alignSelf: 'start' }}>
          <div className="card-header">
            <div>
              <h2 className="card-title">Request leave</h2>
              <p className="card-description">The working-day count and quota check are handled by the server.</p>
            </div>
          </div>
          <div className="card-body">
            {formError && <div className="auth-alert" role="alert"><span>{formError}</span></div>}
            <form onSubmit={submit} noValidate>
              <Field label="Leave type" htmlFor="leave-type" required error={errors.type}>
                {({ describedBy }) => (
                  <select id="leave-type" className="select" value={form.type} onChange={update('type')} aria-invalid={Boolean(errors.type)} aria-describedby={describedBy} disabled={busy}>
                    {LEAVE_TYPES.map((type) => <option key={type} value={type}>{LEAVE_TYPE_LABELS[type]}</option>)}
                  </select>
                )}
              </Field>
              <Field label="Start date" htmlFor="leave-start" required error={errors.startDate}>
                {({ describedBy }) => (
                  <input id="leave-start" className="input" type="date" value={form.startDate} onChange={(event) => {
                    update('startDate')(event);
                    if (form.endDate && form.endDate < event.target.value) setForm((current) => ({ ...current, endDate: event.target.value }));
                  }} aria-invalid={Boolean(errors.startDate)} aria-describedby={describedBy} disabled={busy} />
                )}
              </Field>
              <Field label="End date" htmlFor="leave-end" required error={errors.endDate}>
                {({ describedBy }) => (
                  <input id="leave-end" className="input" type="date" min={form.startDate || undefined} value={form.endDate} onChange={update('endDate')} aria-invalid={Boolean(errors.endDate)} aria-describedby={describedBy} disabled={busy} />
                )}
              </Field>
              <Field label="Reason" htmlFor="leave-reason" required error={errors.reason} hint="5–500 characters.">
                {({ describedBy }) => (
                  <textarea id="leave-reason" className="textarea" rows={4} value={form.reason} onChange={update('reason')} aria-invalid={Boolean(errors.reason)} aria-describedby={describedBy} disabled={busy} placeholder="Briefly explain the request." />
                )}
              </Field>
              <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
                <CalendarPlus size={15} /> {busy ? 'Submitting…' : 'Submit request'}
              </button>
            </form>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        title="Cancel leave request?"
        message={cancelTarget
          ? `${LEAVE_TYPE_LABELS[cancelTarget.type] || cancelTarget.type} from ${formatDate(cancelTarget.startDate)} to ${formatDate(cancelTarget.endDate)} will be cancelled. Quota will be released.`
          : ''}
        confirmLabel="Cancel request"
        cancelLabel="Keep request"
        tone="danger"
      />
    </>
  );
}

/* ── Staff approvals ───────────────────────────────────────────────────── */

function StaffLeave({ hasEmployeeProfile }) {
  const toast = useToast();
  const location = useLocation();
  const [tab, setTab] = useState(() => (
    location.state?.suggestion && hasEmployeeProfile ? 'mine' : 'approvals'
  ));
  const [status, setStatus] = useState('pending');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], pagination: { page: 1, pages: 1, total: 0, limit: 20 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [decision, setDecision] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await leavesApi.list({
        page,
        limit: 20,
        status: status || undefined,
        type: type || undefined,
      });
      setData(result);
    } catch (err) {
      setError(getErrorMessage(err, 'Leave requests could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, [page, status, type]);

  useEffect(() => {
    if (tab === 'approvals') load();
  }, [tab, load]);

  const handleDecision = async (leave, value, comment) => {
    await leavesApi.decide(leave.id, { decision: value, comment });
    toast.success(`Leave request ${value}.`);
    setDecision(null);
    await load();
  };

  const pendingCount = status === 'pending' ? data.pagination?.total || 0 : undefined;

  return (
    <div>
      <PageHeader
        eyebrow="Leave"
        title="Leave"
        description="Review requests, approve decisions and inspect team balances."
        actions={(
          <button type="button" className="btn btn-secondary" onClick={load} disabled={loading}>
            <RefreshCw size={15} /> Refresh
          </button>
        )}
      />

      <div className="tabs" role="tablist" aria-label="Leave sections">
        <button type="button" role="tab" aria-selected={tab === 'approvals'} className={`tab ${tab === 'approvals' ? 'tab-active' : ''}`} onClick={() => setTab('approvals')}>
          <ClipboardList size={14} /> Approvals
          {pendingCount > 0 && <span className="tab-count">{pendingCount}</span>}
        </button>
        <button type="button" role="tab" aria-selected={tab === 'balances'} className={`tab ${tab === 'balances' ? 'tab-active' : ''}`} onClick={() => setTab('balances')}>
          <CalendarDays size={14} /> Team balances
        </button>
        {hasEmployeeProfile && (
          <button type="button" role="tab" aria-selected={tab === 'mine'} className={`tab ${tab === 'mine' ? 'tab-active' : ''}`} onClick={() => setTab('mine')}>
            <CalendarPlus size={14} /> My leave
          </button>
        )}
      </div>

      {tab === 'approvals' && (
        <>
          <div className="filter-card mt-16">
            <div className="toolbar">
              <label className="sr-only" htmlFor="leave-status-filter">Status</label>
              <select id="leave-status-filter" className="select" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
                <option value="">All statuses</option>
              </select>
              <label className="sr-only" htmlFor="leave-type-filter">Type</label>
              <select id="leave-type-filter" className="select" value={type} onChange={(event) => { setType(event.target.value); setPage(1); }}>
                <option value="">All leave types</option>
                {LEAVE_TYPES.map((value) => <option key={value} value={value}>{LEAVE_TYPE_LABELS[value]}</option>)}
              </select>
              <button type="button" className="btn-link" onClick={() => { setStatus('pending'); setType(''); setPage(1); }}>Reset</button>
            </div>
          </div>

          {error && <ErrorState message={error} onRetry={load} title="Leave requests unavailable" />}

          {!error && (
            <div className="list-card">
              <div className="list-card-head">
                <div>
                  <h2>{formatNumber(data.pagination?.total || 0)} request{data.pagination?.total === 1 ? '' : 's'}</h2>
                  <p>{status ? LEAVE_STATUS_LABELS[status] : 'All statuses'}{type ? ` · ${LEAVE_TYPE_LABELS[type]}` : ''}</p>
                </div>
              </div>
              {loading ? (
                <TableSkeleton rows={7} columns={6} />
              ) : data.items.length === 0 ? (
                <EmptyState icon={CalendarDays} title="No leave requests" message="There are no requests matching these filters." />
              ) : (
                <>
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Employee</th>
                          <th>Type</th>
                          <th>Dates</th>
                          <th>Days</th>
                          <th>Status</th>
                          <th aria-label="Actions" />
                        </tr>
                      </thead>
                      <tbody>
                        {data.items.map((leave) => (
                          <tr key={leave.id}>
                            <td>
                              <div className="cell-person-copy">
                                <strong>{leave.employee?.name || 'Employee'}</strong>
                                <span>{leave.employee?.code} · {leave.employee?.department}</span>
                              </div>
                            </td>
                            <td>{LEAVE_TYPE_LABELS[leave.type] || leave.type}</td>
                            <td>
                              <div className="day-meta">
                                <strong>{formatDate(leave.startDate)} – {formatDate(leave.endDate)}</strong>
                                <span>Requested {formatDate(leave.createdAt)}</span>
                              </div>
                            </td>
                            <td>{formatNumber(leave.days)}</td>
                            <td>
                              <Badge status={leave.status} />
                              {leave.decisionComment && <div className="cell-sub">{leave.decisionComment}</div>}
                            </td>
                            <td>
                              {leave.status === 'pending' ? (
                                <div className="table-actions">
                                  <button type="button" className="btn btn-success btn-sm" onClick={() => setDecision({ leave, value: 'approved' })}>Approve</button>
                                  <button type="button" className="btn btn-danger btn-sm" onClick={() => setDecision({ leave, value: 'rejected' })}>Reject</button>
                                </div>
                              ) : (
                                <span className="muted nowrap">Decided</span>
                              )}
                            </td>
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
          )}
        </>
      )}

      {tab === 'balances' && <TeamBalances />}

      {tab === 'mine' && hasEmployeeProfile && (
        <div className="mt-24">
          <MyLeaveContent />
        </div>
      )}

      <DecisionModal
        open={Boolean(decision)}
        decision={decision}
        onClose={() => setDecision(null)}
        onConfirm={handleDecision}
      />
    </div>
  );
}

function DecisionModal({ open, decision, onClose, onConfirm }) {
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) { setComment(''); setError(''); }
  }, [open]);

  const approve = decision?.value === 'approved';

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await onConfirm(decision.leave, decision.value, comment.trim());
    } catch (err) {
      setError(getErrorMessage(err, `The leave request could not be ${decision.value}.`));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      title={approve ? 'Approve leave request?' : 'Reject leave request?'}
      description={decision?.leave ? `${decision.leave.employee?.name} · ${LEAVE_TYPE_LABELS[decision.leave.type]} · ${formatDate(decision.leave.startDate)} – ${formatDate(decision.leave.endDate)} (${decision.leave.days} days)` : ''}
      size="sm"
      footer={(
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className={`btn ${approve ? 'btn-success' : 'btn-danger'}`} onClick={submit} disabled={busy}>
            {busy ? 'Working…' : approve ? 'Approve request' : 'Reject request'}
          </button>
        </>
      )}
    >
      {error && <div className="auth-alert" role="alert"><span>{error}</span></div>}
      <div className="notice-item" style={{ marginBottom: 16 }}>
        <strong>Reason given:</strong> {decision?.leave?.reason || '—'}
      </div>
      <Field label="Decision note" htmlFor="leave-comment" optional hint="Shared with the employee in their notification.">
        {() => (
          <textarea id="leave-comment" className="textarea" rows={3} maxLength={500} value={comment} onChange={(event) => setComment(event.target.value)} disabled={busy} />
        )}
      </Field>
      {approve && (
        <div className="info-banner" style={{ marginBottom: 0 }}>
          <CheckCircle2 size={16} />
          <span>Approving consumes the employee's leave quota for the selected year.</span>
        </div>
      )}
    </Modal>
  );
}

function TeamBalances() {
  const { organization } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [employeeId, setEmployeeId] = useState('');
  const [year, setYear] = useState(Number(todayKey(organization?.timezone).slice(0, 4)));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [listError, setListError] = useState('');

  const years = useMemo(() => {
    const current = Number(todayKey(organization?.timezone).slice(0, 4));
    return [current, current - 1, current - 2];
  }, [organization?.timezone]);

  useEffect(() => {
    let active = true;
    employeesApi.list({ limit: 100, status: 'active' })
      .then((result) => {
        if (!active) return;
        setEmployees(result.items || []);
        if (result.items?.length) setEmployeeId((current) => current || result.items[0].id);
      })
      .catch((err) => { if (active) setListError(getErrorMessage(err, 'Employees could not be loaded.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!employeeId) return;
    let active = true;
    setError('');
    leavesApi.balances(employeeId, { year })
      .then((result) => { if (active) setData(result); })
      .catch((err) => { if (active) setError(getErrorMessage(err, 'Balances could not be loaded.')); });
    return () => { active = false; };
  }, [employeeId, year]);

  return (
    <div className="mt-24">
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Team leave balances</h2>
            <p className="card-description">Read-only view of quota, used and reserved days for a selected employee.</p>
          </div>
        </div>
        <div className="card-body">
          {listError && <div className="notice-item">{listError}</div>}
          <div className="toolbar">
            <label className="sr-only" htmlFor="balance-employee">Employee</label>
            <select id="balance-employee" className="select" style={{ minWidth: 260 }} value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} disabled={loading}>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>{employee.fullName} · {employee.code}</option>
              ))}
            </select>
            <label className="sr-only" htmlFor="balance-year">Year</label>
            <select id="balance-year" className="select" value={year} onChange={(event) => setYear(Number(event.target.value))}>
              {years.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            {employeeId && <Link to={`/employees/${employeeId}`} className="text-button">Open employee dossier</Link>}
          </div>

          <div className="mt-24">
            {loading ? (
              <div className="inline-loading">Loading employees…</div>
            ) : error ? (
              <div className="notice-item">{error}</div>
            ) : !employeeId ? (
              <EmptyState compact icon={CalendarDays} title="No active employees" message="Add an employee to review leave balances." />
            ) : data ? (
              <>
                <div className="leave-head">
                  <div>
                    <h3 className="section-title">{data.employee?.name}</h3>
                    <p className="section-subtitle"><span className="mono">{data.employee?.code}</span> · {data.year}</p>
                  </div>
                </div>
                <BalanceCards balances={data.balances || []} />
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

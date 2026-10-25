import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle, CalendarRange, FileText, Info, Plus, RefreshCw, WalletCards,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import Modal from '../components/ui/Modal';
import Field from '../components/ui/Field';
import Pagination from '../components/ui/Pagination';
import { TableSkeleton } from '../components/ui/Skeleton';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import payrollApi from '../api/payroll';
import { getErrorMessage, getFieldErrors } from '../api/client';
import { currentPeriod, formatDate, formatMoney, formatMonth, formatNumber } from '../lib/format';

const EMPTY_PAGINATION = { page: 1, pages: 1, total: 0, limit: 20 };

export default function PayrollPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { organization, isAdmin } = useAuth();
  const timezone = organization?.timezone;
  const current = currentPeriod(timezone);

  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], pagination: EMPTY_PAGINATION });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ period: current, notes: '' });
  const [createErrors, setCreateErrors] = useState({});
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await payrollApi.list({
        page,
        limit: 20,
        status: status || undefined,
      });
      setData(result);
    } catch (err) {
      setError(getErrorMessage(err, 'Payroll runs could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => { load(); }, [load]);

  const pageTotals = useMemo(() => (data.items || []).reduce((accumulator, payroll) => ({
    net: accumulator.net + Number(payroll.totals?.net || 0),
    employees: accumulator.employees + Number(payroll.totals?.employees || 0),
  }), { net: 0, employees: 0 }), [data.items]);

  const openCreate = () => {
    setCreateForm({ period: current, notes: '' });
    setCreateErrors({});
    setCreateError('');
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    const nextErrors = {};
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(createForm.period)) nextErrors.period = 'Choose a valid payroll month.';
    else if (createForm.period > current) nextErrors.period = 'Payroll cannot be generated for a future period.';
    if (createForm.notes.trim().length > 500) nextErrors.notes = 'Notes must be at most 500 characters.';
    setCreateErrors(nextErrors);
    setCreateError('');
    if (Object.keys(nextErrors).length) return;

    setCreating(true);
    try {
      const result = await payrollApi.createDraft({
        period: createForm.period,
        notes: createForm.notes.trim(),
      });
      toast.success(`Payroll draft for ${formatMonth(createForm.period)} generated for ${formatNumber(result.payroll?.totals?.employees)} employees.`);
      setCreateOpen(false);
      navigate(`/payroll/${result.payroll.id}`);
    } catch (err) {
      setCreateErrors((currentErrors) => ({ ...currentErrors, ...getFieldErrors(err) }));
      setCreateError(getErrorMessage(err, 'The payroll draft could not be generated.'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Finance"
        title="Payroll"
        description="Generate monthly drafts from attendance, review totals and finalize a run once the period has closed."
        actions={(
          <>
            <button type="button" className="btn btn-secondary" onClick={load} disabled={loading}>
              <RefreshCw size={15} /> Refresh
            </button>
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              <Plus size={15} /> Generate draft
            </button>
          </>
        )}
      />

      <div className="info-banner">
        <Info size={16} />
        <span>
          Drafts are snapshots of attendance at generation time. Generating a draft for an existing period replaces
          that draft. {isAdmin ? 'Only administrators can finalize a run.' : 'An administrator must finalize a run before payslips are visible to employees.'}
        </span>
      </div>

      <div className="filter-card">
        <div className="toolbar">
          <label className="sr-only" htmlFor="payroll-status">Status</label>
          <select
            id="payroll-status"
            className="select"
            value={status}
            onChange={(event) => { setStatus(event.target.value); setPage(1); }}
          >
            <option value="">All statuses</option>
            <option value="draft">Drafts</option>
            <option value="finalized">Finalized</option>
          </select>
          <span className="muted">
            {data.items.length > 0
              ? `${formatNumber(pageTotals.employees)} employees · ${formatMoney(pageTotals.net, organization?.currency)} net on this page`
              : 'No runs to summarize'}
          </span>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={load} title="Payroll unavailable" />}

      {!error && (
        <div className="list-card">
          <div className="list-card-head">
            <div>
              <h2>{formatNumber(data.pagination?.total || 0)} payroll run{data.pagination?.total === 1 ? '' : 's'}</h2>
              <p>{status ? (status === 'draft' ? 'Editable drafts' : 'Locked finalized runs') : 'All payroll periods'}</p>
            </div>
            <button type="button" className="text-button" onClick={openCreate}>
              <Plus size={14} /> New draft
            </button>
          </div>

          {loading ? (
            <TableSkeleton rows={6} columns={8} />
          ) : data.items.length === 0 ? (
            <EmptyState
              icon={CalendarRange}
              title="No payroll runs yet"
              message="Generate a draft for a completed month to calculate gross pay, deductions and tax from attendance."
              action={<button type="button" className="btn btn-primary" onClick={openCreate}><Plus size={15} /> Generate the first draft</button>}
            />
          ) : (
            <>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Period</th>
                      <th>Status</th>
                      <th>Employees</th>
                      <th>Gross</th>
                      <th>Deductions</th>
                      <th>Tax</th>
                      <th>Net</th>
                      <th>Cutoff</th>
                      <th aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((payroll) => (
                      <tr key={payroll.id}>
                        <td>
                          <div className="day-meta">
                            <strong>{formatMonth(payroll.period)}</strong>
                            <span>{payroll.period}</span>
                          </div>
                        </td>
                        <td><Badge status={payroll.status} /></td>
                        <td>{formatNumber(payroll.totals?.employees)}</td>
                        <td className="money">{formatMoney(payroll.totals?.gross, payroll.currency)}</td>
                        <td className="money">{formatMoney(payroll.totals?.deductions, payroll.currency)}</td>
                        <td className="money">{formatMoney(payroll.totals?.tax, payroll.currency)}</td>
                        <td className="money money-strong">{formatMoney(payroll.totals?.net, payroll.currency)}</td>
                        <td className="nowrap">{formatDate(payroll.cutoffDate)}</td>
                        <td>
                          <div className="table-actions">
                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate(`/payroll/${payroll.id}`)}>
                              <FileText size={14} /> Open
                            </button>
                          </div>
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

      <Modal
        open={createOpen}
        onClose={creating ? () => {} : () => setCreateOpen(false)}
        title="Generate payroll draft"
        description="The server builds every active employee's entry from stored attendance and leave records."
        size="md"
        footer={(
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={handleCreate} disabled={creating}>
              <WalletCards size={15} /> {creating ? 'Generating…' : 'Generate draft'}
            </button>
          </>
        )}
      >
        {createError && <div className="auth-alert" role="alert"><AlertCircle size={15} /><span>{createError}</span></div>}
        <div className="form-grid">
          <Field label="Payroll period" htmlFor="payroll-period" required error={createErrors.period} hint="Choose a month that has already started.">
            {({ describedBy }) => (
              <input
                id="payroll-period"
                className="input"
                type="month"
                max={current}
                value={createForm.period}
                onChange={(event) => {
                  setCreateForm((form) => ({ ...form, period: event.target.value }));
                  setCreateErrors((errors) => ({ ...errors, period: undefined }));
                }}
                aria-invalid={Boolean(createErrors.period)}
                aria-describedby={describedBy}
                disabled={creating}
              />
            )}
          </Field>
          <div />
          <Field label="Notes" htmlFor="payroll-notes" optional error={createErrors.notes} className="span-2" hint="Stored with the run and shown on the payroll detail page.">
            {({ describedBy }) => (
              <textarea
                id="payroll-notes"
                className="textarea"
                rows={3}
                maxLength={500}
                value={createForm.notes}
                onChange={(event) => {
                  setCreateForm((form) => ({ ...form, notes: event.target.value }));
                  setCreateErrors((errors) => ({ ...errors, notes: undefined }));
                }}
                aria-invalid={Boolean(createErrors.notes)}
                aria-describedby={describedBy}
                disabled={creating}
                placeholder="Optional context for this run."
              />
            )}
          </Field>
        </div>
        <div className="warning-banner" style={{ marginBottom: 0 }}>
          <AlertCircle size={16} />
          <span>
            A draft generated for the current month only covers attendance up to today. Finalization is blocked until
            the month ends and the draft has been regenerated.
          </span>
        </div>
      </Modal>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertCircle, ArrowLeft, CalendarCheck2, CheckCircle2, Download, FileText,
  LockKeyhole, MinusCircle, ReceiptText, Save, UsersRound, WalletCards,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Modal from '../components/ui/Modal';
import StatCard from '../components/ui/StatCard';
import { PageSkeleton } from '../components/ui/Skeleton';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import payrollApi from '../api/payroll';
import { getErrorMessage } from '../api/client';
import {
  formatDate, formatDateTime, formatMoney, formatMonth, formatNumber, todayKey,
} from '../lib/format';

function periodEndKey(period) {
  if (!/^\d{4}-\d{2}$/.test(period || '')) return null;
  const [year, month] = period.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return `${period}-${String(lastDay).padStart(2, '0')}`;
}

export default function PayrollDetailPage() {
  const { id } = useParams();
  const toast = useToast();
  const { organization, isAdmin } = useAuth();
  const [payroll, setPayroll] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState('');
  const [savedNotes, setSavedNotes] = useState('');
  const [notesError, setNotesError] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [activeEntry, setActiveEntry] = useState(null);
  const [downloadId, setDownloadId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await payrollApi.get(id);
      setPayroll(result.payroll);
      setEntries(result.entries || []);
      setNotes(result.payroll?.notes || '');
      setSavedNotes(result.payroll?.notes || '');
    } catch (err) {
      setError(getErrorMessage(err, 'This payroll run could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const endKey = useMemo(() => periodEndKey(payroll?.period), [payroll?.period]);
  const periodClosed = Boolean(endKey && todayKey(organization?.timezone) >= endKey && payroll?.cutoffDate >= endKey);
  const isDraft = payroll?.status === 'draft';

  const saveNotes = async () => {
    setSavingNotes(true);
    setNotesError('');
    try {
      const result = await payrollApi.updateNotes(id, notes.trim());
      setPayroll((current) => ({ ...current, ...result }));
      setSavedNotes(result.notes || '');
      setNotes(result.notes || '');
      toast.success('Payroll notes saved.');
    } catch (err) {
      setNotesError(getErrorMessage(err, 'Payroll notes could not be saved.'));
    } finally {
      setSavingNotes(false);
    }
  };

  const handleFinalize = async () => {
    setFinalizing(true);
    try {
      await payrollApi.finalize(id);
      toast.success(`${formatMonth(payroll?.period)} payroll finalized. Payslips are now available.`);
      await load();
    } finally {
      setFinalizing(false);
    }
  };

  const downloadPayslip = async (entry) => {
    setDownloadId(entry.employee);
    try {
      await payrollApi.downloadPayslip(
        payroll.id,
        entry.employee,
        `payslip-${entry.code}-${payroll.period}.pdf`,
      );
      toast.success(`Payslip for ${entry.name} downloaded.`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'The payslip could not be downloaded.'));
    } finally {
      setDownloadId('');
    }
  };

  if (loading) return <PageSkeleton />;

  if (error) {
    return (
      <div>
        <PageHeader
          title="Payroll run"
          actions={<Link to="/payroll" className="btn btn-secondary"><ArrowLeft size={15} /> Back to payroll</Link>}
        />
        <ErrorState message={error} onRetry={load} title="Payroll unavailable" />
      </div>
    );
  }

  if (!payroll) return null;

  return (
    <div>
      <PageHeader
        eyebrow="Finance"
        title={formatMonth(payroll.period)}
        description={`Payroll ${payroll.period} · ${formatNumber(payroll.totals?.employees)} employees · ${formatNumber(payroll.workingDays)} working days`}
        actions={(
          <>
            <Link to="/payroll" className="btn btn-secondary"><ArrowLeft size={15} /> Payroll</Link>
            {isDraft && isAdmin && (
              <button type="button" className="btn btn-primary" onClick={() => setFinalizeOpen(true)} disabled={!periodClosed}>
                <LockKeyhole size={15} /> Finalize run
              </button>
            )}
          </>
        )}
      />

      <section className="payroll-hero">
        <div>
          <p className="eyebrow">Payroll run</p>
          <h1>{formatMonth(payroll.period)} · {formatMoney(payroll.totals?.net, payroll.currency)}</h1>
          <p>
            Cutoff {formatDate(payroll.cutoffDate)} · Created {formatDate(payroll.createdAt)}
            {payroll.finalizedAt ? ` · Finalized ${formatDateTime(payroll.finalizedAt)}` : ' · Editable draft'}
          </p>
        </div>
        <div className="payroll-hero-actions">
          <Badge status={payroll.status} />
          {isDraft && !isAdmin && <span className="muted">An administrator finalizes this run.</span>}
        </div>
      </section>

      {isDraft && !periodClosed && (
        <div className="warning-banner mt-16">
          <AlertCircle size={16} />
          <span>
            This draft covers attendance only through {formatDate(payroll.cutoffDate)}. Finalization unlocks after
            {endKey ? ` ${formatDate(endKey)}` : ' the period ends'} and the draft is regenerated for the full period.
          </span>
        </div>
      )}

      <div className="stat-grid mt-24">
        <StatCard
          icon={WalletCards}
          label="Gross pay"
          value={formatMoney(payroll.totals?.gross, payroll.currency)}
          meta="Total earnings"
          tone="brand"
          footer="Basic salary, HRA and medical"
        />
        <StatCard
          icon={MinusCircle}
          label="Attendance deductions"
          value={formatMoney(payroll.totals?.deductions, payroll.currency)}
          meta="Absence / leave"
          tone="warning"
          footer={`${formatNumber(payroll.workingDays)} working days in period`}
        />
        <StatCard
          icon={ReceiptText}
          label="Income tax"
          value={formatMoney(payroll.totals?.tax, payroll.currency)}
          meta="Monthly"
          tone="info"
          footer="Progressive annual slabs"
        />
        <StatCard
          icon={CheckCircle2}
          label="Net payable"
          value={formatMoney(payroll.totals?.net, payroll.currency)}
          meta={payroll.status === 'finalized' ? 'Locked' : 'Draft'}
          tone="success"
          footer={`${formatNumber(payroll.totals?.employees)} employees`}
        />
      </div>

      <div className="dash-grid mt-24">
        <div className="dash-stack">
          <div className="list-card">
            <div className="list-card-head">
              <div>
                <h2>Employee entries</h2>
                <p>Gross, deductions and net for every employee included in this run.</p>
              </div>
              <span className="muted">{formatNumber(entries.length)} entries</span>
            </div>
            {entries.length === 0 ? (
              <EmptyState icon={UsersRound} title="No entries in this run" message="There were no active employees in the period when this draft was generated." />
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Department</th>
                      <th>Attendance</th>
                      <th>Gross</th>
                      <th>Deductions</th>
                      <th>Tax</th>
                      <th>Net</th>
                      <th aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr key={entry.employee}>
                        <td>
                          <div className="cell-person-copy">
                            <strong>{entry.name}</strong>
                            <span className="mono">{entry.code}</span>
                          </div>
                        </td>
                        <td>{entry.department || '—'}</td>
                        <td>
                          <div className="cell-sub">
                            {entry.presentDays} present · {entry.absentDays} absent
                          </div>
                          <div className="cell-sub">
                            {entry.halfDays} half · {entry.paidLeaveDays} paid leave
                          </div>
                        </td>
                        <td className="money">{formatMoney(entry.gross, payroll.currency)}</td>
                        <td className="money">{formatMoney(entry.totalDeductions, payroll.currency)}</td>
                        <td className="money">{formatMoney(entry.monthlyTax, payroll.currency)}</td>
                        <td className="money money-strong">{formatMoney(entry.net, payroll.currency)}</td>
                        <td>
                          <div className="table-actions">
                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setActiveEntry(entry)}>
                              <FileText size={14} /> Breakdown
                            </button>
                            <button
                              type="button"
                              className="icon-button"
                              onClick={() => downloadPayslip(entry)}
                              disabled={downloadId === entry.employee}
                              aria-label={`Download payslip for ${entry.name}`}
                              title="Download PDF payslip"
                            >
                              <Download size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="dash-stack">
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Run notes</h2>
                <p className="card-description">
                  {isDraft ? 'Editable until the run is finalized.' : 'Locked because this run is finalized.'}
                </p>
              </div>
              {payroll.finalizedAt && <Badge status="finalized" />}
            </div>
            <div className="card-body">
              {notesError && <div className="auth-alert" role="alert"><span>{notesError}</span></div>}
              <label className="sr-only" htmlFor="run-notes">Payroll notes</label>
              <textarea
                id="run-notes"
                className="textarea"
                rows={5}
                maxLength={500}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                disabled={!isDraft || savingNotes}
                placeholder={isDraft ? 'Add context for this payroll run.' : 'No notes were saved.'}
              />
              <div className="toolbar mt-12" style={{ justifyContent: 'space-between' }}>
                <span className="muted">{notes.length}/500 characters</span>
                {isDraft && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={saveNotes}
                    disabled={savingNotes || notes.trim() === savedNotes}
                  >
                    <Save size={14} /> {savingNotes ? 'Saving…' : 'Save notes'}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Run details</h2>
                <p className="card-description">Period, cutoff and payroll configuration.</p>
              </div>
            </div>
            <div className="card-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <dt>Period</dt>
                  <dd>{payroll.period}</dd>
                </div>
                <div className="detail-item">
                  <dt>Working days</dt>
                  <dd>{formatNumber(payroll.workingDays)}</dd>
                </div>
                <div className="detail-item">
                  <dt>Cutoff date</dt>
                  <dd>{formatDate(payroll.cutoffDate)}</dd>
                </div>
                <div className="detail-item">
                  <dt>Currency</dt>
                  <dd>{payroll.currency}</dd>
                </div>
                <div className="detail-item">
                  <dt>Created</dt>
                  <dd>{formatDate(payroll.createdAt)}</dd>
                </div>
                <div className="detail-item">
                  <dt>Finalized</dt>
                  <dd>{payroll.finalizedAt ? formatDate(payroll.finalizedAt) : 'Not yet'}</dd>
                </div>
              </div>
              <div className="info-banner mt-24" style={{ marginBottom: 0 }}>
                <CalendarCheck2 size={16} />
                <span>Payslip PDFs are generated from the stored entry, so they never change after finalization.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <EntryModal
        entry={activeEntry}
        currency={payroll.currency}
        payroll={payroll}
        onClose={() => setActiveEntry(null)}
        onDownload={downloadPayslip}
        downloading={downloadId === activeEntry?.employee}
      />

      <ConfirmDialog
        open={finalizeOpen}
        onClose={() => setFinalizeOpen(false)}
        onConfirm={handleFinalize}
        title="Finalize this payroll run?"
        message={(
          <>
            <p>
              Finalizing <strong>{formatMonth(payroll.period)}</strong> locks the run, publishes payslips and notifies
              every included employee. This cannot be undone.
            </p>
            <p style={{ marginTop: 8 }}>
              Net payable: <strong>{formatMoney(payroll.totals?.net, payroll.currency)}</strong> across{' '}
              {formatNumber(payroll.totals?.employees)} employees.
            </p>
          </>
        )}
        confirmLabel={finalizing ? 'Finalizing…' : 'Finalize payroll'}
        tone="success"
      />
    </div>
  );
}

function EntryModal({ entry, currency, payroll, onClose, onDownload, downloading }) {
  if (!entry) return null;
  return (
    <Modal
      open={Boolean(entry)}
      onClose={onClose}
      title={`${entry.name} · ${entry.code}`}
      description={`${entry.department || 'No department'} · ${formatMonth(payroll.period)} payroll entry`}
      size="lg"
      footer={(
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
          <button type="button" className="btn btn-primary" onClick={() => onDownload(entry)} disabled={downloading}>
            <Download size={15} /> {downloading ? 'Preparing…' : 'Download payslip PDF'}
          </button>
        </>
      )}
    >
      <div className="breakdown-grid">
        <div className="breakdown-section">
          <h4>Earnings</h4>
          <div className="breakdown-row"><span>Basic salary</span><strong>{formatMoney(entry.basicSalary, currency)}</strong></div>
          <div className="breakdown-row"><span>House rent allowance (40%)</span><strong>{formatMoney(entry.hra, currency)}</strong></div>
          <div className="breakdown-row"><span>Medical allowance (10%)</span><strong>{formatMoney(entry.medical, currency)}</strong></div>
          <div className="breakdown-row"><span>Gross salary</span><strong>{formatMoney(entry.gross, currency)}</strong></div>
        </div>
        <div className="breakdown-section">
          <h4>Deductions</h4>
          <div className="breakdown-row"><span>Absence ({entry.absentDays} days)</span><strong>{formatMoney(entry.absenceDeduction, currency)}</strong></div>
          <div className="breakdown-row"><span>Half days ({entry.halfDays})</span><strong>{formatMoney(entry.halfDayDeduction, currency)}</strong></div>
          <div className="breakdown-row"><span>Unpaid leave ({entry.unpaidLeaveDays} days)</span><strong>{formatMoney(entry.unpaidLeaveDeduction, currency)}</strong></div>
          <div className="breakdown-row"><span>Income tax (monthly)</span><strong>{formatMoney(entry.monthlyTax, currency)}</strong></div>
          <div className="breakdown-row"><span>Total attendance deductions</span><strong>{formatMoney(entry.totalDeductions, currency)}</strong></div>
        </div>
      </div>

      <div className="divider" />

      <h4 className="section-title">Attendance basis</h4>
      <div className="day-chips mt-12">
        <span className="day-chip">Working <strong>{entry.workingDays}</strong></span>
        <span className="day-chip">Present <strong>{entry.presentDays}</strong></span>
        <span className="day-chip">Late <strong>{entry.lateDays}</strong></span>
        <span className="day-chip">Half day <strong>{entry.halfDays}</strong></span>
        <span className="day-chip">Absent <strong>{entry.absentDays}</strong></span>
        <span className="day-chip">Paid leave <strong>{entry.paidLeaveDays}</strong></span>
        <span className="day-chip">Unpaid leave <strong>{entry.unpaidLeaveDays}</strong></span>
        <span className="day-chip">Missing check-out <strong>{entry.missingCheckoutDays}</strong></span>
      </div>

      <div className="breakdown-total">
        <span>Daily rate</span>
        <strong>{formatMoney(entry.dailyRate, currency)}</strong>
      </div>

      <div className="net-panel">
        <span>Net payable</span>
        <strong>{formatMoney(entry.net, currency)}</strong>
      </div>

      <div className="detail-grid mt-24">
        <div className="detail-item">
          <dt>Annual gross</dt>
          <dd>{formatMoney(entry.annualGross, currency)}</dd>
        </div>
        <div className="detail-item">
          <dt>Annual tax</dt>
          <dd>{formatMoney(entry.annualTax, currency)}</dd>
        </div>
        <div className="detail-item">
          <dt>Monthly tax</dt>
          <dd>{formatMoney(entry.monthlyTax, currency)}</dd>
        </div>
      </div>
    </Modal>
  );
}

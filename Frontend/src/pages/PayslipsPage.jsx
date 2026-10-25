import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarRange, CheckCircle2, Download, ReceiptText, RefreshCw, WalletCards,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import { TableSkeleton } from '../components/ui/Skeleton';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import payrollApi from '../api/payroll';
import { getErrorMessage } from '../api/client';
import { formatDateTime, formatMoney, formatMonth, formatNumber } from '../lib/format';

export default function PayslipsPage() {
  const toast = useToast();
  const { employee } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [noProfile, setNoProfile] = useState(false);
  const [downloadId, setDownloadId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setNoProfile(false);
    try {
      const result = await payrollApi.myPayslips();
      setData(result);
    } catch (err) {
      if (err.response?.status === 404) setNoProfile(true);
      else setError(getErrorMessage(err, 'Your payslips could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const items = data?.items || [];
  const currency = data?.currency || 'PKR';
  const totals = useMemo(() => items.reduce((accumulator, item) => ({
    net: accumulator.net + Number(item.net || 0),
    tax: accumulator.tax + Number(item.tax || 0),
  }), { net: 0, tax: 0 }), [items]);
  const latest = items[0];

  const download = async (item) => {
    setDownloadId(item.payrollId);
    try {
      await payrollApi.downloadPayslip(
        item.payrollId,
        employee?.id,
        `payslip-${employee?.code || 'employee'}-${item.period}.pdf`,
      );
      toast.success(`Payslip for ${formatMonth(item.period)} downloaded.`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'The payslip could not be downloaded.'));
    } finally {
      setDownloadId('');
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader eyebrow="Finance" title="My payslips" description="Your finalized monthly payslips." />
        <div className="card"><div className="card-body"><TableSkeleton rows={6} columns={6} /></div></div>
      </div>
    );
  }

  if (noProfile) {
    return (
      <div>
        <PageHeader eyebrow="Finance" title="My payslips" description="Your finalized monthly payslips." />
        <EmptyState
          icon={ReceiptText}
          title="No employee profile linked"
          message="Payslips are generated from an employee record. Ask HR to link your account to your employee profile."
          action={<Link to="/profile" className="btn btn-secondary">View my account</Link>}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader eyebrow="Finance" title="My payslips" description="Your finalized monthly payslips." />
        <ErrorState message={error} onRetry={load} title="Payslips unavailable" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Finance"
        title="My payslips"
        description="Only finalized payroll runs appear here. Each payslip is a locked PDF generated from the stored run."
        actions={(
          <button type="button" className="btn btn-secondary" onClick={load} disabled={loading}>
            <RefreshCw size={15} /> Refresh
          </button>
        )}
      />

      <div className="stat-grid">
        <StatCard
          icon={WalletCards}
          label="Latest net pay"
          value={latest ? formatMoney(latest.net, latest.currency) : '—'}
          meta={latest ? formatMonth(latest.period) : 'No payslips'}
          tone="brand"
          footer={latest ? `Finalized ${formatDateTime(latest.finalizedAt)}` : 'Available after payroll finalization'}
        />
        <StatCard
          icon={ReceiptText}
          label="Payslips available"
          value={formatNumber(items.length)}
          meta="Finalized runs"
          tone="info"
          footer="Full history from payroll"
        />
        <StatCard
          icon={CheckCircle2}
          label="Net across payslips"
          value={formatMoney(totals.net, currency)}
          meta="All available"
          tone="success"
          footer="Sum of finalized net pay"
        />
        <StatCard
          icon={CalendarRange}
          label="Tax across payslips"
          value={formatMoney(totals.tax, currency)}
          meta="All available"
          tone="violet"
          footer="Monthly income tax withheld"
        />
      </div>

      <div className="list-card mt-24">
        <div className="list-card-head">
          <div>
            <h2>Payslip history</h2>
            <p>{items.length === 0 ? 'No finalized payroll includes your employee record yet.' : `${items.length} finalized payslip${items.length === 1 ? '' : 's'}`}</p>
          </div>
        </div>

        {items.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title="No payslips yet"
            message="Your payslips will appear here once HR finalizes a payroll run that includes your employee record."
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Working days</th>
                  <th>Present</th>
                  <th>Absent</th>
                  <th>Gross</th>
                  <th>Deductions</th>
                  <th>Tax</th>
                  <th>Net</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={`${item.payrollId}-${item.period}`}>
                    <td>
                      <div className="day-meta">
                        <strong>{formatMonth(item.period)}</strong>
                        <span>Finalized {formatDateTime(item.finalizedAt)}</span>
                      </div>
                    </td>
                    <td>{formatNumber(item.workingDays)}</td>
                    <td>
                      <div className="cell-sub">{item.presentDays} present</div>
                      <div className="cell-sub">{item.paidLeaveDays} paid leave</div>
                    </td>
                    <td>
                      <div className="cell-sub">{item.absentDays} absent</div>
                      <div className="cell-sub">{item.halfDays} half day</div>
                    </td>
                    <td className="money">{formatMoney(item.gross, item.currency)}</td>
                    <td className="money">{formatMoney(item.deductions, item.currency)}</td>
                    <td className="money">{formatMoney(item.tax, item.currency)}</td>
                    <td className="money money-strong">{formatMoney(item.net, item.currency)}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => download(item)}
                          disabled={downloadId === item.payrollId}
                        >
                          <Download size={14} /> {downloadId === item.payrollId ? 'Preparing…' : 'PDF'}
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

      <div className="info-banner mt-16">
        <ReceiptText size={16} />
        <span>
          Payslip figures are calculated by the payroll engine: basic salary plus 40% house rent and 10% medical,
          less absence, half-day and unpaid-leave deductions and monthly income tax.
        </span>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, CalendarDays, Mail, Pencil, Phone, ShieldCheck, UserCheck, UserX, UsersRound,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import BalanceCards from '../components/leave/BalanceCards';
import { PageSkeleton } from '../components/ui/Skeleton';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { employeesApi } from '../api/employees';
import leavesApi from '../api/leaves';
import { getErrorMessage } from '../api/client';
import {
  formatDate, formatDateLong, formatMoney, formatNumber,
} from '../lib/format';
import { EMPLOYMENT_TYPE_LABELS, ROLE_LABELS } from '../lib/constants';

function tenureLabel(joiningDate) {
  if (!joiningDate) return null;
  const start = new Date(`${joiningDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return null;
  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth();
  if (now.getDate() < start.getDate()) months -= 1;
  if (months < 0) return 'Starts soon';
  const years = Math.floor(months / 12);
  const remaining = months % 12;
  if (!years) return `${remaining} month${remaining === 1 ? '' : 's'}`;
  if (!remaining) return `${years} year${years === 1 ? '' : 's'}`;
  return `${years}y ${remaining}m`;
}

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { organization } = useAuth();
  const [employee, setEmployee] = useState(null);
  const [balances, setBalances] = useState(null);
  const [balanceError, setBalanceError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setBalanceError('');
    try {
      const result = await employeesApi.get(id);
      setEmployee(result);
      leavesApi.balances(id)
        .then((data) => setBalances(data))
        .catch((err) => setBalanceError(getErrorMessage(err, 'Leave balances could not be loaded.')));
    } catch (err) {
      setError(getErrorMessage(err, 'This employee could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async () => {
    if (!employee) return;
    if (employee.status === 'active') await employeesApi.deactivate(employee.id);
    else await employeesApi.activate(employee.id);
    toast.success(`${employee.fullName} ${employee.status === 'active' ? 'deactivated' : 'reactivated'}.`);
    await load();
  };

  if (loading) return <PageSkeleton />;

  if (error) {
    return (
      <div>
        <PageHeader
          title="Employee profile"
          actions={<Link to="/employees" className="btn btn-secondary"><ArrowLeft size={15} /> Back to directory</Link>}
        />
        <ErrorState message={error} onRetry={load} title="Employee unavailable" />
      </div>
    );
  }

  if (!employee) return null;

  const currency = organization?.currency || 'PKR';
  const active = employee.status === 'active';

  return (
    <div>
      <PageHeader
        eyebrow="Employee dossier"
        title={employee.fullName}
        description={`${employee.designation} · ${employee.department}`}
        actions={(
          <>
            <Link to="/employees" className="btn btn-secondary"><ArrowLeft size={15} /> Directory</Link>
            <Link to={`/employees/${employee.id}/edit`} className="btn btn-secondary"><Pencil size={15} /> Edit</Link>
            <button
              type="button"
              className={`btn ${active ? 'btn-danger' : 'btn-success'}`}
              onClick={() => setConfirm(true)}
            >
              {active ? <UserX size={15} /> : <UserCheck size={15} />}
              {active ? 'Deactivate' : 'Reactivate'}
            </button>
          </>
        )}
      />

      <section className="profile-hero">
        <Avatar name={employee.fullName} src={employee.avatarUrl} size="xl" />
        <div className="profile-hero-main">
          <div className="profile-hero-top">
            <h1>{employee.fullName}</h1>
            <Badge status={employee.status} />
            {employee.hasAccount ? <Badge status="active" label="Login linked" tone="success" /> : <Badge status="inactive" label="No login linked" />}
          </div>
          <p className="profile-hero-sub">
            {employee.designation} · {employee.department} · <span className="mono">{employee.code}</span>
          </p>
          <div className="profile-badges">
            <span className="badge badge-neutral">{EMPLOYMENT_TYPE_LABELS[employee.employmentType] || employee.employmentType}</span>
            <span className="badge badge-neutral">Joined {formatDate(employee.joiningDate)}</span>
            {tenureLabel(employee.joiningDate) && <span className="badge badge-brand">{tenureLabel(employee.joiningDate)} tenure</span>}
          </div>
        </div>
      </section>

      <div className="dash-grid mt-24">
        <div className="dash-stack">
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Contact details</h2>
                <p className="card-description">Reachable information on file.</p>
              </div>
            </div>
            <div className="card-body">
              <div className="approval-list">
                <div className="approval-row">
                  <span className="quick-tile-icon"><Mail size={15} /></span>
                  <div className="approval-copy">
                    <strong>Work email</strong>
                    <span>{employee.email || 'Not provided'}</span>
                  </div>
                </div>
                <div className="approval-row">
                  <span className="quick-tile-icon"><Phone size={15} /></span>
                  <div className="approval-copy">
                    <strong>Phone</strong>
                    <span>{employee.phone || 'Not provided'}</span>
                  </div>
                </div>
                <div className="approval-row">
                  <span className="quick-tile-icon"><ShieldCheck size={15} /></span>
                  <div className="approval-copy">
                    <strong>Emergency contact</strong>
                    <span>{employee.emergencyContact || 'Not provided'}</span>
                  </div>
                </div>
              </div>
              <div className="detail-grid mt-24">
                <div className="detail-item">
                  <dt>Address</dt>
                  <dd>{employee.address || 'Not provided'}</dd>
                </div>
                <div className="detail-item">
                  <dt>Joined</dt>
                  <dd>{formatDateLong(employee.joiningDate)}</dd>
                </div>
                <div className="detail-item">
                  <dt>Employee code</dt>
                  <dd className="mono">{employee.code}</dd>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Employment details</h2>
                <p className="card-description">Directory fields maintained by HR.</p>
              </div>
            </div>
            <div className="card-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <dt>Department</dt>
                  <dd>{employee.department}</dd>
                </div>
                <div className="detail-item">
                  <dt>Designation</dt>
                  <dd>{employee.designation}</dd>
                </div>
                <div className="detail-item">
                  <dt>Employment type</dt>
                  <dd>{EMPLOYMENT_TYPE_LABELS[employee.employmentType] || employee.employmentType}</dd>
                </div>
                <div className="detail-item">
                  <dt>Status</dt>
                  <dd>{active ? 'Active' : 'Inactive'}</dd>
                </div>
                <div className="detail-item">
                  <dt>Login account</dt>
                  <dd>{employee.hasAccount ? 'Linked' : 'Not linked'}</dd>
                </div>
                <div className="detail-item">
                  <dt>Created</dt>
                  <dd>{formatDate(employee.createdAt)}</dd>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Leave balances</h2>
                <p className="card-description">Current calendar year, including pending reservations.</p>
              </div>
            </div>
            <div className="card-body">
              {balanceError ? (
                <div className="notice-item">{balanceError}</div>
              ) : !balances ? (
                <div className="inline-loading">Loading balances…</div>
              ) : (
                <BalanceCards balances={balances.balances || []} compact />
              )}
            </div>
          </div>
        </div>

        <div className="dash-stack">
          <div className="compensation-card">
            <span className="label">Monthly basic salary</span>
            <div className="value">{formatMoney(employee.basicSalary, currency)}</div>
            <div className="split">
              <div>
                <span>Currency</span>
                <strong>{currency}</strong>
              </div>
              <div>
                <span>Payroll</span>
                <strong>Computed in runs</strong>
              </div>
              <div>
                <span>Attendance</span>
                <strong>Live records</strong>
              </div>
            </div>
            <p className="clock-note">
              Allowances, deductions and tax are calculated by the payroll engine when a run is generated.
            </p>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Quick links</h2>
                <p className="card-description">Related records for this employee.</p>
              </div>
            </div>
            <div className="card-body">
              <div className="quick-grid">
                <button type="button" className="quick-tile" onClick={() => navigate('/attendance')}>
                  <span className="quick-tile-icon"><CalendarDays size={15} /></span>
                  <span>
                    <strong>Attendance</strong>
                    <span>Daily overview and records</span>
                  </span>
                </button>
                <button type="button" className="quick-tile" onClick={() => navigate('/payroll')}>
                  <span className="quick-tile-icon"><UsersRound size={15} /></span>
                  <span>
                    <strong>Payroll</strong>
                    <span>Runs and payslip PDFs</span>
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h2 className="card-title">Account scope</h2>
              <p className="card-description mt-8">
                {employee.hasAccount
                  ? 'This employee has a login linked to their employee record. They can access their own attendance, leave and payslips.'
                  : 'No login is linked to this employee record. Their profile exists for operational records only.'}
              </p>
              {employee.hasAccount && (
                <div className="profile-meta-list">
                  <div className="profile-meta-row">
                    <span>Role</span>
                    <strong>{ROLE_LABELS.employee}</strong>
                  </div>
                  <div className="profile-meta-row">
                    <span>Employee ID</span>
                    <strong className="mono">{employee.id}</strong>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={handleToggle}
        title={active ? 'Deactivate employee?' : 'Reactivate employee?'}
        message={active
          ? `${employee.fullName} will be marked inactive and their login will be disabled. Historical records, leave and payroll entries are kept.`
          : `${employee.fullName} will be marked active and their login will be re-enabled.`}
        confirmLabel={active ? 'Deactivate' : 'Reactivate'}
        tone={active ? 'danger' : 'success'}
      />
    </div>
  );
}

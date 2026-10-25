import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Building2, CheckCircle2 } from 'lucide-react';
import AuthLayout from '../components/auth/AuthLayout';
import Field from '../components/ui/Field';
import PasswordInput from '../components/ui/PasswordInput';
import { useAuth } from '../context/AuthContext';
import authApi from '../api/auth';
import { getErrorMessage } from '../api/client';
import { validatePassword } from '../lib/validation';

const TIMEZONES = [
  'Asia/Karachi', 'Asia/Dubai', 'Asia/Riyadh', 'Asia/Kolkata', 'Asia/Kathmandu',
  'Europe/London', 'Europe/Berlin', 'America/New_York', 'America/Los_Angeles', 'UTC',
];
const CURRENCIES = ['PKR', 'USD', 'AED', 'SAR', 'GBP', 'EUR', 'INR', 'CAD', 'AUD'];

export default function SetupPage() {
  const { setup, isAuthenticated, loading, mustChangePassword } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState({ loading: true, required: false, companyName: '' });
  const [form, setForm] = useState({
    companyName: '',
    adminName: '',
    email: '',
    password: '',
    confirmPassword: '',
    timezone: 'Asia/Karachi',
    currency: 'PKR',
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    authApi.setupStatus()
      .then((data) => setStatus({ loading: false, required: Boolean(data.setupRequired), companyName: data.companyName || '' }))
      .catch((error) => setStatus({ loading: false, required: false, error: getErrorMessage(error) }));
  }, []);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate(mustChangePassword ? '/change-password' : '/', { replace: true });
    }
  }, [loading, isAuthenticated, mustChangePassword, navigate]);

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (form.companyName.trim().length < 2) nextErrors.companyName = 'Company name must be at least 2 characters.';
    if (form.adminName.trim().length < 2) nextErrors.adminName = 'Your name must be at least 2 characters.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) nextErrors.email = 'Enter a valid email address.';
    const passwordProblem = validatePassword(form.password);
    if (passwordProblem) nextErrors.password = passwordProblem;
    if (form.password !== form.confirmPassword) nextErrors.confirmPassword = 'Passwords do not match.';
    setErrors(nextErrors);
    setFormError('');
    if (Object.keys(nextErrors).length) return;

    setBusy(true);
    try {
      await setup({
        companyName: form.companyName.trim(),
        adminName: form.adminName.trim(),
        email: form.email.trim(),
        password: form.password,
        timezone: form.timezone,
        currency: form.currency,
      });
      navigate('/', { replace: true });
    } catch (error) {
      setFormError(getErrorMessage(error, 'Workspace setup failed.'));
    } finally {
      setBusy(false);
    }
  };

  if (!status.loading && !status.required) {
    return (
      <AuthLayout>
        <div className="auth-card">
          <div className="auth-form-head">
            <h1>Workspace already set up</h1>
            <p>This installation is already initialised. Sign in with your administrator account.</p>
          </div>
          <div className="auth-form">
            <div className="auth-alert auth-alert-success">
              <CheckCircle2 size={15} />
              <span>{status.companyName ? `${status.companyName} is ready.` : 'The workspace is ready.'}</span>
            </div>
            <Link to="/login" className="btn btn-primary btn-lg btn-block">Go to sign in</Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="auth-card auth-card-wide">
        <div className="auth-form-head">
          <p className="page-eyebrow">First-run setup</p>
          <h1>Create your workspace</h1>
          <p>This creates the company and the only initial administrator account. You can add HR accounts afterwards.</p>
        </div>

        <div className="auth-form">
          {status.error && (
            <div className="auth-alert">
              <AlertCircle size={15} />
              <span>{status.error}</span>
            </div>
          )}
          {formError && (
            <div className="auth-alert" role="alert">
              <AlertCircle size={15} />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="setup-section">
              <h2 className="form-section-title"><Building2 size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />Company</h2>
              <p className="form-section-help">The organisation name appears across dashboards and payslips.</p>
              <div className="form-grid">
                <Field label="Company name" htmlFor="setup-company" required error={errors.companyName} className="span-2">
                  {({ describedBy }) => (
                    <input
                      id="setup-company"
                      className="input"
                      value={form.companyName}
                      onChange={update('companyName')}
                      placeholder="Northstar Technologies"
                      aria-invalid={Boolean(errors.companyName)}
                      aria-describedby={describedBy}
                      disabled={busy}
                      autoFocus
                    />
                  )}
                </Field>
                <Field label="Currency" htmlFor="setup-currency" hint="Used for payroll and salary displays.">
                  {({ describedBy }) => (
                    <select id="setup-currency" className="select" value={form.currency} onChange={update('currency')} aria-describedby={describedBy} disabled={busy}>
                      {CURRENCIES.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                    </select>
                  )}
                </Field>
                <Field label="Timezone" htmlFor="setup-timezone" hint="Attendance and payroll dates use this timezone.">
                  {({ describedBy }) => (
                    <select id="setup-timezone" className="select" value={form.timezone} onChange={update('timezone')} aria-describedby={describedBy} disabled={busy}>
                      {TIMEZONES.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
                    </select>
                  )}
                </Field>
              </div>
            </div>

            <div className="setup-section">
              <h2 className="form-section-title">Administrator account</h2>
              <p className="form-section-help">You can add HR users and employees once setup is complete.</p>
              <div className="form-grid">
                <Field label="Your name" htmlFor="setup-name" required error={errors.adminName}>
                  {({ describedBy }) => (
                    <input
                      id="setup-name"
                      className="input"
                      value={form.adminName}
                      onChange={update('adminName')}
                      placeholder="Ayesha Khan"
                      autoComplete="name"
                      aria-invalid={Boolean(errors.adminName)}
                      aria-describedby={describedBy}
                      disabled={busy}
                    />
                  )}
                </Field>
                <Field label="Work email" htmlFor="setup-email" required error={errors.email}>
                  {({ describedBy }) => (
                    <input
                      id="setup-email"
                      className="input"
                      type="email"
                      value={form.email}
                      onChange={update('email')}
                      placeholder="admin@company.com"
                      autoComplete="username"
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={describedBy}
                      disabled={busy}
                    />
                  )}
                </Field>
                <Field label="Password" htmlFor="setup-password" required error={errors.password} hint="At least 8 characters with a letter and a number.">
                  {({ describedBy }) => (
                    <PasswordInput
                      id="setup-password"
                      value={form.password}
                      onChange={update('password')}
                      autoComplete="new-password"
                      placeholder="Create a password"
                      describedBy={describedBy}
                      disabled={busy}
                    />
                  )}
                </Field>
                <Field label="Confirm password" htmlFor="setup-confirm" required error={errors.confirmPassword}>
                  {({ describedBy }) => (
                    <PasswordInput
                      id="setup-confirm"
                      value={form.confirmPassword}
                      onChange={update('confirmPassword')}
                      autoComplete="new-password"
                      placeholder="Repeat the password"
                      describedBy={describedBy}
                      disabled={busy}
                    />
                  )}
                </Field>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy}>
              {busy ? 'Creating workspace…' : <>Create workspace <ArrowRight size={16} /></>}
            </button>
          </form>

          <p className="auth-form-footer">
            Already initialised? <Link to="/login">Sign in instead</Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}

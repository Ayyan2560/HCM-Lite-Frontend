import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, LockKeyhole } from 'lucide-react';
import AuthLayout from '../components/auth/AuthLayout';
import Field from '../components/ui/Field';
import PasswordInput from '../components/ui/PasswordInput';
import { useAuth } from '../context/AuthContext';
import authApi from '../api/auth';
import { getErrorMessage } from '../api/client';

export default function LoginPage() {
  const { login, isAuthenticated, loading, sessionMessage, mustChangePassword, clearSessionMessage } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [setup, setSetup] = useState({ loading: true, required: false, companyName: '' });

  useEffect(() => {
    let active = true;
    authApi.setupStatus()
      .then((data) => {
        if (active) setSetup({ loading: false, required: Boolean(data.setupRequired), companyName: data.companyName || '' });
      })
      .catch(() => {
        if (active) setSetup((current) => ({ ...current, loading: false }));
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate(mustChangePassword ? '/change-password' : (location.state?.from || '/'), { replace: true });
    }
  }, [loading, isAuthenticated, mustChangePassword, navigate, location.state]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!email.trim()) nextErrors.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) nextErrors.email = 'Enter a valid email address.';
    if (!password) nextErrors.password = 'Password is required.';
    setErrors(nextErrors);
    setFormError('');
    if (Object.keys(nextErrors).length) return;

    setBusy(true);
    try {
      clearSessionMessage();
      const session = await login({ email: email.trim(), password });
      navigate(session?.user?.mustChangePassword ? '/change-password' : (location.state?.from || '/'), { replace: true });
    } catch (error) {
      setFormError(getErrorMessage(error, 'Sign in failed.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      <div className="auth-card">
        <div className="auth-form-head">
          <h1>Welcome back</h1>
          <p>Sign in to your {setup.companyName || 'company'} workspace.</p>
        </div>

        <div className="auth-form">
          {sessionMessage && (
            <div className="auth-alert auth-alert-info" role="status">
              <AlertCircle size={15} />
              <span>{sessionMessage}</span>
            </div>
          )}
          {setup.required && (
            <div className="auth-alert auth-alert-info" role="status">
              <LockKeyhole size={15} />
              <span>
                This installation has not been set up yet.{' '}
                <Link to="/setup" style={{ fontWeight: 700, textDecoration: 'underline' }}>Create the workspace</Link>
              </span>
            </div>
          )}
          {formError && (
            <div className="auth-alert" role="alert">
              <AlertCircle size={15} />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <Field label="Work email" htmlFor="login-email" required error={errors.email}>
              {({ describedBy }) => (
                <input
                  id="login-email"
                  className="input"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@company.com"
                  autoComplete="username"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={describedBy}
                  disabled={busy}
                  autoFocus
                />
              )}
            </Field>
            <Field label="Password" htmlFor="login-password" required error={errors.password}>
              {({ describedBy }) => (
                <PasswordInput
                  id="login-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  describedBy={describedBy}
                  disabled={busy}
                />
              )}
            </Field>

            <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy}>
              {busy ? 'Signing in…' : <>Sign in <ArrowRight size={16} /></>}
            </button>
          </form>

          <p className="auth-form-footer">
            Accounts are provisioned by your administrator.
          </p>
        </div>

        <div className="auth-demo">
          <strong>Running the demo environment?</strong> The backend seed script creates the
          administrator and HR accounts. Use the credentials printed by <span className="mono">npm run seed</span>.
        </div>
      </div>
    </AuthLayout>
  );
}

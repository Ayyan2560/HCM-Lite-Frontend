import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, KeyRound } from 'lucide-react';
import AuthLayout from '../components/auth/AuthLayout';
import Field from '../components/ui/Field';
import PasswordInput from '../components/ui/PasswordInput';
import { useAuth } from '../context/AuthContext';
import authApi from '../api/auth';
import { getErrorMessage } from '../api/client';
import { validatePassword } from '../lib/validation';
import { useToast } from '../context/ToastContext';

export default function ChangePasswordPage() {
  const { user, mustChangePassword, updateUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!form.currentPassword) nextErrors.currentPassword = 'Current password is required.';
    const problem = validatePassword(form.newPassword);
    if (problem) nextErrors.newPassword = problem;
    if (form.newPassword === form.currentPassword) nextErrors.newPassword = 'The new password must be different from the current password.';
    if (form.newPassword !== form.confirmPassword) nextErrors.confirmPassword = 'Passwords do not match.';
    setErrors(nextErrors);
    setFormError('');
    setSuccess(false);
    if (Object.keys(nextErrors).length) return;

    setBusy(true);
    try {
      await authApi.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      updateUser({ mustChangePassword: false });
      setSuccess(true);
      toast.success('Your password has been updated.');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      if (mustChangePassword) {
        window.setTimeout(() => navigate('/', { replace: true }), 700);
      }
    } catch (error) {
      setFormError(getErrorMessage(error, 'Password could not be updated.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      <div className="auth-card">
        <div className="auth-form-head">
          <p className="page-eyebrow">Account security</p>
          <h1>Change your password</h1>
          <p>{user?.name ? `${user.name}, update the password for ${user.email}.` : 'Update the password for your account.'}</p>
        </div>

        <div className="auth-form">
          {mustChangePassword && (
            <div className="auth-alert auth-alert-info">
              <KeyRound size={15} />
              <span>Your account was created with a temporary password. Set a new password to continue into the workspace.</span>
            </div>
          )}
          {success && (
            <div className="auth-alert auth-alert-success" role="status">
              <CheckCircle2 size={15} />
              <span>Password updated. {mustChangePassword ? 'Taking you to your dashboard…' : ''}</span>
            </div>
          )}
          {formError && (
            <div className="auth-alert" role="alert">
              <AlertCircle size={15} />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <Field label="Current password" htmlFor="current-password" required error={errors.currentPassword}>
              {({ describedBy }) => (
                <PasswordInput
                  id="current-password"
                  value={form.currentPassword}
                  onChange={update('currentPassword')}
                  autoComplete="current-password"
                  placeholder="Enter your current password"
                  describedBy={describedBy}
                  disabled={busy}
                />
              )}
            </Field>
            <Field label="New password" htmlFor="new-password" required error={errors.newPassword} hint="At least 8 characters with a letter and a number.">
              {({ describedBy }) => (
                <PasswordInput
                  id="new-password"
                  value={form.newPassword}
                  onChange={update('newPassword')}
                  autoComplete="new-password"
                  placeholder="Create a new password"
                  describedBy={describedBy}
                  disabled={busy}
                />
              )}
            </Field>
            <Field label="Confirm new password" htmlFor="confirm-new-password" required error={errors.confirmPassword}>
              {({ describedBy }) => (
                <PasswordInput
                  id="confirm-new-password"
                  value={form.confirmPassword}
                  onChange={update('confirmPassword')}
                  autoComplete="new-password"
                  placeholder="Repeat the new password"
                  describedBy={describedBy}
                  disabled={busy}
                />
              )}
            </Field>

            <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy}>
              {busy ? 'Updating password…' : 'Update password'}
            </button>
          </form>

          {!mustChangePassword && (
            <p className="auth-form-footer">
              <Link to="/" className="text-button" style={{ justifyContent: 'center' }}>
                <ArrowLeft size={14} /> Back to dashboard
              </Link>
            </p>
          )}
        </div>
      </div>
    </AuthLayout>
  );
}

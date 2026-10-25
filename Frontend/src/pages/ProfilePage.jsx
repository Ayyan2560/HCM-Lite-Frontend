import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle, Briefcase, Building2, Camera, CheckCircle2, KeyRound, Mail,
  MapPin, Phone, ShieldCheck, UserRound,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Field from '../components/ui/Field';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import { Skeleton } from '../components/ui/Skeleton';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { employeesApi } from '../api/employees';
import { getErrorMessage, getFieldErrors } from '../api/client';
import { formatDate, formatDateTime, formatMoney } from '../lib/format';
import { EMPLOYMENT_TYPE_LABELS, ROLE_LABELS } from '../lib/constants';

const EMPTY_CONTACT = { phone: '', address: '', emergencyContact: '' };
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function ProfilePage() {
  const toast = useToast();
  const { user, employee, organization, updateEmployee } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [form, setForm] = useState(EMPTY_CONTACT);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const fileInput = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    setProfileError('');
    try {
      const result = await employeesApi.me();
      setProfile(result);
      setForm({
        phone: result.phone || '',
        address: result.address || '',
        emergencyContact: result.emergencyContact || '',
      });
      updateEmployee(result);
    } catch (err) {
      if (err.response?.status === 404) {
        setProfile(null);
      } else {
        setProfileError(getErrorMessage(err, 'Your employee profile could not be loaded.'));
      }
    } finally {
      setLoading(false);
    }
  }, [updateEmployee]);

  useEffect(() => { load(); }, [load]);

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const saveContact = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (form.phone.trim().length > 30) nextErrors.phone = 'Phone must be at most 30 characters.';
    if (form.address.trim().length > 300) nextErrors.address = 'Address must be at most 300 characters.';
    if (form.emergencyContact.trim().length > 120) nextErrors.emergencyContact = 'Emergency contact must be at most 120 characters.';
    setErrors(nextErrors);
    setFormError('');
    if (Object.keys(nextErrors).length) return;

    setSaving(true);
    try {
      const result = await employeesApi.updateMe({
        phone: form.phone.trim(),
        address: form.address.trim(),
        emergencyContact: form.emergencyContact.trim(),
      });
      setProfile(result);
      setForm({
        phone: result.phone || '',
        address: result.address || '',
        emergencyContact: result.emergencyContact || '',
      });
      updateEmployee(result);
      toast.success('Contact details updated.');
    } catch (err) {
      setErrors((current) => ({ ...current, ...getFieldErrors(err) }));
      setFormError(getErrorMessage(err, 'Contact details could not be updated.'));
    } finally {
      setSaving(false);
    }
  };

  const handleAvatar = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setAvatarError('');
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setAvatarError('Choose a JPEG, PNG or WebP image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('The image must be 5 MB or smaller.');
      return;
    }

    setUploading(true);
    try {
      const result = await employeesApi.uploadAvatar(file);
      setProfile((current) => (current ? { ...current, avatarUrl: result.avatarUrl } : current));
      updateEmployee({ avatarUrl: result.avatarUrl });
      toast.success('Profile photo updated.');
    } catch (err) {
      setAvatarError(getErrorMessage(err, 'The photo could not be uploaded.'));
    } finally {
      setUploading(false);
    }
  };

  const name = profile?.fullName || user?.name || 'Your account';
  const avatarUrl = profile?.avatarUrl || employee?.avatarUrl;
  const currency = organization?.currency || 'PKR';

  return (
    <div>
      <PageHeader
        eyebrow="Account"
        title="My profile"
        description="Your account details and the employee record your workspace is linked to."
        actions={<Link to="/change-password" className="btn btn-secondary"><KeyRound size={15} /> Change password</Link>}
      />

      <div className="profile-layout">
        <div className="dash-stack">
          <div className="card profile-card">
            {loading ? (
              <>
                <Skeleton width="84px" height="84px" radius="50%" />
                <Skeleton width="60%" height="18px" className="mt-16" />
                <Skeleton width="45%" height="11px" className="mt-8" />
              </>
            ) : (
              <>
                <Avatar name={name} src={avatarUrl} size="xl" />
                <h2>{name}</h2>
                <p>{user?.email}</p>
                <div className="profile-badges" style={{ justifyContent: 'center' }}>
                  <Badge status={user?.role} />
                  {user?.mustChangePassword
                    ? <Badge status="pending" label="Password change required" />
                    : <Badge status="active" label="Account secured" />}
                </div>

                {profile && (
                  <div className="avatar-upload">
                    <input
                      ref={fileInput}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleAvatar}
                      aria-label="Upload profile photo"
                    />
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => fileInput.current?.click()}
                      disabled={uploading}
                    >
                      <Camera size={14} /> {uploading ? 'Uploading…' : 'Change photo'}
                    </button>
                    <p className="avatar-upload-hint">JPEG, PNG or WebP · up to 5 MB</p>
                    {avatarError && <p className="field-error"><AlertCircle size={13} /> {avatarError}</p>}
                  </div>
                )}
              </>
            )}

            <div className="profile-meta-list">
              <div className="profile-meta-row">
                <span>Role</span>
                <strong>{ROLE_LABELS[user?.role] || 'Member'}</strong>
              </div>
              {profile && (
                <div className="profile-meta-row">
                  <span>Employee code</span>
                  <strong className="mono">{profile.code}</strong>
                </div>
              )}
              {profile && (
                <div className="profile-meta-row">
                  <span>Department</span>
                  <strong>{profile.department}</strong>
                </div>
              )}
              <div className="profile-meta-row">
                <span>Last sign-in</span>
                <strong>{user?.lastLoginAt ? formatDateTime(user.lastLoginAt) : '—'}</strong>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Account security</h2>
                <p className="card-description">Sign-in and password status.</p>
              </div>
            </div>
            <div className="card-body">
              <div className="profile-meta-list" style={{ marginTop: 0, paddingTop: 0, borderTop: 0 }}>
                <div className="profile-meta-row">
                  <span>Sign-in email</span>
                  <strong>{user?.email}</strong>
                </div>
                <div className="profile-meta-row">
                  <span>Password</span>
                  <strong>{user?.mustChangePassword ? 'Temporary password in use' : 'Updated by you'}</strong>
                </div>
              </div>
              <Link to="/change-password" className="btn btn-secondary btn-block mt-16">
                <KeyRound size={15} /> {user?.mustChangePassword ? 'Set a new password' : 'Change password'}
              </Link>
            </div>
          </div>
        </div>

        <div className="dash-stack">
          {loading ? (
            <div className="card"><div className="card-body">
              <Skeleton width="35%" height="18px" />
              <Skeleton width="100%" height="40px" className="mt-16" />
              <Skeleton width="100%" height="40px" className="mt-12" />
              <Skeleton width="100%" height="90px" className="mt-12" />
            </div></div>
          ) : profileError ? (
            <ErrorState message={profileError} onRetry={load} title="Employee profile unavailable" />
          ) : !profile ? (
            <EmptyState
              icon={UserRound}
              title="No employee profile linked"
              message={user?.role === 'employee'
                ? 'Your login is active but is not linked to an employee record. Ask HR to link it so attendance, leave and payslips become available.'
                : 'This account administers the workspace but is not linked to an employee record. Staff accounts do not require one.'}
            />
          ) : (
            <>
              <div className="card">
                <div className="card-header">
                  <div>
                    <h2 className="card-title">Contact details</h2>
                    <p className="card-description">You can update these fields yourself. HR controls employment data.</p>
                  </div>
                </div>
                <div className="card-body">
                  {formError && <div className="auth-alert" role="alert"><span>{formError}</span></div>}
                  <form onSubmit={saveContact} noValidate>
                    <div className="form-grid">
                      <Field label="Phone" htmlFor="profile-phone" optional error={errors.phone} hint="Include the country code.">
                        {({ describedBy }) => (
                          <input
                            id="profile-phone"
                            className="input"
                            value={form.phone}
                            onChange={update('phone')}
                            autoComplete="tel"
                            aria-invalid={Boolean(errors.phone)}
                            aria-describedby={describedBy}
                            disabled={saving}
                            placeholder="+92 300 1234567"
                          />
                        )}
                      </Field>
                      <Field label="Emergency contact" htmlFor="profile-emergency" optional error={errors.emergencyContact} hint="Name and phone number.">
                        {({ describedBy }) => (
                          <input
                            id="profile-emergency"
                            className="input"
                            value={form.emergencyContact}
                            onChange={update('emergencyContact')}
                            aria-invalid={Boolean(errors.emergencyContact)}
                            aria-describedby={describedBy}
                            disabled={saving}
                            placeholder="Sara Khan · +92 300 7654321"
                          />
                        )}
                      </Field>
                      <Field label="Address" htmlFor="profile-address" optional error={errors.address} className="span-2">
                        {({ describedBy }) => (
                          <textarea
                            id="profile-address"
                            className="textarea"
                            rows={3}
                            value={form.address}
                            onChange={update('address')}
                            aria-invalid={Boolean(errors.address)}
                            aria-describedby={describedBy}
                            disabled={saving}
                            placeholder="House, street, city"
                          />
                        )}
                      </Field>
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="btn btn-primary" disabled={saving}>
                        <CheckCircle2 size={15} /> {saving ? 'Saving…' : 'Save contact details'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <div>
                    <h2 className="card-title">Employment record</h2>
                    <p className="card-description">Maintained by HR. Contact them to request a change.</p>
                  </div>
                  <Badge status={profile.status} />
                </div>
                <div className="card-body">
                  <div className="approval-list">
                    <div className="approval-row">
                      <span className="quick-tile-icon"><Mail size={15} /></span>
                      <div className="approval-copy">
                        <strong>Work email</strong>
                        <span>{profile.email || 'Not provided'}</span>
                      </div>
                    </div>
                    <div className="approval-row">
                      <span className="quick-tile-icon"><Building2 size={15} /></span>
                      <div className="approval-copy">
                        <strong>Department & designation</strong>
                        <span>{profile.department} · {profile.designation}</span>
                      </div>
                    </div>
                    <div className="approval-row">
                      <span className="quick-tile-icon"><Briefcase size={15} /></span>
                      <div className="approval-copy">
                        <strong>Employment type</strong>
                        <span>{EMPLOYMENT_TYPE_LABELS[profile.employmentType] || profile.employmentType}</span>
                      </div>
                    </div>
                    <div className="approval-row">
                      <span className="quick-tile-icon"><MapPin size={15} /></span>
                      <div className="approval-copy">
                        <strong>Address on file</strong>
                        <span>{profile.address || 'Not provided'}</span>
                      </div>
                    </div>
                    <div className="approval-row">
                      <span className="quick-tile-icon"><Phone size={15} /></span>
                      <div className="approval-copy">
                        <strong>Phone on file</strong>
                        <span>{profile.phone || 'Not provided'}</span>
                      </div>
                    </div>
                    <div className="approval-row">
                      <span className="quick-tile-icon"><ShieldCheck size={15} /></span>
                      <div className="approval-copy">
                        <strong>Emergency contact</strong>
                        <span>{profile.emergencyContact || 'Not provided'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="detail-grid mt-24">
                    <div className="detail-item">
                      <dt>Employee code</dt>
                      <dd className="mono">{profile.code}</dd>
                    </div>
                    <div className="detail-item">
                      <dt>Joining date</dt>
                      <dd>{formatDate(profile.joiningDate)}</dd>
                    </div>
                    <div className="detail-item">
                      <dt>Monthly basic salary</dt>
                      <dd>{profile.basicSalary === undefined ? 'Restricted' : formatMoney(profile.basicSalary, currency)}</dd>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

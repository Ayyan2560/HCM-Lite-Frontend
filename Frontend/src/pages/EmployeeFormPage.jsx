import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, Copy, KeyRound, Save, UserPlus,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Field from '../components/ui/Field';
import Modal from '../components/ui/Modal';
import ErrorState from '../components/ui/ErrorState';
import { Skeleton } from '../components/ui/Skeleton';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { employeesApi } from '../api/employees';
import { getErrorMessage, getFieldErrors } from '../api/client';
import { copyText } from '../lib/browser';
import { formatMoney, todayKey } from '../lib/format';
import { EMPLOYMENT_TYPE_LABELS } from '../lib/constants';
import { compactErrors, isEmail } from '../lib/validation';

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  code: '',
  email: '',
  phone: '',
  department: '',
  designation: '',
  joiningDate: '',
  basicSalary: '',
  employmentType: 'full-time',
  address: '',
  emergencyContact: '',
};

const EMPLOYMENT_TYPES = ['full-time', 'part-time', 'contract'];

export default function EmployeeFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const { organization } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [credentials, setCredentials] = useState(null);

  const currency = meta?.currency || organization?.currency || 'PKR';
  const departments = useMemo(
    () => meta?.departments || organization?.departments?.map((item) => item.name) || [],
    [meta, organization],
  );
  const designations = meta?.designations || organization?.designations || [];

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setLoadError('');
      try {
        const [metaResult, employeeResult] = await Promise.all([
          employeesApi.meta().catch(() => null),
          editing ? employeesApi.get(id) : Promise.resolve(null),
        ]);
        if (!active) return;
        setMeta(metaResult);
        if (employeeResult) {
          setForm({
            firstName: employeeResult.firstName || '',
            lastName: employeeResult.lastName || '',
            code: employeeResult.code || '',
            email: employeeResult.email || '',
            phone: employeeResult.phone || '',
            department: employeeResult.department || '',
            designation: employeeResult.designation || '',
            joiningDate: employeeResult.joiningDate || '',
            basicSalary: employeeResult.basicSalary ?? '',
            employmentType: employeeResult.employmentType || 'full-time',
            address: employeeResult.address || '',
            emergencyContact: employeeResult.emergencyContact || '',
          });
        } else {
          setForm((current) => ({
            ...current,
            department: current.department || metaResult?.departments?.[0] || '',
            joiningDate: current.joiningDate || todayKey(organization?.timezone),
          }));
        }
      } catch (error) {
        if (active) setLoadError(getErrorMessage(error, 'This employee could not be loaded.'));
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [editing, id, organization?.timezone]);

  const update = (field) => (event) => {
    const value = event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (!form.firstName.trim()) next.firstName = 'First name is required.';
    else if (form.firstName.trim().length > 80) next.firstName = 'First name must be at most 80 characters.';
    if (!form.lastName.trim()) next.lastName = 'Last name is required.';
    else if (form.lastName.trim().length > 80) next.lastName = 'Last name must be at most 80 characters.';
    if (!editing) {
      if (!form.code.trim()) next.code = 'Employee code is required.';
      else if (!/^[A-Za-z0-9_-]{2,24}$/.test(form.code.trim())) next.code = 'Use 2–24 letters, numbers, hyphens or underscores.';
    }
    if (!form.email.trim()) next.email = 'Work email is required.';
    else if (!isEmail(form.email)) next.email = 'Enter a valid email address.';
    if (!form.department) next.department = 'Choose a department.';
    if (!form.designation.trim()) next.designation = 'Designation is required.';
    if (!form.joiningDate) next.joiningDate = 'Joining date is required.';
    const salary = Number(form.basicSalary);
    if (form.basicSalary === '' || !Number.isFinite(salary)) next.basicSalary = 'Basic salary is required.';
    else if (salary < 1) next.basicSalary = 'Basic salary must be greater than zero.';
    else if (salary > 100000000) next.basicSalary = 'Basic salary is out of range.';
    if (!EMPLOYMENT_TYPES.includes(form.employmentType)) next.employmentType = 'Choose an employment type.';
    if (form.phone.trim().length > 30) next.phone = 'Phone number must be at most 30 characters.';
    if (form.address.trim().length > 300) next.address = 'Address must be at most 300 characters.';
    if (form.emergencyContact.trim().length > 120) next.emergencyContact = 'Emergency contact must be at most 120 characters.';
    return compactErrors(next);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    setFormError('');
    if (Object.keys(nextErrors).length) {
      document.querySelector('.field-invalid input, .field-invalid select, .field-invalid textarea')?.focus();
      return;
    }

    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      department: form.department,
      designation: form.designation.trim(),
      joiningDate: form.joiningDate,
      basicSalary: Number(form.basicSalary),
      employmentType: form.employmentType,
      address: form.address.trim(),
      emergencyContact: form.emergencyContact.trim(),
    };
    if (!editing) payload.code = form.code.trim().toUpperCase();

    setBusy(true);
    try {
      if (editing) {
        await employeesApi.update(id, payload);
        toast.success('Employee details updated.');
        navigate(`/employees/${id}`);
      } else {
        const result = await employeesApi.create(payload);
        toast.success(`${result.employee.fullName} was added to the directory.`);
        setCredentials(result);
        setForm({ ...EMPTY_FORM, department: departments[0] || '', joiningDate: todayKey(organization?.timezone) });
      }
    } catch (error) {
      setErrors((current) => ({ ...current, ...getFieldErrors(error) }));
      setFormError(getErrorMessage(error, 'The employee could not be saved.'));
    } finally {
      setBusy(false);
    }
  };

  const closeCredentials = () => {
    const employeeId = credentials?.employee?.id;
    setCredentials(null);
    if (employeeId) navigate(`/employees/${employeeId}`);
  };

  if (loading) {
    return (
      <div>
        <Skeleton width="240px" height="27px" />
        <Skeleton width="420px" height="12px" className="mt-8" />
        <div className="card mt-24">
          <div className="card-body">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} height="42px" className="mb-16" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div>
        <PageHeader title={editing ? 'Edit employee' : 'Add employee'} actions={<Link to="/employees" className="btn btn-secondary"><ArrowLeft size={15} /> Back to directory</Link>} />
        <ErrorState message={loadError} onRetry={() => window.location.reload()} title="Employee unavailable" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Workforce"
        title={editing ? `Edit ${form.firstName} ${form.lastName}`.trim() : 'Add employee'}
        description={editing
          ? 'Update directory, employment and contact details. Salary changes are audited.'
          : 'Create an employee profile and a login account. A temporary password is shown once after saving.'}
        actions={(
          <Link to={editing ? `/employees/${id}` : '/employees'} className="btn btn-secondary">
            <ArrowLeft size={15} /> {editing ? 'Back to profile' : 'Back to directory'}
          </Link>
        )}
      />

      {formError && (
        <div className="auth-alert" role="alert">
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="card">
          <div className="card-body">
            <div className="form-section">
              <h2 className="form-section-title">Personal details</h2>
              <p className="form-section-help">The name and email are used across attendance, leave and payslips.</p>
              <div className="form-grid">
                <Field label="First name" htmlFor="employee-first-name" required error={errors.firstName}>
                  {({ describedBy }) => (
                    <input id="employee-first-name" className="input" value={form.firstName} onChange={update('firstName')} autoComplete="given-name" aria-invalid={Boolean(errors.firstName)} aria-describedby={describedBy} disabled={busy} autoFocus />
                  )}
                </Field>
                <Field label="Last name" htmlFor="employee-last-name" required error={errors.lastName}>
                  {({ describedBy }) => (
                    <input id="employee-last-name" className="input" value={form.lastName} onChange={update('lastName')} autoComplete="family-name" aria-invalid={Boolean(errors.lastName)} aria-describedby={describedBy} disabled={busy} />
                  )}
                </Field>
                <Field label="Work email" htmlFor="employee-email" required error={errors.email} hint="Also used as the employee's sign-in email.">
                  {({ describedBy }) => (
                    <input id="employee-email" className="input" type="email" value={form.email} onChange={update('email')} autoComplete="email" aria-invalid={Boolean(errors.email)} aria-describedby={describedBy} disabled={busy} />
                  )}
                </Field>
                <Field label="Phone" htmlFor="employee-phone" optional error={errors.phone}>
                  {({ describedBy }) => (
                    <input id="employee-phone" className="input" value={form.phone} onChange={update('phone')} autoComplete="tel" aria-invalid={Boolean(errors.phone)} aria-describedby={describedBy} disabled={busy} placeholder="+92 300 1234567" />
                  )}
                </Field>
              </div>
            </div>

            <div className="form-section">
              <h2 className="form-section-title">Employment</h2>
              <p className="form-section-help">Department options come from the organization configuration.</p>
              <div className="form-grid-three">
                <Field label="Employee code" htmlFor="employee-code" required={!editing} error={errors.code} hint={editing ? 'Employee codes cannot be changed.' : '2–24 letters, numbers, hyphens or underscores.'}>
                  {({ describedBy }) => (
                    <input id="employee-code" className="input mono" value={form.code} onChange={update('code')} aria-invalid={Boolean(errors.code)} aria-describedby={describedBy} disabled={busy || editing} placeholder="EMP-101" />
                  )}
                </Field>
                <Field label="Department" htmlFor="employee-department" required error={errors.department}>
                  {({ describedBy }) => (
                    <select id="employee-department" className="select" value={form.department} onChange={update('department')} aria-invalid={Boolean(errors.department)} aria-describedby={describedBy} disabled={busy}>
                      <option value="">Select a department</option>
                      {departments.map((name) => <option key={name} value={name}>{name}</option>)}
                    </select>
                  )}
                </Field>
                <Field label="Designation" htmlFor="employee-designation" required error={errors.designation}>
                  {({ describedBy }) => (
                    <>
                      <input
                        id="employee-designation"
                        className="input"
                        value={form.designation}
                        onChange={update('designation')}
                        aria-invalid={Boolean(errors.designation)}
                        aria-describedby={describedBy}
                        disabled={busy}
                        list="designation-options"
                        placeholder="Software Engineer"
                      />
                      <datalist id="designation-options">
                        {designations.map((name) => <option key={name} value={name} />)}
                      </datalist>
                    </>
                  )}
                </Field>
                <Field label="Joining date" htmlFor="employee-joining" required error={errors.joiningDate}>
                  {({ describedBy }) => (
                    <input id="employee-joining" className="input" type="date" value={form.joiningDate} onChange={update('joiningDate')} aria-invalid={Boolean(errors.joiningDate)} aria-describedby={describedBy} disabled={busy} />
                  )}
                </Field>
                <Field label={`Basic salary (${currency})`} htmlFor="employee-salary" required error={errors.basicSalary} hint="Gross salary, allowances and tax are calculated by payroll.">
                  {({ describedBy }) => (
                    <input id="employee-salary" className="input" type="number" min="1" step="0.01" value={form.basicSalary} onChange={update('basicSalary')} aria-invalid={Boolean(errors.basicSalary)} aria-describedby={describedBy} disabled={busy} placeholder="120000" />
                  )}
                </Field>
                <Field label="Employment type" htmlFor="employee-type" required error={errors.employmentType}>
                  {({ describedBy }) => (
                    <select id="employee-type" className="select" value={form.employmentType} onChange={update('employmentType')} aria-invalid={Boolean(errors.employmentType)} aria-describedby={describedBy} disabled={busy}>
                      {EMPLOYMENT_TYPES.map((type) => <option key={type} value={type}>{EMPLOYMENT_TYPE_LABELS[type]}</option>)}
                    </select>
                  )}
                </Field>
              </div>
            </div>

            <div className="form-section">
              <h2 className="form-section-title">Contact & emergency</h2>
              <p className="form-section-help">Optional details for the employee dossier.</p>
              <div className="form-grid">
                <Field label="Address" htmlFor="employee-address" optional error={errors.address} className="span-2">
                  {({ describedBy }) => (
                    <textarea id="employee-address" className="textarea" rows={3} value={form.address} onChange={update('address')} aria-invalid={Boolean(errors.address)} aria-describedby={describedBy} disabled={busy} placeholder="House, street, city" />
                  )}
                </Field>
                <Field label="Emergency contact" htmlFor="employee-emergency" optional error={errors.emergencyContact} hint="Name and phone number.">
                  {({ describedBy }) => (
                    <input id="employee-emergency" className="input" value={form.emergencyContact} onChange={update('emergencyContact')} aria-invalid={Boolean(errors.emergencyContact)} aria-describedby={describedBy} disabled={busy} placeholder="Sara Khan · +92 300 7654321" />
                  )}
                </Field>
              </div>
            </div>

            <div className="form-actions">
              <Link to={editing ? `/employees/${id}` : '/employees'} className="btn btn-secondary">Cancel</Link>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {editing ? <Save size={15} /> : <UserPlus size={15} />}
                {busy ? 'Saving…' : editing ? 'Save changes' : 'Create employee'}
              </button>
            </div>
          </div>
        </div>
      </form>

      <Modal
        open={Boolean(credentials)}
        onClose={closeCredentials}
        title="Employee created"
        description="The login is active. The temporary password is shown once — share it securely."
        size="md"
        footer={(
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setCredentials(null)}>Add another</button>
            <button type="button" className="btn btn-primary" onClick={closeCredentials}>Open employee profile</button>
          </>
        )}
      >
        {credentials && (
          <>
            <div className="success-banner">
              <CheckCircle2 size={16} />
              <span><strong>{credentials.employee?.fullName}</strong> was created and can sign in immediately.</span>
            </div>
            <div className="credentials-box">
              <div className="credential-row">
                <span>Employee code</span>
                <code>{credentials.employee?.code}</code>
              </div>
              <div className="credential-row">
                <span>Sign-in email</span>
                <code>{credentials.credentials?.email}</code>
              </div>
              <div className="credential-row">
                <span>Temporary password</span>
                <span className="copy-value">
                  <code>{credentials.credentials?.temporaryPassword}</code>
                  <button
                    type="button"
                    onClick={() => copyText(credentials.credentials?.temporaryPassword).then(() => toast.success('Temporary password copied.'))}
                    aria-label="Copy temporary password"
                  >
                    <Copy size={13} />
                  </button>
                </span>
              </div>
              <div className="credential-row">
                <span>Monthly basic salary</span>
                <code>{formatMoney(credentials.employee?.basicSalary, currency)}</code>
              </div>
            </div>
            <div className="info-banner mt-16">
              <KeyRound size={16} />
              <span>The employee must set a new password on first sign-in. This password cannot be retrieved later.</span>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, Building2, CalendarDays, CheckCircle2, Clock3, Copy, KeyRound,
  MapPin, Plus, RefreshCw, Save, ShieldCheck, Trash2, UserPlus, UsersRound, X,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Tabs from '../components/ui/Tabs';
import Field from '../components/ui/Field';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { TableSkeleton } from '../components/ui/Skeleton';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import organizationApi from '../api/organization';
import { getErrorMessage, getFieldErrors } from '../api/client';
import { copyText } from '../lib/browser';
import { formatDate, formatDateTime, isDateKey } from '../lib/format';
import { ROLE_LABELS, WEEKDAYS } from '../lib/constants';

const CURRENCIES = ['PKR', 'USD', 'AED', 'SAR', 'GBP', 'EUR', 'INR', 'CAD', 'AUD'];
const TIMEZONES = [
  'Asia/Karachi', 'Asia/Dubai', 'Asia/Riyadh', 'Asia/Kolkata', 'Asia/Kathmandu',
  'Europe/London', 'Europe/Berlin', 'America/New_York', 'America/Los_Angeles', 'UTC',
];

function mapOrganization(org) {
  return {
    name: org.name || '',
    currency: org.currency || 'PKR',
    timezone: org.timezone || 'Asia/Karachi',
    workStartTime: org.workStartTime || '09:00',
    graceMinutes: String(org.graceMinutes ?? 15),
    halfDayHours: String(org.halfDayHours ?? 5),
    weekendDays: [...(org.weekendDays || [])],
    officeLatitude: String(org.officeLatitude ?? ''),
    officeLongitude: String(org.officeLongitude ?? ''),
    geofenceRadius: String(org.geofenceRadius ?? 150),
    geofenceEnabled: Boolean(org.geofenceEnabled),
    leavePolicy: {
      annual: String(org.leavePolicy?.annual ?? 14),
      sick: String(org.leavePolicy?.sick ?? 8),
      casual: String(org.leavePolicy?.casual ?? 10),
      unpaid: org.leavePolicy?.unpaid === null || org.leavePolicy?.unpaid === undefined ? '' : String(org.leavePolicy.unpaid),
    },
    departments: (org.departments || []).map((department) => department.name),
    designations: [...(org.designations || [])],
    publicHolidays: (org.publicHolidays || []).map((holiday) => ({ date: holiday.date, name: holiday.name })),
  };
}

const EMPTY_HR = { name: '', email: '' };

export default function OrganizationPage() {
  const [tab, setTab] = useState('configuration');

  return (
    <div>
      <PageHeader
        eyebrow="Administration"
        title="Organization"
        description="Company-wide policy, working calendar and administrator-managed staff accounts."
      />

      <Tabs
        label="Organization sections"
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'configuration', label: 'Configuration' },
          { id: 'users', label: 'Team accounts' },
        ]}
      />

      <div className="mt-24" hidden={tab !== 'configuration'}>
        <ConfigurationPanel />
      </div>
      <div className="mt-24" hidden={tab !== 'users'}>
        <UsersPanel />
      </div>
    </div>
  );
}

/* ── Configuration ─────────────────────────────────────────────────────── */

function ConfigurationPanel() {
  const toast = useToast();
  const { updateOrganization } = useAuth();
  const [form, setForm] = useState(null);
  const [original, setOriginal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await organizationApi.get();
      const mapped = mapOrganization(result);
      setForm(mapped);
      setOriginal(mapped);
      setErrors({});
      setFormError('');
      updateOrganization(result);
    } catch (err) {
      setError(getErrorMessage(err, 'Organization settings could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, [updateOrganization]);

  useEffect(() => { load(); }, [load]);

  const dirty = useMemo(() => {
    if (!form || !original) return false;
    return JSON.stringify(form) !== JSON.stringify(original);
  }, [form, original]);

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const updatePolicy = (field) => (event) => {
    setForm((current) => ({
      ...current,
      leavePolicy: { ...current.leavePolicy, [field]: event.target.value },
    }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const toggleWeekend = (day) => {
    setForm((current) => {
      const has = current.weekendDays.includes(day);
      return {
        ...current,
        weekendDays: has
          ? current.weekendDays.filter((value) => value !== day)
          : [...current.weekendDays, day].sort(),
      };
    });
  };

  const validate = () => {
    const next = {};
    const numberInRange = (field, value, min, max, integer, label) => {
      const number = Number(value);
      if (value === '' || !Number.isFinite(number)) next[field] = `${label} is required.`;
      else if (integer && !Number.isInteger(number)) next[field] = `${label} must be a whole number.`;
      else if (number < min || number > max) next[field] = `${label} must be between ${min} and ${max}.`;
    };

    if (form.name.trim().length < 2) next.name = 'Company name must be at least 2 characters.';
    else if (form.name.trim().length > 160) next.name = 'Company name must be at most 160 characters.';
    if (!/^[A-Za-z]{2,8}$/.test(form.currency.trim())) next.currency = 'Use a 2–8 letter currency code.';
    if (form.timezone.trim().length < 3) next.timezone = 'Choose a timezone.';
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(form.workStartTime)) next.workStartTime = 'Work start time must use HH:mm.';
    numberInRange('graceMinutes', form.graceMinutes, 0, 240, true, 'Grace period');
    numberInRange('halfDayHours', form.halfDayHours, 1, 12, false, 'Half-day threshold');
    numberInRange('officeLatitude', form.officeLatitude, -90, 90, false, 'Office latitude');
    numberInRange('officeLongitude', form.officeLongitude, -180, 180, false, 'Office longitude');
    numberInRange('geofenceRadius', form.geofenceRadius, 20, 5000, false, 'Geofence radius');

    ['annual', 'sick', 'casual'].forEach((field) => {
      numberInRange(field, form.leavePolicy[field], 0, 365, false, `${field[0].toUpperCase()}${field.slice(1)} leave quota`);
    });
    if (form.leavePolicy.unpaid !== '') {
      numberInRange('unpaid', form.leavePolicy.unpaid, 0, 365, false, 'Unpaid leave quota');
    }

    if (form.departments.length === 0) next.departments = 'Keep at least one department so employees can be assigned.';
    else if (form.departments.some((name) => !name.trim() || name.trim().length > 80)) {
      next.departments = 'Every department needs a name of at most 80 characters.';
    }

    if (form.designations.some((name) => !name.trim() || name.trim().length > 80)) {
      next.designations = 'Every designation needs a name of at most 80 characters.';
    }

    const holidayDates = new Set();
    form.publicHolidays.forEach((holiday) => {
      if (!isDateKey(holiday.date)) next.holidays = 'Every public holiday needs a valid date.';
      if (!holiday.name.trim() || holiday.name.trim().length < 2 || holiday.name.trim().length > 120) {
        next.holidays = 'Every public holiday needs a name of 2–120 characters.';
      }
      if (holiday.date && holidayDates.has(holiday.date)) next.holidays = 'Two public holidays cannot share the same date.';
      if (holiday.date) holidayDates.add(holiday.date);
    });

    return next;
  };

  const handleSave = async () => {
    const nextErrors = validate();
    setErrors(nextErrors);
    setFormError('');
    if (Object.keys(nextErrors).length) {
      document.querySelector('.field-invalid input, .field-invalid select, .field-invalid textarea')?.focus();
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        currency: form.currency.trim().toUpperCase(),
        timezone: form.timezone.trim(),
        workStartTime: form.workStartTime,
        graceMinutes: Number(form.graceMinutes),
        halfDayHours: Number(form.halfDayHours),
        weekendDays: form.weekendDays,
        officeLatitude: Number(form.officeLatitude),
        officeLongitude: Number(form.officeLongitude),
        geofenceRadius: Number(form.geofenceRadius),
        geofenceEnabled: form.geofenceEnabled,
        leavePolicy: {
          annual: Number(form.leavePolicy.annual),
          sick: Number(form.leavePolicy.sick),
          casual: Number(form.leavePolicy.casual),
          unpaid: form.leavePolicy.unpaid === '' ? null : Number(form.leavePolicy.unpaid),
        },
        departments: form.departments.map((name) => name.trim()).filter(Boolean),
        designations: form.designations.map((name) => name.trim()).filter(Boolean),
        publicHolidays: form.publicHolidays
          .map((holiday) => ({ date: holiday.date, name: holiday.name.trim() }))
          .sort((a, b) => a.date.localeCompare(b.date)),
      };
      const result = await organizationApi.update(payload);
      const mapped = mapOrganization(result);
      setForm(mapped);
      setOriginal(mapped);
      updateOrganization(result);
      toast.success('Organization settings saved.');
    } catch (err) {
      setErrors((current) => ({ ...current, ...getFieldErrors(err) }));
      setFormError(getErrorMessage(err, 'Organization settings could not be saved.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="card-body"><TableSkeleton rows={8} columns={3} /></div>
      </div>
    );
  }

  if (error) return <ErrorState message={error} onRetry={load} title="Organization settings unavailable" />;
  if (!form) return null;

  return (
    <div className="settings-card">
      <div className="settings-card-head">
        <div>
          <h2>Company configuration</h2>
          <p>These settings drive attendance classification, leave quotas and payroll dates across the workspace.</p>
        </div>
        <div className="toolbar">
          <button type="button" className="btn btn-secondary btn-sm" onClick={load} disabled={saving}>
            <RefreshCw size={14} /> Reload
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving || !dirty}>
            <Save size={14} /> {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>

      <div className="settings-body">
        {formError && <div className="auth-alert" role="alert"><AlertCircle size={15} /><span>{formError}</span></div>}

        <section className="settings-section">
          <h3><Building2 size={14} style={{ verticalAlign: '-2px', marginRight: 5 }} />Company identity</h3>
          <p>Shown in the sidebar, announcements and generated payslips.</p>
          <div className="form-grid">
            <Field label="Company name" htmlFor="org-name" required error={errors.name} className="span-2">
              {({ describedBy }) => (
                <input
                  id="org-name"
                  className="input"
                  value={form.name}
                  onChange={update('name')}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={describedBy}
                  disabled={saving}
                />
              )}
            </Field>
            <Field label="Currency" htmlFor="org-currency" required error={errors.currency} hint="Used for salaries, payroll and payslips.">
              {({ describedBy }) => (
                <select
                  id="org-currency"
                  className="select"
                  value={form.currency}
                  onChange={update('currency')}
                  aria-invalid={Boolean(errors.currency)}
                  aria-describedby={describedBy}
                  disabled={saving}
                >
                  {CURRENCIES.includes(form.currency) ? null : <option value={form.currency}>{form.currency}</option>}
                  {CURRENCIES.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                </select>
              )}
            </Field>
            <Field label="Timezone" htmlFor="org-timezone" required error={errors.timezone} hint="Controls today's date, attendance and payroll cutoffs.">
              {({ describedBy }) => (
                <select
                  id="org-timezone"
                  className="select"
                  value={form.timezone}
                  onChange={update('timezone')}
                  aria-invalid={Boolean(errors.timezone)}
                  aria-describedby={describedBy}
                  disabled={saving}
                >
                  {TIMEZONES.includes(form.timezone) ? null : <option value={form.timezone}>{form.timezone}</option>}
                  {TIMEZONES.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
                </select>
              )}
            </Field>
          </div>
        </section>

        <section className="settings-section">
          <h3><Clock3 size={14} style={{ verticalAlign: '-2px', marginRight: 5 }} />Working schedule</h3>
          <p>Late arrival is measured after the start time plus the grace period. Half days are classified below the hours threshold.</p>
          <div className="form-grid-three">
            <Field label="Work start time" htmlFor="org-start" required error={errors.workStartTime}>
              {({ describedBy }) => (
                <input
                  id="org-start"
                  className="input"
                  type="time"
                  value={form.workStartTime}
                  onChange={update('workStartTime')}
                  aria-invalid={Boolean(errors.workStartTime)}
                  aria-describedby={describedBy}
                  disabled={saving}
                />
              )}
            </Field>
            <Field label="Grace period (minutes)" htmlFor="org-grace" required error={errors.graceMinutes}>
              {({ describedBy }) => (
                <input
                  id="org-grace"
                  className="input"
                  type="number"
                  min="0"
                  max="240"
                  step="1"
                  value={form.graceMinutes}
                  onChange={update('graceMinutes')}
                  aria-invalid={Boolean(errors.graceMinutes)}
                  aria-describedby={describedBy}
                  disabled={saving}
                />
              )}
            </Field>
            <Field label="Half-day threshold (hours)" htmlFor="org-halfday" required error={errors.halfDayHours}>
              {({ describedBy }) => (
                <input
                  id="org-halfday"
                  className="input"
                  type="number"
                  min="1"
                  max="12"
                  step="0.5"
                  value={form.halfDayHours}
                  onChange={update('halfDayHours')}
                  aria-invalid={Boolean(errors.halfDayHours)}
                  aria-describedby={describedBy}
                  disabled={saving}
                />
              )}
            </Field>
          </div>
          <Field label="Weekend days" hint="Selected days are excluded from expected working days, leave and payroll.">
            {() => (
              <div className="checkbox-row">
                {WEEKDAYS.map((day) => {
                  const selected = form.weekendDays.includes(day.value);
                  return (
                    <label key={day.value} className={`checkbox-pill ${selected ? 'is-selected' : ''}`}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleWeekend(day.value)}
                        disabled={saving}
                      />
                      {day.label}
                    </label>
                  );
                })}
              </div>
            )}
          </Field>
        </section>

        <section className="settings-section">
          <h3><CalendarDays size={14} style={{ verticalAlign: '-2px', marginRight: 5 }} />Leave policy</h3>
          <p>Annual quotas per calendar year. Leave unpaid blank to allow unlimited unpaid leave.</p>
          <div className="form-grid">
            <Field label="Annual leave (days)" htmlFor="leave-annual" required error={errors.annual}>
              {({ describedBy }) => (
                <input id="leave-annual" className="input" type="number" min="0" max="365" step="0.5" value={form.leavePolicy.annual} onChange={updatePolicy('annual')} aria-invalid={Boolean(errors.annual)} aria-describedby={describedBy} disabled={saving} />
              )}
            </Field>
            <Field label="Sick leave (days)" htmlFor="leave-sick" required error={errors.sick}>
              {({ describedBy }) => (
                <input id="leave-sick" className="input" type="number" min="0" max="365" step="0.5" value={form.leavePolicy.sick} onChange={updatePolicy('sick')} aria-invalid={Boolean(errors.sick)} aria-describedby={describedBy} disabled={saving} />
              )}
            </Field>
            <Field label="Casual leave (days)" htmlFor="leave-casual" required error={errors.casual}>
              {({ describedBy }) => (
                <input id="leave-casual" className="input" type="number" min="0" max="365" step="0.5" value={form.leavePolicy.casual} onChange={updatePolicy('casual')} aria-invalid={Boolean(errors.casual)} aria-describedby={describedBy} disabled={saving} />
              )}
            </Field>
            <Field label="Unpaid leave (days)" htmlFor="leave-unpaid" optional error={errors.unpaid} hint="Leave blank for unlimited.">
              {({ describedBy }) => (
                <input id="leave-unpaid" className="input" type="number" min="0" max="365" step="0.5" value={form.leavePolicy.unpaid} onChange={updatePolicy('unpaid')} aria-invalid={Boolean(errors.unpaid)} aria-describedby={describedBy} disabled={saving} placeholder="Unlimited" />
              )}
            </Field>
          </div>
        </section>

        <section className="settings-section">
          <h3><MapPin size={14} style={{ verticalAlign: '-2px', marginRight: 5 }} />Office location & geofencing</h3>
          <p>When geofencing is enabled, check-in and check-out require the browser location to fall inside the radius.</p>
          <div className="form-grid">
            <Field label="Office latitude" htmlFor="org-lat" required error={errors.officeLatitude}>
              {({ describedBy }) => (
                <input id="org-lat" className="input" type="number" step="0.0001" min="-90" max="90" value={form.officeLatitude} onChange={update('officeLatitude')} aria-invalid={Boolean(errors.officeLatitude)} aria-describedby={describedBy} disabled={saving} />
              )}
            </Field>
            <Field label="Office longitude" htmlFor="org-lng" required error={errors.officeLongitude}>
              {({ describedBy }) => (
                <input id="org-lng" className="input" type="number" step="0.0001" min="-180" max="180" value={form.officeLongitude} onChange={update('officeLongitude')} aria-invalid={Boolean(errors.officeLongitude)} aria-describedby={describedBy} disabled={saving} />
              )}
            </Field>
            <Field label="Geofence radius (metres)" htmlFor="org-radius" required error={errors.geofenceRadius} hint="Between 20 and 5,000 metres.">
              {({ describedBy }) => (
                <input id="org-radius" className="input" type="number" min="20" max="5000" step="1" value={form.geofenceRadius} onChange={update('geofenceRadius')} aria-invalid={Boolean(errors.geofenceRadius)} aria-describedby={describedBy} disabled={saving} />
              )}
            </Field>
            <Field label="Geofence enforcement" hint="When disabled, location is not requested at check-in.">
              {() => (
                <label className={`checkbox-pill ${form.geofenceEnabled ? 'is-selected' : ''}`} style={{ minHeight: 39 }}>
                  <input
                    type="checkbox"
                    checked={form.geofenceEnabled}
                    onChange={(event) => setForm((current) => ({ ...current, geofenceEnabled: event.target.checked }))}
                    disabled={saving}
                  />
                  {form.geofenceEnabled ? 'Location required' : 'Location not required'}
                </label>
              )}
            </Field>
          </div>
        </section>

        <section className="settings-section">
          <h3><UsersRound size={14} style={{ verticalAlign: '-2px', marginRight: 5 }} />Departments</h3>
          <p>Departments used by employee profiles, filters and attendance summaries. A department cannot be removed while employees still use it.</p>
          <TagEditor
            id="org-departments"
            label="Departments"
            values={form.departments}
            onChange={(values) => { setForm((current) => ({ ...current, departments: values })); setErrors((current) => ({ ...current, departments: undefined })); }}
            error={errors.departments}
            placeholder="Add a department"
            disabled={saving}
          />
        </section>

        <section className="settings-section">
          <h3><ShieldCheck size={14} style={{ verticalAlign: '-2px', marginRight: 5 }} />Designations</h3>
          <p>Suggested job titles for the employee form. Free-text designations are still accepted there.</p>
          <TagEditor
            id="org-designations"
            label="Designations"
            values={form.designations}
            onChange={(values) => { setForm((current) => ({ ...current, designations: values })); setErrors((current) => ({ ...current, designations: undefined })); }}
            error={errors.designations}
            placeholder="Add a designation"
            disabled={saving}
          />
        </section>

        <section className="settings-section">
          <h3><CalendarDays size={14} style={{ verticalAlign: '-2px', marginRight: 5 }} />Public holidays</h3>
          <p>Excluded from working days, leave calculations and payroll deductions.</p>
          <HolidaysEditor
            value={form.publicHolidays}
            onChange={(value) => { setForm((current) => ({ ...current, publicHolidays: value })); setErrors((current) => ({ ...current, holidays: undefined })); }}
            error={errors.holidays}
            disabled={saving}
          />
        </section>

        <div className="form-actions">
          <span className="muted" style={{ marginRight: 'auto' }}>
            {dirty ? 'You have unsaved changes.' : 'All changes are saved.'}
          </span>
          <button type="button" className="btn btn-secondary" onClick={load} disabled={saving || !dirty}>Discard changes</button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving || !dirty}>
            <Save size={15} /> {saving ? 'Saving…' : 'Save configuration'}
          </button>
        </div>
      </div>
    </div>
  );
}

function TagEditor({ id, label, values, onChange, error, placeholder, disabled }) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const value = draft.trim();
    if (!value) return;
    if (values.some((item) => item.toLowerCase() === value.toLowerCase())) {
      setDraft('');
      return;
    }
    onChange([...values, value]);
    setDraft('');
  };

  return (
    <Field label={label} htmlFor={id} error={error}>
      {({ describedBy }) => (
        <>
          <div className="tag-editor">
            {values.length === 0 && <span className="muted" style={{ fontSize: 11 }}>Nothing added yet.</span>}
            {values.map((value) => (
              <span className="tag-chip" key={value}>
                {value}
                <button
                  type="button"
                  onClick={() => onChange(values.filter((item) => item !== value))}
                  aria-label={`Remove ${value}`}
                  disabled={disabled}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
          <div className="tag-add">
            <input
              id={id}
              className="input"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  add();
                }
              }}
              placeholder={placeholder}
              aria-describedby={describedBy}
              disabled={disabled}
            />
            <button type="button" className="btn btn-secondary btn-sm" onClick={add} disabled={disabled || !draft.trim()}>
              <Plus size={14} /> Add
            </button>
          </div>
        </>
      )}
    </Field>
  );
}

function HolidaysEditor({ value, onChange, error, disabled }) {
  const update = (index, field) => (event) => {
    onChange(value.map((holiday, position) => (
      position === index ? { ...holiday, [field]: event.target.value } : holiday
    )));
  };

  return (
    <div className={`field ${error ? 'field-invalid' : ''}`}>
      {value.length === 0 ? (
        <div className="notice-item">No public holidays configured. Weekends are still excluded from working days.</div>
      ) : (
        <div className="list-editor">
          {value.map((holiday, index) => (
            <div className="list-editor-row" key={index}>
              <input
                className="input"
                type="date"
                value={holiday.date}
                onChange={update(index, 'date')}
                aria-label={`Holiday ${index + 1} date`}
                style={{ flex: '0 0 160px' }}
                disabled={disabled}
              />
              <input
                className="input"
                value={holiday.name}
                onChange={update(index, 'name')}
                aria-label={`Holiday ${index + 1} name`}
                placeholder="Holiday name"
                style={{ flex: 1 }}
                disabled={disabled}
              />
              <button
                type="button"
                className="icon-button"
                onClick={() => onChange(value.filter((_, position) => position !== index))}
                aria-label={`Remove ${holiday.name || 'holiday'}`}
                disabled={disabled}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="mt-8">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => onChange([...value, { date: '', name: '' }])}
          disabled={disabled}
        >
          <Plus size={14} /> Add holiday
        </button>
      </div>
      {error && <p className="field-error"><AlertCircle size={13} /> {error}</p>}
    </div>
  );
}

/* ── Staff accounts ────────────────────────────────────────────────────── */

function UsersPanel() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [credentials, setCredentials] = useState(null);
  const [toggleTarget, setToggleTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await organizationApi.listUsers();
      setUsers(result || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Staff accounts could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async () => {
    if (!toggleTarget) return;
    await organizationApi.setUserActive(toggleTarget.id, !toggleTarget.isActive);
    toast.success(`${toggleTarget.name} ${toggleTarget.isActive ? 'deactivated' : 'reactivated'}.`);
    await load();
  };

  const activeCount = users.filter((user) => user.isActive).length;
  const hrCount = users.filter((user) => user.role === 'hr').length;

  return (
    <>
      <div className="list-card">
        <div className="list-card-head">
          <div>
            <h2>Team accounts</h2>
            <p>{activeCount} active · {hrCount} HR · {users.length} total accounts</p>
          </div>
          <div className="toolbar">
            <button type="button" className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
              <RefreshCw size={14} /> Refresh
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setCreateOpen(true)}>
              <UserPlus size={14} /> Add HR account
            </button>
          </div>
        </div>

        {error && <div className="card-body"><div className="notice-item">{error}</div></div>}

        {loading ? (
          <TableSkeleton rows={5} columns={6} />
        ) : users.length === 0 ? (
          <EmptyState icon={UsersRound} title="No accounts" message="Staff accounts will appear here." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Password</th>
                  <th>Last sign-in</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {users.map((account) => (
                  <tr key={account.id}>
                    <td>
                      <div className="cell-person-copy">
                        <strong>{account.name}</strong>
                        <span>{account.email}</span>
                        {account.employee && (
                          <span>{account.employee.code} · {account.employee.department}</span>
                        )}
                      </div>
                    </td>
                    <td><Badge status={account.role} /></td>
                    <td><Badge status={account.isActive ? 'active' : 'inactive'} /></td>
                    <td>
                      {account.mustChangePassword
                        ? <span className="pending-badge"><KeyRound size={13} /> Temporary</span>
                        : <span className="muted">Set by user</span>}
                    </td>
                    <td className="nowrap">{account.lastLoginAt ? formatDateTime(account.lastLoginAt) : 'Never'}</td>
                    <td>
                      <div className="table-actions">
                        {account.role === 'admin' ? (
                          <span className="muted nowrap">Protected</span>
                        ) : (
                          <button
                            type="button"
                            className={`btn btn-sm ${account.isActive ? 'btn-secondary' : 'btn-success'}`}
                            onClick={() => setToggleTarget(account)}
                          >
                            {account.isActive ? 'Deactivate' : 'Reactivate'}
                          </button>
                        )}
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
        <ShieldCheck size={16} />
        <span>
          Only one administrator exists by design. New HR accounts receive a one-time temporary password and must set
          a new password at first sign-in. Deactivating an HR account also marks its linked employee record inactive.
        </span>
      </div>

      <CreateHrModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(result) => {
          setCreateOpen(false);
          setCredentials(result);
          load();
        }}
      />

      <Modal
        open={Boolean(credentials)}
        onClose={() => setCredentials(null)}
        title="HR account created"
        description="The temporary password is shown once. Share it securely with the new team member."
        size="md"
        footer={<button type="button" className="btn btn-primary" onClick={() => setCredentials(null)}>Done</button>}
      >
        {credentials && (
          <>
            <div className="success-banner">
              <CheckCircle2 size={16} />
              <span><strong>{credentials.user?.name}</strong> can now sign in as HR and must change the password.</span>
            </div>
            <div className="credentials-box">
              <div className="credential-row">
                <span>Name</span>
                <code>{credentials.user?.name}</code>
              </div>
              <div className="credential-row">
                <span>Sign-in email</span>
                <span className="copy-value">
                  <code>{credentials.user?.email}</code>
                  <button
                    type="button"
                    onClick={() => copyText(credentials.user?.email).then(() => toast.success('Email copied.'))}
                    aria-label="Copy email"
                  >
                    <Copy size={13} />
                  </button>
                </span>
              </div>
              <div className="credential-row">
                <span>Temporary password</span>
                <span className="copy-value">
                  <code>{credentials.temporaryPassword}</code>
                  <button
                    type="button"
                    onClick={() => copyText(credentials.temporaryPassword).then(() => toast.success('Temporary password copied.'))}
                    aria-label="Copy temporary password"
                  >
                    <Copy size={13} />
                  </button>
                </span>
              </div>
            </div>
            <div className="warning-banner mt-16" style={{ marginBottom: 0 }}>
              <KeyRound size={16} />
              <span>This password cannot be retrieved again. If it is lost, deactivate the account and create a new HR account.</span>
            </div>
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(toggleTarget)}
        onClose={() => setToggleTarget(null)}
        onConfirm={handleToggle}
        title={toggleTarget?.isActive ? 'Deactivate this account?' : 'Reactivate this account?'}
        message={toggleTarget
          ? toggleTarget.isActive
            ? `${toggleTarget.name} will lose access immediately. If this account is linked to an employee record, that record will also be marked inactive.`
            : `${toggleTarget.name} will be able to sign in again. Any linked employee record will be reactivated.`
          : ''}
        confirmLabel={toggleTarget?.isActive ? 'Deactivate account' : 'Reactivate account'}
        tone={toggleTarget?.isActive ? 'danger' : 'success'}
      />
    </>
  );
}

function CreateHrModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY_HR);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(EMPTY_HR);
      setErrors({});
      setFormError('');
    }
  }, [open]);

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = async () => {
    const nextErrors = {};
    if (form.name.trim().length < 2) nextErrors.name = 'Name must be at least 2 characters.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) nextErrors.email = 'Enter a valid email address.';
    setErrors(nextErrors);
    setFormError('');
    if (Object.keys(nextErrors).length) return;

    setBusy(true);
    try {
      const result = await organizationApi.createHr({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        role: 'hr',
      });
      onCreated?.(result);
    } catch (err) {
      setErrors((current) => ({ ...current, ...getFieldErrors(err) }));
      setFormError(getErrorMessage(err, 'The HR account could not be created.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      title="Add an HR account"
      description="HR accounts can manage employees, attendance, leave, payroll and announcements, but cannot change organization settings or the audit log."
      size="md"
      footer={(
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={submit} disabled={busy}>
            <UserPlus size={15} /> {busy ? 'Creating…' : 'Create HR account'}
          </button>
        </>
      )}
    >
      {formError && <div className="auth-alert" role="alert"><AlertCircle size={15} /><span>{formError}</span></div>}
      <div className="form-grid">
        <Field label="Full name" htmlFor="hr-name" required error={errors.name}>
          {({ describedBy }) => (
            <input
              id="hr-name"
              className="input"
              value={form.name}
              onChange={update('name')}
              autoComplete="name"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={describedBy}
              disabled={busy}
            />
          )}
        </Field>
        <Field label="Work email" htmlFor="hr-email" required error={errors.email}>
          {({ describedBy }) => (
            <input
              id="hr-email"
              className="input"
              type="email"
              value={form.email}
              onChange={update('email')}
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={describedBy}
              disabled={busy}
            />
          )}
        </Field>
      </div>
      <div className="info-banner" style={{ marginBottom: 0 }}>
        <KeyRound size={16} />
        <span>The server generates a temporary password. The new account must replace it on first sign-in.</span>
      </div>
    </Modal>
  );
}

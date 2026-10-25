import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, Megaphone, Pin, Plus, RefreshCw, Search, Trash2,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Badge from '../components/ui/Badge';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import Field from '../components/ui/Field';
import Modal from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import announcementsApi from '../api/announcements';
import { getErrorMessage, getFieldErrors } from '../api/client';
import { formatDateTime, relativeTime } from '../lib/format';
import { ANNOUNCEMENT_CATEGORIES } from '../lib/constants';

const CATEGORY_LABELS = {
  general: 'General',
  policy: 'Policy',
  payroll: 'Payroll',
  event: 'Event',
};

const EMPTY_FORM = { title: '', body: '', category: 'general', pinned: false };

function sortAnnouncements(items) {
  return [...items].sort((a, b) => {
    if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });
}

export default function AnnouncementsPage() {
  const toast = useToast();
  const { user, isAdmin, isHr } = useAuth();
  const canPublish = isAdmin || isHr;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('');
  const [query, setQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await announcementsApi.list();
      setItems(sortAnnouncements(Array.isArray(result) ? result : []));
    } catch (err) {
      setError(getErrorMessage(err, 'Announcements could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return items.filter((item) => {
      if (category && item.category !== category) return false;
      if (!term) return true;
      return `${item.title} ${item.body} ${item.authorName}`.toLowerCase().includes(term);
    });
  }, [items, category, query]);

  const canDelete = (item) => {
    if (isAdmin) return true;
    // The list response omits the author id. HR can only be offered deletion
    // when the stored display name clearly belongs to the signed-in account.
    return isHr && item.authorName && user?.name && item.authorName === user.name;
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await announcementsApi.remove(deleteTarget.id);
    toast.success('Announcement deleted.');
    setDeleteTarget(null);
    await load();
  };

  const pinnedCount = items.filter((item) => item.pinned).length;

  return (
    <div>
      <PageHeader
        eyebrow="Company"
        title="Announcements"
        description="Company-wide updates, policies and events. Pinned messages stay at the top of the feed."
        actions={(
          <>
            <button type="button" className="btn btn-secondary" onClick={load} disabled={loading}>
              <RefreshCw size={15} /> Refresh
            </button>
            {canPublish && (
              <button type="button" className="btn btn-primary" onClick={() => setCreateOpen(true)}>
                <Plus size={15} /> New announcement
              </button>
            )}
          </>
        )}
      />

      <div className="filter-card">
        <div className="toolbar">
          <label className="search-box">
            <Search size={15} aria-hidden="true" />
            <span className="sr-only">Search announcements</span>
            <input
              className="input"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title, message or author"
            />
          </label>
          <label className="sr-only" htmlFor="announcement-category">Category</label>
          <select
            id="announcement-category"
            className="select"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="">All categories</option>
            {ANNOUNCEMENT_CATEGORIES.map((value) => (
              <option key={value} value={value}>{CATEGORY_LABELS[value]}</option>
            ))}
          </select>
          <span className="muted">
            {items.length} announcement{items.length === 1 ? '' : 's'}
            {pinnedCount ? ` · ${pinnedCount} pinned` : ''}
          </span>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={load} title="Announcements unavailable" />}

      {!error && loading && (
        <div className="announcement-grid" aria-label="Loading announcements" role="status">
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="announcement-card" key={index}>
              <Skeleton width="55%" height="18px" />
              <Skeleton width="100%" height="12px" className="mt-12" />
              <Skeleton width="92%" height="12px" className="mt-8" />
              <Skeleton width="68%" height="12px" className="mt-8" />
              <Skeleton width="40%" height="10px" className="mt-16" />
            </div>
          ))}
        </div>
      )}

      {!error && !loading && filtered.length === 0 && (
        <div className="card">
          <EmptyState
            icon={Megaphone}
            title={items.length ? 'No matches' : 'No announcements yet'}
            message={items.length
              ? 'Try a different search term or category.'
              : canPublish
                ? 'Publish the first company update for your team.'
                : 'Company updates from your HR team will appear here.'}
            action={canPublish && !items.length
              ? <button type="button" className="btn btn-primary" onClick={() => setCreateOpen(true)}><Plus size={15} /> Write an announcement</button>
              : undefined}
          />
        </div>
      )}

      {!error && !loading && filtered.length > 0 && (
        <div className="announcement-grid">
          {filtered.map((item) => (
            <article key={item.id} className={`announcement-card ${item.pinned ? 'is-pinned' : ''}`}>
              <div className="announcement-card-head">
                <div>
                  {item.pinned && <span className="pin-flag"><Pin size={12} /> Pinned</span>}
                  <h2>{item.title}</h2>
                </div>
                <Badge status={item.category} label={CATEGORY_LABELS[item.category] || item.category} dot={false} />
              </div>
              <p>{item.body}</p>
              <div className="announcement-meta">
                <span>
                  {item.authorName || 'Workspace'}
                  {item.authorRole ? ` · ${item.authorRole === 'hr' ? 'HR' : item.authorRole === 'admin' ? 'Admin' : 'Employee'}` : ''}
                </span>
                <span aria-hidden="true">·</span>
                <time dateTime={item.createdAt} title={formatDateTime(item.createdAt)}>
                  {relativeTime(item.createdAt)}
                </time>
                {canDelete(item) && (
                  <button
                    type="button"
                    className="btn-link"
                    style={{ marginLeft: 'auto', color: 'var(--danger)' }}
                    onClick={() => setDeleteTarget(item)}
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {!canPublish && !error && !loading && items.length > 0 && (
        <div className="info-banner mt-16">
          <Megaphone size={16} />
          <span>Announcements are managed by HR and workspace administrators.</span>
        </div>
      )}

      <CreateAnnouncementModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={async () => {
          setCreateOpen(false);
          await load();
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete this announcement?"
        message={deleteTarget ? `“${deleteTarget.title}” will be removed for everyone. This cannot be undone.` : ''}
        confirmLabel="Delete announcement"
      />
    </div>
  );
}

function CreateAnnouncementModal({ open, onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(EMPTY_FORM);
      setErrors({});
      setFormError('');
    }
  }, [open]);

  const update = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = async () => {
    const next = {};
    if (form.title.trim().length < 3) next.title = 'Title must be at least 3 characters.';
    else if (form.title.trim().length > 160) next.title = 'Title must be at most 160 characters.';
    if (form.body.trim().length < 5) next.body = 'Message must be at least 5 characters.';
    else if (form.body.trim().length > 3000) next.body = 'Message must be at most 3,000 characters.';
    if (!ANNOUNCEMENT_CATEGORIES.includes(form.category)) next.category = 'Choose a category.';
    setErrors(next);
    setFormError('');
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      await announcementsApi.create({
        title: form.title.trim(),
        body: form.body.trim(),
        category: form.category,
        pinned: Boolean(form.pinned),
      });
      toast.success('Announcement published.');
      onCreated?.();
    } catch (err) {
      setErrors((current) => ({ ...current, ...getFieldErrors(err) }));
      setFormError(getErrorMessage(err, 'The announcement could not be published.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      title="New announcement"
      description="This will be visible to every member of the workspace and notify HR and employees."
      size="md"
      footer={(
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={submit} disabled={busy}>
            <Megaphone size={15} /> {busy ? 'Publishing…' : 'Publish announcement'}
          </button>
        </>
      )}
    >
      {formError && <div className="auth-alert" role="alert"><AlertCircle size={15} /><span>{formError}</span></div>}
      <div className="form-grid">
        <Field label="Title" htmlFor="announcement-title" required error={errors.title} className="span-2" hint={`${form.title.length}/160 characters`}>
          {({ describedBy }) => (
            <input
              id="announcement-title"
              className="input"
              maxLength={160}
              value={form.title}
              onChange={update('title')}
              aria-invalid={Boolean(errors.title)}
              aria-describedby={describedBy}
              disabled={busy}
              placeholder="A clear, short headline"
            />
          )}
        </Field>
        <Field label="Category" htmlFor="announcement-type" required error={errors.category}>
          {({ describedBy }) => (
            <select
              id="announcement-type"
              className="select"
              value={form.category}
              onChange={update('category')}
              aria-invalid={Boolean(errors.category)}
              aria-describedby={describedBy}
              disabled={busy}
            >
              {ANNOUNCEMENT_CATEGORIES.map((value) => (
                <option key={value} value={value}>{CATEGORY_LABELS[value]}</option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Placement" hint="Pinned announcements appear first for everyone.">
          {() => (
            <label className={`checkbox-pill ${form.pinned ? 'is-selected' : ''}`} style={{ minHeight: 39 }}>
              <input type="checkbox" checked={form.pinned} onChange={update('pinned')} disabled={busy} />
              <Pin size={13} /> Pin to top
            </label>
          )}
        </Field>
        <Field label="Message" htmlFor="announcement-body" required error={errors.body} className="span-2" hint={`${form.body.length}/3,000 characters`}>
          {({ describedBy }) => (
            <textarea
              id="announcement-body"
              className="textarea"
              rows={7}
              maxLength={3000}
              value={form.body}
              onChange={update('body')}
              aria-invalid={Boolean(errors.body)}
              aria-describedby={describedBy}
              disabled={busy}
              placeholder="Share the details your team needs."
            />
          )}
        </Field>
      </div>
    </Modal>
  );
}

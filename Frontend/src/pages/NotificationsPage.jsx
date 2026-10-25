import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Check, CheckCheck, ExternalLink, RefreshCw,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import Tabs from '../components/ui/Tabs';
import { Skeleton } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';
import notificationsApi from '../api/notifications';
import { getErrorMessage } from '../api/client';
import { formatDateTime, relativeTime } from '../lib/format';

const TYPE_LABELS = {
  leave: 'Leave',
  attendance: 'Attendance',
  payroll: 'Payroll',
  announcement: 'Announcement',
  system: 'System',
};

const TYPE_TONES = {
  leave: 'brand',
  attendance: 'info',
  payroll: 'success',
  announcement: 'warning',
  system: 'neutral',
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState({ unread: 0, items: [] });
  const [tab, setTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [markingAll, setMarkingAll] = useState(false);
  const [markingId, setMarkingId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await notificationsApi.list({ limit: 100 });
      setData({ unread: result?.unread || 0, items: result?.items || [] });
    } catch (err) {
      setError(getErrorMessage(err, 'Notifications could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const unreadItems = useMemo(() => data.items.filter((item) => !item.read), [data.items]);
  const visible = tab === 'unread' ? unreadItems : data.items;

  const markLocalRead = (id) => {
    setData((current) => {
      const item = current.items.find((entry) => entry.id === id);
      return {
        unread: item && !item.read ? Math.max(0, current.unread - 1) : current.unread,
        items: current.items.map((entry) => (entry.id === id ? { ...entry, read: true } : entry)),
      };
    });
  };

  const openItem = async (item) => {
    setMarkingId(item.id);
    try {
      if (!item.read) {
        await notificationsApi.markRead(item.id);
        markLocalRead(item.id);
      }
      if (item.link) navigate(item.link);
    } catch (err) {
      toast.error(getErrorMessage(err, 'The notification could not be updated.'));
    } finally {
      setMarkingId('');
    }
  };

  const markOne = async (item) => {
    setMarkingId(item.id);
    try {
      await notificationsApi.markRead(item.id);
      markLocalRead(item.id);
    } catch (err) {
      toast.error(getErrorMessage(err, 'The notification could not be marked as read.'));
    } finally {
      setMarkingId('');
    }
  };

  const markAll = async () => {
    setMarkingAll(true);
    try {
      const result = await notificationsApi.markAllRead();
      setData((current) => ({
        unread: 0,
        items: current.items.map((item) => ({ ...item, read: true })),
      }));
      toast.success(result?.updated ? `${result.updated} notification${result.updated === 1 ? '' : 's'} marked as read.` : 'You are already caught up.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Notifications could not be marked as read.'));
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Administration"
        title="Notifications"
        description="Decisions, payroll updates and company announcements delivered to your workspace inbox."
        actions={(
          <>
            <button type="button" className="btn btn-secondary" onClick={load} disabled={loading}>
              <RefreshCw size={15} /> Refresh
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={markAll}
              disabled={markingAll || data.unread === 0}
            >
              <CheckCheck size={15} /> {markingAll ? 'Updating…' : 'Mark all read'}
            </button>
          </>
        )}
      />

      <div className="toolbar mb-16">
        <Tabs
          label="Notification filters"
          active={tab}
          onChange={setTab}
          tabs={[
            { id: 'all', label: 'All', count: data.items.length },
            { id: 'unread', label: 'Unread', count: data.unread },
          ]}
        />
        <span className="muted">
          {data.unread ? `${data.unread} unread` : 'All caught up'}
        </span>
      </div>

      {error && <ErrorState message={error} onRetry={load} title="Notifications unavailable" />}

      {!error && (
        <div className="list-card">
          <div className="list-card-head">
            <div>
              <h2>{tab === 'unread' ? 'Unread notifications' : 'All notifications'}</h2>
              <p>Showing up to 100 most recent notifications.</p>
            </div>
          </div>

          {loading ? (
            <div className="card-body">
              {Array.from({ length: 6 }).map((_, index) => (
                <div className="notification-feed-row" key={index}>
                  <Skeleton width="7px" height="7px" radius="50%" />
                  <div style={{ flex: 1 }}>
                    <Skeleton width="35%" height="12px" />
                    <Skeleton width="78%" height="10px" className="mt-8" />
                    <Skeleton width="22%" height="9px" className="mt-8" />
                  </div>
                </div>
              ))}
            </div>
          ) : visible.length === 0 ? (
            <EmptyState
              icon={Bell}
              title={tab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              message={tab === 'unread'
                ? 'You have read everything in your inbox.'
                : 'Updates about leave, payroll and announcements will appear here.'}
              action={tab === 'unread' && data.items.length > 0
                ? <button type="button" className="btn btn-secondary" onClick={() => setTab('all')}>View all notifications</button>
                : undefined}
            />
          ) : (
            <div className="notification-feed">
              {visible.map((item) => (
                <div key={item.id} className={`notification-feed-row ${item.read ? '' : 'is-unread'}`}>
                  <span
                    className={`notification-feed-dot type-${item.type || 'system'}`}
                    style={{ background: item.read ? 'var(--border-strong)' : undefined }}
                    aria-hidden="true"
                  />
                  <div className="notification-feed-copy">
                    <div className="toolbar" style={{ gap: 8, justifyContent: 'flex-start' }}>
                      <strong style={{ fontSize: 12 }}>{item.title}</strong>
                      <Badge
                        status={item.type}
                        label={TYPE_LABELS[item.type] || 'Update'}
                        tone={TYPE_TONES[item.type] || 'neutral'}
                        dot={false}
                      />
                      {!item.read && <span className="pending-badge">Unread</span>}
                    </div>
                    <p>{item.message}</p>
                    <small title={formatDateTime(item.createdAt)}>
                      {relativeTime(item.createdAt)} · {formatDateTime(item.createdAt)}
                    </small>
                  </div>
                  <div className="notification-feed-actions">
                    {!item.read && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => markOne(item)}
                        disabled={markingId === item.id}
                      >
                        <Check size={14} /> {markingId === item.id ? 'Saving…' : 'Mark read'}
                      </button>
                    )}
                    {item.link && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => openItem(item)}
                        disabled={markingId === item.id}
                      >
                        <ExternalLink size={14} /> Open
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell, CheckCheck, ChevronDown, KeyRound, LogOut, Menu, UserRound, X,
} from 'lucide-react';
import Avatar from '../ui/Avatar';
import { useAuth } from '../../context/AuthContext';
import notificationsApi from '../../api/notifications';
import { getErrorMessage } from '../../api/client';
import { formatDateLong, relativeTime, todayKey } from '../../lib/format';
import { PAGE_TITLES } from './navigation';
import { ROLE_LABELS } from '../../lib/constants';

function pageTitle(pathname) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.startsWith('/employees/') && pathname.endsWith('/edit')) return 'Edit employee';
  if (pathname.startsWith('/employees/')) return 'Employee profile';
  if (pathname.startsWith('/payroll/')) return 'Payroll run';
  return 'HCM Lite';
}

export default function Topbar({ onMobileToggle }) {
  const { user, employee, organization, role, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState({ unread: 0, items: [] });
  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loadingNotif, setLoadingNotif] = useState(false);
  const [notifError, setNotifError] = useState('');
  const notifRef = useRef(null);
  const menuRef = useRef(null);

  const loadNotifications = useCallback(async () => {
    setLoadingNotif(true);
    setNotifError('');
    try {
      const data = await notificationsApi.list({ limit: 8 });
      setNotifications({ unread: data.unread || 0, items: data.items || [] });
    } catch (error) {
      setNotifError(getErrorMessage(error, 'Notifications are unavailable.'));
    } finally {
      setLoadingNotif(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    const close = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) setNotifOpen(false);
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
    };
    const onEscape = (event) => {
      if (event.key === 'Escape') {
        setNotifOpen(false);
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onEscape);
    };
  }, []);

  useEffect(() => {
    setNotifOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  const toggleNotifications = () => {
    const next = !notifOpen;
    setNotifOpen(next);
    setMenuOpen(false);
    if (next) loadNotifications();
  };

  const handleMarkAll = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications((current) => ({
        unread: 0,
        items: current.items.map((item) => ({ ...item, read: true })),
      }));
    } catch (error) {
      setNotifError(getErrorMessage(error));
    }
  };

  const handleNotificationClick = async (item) => {
    setNotifOpen(false);
    if (!item.read) {
      try {
        await notificationsApi.markRead(item.id);
        setNotifications((current) => ({
          unread: Math.max(0, current.unread - 1),
          items: current.items.map((entry) => (entry.id === item.id ? { ...entry, read: true } : entry)),
        }));
      } catch {
        // Navigation is still useful even if the read receipt fails.
      }
    }
    if (item.link) navigate(item.link);
    else navigate('/notifications');
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  const dateLabel = useMemo(
    () => formatDateLong(todayKey(organization?.timezone)),
    [organization?.timezone],
  );

  return (
    <header className="topbar">
      <button type="button" className="icon-button topbar-menu" onClick={onMobileToggle} aria-label="Open navigation">
        <Menu size={20} />
      </button>

      <div className="topbar-context">
        <p className="topbar-eyebrow">{organization?.name || 'Workspace'}</p>
        <h2 className="topbar-title">{pageTitle(location.pathname)}</h2>
      </div>

      <div className="topbar-right">
        <span className="topbar-date">{dateLabel}</span>

        <div className="popover-anchor" ref={notifRef}>
          <button
            type="button"
            className={`icon-button topbar-icon ${notifOpen ? 'is-active' : ''}`}
            onClick={toggleNotifications}
            aria-label={`Notifications${notifications.unread ? `, ${notifications.unread} unread` : ''}`}
            aria-expanded={notifOpen}
          >
            <Bell size={18} />
            {notifications.unread > 0 && (
              <span className="notification-count">{notifications.unread > 9 ? '9+' : notifications.unread}</span>
            )}
          </button>
          {notifOpen && (
            <div className="popover popover-notifications" role="dialog" aria-label="Notifications">
              <div className="popover-header">
                <div>
                  <strong>Notifications</strong>
                  <span>{notifications.unread ? `${notifications.unread} unread` : 'You are all caught up'}</span>
                </div>
                <button type="button" className="icon-button" onClick={() => setNotifOpen(false)} aria-label="Close notifications">
                  <X size={16} />
                </button>
              </div>
              <div className="notification-list">
                {loadingNotif && <p className="popover-state">Loading notifications…</p>}
                {!loadingNotif && notifError && <p className="popover-state popover-error">{notifError}</p>}
                {!loadingNotif && !notifError && notifications.items.length === 0 && (
                  <p className="popover-state">No notifications yet.</p>
                )}
                {!loadingNotif && notifications.items.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className={`notification-item ${item.read ? '' : 'is-unread'}`}
                    onClick={() => handleNotificationClick(item)}
                  >
                    <span className={`notification-dot type-${item.type}`} aria-hidden="true" />
                    <span className="notification-copy">
                      <strong>{item.title}</strong>
                      <span>{item.message}</span>
                      <small>{relativeTime(item.createdAt)}</small>
                    </span>
                  </button>
                ))}
              </div>
              <div className="popover-footer">
                <button type="button" className="text-button" onClick={handleMarkAll} disabled={!notifications.unread}>
                  <CheckCheck size={15} /> Mark all read
                </button>
                <Link to="/notifications" className="text-button" onClick={() => setNotifOpen(false)}>
                  View all
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="popover-anchor" ref={menuRef}>
          <button
            type="button"
            className="profile-trigger"
            onClick={() => { setMenuOpen((open) => !open); setNotifOpen(false); }}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <Avatar name={user?.name} src={employee?.avatarUrl} size="sm" />
            <span className="profile-trigger-copy">
              <strong>{user?.name || 'Account'}</strong>
              <small>{ROLE_LABELS[role] || 'Member'}</small>
            </span>
            <ChevronDown size={15} className={menuOpen ? 'is-rotated' : ''} />
          </button>
          {menuOpen && (
            <div className="popover popover-menu" role="menu">
              <div className="popover-menu-head">
                <strong>{user?.name}</strong>
                <span>{user?.email}</span>
                <span className="badge badge-brand">{ROLE_LABELS[role]}</span>
              </div>
              <Link to="/profile" className="menu-item" role="menuitem" onClick={() => setMenuOpen(false)}>
                <UserRound size={16} /> My profile
              </Link>
              <Link to="/change-password" className="menu-item" role="menuitem" onClick={() => setMenuOpen(false)}>
                <KeyRound size={16} /> Change password
              </Link>
              <button type="button" className="menu-item menu-item-danger" role="menuitem" onClick={handleLogout}>
                <LogOut size={16} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

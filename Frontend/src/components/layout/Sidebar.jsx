import { NavLink } from 'react-router-dom';
import { ChevronLeft, ChevronRight, LogOut, ShieldCheck } from 'lucide-react';
import Avatar from '../ui/Avatar';
import { useAuth } from '../../context/AuthContext';
import { buildNavigation } from './navigation';
import { ROLE_LABELS } from '../../lib/constants';

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <span>H</span>
      <i />
    </span>
  );
}

export default function Sidebar({ collapsed, mobileOpen, onCollapse, onMobileClose }) {
  const { user, employee, organization, isAdmin, isHr, isEmployee, logout } = useAuth();
  const sections = buildNavigation({
    isAdmin,
    isHr,
    isEmployee,
    hasEmployeeProfile: Boolean(employee),
  });

  const handleLogout = async () => {
    onMobileClose?.();
    await logout();
  };

  return (
    <>
      <div
        className={`sidebar-scrim ${mobileOpen ? 'is-open' : ''}`}
        onClick={onMobileClose}
        aria-hidden="true"
      />
      <aside className={`sidebar ${collapsed ? 'is-collapsed' : ''} ${mobileOpen ? 'is-mobile-open' : ''}`}>
        <div className="sidebar-brand">
          <NavLink to="/" className="brand-link" onClick={onMobileClose} aria-label="HCM Lite home">
            <BrandMark />
            <span className="brand-copy">
              <strong>HCM Lite</strong>
              <small>People operations</small>
            </span>
          </NavLink>
          <button
            type="button"
            className="sidebar-collapse"
            onClick={onCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {sections.map((section) => (
            <div className="nav-section" key={section.label}>
              <p className="nav-section-label">{section.label}</p>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `nav-item ${isActive ? 'is-active' : ''}`}
                  onClick={onMobileClose}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon size={18} className="nav-icon" />
                  <span className="nav-label">{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-account">
            <Avatar name={user?.name} src={employee?.avatarUrl} size="sm" />
            <span className="sidebar-account-copy">
              <strong>{user?.name || 'Account'}</strong>
              <small>{ROLE_LABELS[user?.role] || 'Member'}</small>
            </span>
          </div>
          <div className="sidebar-org">
            <span className="org-mark"><ShieldCheck size={13} /></span>
            <span>
              <strong>{organization?.name || 'HCM Lite'}</strong>
              <small>Internal workspace</small>
            </span>
          </div>
          <button type="button" className="sidebar-logout" onClick={handleLogout}>
            <LogOut size={16} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

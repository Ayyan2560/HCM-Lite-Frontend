import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const STORAGE_KEY = 'hcm_lite_sidebar_collapsed';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(STORAGE_KEY) === '1');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  useEffect(() => {
    document.body.classList.toggle('nav-open', mobileOpen);
    return () => document.body.classList.remove('nav-open');
  }, [mobileOpen]);

  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCollapse={() => setCollapsed((value) => !value)}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="app-main">
        <Topbar onMobileToggle={() => setMobileOpen((open) => !open)} />
        <main className="app-content" id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
        <footer className="app-footer">
          <span>HCM Lite</span>
          <span>Human capital, clearly managed.</span>
        </footer>
      </div>
    </div>
  );
}

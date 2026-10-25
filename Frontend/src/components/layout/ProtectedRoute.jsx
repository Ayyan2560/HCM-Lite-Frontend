import { Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Spinner } from '../ui/Skeleton';

function FullPageLoader() {
  return (
    <div className="boot-screen">
      <span className="brand-mark brand-mark-large" aria-hidden="true"><span>H</span><i /></span>
      <Spinner label="Restoring session" />
      <p>Restoring your workspace…</p>
    </div>
  );
}

export function AccessDenied({ title = 'You do not have access to this page' }) {
  return (
    <div className="access-denied">
      <span className="access-denied-icon"><ShieldAlert size={26} /></span>
      <h1>Access restricted</h1>
      <p>{title}. Your account role does not include this area of the workspace.</p>
      <a href="/" className="btn btn-primary">Back to overview</a>
    </div>
  );
}

export default function ProtectedRoute({ children, allowedRoles }) {
  const { loading, isAuthenticated, mustChangePassword, hasRole } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageLoader />;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  if (allowedRoles?.length && !hasRole(allowedRoles)) {
    return <AccessDenied />;
  }

  return children;
}

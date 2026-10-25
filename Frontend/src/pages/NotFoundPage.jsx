import { Link } from 'react-router-dom';
import { ArrowLeft, Compass } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="not-found">
      <span className="not-found-icon"><Compass size={28} /></span>
      <p className="page-eyebrow">404 · Route not found</p>
      <h1>This page is off the map</h1>
      <p>The page you requested does not exist or may have moved. Return to your workspace to continue.</p>
      <Link to="/" className="btn btn-primary"><ArrowLeft size={15} /> Back to overview</Link>
    </div>
  );
}

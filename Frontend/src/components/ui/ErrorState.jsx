import { RefreshCw, WifiOff } from 'lucide-react';

export default function ErrorState({ message, onRetry, compact = false, title = 'Could not load this data' }) {
  return (
    <div className={`error-state ${compact ? 'error-compact' : ''}`} role="alert">
      <span className="error-state-icon"><WifiOff size={22} /></span>
      <div>
        <h3>{title}</h3>
        <p>{message || 'Please check your connection and try again.'}</p>
      </div>
      {onRetry && (
        <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>
          <RefreshCw size={15} /> Try again
        </button>
      )}
    </div>
  );
}

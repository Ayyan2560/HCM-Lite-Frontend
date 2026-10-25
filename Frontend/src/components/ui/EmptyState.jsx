export default function EmptyState({ icon: Icon, title, message, action, compact = false }) {
  return (
    <div className={`empty-state ${compact ? 'empty-compact' : ''}`}>
      {Icon && <span className="empty-icon"><Icon size={22} /></span>}
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}

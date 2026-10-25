export default function StatCard({ label, value, meta, icon: Icon, tone = 'brand', footer }) {
  return (
    <div className={`stat-card stat-${tone}`}>
      <div className="stat-top">
        <span className="stat-icon">{Icon && <Icon size={19} />}</span>
        {meta && <span className="stat-meta">{meta}</span>}
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {footer && <div className="stat-footer">{footer}</div>}
    </div>
  );
}

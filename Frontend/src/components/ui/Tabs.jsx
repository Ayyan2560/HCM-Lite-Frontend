export default function Tabs({ tabs, active, onChange, label = 'Sections' }) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          className={`tab ${active === tab.id ? 'tab-active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
          {tab.count !== undefined && tab.count !== null && (
            <span className="tab-count">{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

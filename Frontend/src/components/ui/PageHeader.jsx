export default function PageHeader({ eyebrow, title, description, actions, children }) {
  return (
    <header className="page-header">
      <div className="page-header-copy">
        {eyebrow && <p className="page-eyebrow">{eyebrow}</p>}
        <h1 className="page-title">{title}</h1>
        {description && <p className="page-description">{description}</p>}
        {children}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

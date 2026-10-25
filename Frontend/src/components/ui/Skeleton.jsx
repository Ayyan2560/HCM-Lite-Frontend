export function Skeleton({ className = '', width, height, radius }) {
  const style = {};
  if (width) style.width = width;
  if (height) style.height = height;
  if (radius) style.borderRadius = radius;
  return <span className={`skeleton ${className}`.trim()} style={style} aria-hidden="true" />;
}

export function StatSkeleton() {
  return (
    <div className="stat-card stat-card-skeleton" aria-hidden="true">
      <Skeleton width="42px" height="42px" radius="12px" />
      <div className="skeleton-copy">
        <Skeleton width="60%" height="11px" />
        <Skeleton width="42%" height="24px" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 6, columns = 5 }) {
  return (
    <div className="table-skeleton" aria-label="Loading table" role="status">
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="table-skeleton-row">
          {Array.from({ length: columns }).map((__, column) => (
            <Skeleton key={column} height="14px" width={column === 0 ? '70%' : '50%'} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div aria-label="Loading page" role="status">
      <Skeleton width="220px" height="26px" />
      <Skeleton width="340px" height="13px" className="mt-8" />
      <div className="stat-grid mt-24">
        {Array.from({ length: 4 }).map((_, index) => <StatSkeleton key={index} />)}
      </div>
      <div className="card mt-24">
        <div className="card-body"><TableSkeleton rows={7} /></div>
      </div>
    </div>
  );
}

export function Spinner({ label = 'Loading' }) {
  return (
    <span className="spinner" role="status" aria-label={label}>
      <span className="spinner-ring" />
    </span>
  );
}

export default Skeleton;

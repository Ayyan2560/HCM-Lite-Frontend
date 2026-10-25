import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page = 1, pages = 1, total = 0, limit = 20, onPage }) {
  if (!total) return null;
  const start = (page - 1) * limit + 1;
  const end = Math.min(total, page * limit);

  return (
    <div className="pagination">
      <p className="pagination-info">
        Showing <strong>{start}–{end}</strong> of <strong>{total}</strong>
      </p>
      <div className="pagination-controls">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} /> Previous
        </button>
        <span className="pagination-page">Page {page} of {Math.max(1, pages)}</span>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => onPage(page + 1)}
          disabled={page >= pages}
          aria-label="Next page"
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

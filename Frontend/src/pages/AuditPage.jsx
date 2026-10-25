import { Fragment, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronDown, ChevronRight, RefreshCw, ScrollText, Search, SlidersHorizontal,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import Pagination from '../components/ui/Pagination';
import { TableSkeleton } from '../components/ui/Skeleton';
import auditApi from '../api/audit';
import { getErrorMessage } from '../api/client';
import { formatDateTime, formatNumber } from '../lib/format';

const EMPTY_FILTERS = { action: '', entityType: '', from: '', to: '' };
const EMPTY_PAGINATION = { page: 1, pages: 1, total: 0, limit: 30 };

const ENTITY_TYPES = [
  'User', 'Employee', 'Organization', 'LeaveRequest', 'AttendanceCorrection',
  'Payroll', 'Announcement', 'AiAssistant',
];

const ENTITY_ROUTES = {
  Employee: (id) => `/employees/${id}`,
  Payroll: (id) => `/payroll/${id}`,
  LeaveRequest: () => '/leave',
  AttendanceCorrection: () => '/attendance',
  Announcement: () => '/announcements',
  Organization: () => '/organization',
  User: () => '/organization',
};

function Snapshot({ label, value }) {
  return (
    <div>
      <strong style={{ color: '#93c5fd', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</strong>
      <pre className="audit-details" style={{ marginTop: 5 }}>
        {value === null || value === undefined ? 'No snapshot recorded.' : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

export default function AuditPage() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [applied, setApplied] = useState(EMPTY_FILTERS);
  const [data, setData] = useState({ items: [], pagination: EMPTY_PAGINATION });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterError, setFilterError] = useState('');
  const [expanded, setExpanded] = useState(() => new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await auditApi.list({
        page,
        limit: 30,
        action: applied.action || undefined,
        entityType: applied.entityType || undefined,
        from: applied.from || undefined,
        to: applied.to || undefined,
      });
      setData({
        items: result?.items || [],
        pagination: result?.pagination || EMPTY_PAGINATION,
      });
    } catch (err) {
      setError(getErrorMessage(err, 'Audit entries could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, [page, applied]);

  useEffect(() => { load(); }, [load]);

  const updateFilter = (field) => (event) => {
    setFilters((current) => ({ ...current, [field]: event.target.value }));
    setFilterError('');
  };

  const applyFilters = (event) => {
    event.preventDefault();
    if (filters.from && filters.to && filters.from > filters.to) {
      setFilterError('The start date cannot be after the end date.');
      return;
    }
    setFilterError('');
    setPage(1);
    setApplied({
      action: filters.action.trim(),
      entityType: filters.entityType,
      from: filters.from,
      to: filters.to,
    });
  };

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    setFilterError('');
    setPage(1);
  };

  const toggleDetails = (id) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const activeFilterCount = Object.values(applied).filter(Boolean).length;
  const pagination = data.pagination || EMPTY_PAGINATION;

  return (
    <div>
      <PageHeader
        eyebrow="Administration"
        title="Audit log"
        description="An immutable record of security-sensitive changes across employees, leave, payroll and workspace settings."
        actions={(
          <button type="button" className="btn btn-secondary" onClick={load} disabled={loading}>
            <RefreshCw size={15} /> Refresh
          </button>
        )}
      />

      <form className="filter-card" onSubmit={applyFilters}>
        <div className="toolbar">
          <label className="search-box">
            <Search size={15} aria-hidden="true" />
            <span className="sr-only">Filter by action</span>
            <input
              className="input"
              type="search"
              value={filters.action}
              onChange={updateFilter('action')}
              placeholder="Filter action, e.g. leave.approved"
            />
          </label>
          <label className="sr-only" htmlFor="audit-entity">Entity type</label>
          <select id="audit-entity" className="select" value={filters.entityType} onChange={updateFilter('entityType')}>
            <option value="">All entity types</option>
            {ENTITY_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          <label className="sr-only" htmlFor="audit-from">From date</label>
          <input id="audit-from" className="input" type="date" value={filters.from} onChange={updateFilter('from')} title="From date" />
          <label className="sr-only" htmlFor="audit-to">To date</label>
          <input id="audit-to" className="input" type="date" value={filters.to} onChange={updateFilter('to')} title="To date" />
          <button type="submit" className="btn btn-primary btn-sm">
            <SlidersHorizontal size={14} /> Apply
          </button>
          {activeFilterCount > 0 && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={resetFilters}>Clear</button>
          )}
        </div>
        {filterError && <p className="field-error" style={{ marginTop: 8 }}>{filterError}</p>}
      </form>

      {error && <ErrorState message={error} onRetry={load} title="Audit log unavailable" />}

      {!error && (
        <div className="list-card">
          <div className="list-card-head">
            <div>
              <h2>{formatNumber(pagination.total)} entr{pagination.total === 1 ? 'y' : 'ies'}</h2>
              <p>
                {activeFilterCount
                  ? `${activeFilterCount} filter${activeFilterCount === 1 ? '' : 's'} applied · newest first`
                  : 'Complete activity, newest first'}
              </p>
            </div>
          </div>

          {loading ? (
            <TableSkeleton rows={9} columns={6} />
          ) : data.items.length === 0 ? (
            <EmptyState
              icon={ScrollText}
              title={activeFilterCount ? 'No matching entries' : 'No audit entries yet'}
              message={activeFilterCount
                ? 'Try widening the date range or clearing the action filter.'
                : 'Changes to employees, leave and payroll will be recorded here.'}
              action={activeFilterCount ? <button type="button" className="btn btn-secondary" onClick={resetFilters}>Clear filters</button> : undefined}
            />
          ) : (
            <>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Actor</th>
                      <th>Action</th>
                      <th>Entity</th>
                      <th>Summary</th>
                      <th aria-label="Details" />
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((log) => {
                      const isOpen = expanded.has(log.id);
                      const route = log.entityId && ENTITY_ROUTES[log.entityType]
                        ? ENTITY_ROUTES[log.entityType](log.entityId)
                        : null;
                      return (
                        <Fragment key={log.id}>
                          <tr>
                            <td className="nowrap">
                              <div className="day-meta">
                                <strong>{formatDateTime(log.createdAt)}</strong>
                                <span>{log.ip || 'No IP recorded'}</span>
                              </div>
                            </td>
                            <td>
                              <div className="day-meta">
                                <strong>{log.actorName || 'System'}</strong>
                                <span><Badge status={log.actorRole} label={log.actorRole || 'system'} dot={false} /></span>
                              </div>
                            </td>
                            <td><span className="audit-action">{log.action}</span></td>
                            <td>
                              <div className="day-meta">
                                <strong>{log.entityType || '—'}</strong>
                                {log.entityId ? (
                                  <span className="mono" title={log.entityId}>{log.entityId.slice(-8)}</span>
                                ) : <span>No entity ID</span>}
                              </div>
                            </td>
                            <td><div className="audit-summary">{log.summary || '—'}</div></td>
                            <td>
                              <div className="table-actions">
                                {route && (
                                  <Link to={route} className="icon-button" aria-label={`Open ${log.entityType}`} title="Open related record">
                                    <ChevronRight size={15} />
                                  </Link>
                                )}
                                <button
                                  type="button"
                                  className="icon-button"
                                  onClick={() => toggleDetails(log.id)}
                                  aria-expanded={isOpen}
                                  aria-label={isOpen ? 'Hide change details' : 'Show change details'}
                                >
                                  <ChevronDown size={15} style={{ transform: isOpen ? 'rotate(180deg)' : undefined }} />
                                </button>
                              </div>
                            </td>
                          </tr>
                          {isOpen && (
                            <tr>
                              <td colSpan={6} style={{ background: 'var(--surface-soft)', padding: '0 16px 14px' }}>
                                <div className="form-grid">
                                  <Snapshot label="Before" value={log.before} />
                                  <Snapshot label="After" value={log.after} />
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={pagination.page || 1}
                pages={pagination.pages || 1}
                total={pagination.total || 0}
                limit={pagination.limit || 30}
                onPage={setPage}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

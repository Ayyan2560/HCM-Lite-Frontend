import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Download, Eye, Pencil, Plus, Search, Upload, UserCheck, UserX, UsersRound,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import Pagination from '../components/ui/Pagination';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import ImportEmployeesModal from '../components/employees/ImportEmployeesModal';
import { PageSkeleton, TableSkeleton } from '../components/ui/Skeleton';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { employeesApi } from '../api/employees';
import { getErrorMessage } from '../api/client';
import { formatDate, formatNumber } from '../lib/format';
import { EMPLOYMENT_TYPE_LABELS } from '../lib/constants';

export default function EmployeesPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { organization } = useAuth();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('active');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], pagination: { page: 1, pages: 1, total: 0, limit: 20 } });
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 320);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedSearch, department, status]);

  useEffect(() => {
    let active = true;
    employeesApi.meta()
      .then((result) => { if (active) setMeta(result); })
      .catch(() => { if (active) setMeta(null); });
    return () => { active = false; };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await employeesApi.list({
        page,
        limit: 20,
        search: debouncedSearch || undefined,
        department: department || undefined,
        status: status || undefined,
      });
      setData(result);
    } catch (err) {
      setError(getErrorMessage(err, 'Employees could not be loaded.'));
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [page, debouncedSearch, department, status]);

  useEffect(() => { load(); }, [load]);

  const handleExport = async () => {
    setExportBusy(true);
    try {
      const filename = await employeesApi.exportCsv();
      toast.success(`Downloaded ${filename}.`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'The employee export could not be downloaded.'));
    } finally {
      setExportBusy(false);
    }
  };

  const handleToggle = async () => {
    if (!confirm) return;
    if (confirm.mode === 'deactivate') await employeesApi.deactivate(confirm.employee.id);
    else await employeesApi.activate(confirm.employee.id);
    toast.success(`${confirm.employee.fullName} ${confirm.mode === 'deactivate' ? 'deactivated' : 'reactivated'}.`);
    await load();
  };

  if (initialLoading) return <PageSkeleton />;

  return (
    <div>
      <PageHeader
        eyebrow="Workforce"
        title="Employees"
        description="The employee directory, including login-linked profiles, employment details and status."
        actions={(
          <>
            <button type="button" className="btn btn-secondary" onClick={handleExport} disabled={exportBusy}>
              <Download size={15} /> {exportBusy ? 'Exporting…' : 'Export CSV'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setImportOpen(true)}>
              <Upload size={15} /> Import
            </button>
            <button type="button" className="btn btn-primary" onClick={() => navigate('/employees/new')}>
              <Plus size={15} /> Add employee
            </button>
          </>
        )}
      />

      <div className="filter-card">
        <div className="toolbar">
          <div className="search-box">
            <Search size={16} />
            <label className="sr-only" htmlFor="employee-search">Search employees</label>
            <input
              id="employee-search"
              className="input"
              placeholder="Search name, code, email or designation…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <label className="sr-only" htmlFor="department-filter">Department</label>
          <select id="department-filter" className="select" value={department} onChange={(event) => setDepartment(event.target.value)}>
            <option value="">All departments</option>
            {(meta?.departments || organization?.departments?.map((item) => item.name) || []).map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <label className="sr-only" htmlFor="status-filter">Status</label>
          <select id="status-filter" className="select" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          {(search || department || status !== 'active') && (
            <button type="button" className="btn-link" onClick={() => { setSearch(''); setDepartment(''); setStatus('active'); }}>
              Clear filters
            </button>
          )}
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={load} title="Employee directory unavailable" />}

      {!error && (
        <div className="list-card">
          <div className="list-card-head">
            <div>
              <h2>{formatNumber(data.pagination?.total || 0)} employee{data.pagination?.total === 1 ? '' : 's'}</h2>
              <p>{debouncedSearch ? `Matching “${debouncedSearch}”` : 'Sorted by employee code'}</p>
            </div>
          </div>

          {loading ? (
            <TableSkeleton rows={7} columns={7} />
          ) : data.items.length === 0 ? (
            <EmptyState
              icon={UsersRound}
              title={debouncedSearch || department || status ? 'No employees match these filters' : 'No employees yet'}
              message={debouncedSearch || department || status
                ? 'Try a different search term, department or status.'
                : 'Create the first employee profile to start tracking attendance, leave and payroll.'}
              action={<button type="button" className="btn btn-primary" onClick={() => navigate('/employees/new')}><Plus size={15} /> Add employee</button>}
            />
          ) : (
            <>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Code</th>
                      <th>Department</th>
                      <th>Designation</th>
                      <th>Joined</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((employee) => (
                      <tr key={employee.id} className="row-click" onClick={() => navigate(`/employees/${employee.id}`)}>
                        <td>
                          <div className="cell-person">
                            <Avatar name={employee.fullName} src={employee.avatarUrl} size="sm" />
                            <div className="cell-person-copy">
                              <strong>{employee.fullName}</strong>
                              <span>{employee.email}</span>
                            </div>
                          </div>
                        </td>
                        <td><span className="mono">{employee.code}</span></td>
                        <td>{employee.department}</td>
                        <td>{employee.designation}</td>
                        <td className="nowrap">{formatDate(employee.joiningDate)}</td>
                        <td className="nowrap">{EMPLOYMENT_TYPE_LABELS[employee.employmentType] || employee.employmentType}</td>
                        <td><Badge status={employee.status} /></td>
                        <td onClick={(event) => event.stopPropagation()}>
                          <div className="table-actions">
                            <button type="button" className="icon-button" onClick={() => navigate(`/employees/${employee.id}`)} aria-label={`View ${employee.fullName}`} title="View">
                              <Eye size={16} />
                            </button>
                            <button type="button" className="icon-button" onClick={() => navigate(`/employees/${employee.id}/edit`)} aria-label={`Edit ${employee.fullName}`} title="Edit">
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              className="icon-button"
                              onClick={() => setConfirm({ employee, mode: employee.status === 'active' ? 'deactivate' : 'activate' })}
                              aria-label={`${employee.status === 'active' ? 'Deactivate' : 'Reactivate'} ${employee.fullName}`}
                              title={employee.status === 'active' ? 'Deactivate' : 'Reactivate'}
                            >
                              {employee.status === 'active' ? <UserX size={15} /> : <UserCheck size={15} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={data.pagination?.page || 1}
                pages={data.pagination?.pages || 1}
                total={data.pagination?.total || 0}
                limit={data.pagination?.limit || 20}
                onPage={setPage}
              />
            </>
          )}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={handleToggle}
        title={confirm?.mode === 'deactivate' ? 'Deactivate employee?' : 'Reactivate employee?'}
        message={confirm?.mode === 'deactivate'
          ? `${confirm?.employee?.fullName} will be marked inactive and their login will be disabled. Historical records are kept.`
          : `${confirm?.employee?.fullName} will be marked active and their login will be re-enabled.`}
        confirmLabel={confirm?.mode === 'deactivate' ? 'Deactivate' : 'Reactivate'}
        tone={confirm?.mode === 'deactivate' ? 'danger' : 'success'}
      />

      <ImportEmployeesModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={load}
      />
    </div>
  );
}

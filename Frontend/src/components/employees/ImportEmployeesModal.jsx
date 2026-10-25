import { useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Copy, FileUp, UploadCloud } from 'lucide-react';
import Modal from '../ui/Modal';
import Field from '../ui/Field';
import { employeesApi } from '../../api/employees';
import { getErrorMessage } from '../../api/client';
import { copyText } from '../../lib/browser';
import { useToast } from '../../context/ToastContext';
import { formatNumber } from '../../lib/format';

const SAMPLE = `EmployeeCode,FirstName,LastName,Email,Phone,Department,Designation,JoiningDate,BasicSalary,EmploymentType
EMP-100,Amina,Yousuf,amina@company.com,+92 300 1234567,Engineering,Software Engineer,2026-10-01,120000,full-time`;

export default function ImportEmployeesModal({ open, onClose, onImported }) {
  const toast = useToast();
  const fileRef = useRef(null);
  const [csv, setCsv] = useState('');
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setCsv('');
    setFileName('');
    setPreview(null);
    setResult(null);
    setError('');
    setBusy(false);
  };

  const close = () => {
    if (busy) return;
    reset();
    onClose();
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Choose a .csv file exported from a spreadsheet.');
      return;
    }
    const text = await file.text();
    setCsv(text);
    setFileName(file.name);
    setPreview(null);
    setResult(null);
    setError('');
  };

  const validate = async () => {
    if (!csv.trim()) {
      setError('Paste CSV content or choose a file first.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const data = await employeesApi.importCsv({ csv, dryRun: true });
      setPreview(data);
    } catch (err) {
      setError(getErrorMessage(err, 'CSV validation failed.'));
    } finally {
      setBusy(false);
    }
  };

  const importNow = async () => {
    setBusy(true);
    setError('');
    try {
      const data = await employeesApi.importCsv({ csv, dryRun: false });
      setResult(data);
      toast.success(`${data.imported} employee${data.imported === 1 ? '' : 's'} imported.`);
      onImported?.();
    } catch (err) {
      setError(getErrorMessage(err, 'Import failed.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Import employees from CSV"
      description="Validate the file first. Importing creates an employee profile and an employee login for each valid row."
      size="lg"
      footer={result ? (
        <button type="button" className="btn btn-primary" onClick={close}>Done</button>
      ) : (
        <>
          <button type="button" className="btn btn-secondary" onClick={close} disabled={busy}>Cancel</button>
          {!preview ? (
            <button type="button" className="btn btn-primary" onClick={validate} disabled={busy}>
              {busy ? 'Validating…' : 'Validate CSV'}
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={importNow} disabled={busy || !preview.summary?.valid}>
              {busy ? 'Importing…' : `Import ${formatNumber(preview.summary?.valid)} employee${preview.summary?.valid === 1 ? '' : 's'}`}
            </button>
          )}
        </>
      )}
    >
      {error && (
        <div className="auth-alert" role="alert">
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      {!result && (
        <>
          <div className="info-banner">
            <UploadCloud size={16} />
            <span>
              Required columns: <strong>EmployeeCode, FirstName, LastName, Email, Department, Designation, JoiningDate, BasicSalary</strong>.
              Optional: Phone, EmploymentType. Existing employee codes or emails are rejected.
            </span>
          </div>

          <div className="toolbar mb-16">
            <button type="button" className="btn btn-secondary" onClick={() => fileRef.current?.click()} disabled={busy}>
              <FileUp size={15} /> Choose CSV file
            </button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} hidden />
            {fileName && <span className="muted" style={{ fontSize: 11 }}>{fileName}</span>}
            <button type="button" className="btn-link" onClick={() => { setCsv(SAMPLE); setFileName('sample.csv'); setPreview(null); }}>
              Use sample
            </button>
          </div>

          <Field
            label="CSV content"
            htmlFor="import-csv"
            hint="The first row must be a header row. A dry run checks the data without creating anything."
          >
            {() => (
              <textarea
                id="import-csv"
                className="textarea"
                rows={9}
                value={csv}
                onChange={(event) => { setCsv(event.target.value); setPreview(null); }}
                placeholder={SAMPLE}
                spellCheck={false}
                style={{ fontFamily: 'var(--mono)', fontSize: 11 }}
                disabled={busy}
              />
            )}
          </Field>

          {preview && (
            <div className="mt-8">
              <div className="success-banner">
                <CheckCircle2 size={16} />
                <span>
                  Dry run complete: <strong>{formatNumber(preview.summary?.valid)}</strong> valid row(s),{' '}
                  <strong>{formatNumber(preview.summary?.invalid)}</strong> invalid row(s) out of {formatNumber(preview.summary?.total)}.
                </span>
              </div>
              {preview.invalid?.length > 0 && (
                <div className="notice-list">
                  {preview.invalid.slice(0, 12).map((row) => (
                    <div className="notice-item" key={`${row.row}-${row.code}`}>
                      <strong>Row {row.row}</strong>
                      {row.code ? ` · ${row.code}` : ''} — {Object.values(row.errors || {}).join(' ')}
                    </div>
                  ))}
                  {preview.invalid.length > 12 && <p className="muted" style={{ fontSize: 10.5 }}>And {preview.invalid.length - 12} more invalid row(s). Fix the file and validate again.</p>}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {result && (
        <>
          <div className="success-banner">
            <CheckCircle2 size={16} />
            <span><strong>{result.imported}</strong> employee(s) imported. Each receives a temporary password shown once below.</span>
          </div>
          <div className="notice-list">
            {result.credentials?.map((credential) => (
              <div className="credentials-box" key={credential.id}>
                <div className="credential-row"><span>Employee code</span><code>{credential.code}</code></div>
                <div className="credential-row"><span>Email</span><code>{credential.email}</code></div>
                <div className="credential-row">
                  <span>Temporary password</span>
                  <span className="copy-value">
                    <code>{credential.temporaryPassword}</code>
                    <button type="button" onClick={() => copyText(credential.temporaryPassword).then(() => toast.success('Password copied.'))} aria-label="Copy password">
                      <Copy size={13} />
                    </button>
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="muted mt-12" style={{ fontSize: 10.5 }}>
            Copy these passwords now. They are not shown again. Each employee must change theirs after signing in.
          </p>
        </>
      )}
    </Modal>
  );
}

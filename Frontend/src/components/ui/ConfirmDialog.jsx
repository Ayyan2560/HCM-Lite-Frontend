import { useState } from 'react';
import Modal from './Modal';
import { AlertTriangle } from 'lucide-react';
import { getErrorMessage } from '../../api/client';

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  busyLabel = 'Working…',
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    setBusy(true);
    setError('');
    try {
      await onConfirm?.();
      onClose?.();
    } catch (err) {
      setError(getErrorMessage(err, 'The action could not be completed.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      title={title}
      size="sm"
      footer={(
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>{cancelLabel}</button>
          <button
            type="button"
            className={`btn ${tone === 'danger' ? 'btn-danger' : tone === 'success' ? 'btn-success' : 'btn-primary'}`}
            onClick={handleConfirm}
            disabled={busy}
          >
            {busy ? busyLabel : confirmLabel}
          </button>
        </>
      )}
    >
      <div className={`confirm-content confirm-${tone}`}>
        <span className="confirm-icon"><AlertTriangle size={20} /></span>
        <div>
          {typeof message === 'string' ? <p>{message}</p> : message}
          {error && <p className="field-error" style={{ marginTop: 8 }}>{error}</p>}
        </div>
      </div>
    </Modal>
  );
}

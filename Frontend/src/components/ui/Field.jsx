import { useId } from 'react';
import { AlertCircle } from 'lucide-react';

export default function Field({
  label,
  htmlFor,
  hint,
  error,
  required = false,
  children,
  className = '',
  optional = false,
}) {
  const generatedId = useId();
  const hintId = hint ? `${generatedId}-hint` : undefined;
  const errorId = error ? `${generatedId}-error` : undefined;

  return (
    <div className={`field ${error ? 'field-invalid' : ''} ${className}`.trim()}>
      {label && (
        <label className="field-label" htmlFor={htmlFor}>
          {label}
          {required && <span className="field-required" aria-hidden="true"> *</span>}
          {optional && <span className="field-optional">Optional</span>}
        </label>
      )}
      {children({ describedBy: [hintId, errorId].filter(Boolean).join(' ') || undefined })}
      {hint && !error && <p className="field-hint" id={hintId}>{hint}</p>}
      {error && (
        <p className="field-error" id={errorId}>
          <AlertCircle size={13} aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

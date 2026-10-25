import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function PasswordInput({ id, value, onChange, autoComplete = 'current-password', placeholder = '', describedBy, disabled = false, name }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="password-wrap">
      <input
        id={id}
        name={name || id}
        className="input"
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-describedby={describedBy}
        disabled={disabled}
        required
      />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        tabIndex={0}
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

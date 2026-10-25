import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const counter = useRef(0);

  const dismiss = useCallback((id) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const push = useCallback((message, variant = 'info', title = '') => {
    if (!message) return;
    counter.current += 1;
    const id = counter.current;
    setItems((current) => [...current.slice(-3), { id, message, variant, title }]);
    window.setTimeout(() => dismiss(id), variant === 'error' ? 6500 : 4500);
  }, [dismiss]);

  const toast = useMemo(() => ({
    success: (message, title) => push(message, 'success', title),
    error: (message, title) => push(message, 'error', title),
    info: (message, title) => push(message, 'info', title),
  }), [push]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="false">
        {items.map((item) => {
          const Icon = ICONS[item.variant] || Info;
          return (
            <div key={item.id} className={`toast toast-${item.variant}`} role="status">
              <Icon size={18} className="toast-icon" aria-hidden="true" />
              <div className="toast-copy">
                {item.title && <strong>{item.title}</strong>}
                <span>{item.message}</span>
              </div>
              <button type="button" className="toast-close" onClick={() => dismiss(item.id)} aria-label="Dismiss notification">
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
}

export default ToastContext;

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Snackbar, Alert } from '@mui/material';

const SnackbarContext = createContext(null);

export function SnackbarProvider({ children }) {
  const [queue, setQueue] = useState([]);

  const show = useCallback((message, severity = 'info') => {
    const id = Date.now() + Math.random();
    setQueue((prev) => [...prev, { id, message, severity }]);
    return id;
  }, []);

  const success = useCallback((msg) => show(msg, 'success'), [show]);
  const error = useCallback((msg) => show(msg, 'error'), [show]);
  const warn = useCallback((msg) => show(msg, 'warning'), [show]);
  const info = useCallback((msg) => show(msg, 'info'), [show]);

  const dismiss = (id) => setQueue((prev) => prev.filter((item) => item.id !== id));

  const current = queue[0] || null;

  return (
    <SnackbarContext.Provider value={{ show, success, error, warn, info }}>
      {children}
      <Snackbar
        open={Boolean(current)}
        autoHideDuration={4500}
        onClose={() => current && dismiss(current.id)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {current ? (
          <Alert
            onClose={() => dismiss(current.id)}
            severity={current.severity}
            variant="filled"
            sx={{ minWidth: 300, borderRadius: 2, fontWeight: 500 }}
          >
            {current.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </SnackbarContext.Provider>
  );
}

export const useSnackbar = () => {
  const ctx = useContext(SnackbarContext);
  if (!ctx) throw new Error('useSnackbar must be used within SnackbarProvider');
  return ctx;
};

export default SnackbarContext;

import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  Chip,
  CircularProgress,
  Pagination,
  Stack,
  Typography,
} from '@mui/material';
import ManageSearchRoundedIcon from '@mui/icons-material/ManageSearchRounded';

import { auditApi } from '../api/communicationsApi';

const formatValue = (value) => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
};

export const AuditPage = () => {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  const fetchLogs = async (page = 1) => {
    setLoading(true);
    try {
      const response = await auditApi.list({ page, limit: 20 });
      const nextData = response?.items || response?.data?.items || [];
      const nextPagination = response?.pagination || response?.data?.pagination || { page, limit: 20, total: 0, pages: 1 };
      setLogs(nextData);
      setPagination(nextPagination);
    } catch (error) {
      console.error(error);
      setFeedback({ type: 'error', message: error?.response?.data?.message || 'Unable to load audit logs.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 4 }}>
      {feedback && (
        <Alert severity={feedback.type} onClose={() => setFeedback(null)} sx={{ mb: 2 }}>
          {feedback.message}
        </Alert>
      )}

      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
        <ManageSearchRoundedIcon color="primary" sx={{ fontSize: 28 }} />
        <Typography variant="h5" fontWeight={700}>Audit Log</Typography>
      </Stack>

      {logs.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No audit events were found.</Typography>
        </Card>
      ) : (
        <Stack spacing={2}>
          {logs.map((log) => (
            <Card key={log.id || log._id} sx={{ p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography variant="subtitle1" fontWeight={700}>{log.action}</Typography>
                    <Chip label={log.actorRole || 'System'} size="small" color="primary" variant="outlined" />
                    <Chip label={log.entityType || 'Record'} size="small" variant="outlined" />
                  </Stack>

                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {log.summary || 'No summary available.'}
                  </Typography>

                  <Stack spacing={0.75} sx={{ mt: 1.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      Actor: {log.actorName || 'Unknown'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Entity ID: {log.entityId || '—'}
                    </Typography>
                    {log.ip && (
                      <Typography variant="caption" color="text.secondary">
                        IP: {log.ip}
                      </Typography>
                    )}
                    {log.before && (
                      <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                        Before: {formatValue(log.before)}
                      </Typography>
                    )}
                    {log.after && (
                      <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                        After: {formatValue(log.after)}
                      </Typography>
                    )}
                  </Stack>
                </Box>

                <Typography variant="caption" color="text.disabled">
                  {new Date(log.createdAt).toLocaleString()}
                </Typography>
              </Stack>
            </Card>
          ))}

          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 2 }}>
            <Pagination
              count={pagination.pages || 1}
              page={(pagination.page || 1) - 1}
              onChange={(_, value) => fetchLogs(value + 1)}
              color="primary"
            />
          </Box>
        </Stack>
      )}
    </Box>
  );
};

export default AuditPage;

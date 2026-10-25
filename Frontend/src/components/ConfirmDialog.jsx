import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Box,
  Typography,
} from '@mui/material';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';

export const ConfirmDialog = ({
  open,
  title,
  content,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmColor = 'primary',
  type = 'warning', // 'warning' | 'danger' | 'success' | 'info'
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <ErrorOutlineRoundedIcon sx={{ color: 'error.main', fontSize: 32 }} />;
      case 'success':
        return <CheckCircleOutlineRoundedIcon sx={{ color: 'success.main', fontSize: 32 }} />;
      default:
        return <WarningAmberRoundedIcon sx={{ color: 'warning.main', fontSize: 32 }} />;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onCancel}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: 1,
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, pt: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {getIcon()}
        <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ pb: 2 }}>
        <DialogContentText sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
          {content}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button variant="outlined" onClick={onCancel} disabled={loading} color="inherit">
          {cancelText}
        </Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          disabled={loading}
          color={confirmColor}
          autoFocus
        >
          {loading ? 'Processing...' : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;

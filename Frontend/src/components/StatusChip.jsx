import React from 'react';
import { Chip } from '@mui/material';
import { brandColors } from '../theme/theme';

export const StatusChip = ({ status, size = 'small', sx = {} }) => {
  if (!status) return null;

  const normalized = status.toLowerCase();

  let colorConfig = {
    bg: '#f1f5f9',
    color: '#475569',
    border: '#cbd5e1',
  };

  if (['present', 'approved', 'active', 'paid', 'completed'].includes(normalized)) {
    colorConfig = {
      bg: '#ecfdf5',
      color: '#065f46',
      border: '#a7f3d0',
    };
  } else if (['pending', 'half day', 'in progress', 'reviewing'].includes(normalized)) {
    colorConfig = {
      bg: '#fffbeb',
      color: '#92400e',
      border: '#fde68a',
    };
  } else if (['late'].includes(normalized)) {
    colorConfig = {
      bg: '#fff7ed',
      color: '#c2410c',
      border: '#ffedd5',
    };
  } else if (['rejected', 'absent', 'inactive', 'unpaid', 'failed'].includes(normalized)) {
    colorConfig = {
      bg: '#fef2f2',
      color: '#991b1b',
      border: '#fecaca',
    };
  } else if (['on leave', 'annual', 'casual', 'sick'].includes(normalized)) {
    colorConfig = {
      bg: '#eff6ff',
      color: '#1e40af',
      border: '#bfdbfe',
    };
  }

  return (
    <Chip
      label={status}
      size={size}
      variant="outlined"
      sx={{
        backgroundColor: colorConfig.bg,
        color: colorConfig.color,
        borderColor: colorConfig.border,
        fontWeight: 600,
        fontSize: size === 'small' ? '0.725rem' : '0.8125rem',
        textTransform: 'capitalize',
        ...sx,
      }}
    />
  );
};

export default StatusChip;

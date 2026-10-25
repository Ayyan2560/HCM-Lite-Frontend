import { createTheme, alpha } from '@mui/material/styles';

export const brandColors = {
  navy: {
    darkest: '#090d16',
    sidebar: '#0f172a', // Slate 900
    sidebarHover: '#1e293b', // Slate 800
    sidebarActive: '#2563eb', // Royal Blue active
    border: 'rgba(255, 255, 255, 0.08)',
    textPrimary: '#f8fafc',
    textSecondary: '#94a3b8',
  },
  primary: {
    main: '#2563eb', // Blue 600
    light: '#3b82f6',
    dark: '#1d4ed8',
    subtle: '#eff6ff',
  },
  success: {
    main: '#10b981', // Emerald 500
    light: '#34d399',
    dark: '#059669',
    subtle: '#ecfdf5',
  },
  warning: {
    main: '#f59e0b', // Amber 500
    light: '#fbbf24',
    dark: '#d97706',
    subtle: '#fffbeb',
  },
  error: {
    main: '#ef4444', // Red 500
    light: '#f87171',
    dark: '#dc2626',
    subtle: '#fef2f2',
  },
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
};

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: brandColors.primary.main,
      light: brandColors.primary.light,
      dark: brandColors.primary.dark,
      contrastText: '#ffffff',
    },
    secondary: {
      main: brandColors.slate[600],
      light: brandColors.slate[400],
      dark: brandColors.slate[800],
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
    text: {
      primary: '#0f172a',
      secondary: '#64748b',
      disabled: '#94a3b8',
    },
    divider: '#e2e8f0',
    success: {
      main: brandColors.success.main,
      light: brandColors.success.light,
      dark: brandColors.success.dark,
    },
    warning: {
      main: brandColors.warning.main,
      light: brandColors.warning.light,
      dark: brandColors.warning.dark,
    },
    error: {
      main: brandColors.error.main,
      light: brandColors.error.light,
      dark: brandColors.error.dark,
    },
    info: {
      main: '#0284c7',
      light: '#38bdf8',
      dark: '#0369a1',
    },
  },
  typography: {
    fontFamily: [
      '"Plus Jakarta Sans"',
      '"Inter"',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      'sans-serif',
    ].join(','),
    h1: { fontWeight: 700, letterSpacing: '-0.025em' },
    h2: { fontWeight: 700, letterSpacing: '-0.02em' },
    h3: { fontWeight: 700, letterSpacing: '-0.015em' },
    h4: { fontWeight: 600, letterSpacing: '-0.01em' },
    h5: { fontWeight: 600, letterSpacing: '-0.01em' },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 500, color: '#475569' },
    subtitle2: { fontWeight: 500, color: '#64748b', fontSize: '0.875rem' },
    body1: { fontSize: '0.9375rem', lineHeight: 1.55 },
    body2: { fontSize: '0.84375rem', lineHeight: 1.5, color: '#64748b' },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: '0.01em' },
    caption: { fontSize: '0.75rem', color: '#94a3b8' },
  },
  shape: {
    borderRadius: 10,
  },
  shadows: [
    'none',
    '0 1px 2px 0 rgba(16, 24, 40, 0.05)',
    '0 1px 3px 0 rgba(16, 24, 40, 0.1), 0 1px 2px -1px rgba(16, 24, 40, 0.1)',
    '0 4px 6px -1px rgba(16, 24, 40, 0.08), 0 2px 4px -2px rgba(16, 24, 40, 0.06)',
    '0 10px 15px -3px rgba(16, 24, 40, 0.08), 0 4px 6px -4px rgba(16, 24, 40, 0.04)',
    '0 20px 25px -5px rgba(16, 24, 40, 0.08), 0 8px 10px -6px rgba(16, 24, 40, 0.04)',
    '0 25px 50px -12px rgba(16, 24, 40, 0.15)',
    ...Array(18).fill('0 4px 20px rgba(15, 23, 42, 0.08)'),
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
          boxShadow: 'none',
          fontSize: '0.875rem',
          '&:hover': {
            boxShadow: '0 2px 4px rgba(37, 99, 235, 0.15)',
          },
        },
        containedPrimary: {
          backgroundColor: brandColors.primary.main,
          '&:hover': {
            backgroundColor: brandColors.primary.dark,
          },
        },
        outlined: {
          borderColor: brandColors.slate[300],
          color: brandColors.slate[700],
          '&:hover': {
            backgroundColor: brandColors.slate[100],
            borderColor: brandColors.slate[400],
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: `1px solid ${brandColors.slate[200]}`,
          boxShadow: '0 1px 3px 0 rgba(16, 24, 40, 0.05)',
          backgroundImage: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        elevation1: {
          boxShadow: '0 1px 3px 0 rgba(16, 24, 40, 0.05)',
          border: `1px solid ${brandColors.slate[200]}`,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: '#ffffff',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: brandColors.slate[200],
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: brandColors.slate[400],
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: brandColors.primary.main,
            borderWidth: '1.5px',
          },
        },
        input: {
          padding: '10px 14px',
          fontSize: '0.875rem',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 6,
          fontSize: '0.75rem',
          height: 24,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: brandColors.slate[200],
          padding: '12px 16px',
        },
        head: {
          backgroundColor: brandColors.slate[50],
          color: brandColors.slate[700],
          fontWeight: 600,
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        },
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: `1px solid ${brandColors.slate[200]}`,
          borderRadius: 10,
          backgroundColor: '#ffffff',
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: brandColors.slate[50],
            borderBottom: `1px solid ${brandColors.slate[200]}`,
            color: brandColors.slate[700],
            fontWeight: 600,
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          },
          '& .MuiDataGrid-cell': {
            borderBottom: `1px solid ${brandColors.slate[100]}`,
            fontSize: '0.875rem',
            '&:focus, &:focus-within': {
              outline: 'none',
            },
          },
          '& .MuiDataGrid-row:hover': {
            backgroundColor: brandColors.slate[50],
          },
          '& .MuiDataGrid-footerContainer': {
            borderTop: `1px solid ${brandColors.slate[200]}`,
          },
        },
      },
    },
  },
});

import React from 'react';
import { Card, CardContent, Box, Typography, Stack } from '@mui/material';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import TrendingDownRoundedIcon from '@mui/icons-material/TrendingDownRounded';
import { brandColors } from '../theme/theme';

export const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = brandColors.primary.main,
  iconBg = brandColors.primary.subtle,
  trend,
  trendLabel,
  isPositive = true,
}) => {
  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          borderColor: brandColors.slate[300],
          boxShadow: '0 4px 12px 0 rgba(16, 24, 40, 0.08)',
        },
      }}
    >
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {title}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5, color: 'text.primary' }}>
              {value}
            </Typography>
          </Box>
          {Icon && (
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: iconBg,
                color: iconColor,
                flexShrink: 0,
              }}
            >
              <Icon fontSize="medium" />
            </Box>
          )}
        </Stack>

        {(trend || subtitle) && (
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 2 }}>
            {trend && (
              <Stack
                direction="row"
                alignItems="center"
                spacing={0.5}
                sx={{
                  color: isPositive ? 'success.main' : 'error.main',
                  backgroundColor: isPositive ? 'success.subtle' : 'error.subtle',
                  px: 0.75,
                  py: 0.25,
                  borderRadius: 1,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                {isPositive ? (
                  <TrendingUpRoundedIcon sx={{ fontSize: '1rem' }} />
                ) : (
                  <TrendingDownRoundedIcon sx={{ fontSize: '1rem' }} />
                )}
                <span>{trend}</span>
              </Stack>
            )}
            <Typography variant="caption" color="text.secondary">
              {trendLabel || subtitle}
            </Typography>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;

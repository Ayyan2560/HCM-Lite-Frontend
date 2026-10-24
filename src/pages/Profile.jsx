import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  Grid,
  Typography,
  TextField,
  Button,
  Stack,
  Avatar,
  IconButton,
  Divider,
  Paper,
  Alert,
  Snackbar,
  CircularProgress,
} from '@mui/material';
import PhotoCameraRoundedIcon from '@mui/icons-material/PhotoCameraRounded';
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded';
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';

import { useAuth } from '../context/AuthContext';
import userRoutes from '../api/userRoutes';
import StatusChip from '../components/StatusChip';
import { brandColors } from '../theme/theme';

export const Profile = () => {
  const { user, updateUserData } = useAuth();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: user?.name || 'Alexander Mitchell',
    email: user?.email || 'alexander.m@hcmlite.com',
    phone: user?.phone || '+1 (555) 234-8901',
    designation: user?.designation || 'VP of People & Operations',
    department: user?.department || 'Human Resources',
    location: user?.location || 'San Francisco, CA (HQ)',
    bio:
      user?.bio ||
      'Leading talent strategy, organizational scaling, and workplace excellence across global engineering and product teams.',
    avatarUrl: user?.avatarUrl || user?.avatar || '',
  });

  const [avatarPreview, setAvatarPreview] = useState(
    user?.avatarUrl || user?.avatar || ''
  );
  const [avatarFile, setAvatarFile] = useState(null);

  const [initialData, setInitialData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (user) {
      const initial = {
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        designation: user.designation || '',
        department: user.department || '',
        location: user.location || '',
        bio: user.bio || '',
        avatarUrl: user.avatarUrl || user.avatar || '',
      };
      setFormData(initial);
      setInitialData(initial);
      setAvatarPreview(user.avatarUrl || user.avatar || '');
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setFeedback({
          type: 'error',
          message: 'Image size exceeds maximum 5MB limit.',
        });
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTriggerUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) {
      errs.name = 'Full name is required';
    }
    if (!formData.phone.trim()) {
      errs.phone = 'Contact telephone is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      let payload;
      if (avatarFile) {
        payload = new FormData();
        payload.append('avatar', avatarFile);
        payload.append('name', formData.name);
        payload.append('phone', formData.phone);
        payload.append('location', formData.location);
        payload.append('bio', formData.bio);
      } else {
        payload = {
          name: formData.name,
          phone: formData.phone,
          location: formData.location,
          bio: formData.bio,
        };
      }

      const res = await userRoutes.updateProfile(payload);
      if (res.success && res.data) {
        updateUserData({
          ...res.data,
          avatarUrl: avatarPreview || res.data.avatarUrl,
        });
        setFeedback({
          type: 'success',
          message: 'Profile details saved and updated successfully.',
        });
        setInitialData({ ...formData, avatarUrl: avatarPreview });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: 'Failed to update profile details. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (initialData) {
      setFormData(initialData);
      setAvatarPreview(initialData.avatarUrl);
      setAvatarFile(null);
      setErrors({});
    }
  };

  return (
    <Box sx={{ pb: 4 }}>
      <Grid container spacing={3}>
        {/* Left Card: Avatar & Organization Summary */}
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 3, textAlign: 'center', height: '100%' }}>
            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/*"
              style={{ display: 'none' }}
            />

            <Box sx={{ position: 'relative', display: 'inline-block', mb: 2 }}>
              <Avatar
                src={avatarPreview}
                alt={formData.name}
                sx={{
                  width: 120,
                  height: 120,
                  mx: 'auto',
                  border: `3px solid ${brandColors.primary.main}`,
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
                }}
              >
                {formData.name?.charAt(0) || 'U'}
              </Avatar>
              <IconButton
                onClick={handleTriggerUpload}
                size="small"
                sx={{
                  position: 'absolute',
                  bottom: 2,
                  right: 2,
                  backgroundColor: brandColors.primary.main,
                  color: '#ffffff',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  '&:hover': { backgroundColor: brandColors.primary.dark },
                }}
              >
                <PhotoCameraRoundedIcon fontSize="small" />
              </IconButton>
            </Box>

            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              {formData.name}
            </Typography>
            <Typography variant="body2" sx={{ color: brandColors.primary.main, fontWeight: 600, mt: 0.5 }}>
              {formData.designation}
            </Typography>
            <Typography variant="caption" sx={{ color: brandColors.slate[500], display: 'block', mb: 2 }}>
              {formData.email}
            </Typography>

            <Box sx={{ mb: 3 }}>
              <StatusChip status="Active Employee" />
            </Box>

            <Divider sx={{ my: 2 }} />

            <Stack spacing={1.5} sx={{ textAlign: 'left' }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  EMPLOYEE ID
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                  {user?.employeeId || 'HCM-00101'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  PRIMARY DEPARTMENT
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {formData.department}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  TENURE / JOIN DATE
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {user?.joinDate || 'March 15, 2023'}
                </Typography>
              </Box>
            </Stack>
          </Card>
        </Grid>

        {/* Right Card: Editable Profile Details Form */}
        <Grid item xs={12} md={8}>
          <Card sx={{ p: 3 }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Personal & Workplace Credentials
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Keep your corporate directory details, phone numbers, and emergency contact up to date
              </Typography>
            </Box>

            <Box component="form" onSubmit={handleSave} noValidate>
              <Stack spacing={2.5}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.75 }}>
                      Full Name
                    </Typography>
                    <TextField
                      fullWidth
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      error={Boolean(errors.name)}
                      helperText={errors.name}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.75 }}>
                      Corporate Email (Read Only)
                    </Typography>
                    <TextField
                      fullWidth
                      name="email"
                      value={formData.email}
                      disabled
                      helperText="Governed by enterprise identity provider (SSO)"
                    />
                  </Grid>
                </Grid>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.75 }}>
                      Direct Contact Phone
                    </Typography>
                    <TextField
                      fullWidth
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      error={Boolean(errors.phone)}
                      helperText={errors.phone}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.75 }}>
                      Work Office Location
                    </Typography>
                    <TextField
                      fullWidth
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                    />
                  </Grid>
                </Grid>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.75 }}>
                      Department
                    </Typography>
                    <TextField
                      fullWidth
                      name="department"
                      value={formData.department}
                      disabled
                      helperText="Managed by Human Resources"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.75 }}>
                      Official Designation
                    </Typography>
                    <TextField
                      fullWidth
                      name="designation"
                      value={formData.designation}
                      disabled
                      helperText="Managed by Human Resources"
                    />
                  </Grid>
                </Grid>

                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.75 }}>
                    Professional Bio
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    placeholder="Briefly state your role and responsibilities..."
                  />
                </Box>

                <Divider sx={{ my: 1 }} />

                <Stack direction="row" spacing={2} justifyContent="flex-end">
                  <Button
                    variant="outlined"
                    color="inherit"
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={saving}
                    sx={{ px: 3, fontWeight: 700 }}
                  >
                    {saving ? <CircularProgress size={22} color="inherit" /> : 'Save Changes'}
                  </Button>
                </Stack>
              </Stack>
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* Feedback Toast */}
      <Snackbar
        open={Boolean(feedback)}
        autoHideDuration={4000}
        onClose={() => setFeedback(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setFeedback(null)}
          severity={feedback?.type || 'info'}
          variant="filled"
          sx={{ width: '100%', borderRadius: 2 }}
        >
          {feedback?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Profile;

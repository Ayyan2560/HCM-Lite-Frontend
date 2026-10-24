import api from './axios';
import { mockEmployees, mockCurrentUser } from '../data/mockData';

let demoUsers = [...mockEmployees];
let demoProfile = { ...mockCurrentUser };

export const userRoutes = {
  // GET /api/users
  async getUsers() {
    try {
      const response = await api.get('/api/users');
      return { success: true, data: response.data?.users || response.data, isMock: false };
    } catch (error) {
      return { success: true, data: demoUsers, isMock: true };
    }
  },

  // PUT /api/users/profile
  async updateProfile(profileData) {
    try {
      // Handles both JSON and FormData if image is uploaded
      const isFormData = profileData instanceof FormData;
      const response = await api.put('/api/users/profile', profileData, {
        headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {},
      });
      return { success: true, data: response.data?.user || response.data, isMock: false };
    } catch (error) {
      if (profileData instanceof FormData) {
        demoProfile = {
          ...demoProfile,
          name: profileData.get('name') || demoProfile.name,
          phone: profileData.get('phone') || demoProfile.phone,
          bio: profileData.get('bio') || demoProfile.bio,
          location: profileData.get('location') || demoProfile.location,
        };
      } else {
        demoProfile = {
          ...demoProfile,
          ...profileData,
        };
      }
      return { success: true, data: demoProfile, isMock: true };
    }
  },

  // Get current active profile
  getDemoProfile() {
    return demoProfile;
  },
};

export default userRoutes;

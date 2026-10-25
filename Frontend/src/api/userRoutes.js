import employeeApi from './employeeApi';

// Compatibility adapter for existing components
export const userRoutes = {
  getUsers: (params) => employeeApi.listEmployees(params),
  updateProfile: (payload) => employeeApi.updateMyProfile(payload),
};

export default userRoutes;

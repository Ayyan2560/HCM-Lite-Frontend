import axios from 'axios';

// Base URL configured via environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 10000,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add custom trace headers or timestamp if needed
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      // Backend returned an error response (4xx, 5xx)
      const status = error.response.status;
      if (status === 401) {
        // Expired session or unauthorized
        console.warn('Session expired or unauthorized request (401)');
      } else if (status === 403) {
        console.warn('Forbidden: Insufficient privileges (403)');
      }
    } else if (error.request) {
      // Backend service unreachable
      console.warn('HCM Lite API is unreachable. Operating in offline/demo fallback mode.');
    }
    return Promise.reject(error);
  }
);

export default api;

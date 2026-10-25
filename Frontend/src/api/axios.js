import axios from 'axios';

// Base URL configured via environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15000,
});

// Request interceptor: attach bearer token if present
api.interceptors.request.use(
  (config) => {
    const token =
      sessionStorage.getItem('hcm_lite_token') ||
      localStorage.getItem('hcm_lite_token');
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: handle 401 and errors cleanly
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      const status = error.response.status;
      if (status === 401) {
        if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/setup')) {
          console.warn('Session expired or unauthorized request (401)');
          // Dispatch event so AuthContext can handle logout if needed
          window.dispatchEvent(new CustomEvent('hcm:unauthorized'));
        }
      }
    }
    return Promise.reject(error);
  }
);

// Helper to trigger browser download for PDF / CSV
export async function downloadFile(url, defaultFilename = 'download') {
  const token =
    sessionStorage.getItem('hcm_lite_token') ||
    localStorage.getItem('hcm_lite_token');

  const response = await fetch(`${API_BASE_URL}${url}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  });

  if (!response.ok) {
    let message = 'Download failed.';
    try {
      const payload = await response.json();
      message = payload?.message || message;
    } catch {
      // not json
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = defaultFilename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(blobUrl);
}

export default api;

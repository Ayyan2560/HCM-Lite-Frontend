import axios from 'axios';

// In production, authenticate directly against the backend origin. A stale
// VITE_API_URL pointing at another frontend deployment breaks cookie sessions.
const productionApiOrigin = 'https://hcm-lite-frontend-iloq.vercel.app';
const envApiUrl = String(import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
const pointsToFrontend = /^https?:\/\/hcm-lite-frontend-[^/]+\.vercel\.app(?:\/api)?$/i.test(envApiUrl);
const isRelativeApiUrl = envApiUrl.startsWith('/');

const configured = import.meta.env.PROD
  ? (envApiUrl && !pointsToFrontend && !isRelativeApiUrl ? envApiUrl : productionApiOrigin)
  : envApiUrl;

// Accept either "http://host:5000" or "http://host:5000/api".
export const apiBaseURL = configured
  ? (configured.endsWith('/api') ? configured : `${configured}/api`)
  : '/api';

export const assetOrigin = configured
  ? configured.replace(/\/api$/, '')
  : window.location.origin;

export const api = axios.create({
  baseURL: apiBaseURL,
  withCredentials: true,
  timeout: 20000,
  headers: { Accept: 'application/json' },
});

api.interceptors.response.use(
  (response) => {
    if (response.config?.skipUnwrap) return response;
    const payload = response.data;
    if (payload && typeof payload === 'object' && 'success' in payload) {
      return payload.data;
    }
    return payload;
  },
  (error) => {
    const status = error.response?.status;
    const url = String(error.config?.url || '');
    const isAuthAttempt = url.includes('/auth/login') || url.includes('/auth/setup');
    const isSessionCheck = url.endsWith('/auth/me');

    if (status === 401 && !isAuthAttempt) {
      window.dispatchEvent(new CustomEvent('hcm:session-expired', {
        detail: { silent: isSessionCheck },
      }));
    }

    if (status === 403 && error.response?.data?.code === 'PASSWORD_CHANGE_REQUIRED') {
      window.dispatchEvent(new CustomEvent('hcm:password-required'));
    }

    return Promise.reject(error);
  },
);

export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback;
  if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
    return 'Cannot reach the server. Check that the backend is running and VITE_API_URL is correct.';
  }
  if (error.code === 'ECONNABORTED') return 'The request timed out. Please try again.';
  const data = error.response?.data;
  if (data?.message) return data.message;
  if (typeof data === 'string' && data.trim()) return data;
  if (error.message) return error.message;
  return fallback;
}

export function getFieldErrors(error) {
  const details = error?.response?.data?.details;
  if (!details || typeof details !== 'object') return {};
  if (details.fields && typeof details.fields === 'object') return details.fields;
  return Object.fromEntries(
    Object.entries(details).filter(([, value]) => typeof value === 'string'),
  );
}

export function resolveAssetUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${assetOrigin}${path.startsWith('/') ? '' : '/'}${path}`;
}

function filenameFromDisposition(disposition, fallback) {
  if (!disposition) return fallback;
  const utf8 = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8) return decodeURIComponent(utf8[1]);
  const normal = disposition.match(/filename="?([^";]+)"?/i);
  return normal ? normal[1] : fallback;
}

export async function downloadFile(url, fallbackName = 'download') {
  const response = await api.get(url, { responseType: 'blob', skipUnwrap: true });
  const filename = filenameFromDisposition(response.headers?.['content-disposition'], fallbackName);
  const blobUrl = window.URL.createObjectURL(response.data);
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(blobUrl);
  return filename;
}

export default api;

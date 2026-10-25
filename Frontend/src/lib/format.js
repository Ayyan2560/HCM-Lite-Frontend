const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function dateKeyFromParts(parts) {
  const pick = (type) => parts.find((part) => part.type === type)?.value;
  return `${pick('year')}-${pick('month')}-${pick('day')}`;
}

export function todayKey(timeZone) {
  const now = new Date();
  if (!timeZone) return dateKeyFromParts(new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now));
  try {
    return dateKeyFromParts(new Intl.DateTimeFormat('en-CA', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(now));
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

export function currentPeriod(timeZone) {
  return todayKey(timeZone).slice(0, 7);
}

export function monthStartKey(timeZone) {
  return `${todayKey(timeZone).slice(0, 7)}-01`;
}

export function addDaysKey(dateKey, amount) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return dateKey;
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function parse(value) {
  if (!value) return null;
  if (DATE_KEY_RE.test(String(value))) return new Date(`${value}T00:00:00`);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value, options = {}) {
  const date = parse(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', ...options,
  }).format(date);
}

export function formatDateLong(value) {
  return formatDate(value, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatDateTime(value) {
  const date = parse(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

export function formatTime(value) {
  const date = parse(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date);
}

export function formatTime12(value) {
  const date = parse(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(date);
}

export function formatMonth(period) {
  if (!period || !/^\d{4}-\d{2}$/.test(period)) return period || '—';
  const date = new Date(`${period}-01T00:00:00`);
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(date);
}

export function formatMoney(value, currency = 'PKR', { decimals = 0 } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'PKR',
      currencyDisplay: 'code',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(number);
  } catch {
    return `${currency || ''} ${number.toLocaleString('en-US')}`.trim();
  }
}

export function formatNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString('en-US') : '—';
}

export function formatDuration(minutes) {
  const total = Math.max(0, Math.round(Number(minutes) || 0));
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (!total) return '0m';
  if (!hours) return `${mins}m`;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}

export function minutesToTime(total) {
  const normalized = ((Math.round(Number(total) || 0) % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
}

export function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return `${parts[0][0]}${parts.length > 1 ? parts[parts.length - 1][0] : ''}`.toUpperCase();
}

export function relativeTime(value) {
  const date = parse(value);
  if (!date) return '';
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(value);
}

export function weekday(dateKey) {
  const date = parse(dateKey);
  return date ? new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(date) : '';
}

export function isDateKey(value) {
  if (!DATE_KEY_RE.test(String(value || ''))) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function fileTimestamp() {
  return new Date().toISOString().slice(0, 10);
}

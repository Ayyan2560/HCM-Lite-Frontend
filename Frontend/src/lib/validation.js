export function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

export function validatePassword(value) {
  if (String(value || '').length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Za-z]/.test(String(value)) || !/\d/.test(String(value))) {
    return 'Password must include at least one letter and one number.';
  }
  return null;
}

export function required(value, label) {
  if (!String(value ?? '').trim()) return `${label} is required.`;
  return null;
}

export function maxLength(value, label, max) {
  if (String(value ?? '').length > max) return `${label} must be at most ${max} characters.`;
  return null;
}

export function numericRange(value, label, { min, max, integer = false } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number)) return `${label} must be a number.`;
  if (integer && !Number.isInteger(number)) return `${label} must be a whole number.`;
  if (min !== undefined && number < min) return `${label} must be at least ${min}.`;
  if (max !== undefined && number > max) return `${label} must be at most ${max}.`;
  return null;
}

export function compactErrors(errors) {
  return Object.fromEntries(Object.entries(errors).filter(([, value]) => Boolean(value)));
}

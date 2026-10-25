import { badRequest } from './http.mjs';
import { isValidDateKey } from './dates.mjs';

export const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
export const asString = (value) => (typeof value === 'string' ? value.trim() : '');

export function requireString(value, label, { min = 1, max = 500 } = {}) {
  const text = asString(value);
  if (text.length < min) throw badRequest(`${label} is required.`);
  if (text.length > max) throw badRequest(`${label} must be at most ${max} characters.`);
  return text;
}

export function optionalString(value, max = 500) {
  const text = asString(value);
  return text.length > max ? text.slice(0, max) : text;
}

export function requireEmail(value, label = 'Email') {
  const email = asString(value).toLowerCase();
  if (!isEmail(email)) throw badRequest(`${label} is not a valid email address.`);
  return email;
}

export function requireRole(value, allowed = ['admin', 'hr', 'employee']) {
  const role = asString(value).toLowerCase();
  if (!allowed.includes(role)) throw badRequest(`Role must be one of: ${allowed.join(', ')}.`);
  return role;
}

export function requireNumber(value, label, { min = 0, max = Number.MAX_SAFE_INTEGER, integer = false } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw badRequest(`${label} must be a number.`);
  if (integer && !Number.isInteger(number)) throw badRequest(`${label} must be a whole number.`);
  if (number < min) throw badRequest(`${label} must be at least ${min}.`);
  if (number > max) throw badRequest(`${label} must be at most ${max}.`);
  return number;
}

export function requireDateKey(value, label = 'Date') {
  const key = asString(value);
  if (!isValidDateKey(key)) throw badRequest(`${label} must be a valid ISO date (YYYY-MM-DD).`);
  return key;
}

export function requireTime(value, label = 'Time') {
  const time = asString(value);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw badRequest(`${label} must be a valid time (HH:mm).`);
  return time;
}

export function requireEnum(value, values, label) {
  const candidate = asString(value);
  if (!values.includes(candidate)) throw badRequest(`${label} must be one of: ${values.join(', ')}.`);
  return candidate;
}

export function requireObjectId(value, label = 'Identifier') {
  const id = asString(value);
  if (!/^[a-f\d]{24}$/i.test(id)) throw badRequest(`${label} is invalid.`);
  return id;
}

export function requireCoordinate(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw badRequest(`${label} must be a number.`);
  return number;
}

export function requireArray(value, label, { min = 0, max = 200 } = {}) {
  if (!Array.isArray(value)) throw badRequest(`${label} must be an array.`);
  if (value.length < min) throw badRequest(`${label} must contain at least ${min} item(s).`);
  if (value.length > max) throw badRequest(`${label} must contain at most ${max} items.`);
  return value;
}

/** Lightweight schema validator: { field: (value) => cleaned }. */
export function validateBody(body, schema) {
  const input = body && typeof body === 'object' ? body : {};
  const output = {};
  for (const [key, validator] of Object.entries(schema)) {
    output[key] = validator(input[key], input);
  }
  return output;
}

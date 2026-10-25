import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

export function validatePassword(password) {
  const value = String(password || '');
  if (value.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return 'Password must include at least one letter and one number.';
  return null;
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password, hash) {
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}

/** Secure temporary password shown once to the creating HR/Admin. */
export function temporaryPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let random = '';
  for (let i = 0; i < 6; i += 1) random += alphabet[crypto.randomInt(0, alphabet.length)];
  return `Hcm@${random}`;
}

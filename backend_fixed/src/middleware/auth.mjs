import jwt from 'jsonwebtoken';
import env from '../config/env.mjs';
import { User } from '../models/User.mjs';
import { Employee } from '../models/Employee.mjs';
import { AppError, forbidden, unauthorized } from '../utils/http.mjs';

export function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn, issuer: 'hcm-lite' }
  );
}

const PASSWORD_CHANGE_ALLOWLIST = ['/api/auth/me', '/api/auth/change-password', '/api/auth/logout'];

export async function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = (header.startsWith('Bearer ') ? header.slice(7) : null) || req.cookies?.token;
    if (!token) throw unauthorized('Missing authentication token.');
    let payload;
    try {
      payload = jwt.verify(token, env.jwtSecret, { issuer: 'hcm-lite' });
    } catch {
      throw unauthorized('Session expired or token invalid. Please sign in again.');
    }
    const user = await User.findById(payload.sub);
    if (!user) throw unauthorized('Account no longer exists.');
    if (!user.isActive) throw forbidden('This account has been deactivated.');

    if (user.mustChangePassword) {
      const path = req.originalUrl.split('?')[0];
      if (!PASSWORD_CHANGE_ALLOWLIST.includes(path)) {
        throw new AppError(
          403,
          'You must set a new password before continuing.',
          null,
          'PASSWORD_CHANGE_REQUIRED'
        );
      }
    }
    req.user = user;
    if (user.employee) {
      req.employee = await Employee.findById(user.employee);
    }
    next();
  } catch (error) {
    next(error);
  }
}

export function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(forbidden(`This action requires ${roles.join(' or ')} access.`));
    }
    next();
  };
}

export function requireEmployee(req, _res, next) {
  if (!req.employee) return next(forbidden('No employee profile is linked to this account.'));
  next();
}

export function requireSelfOrHrRoles(req, _res, next) {
  const targetId = req.params.employeeId || req.params.id;
  if (['admin', 'hr'].includes(req.user.role)) return next();
  if (req.employee && String(req.employee._id) === String(targetId)) return next();
  next(forbidden('You may only access your own records.'));
}

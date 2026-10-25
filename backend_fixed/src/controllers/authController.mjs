import { Organization } from '../models/Organization.mjs';
import { User } from '../models/User.mjs';
import { Employee } from '../models/Employee.mjs';
import { AppError, conflict, ok, unauthorized } from '../utils/http.mjs';
import { hashPassword, validatePassword, verifyPassword } from '../utils/password.mjs';
import { requireEmail, requireString, validateBody, optionalString } from '../utils/validate.mjs';
import { signToken } from '../middleware/auth.mjs';
import { getOrganization } from '../services/orgService.mjs';
import { recordAudit } from '../services/auditService.mjs';
import env from '../config/env.mjs';

/**
 * Parse JWT expiry string into milliseconds so the cookie lifetime matches the
 * token lifetime exactly. Supports formats: "12h", "7d", "3600" (seconds).
 */
function parseExpiresInMs(value = '12h') {
  const str = String(value).trim();
  if (/^\d+$/.test(str)) return Number(str) * 1000;
  const num = parseInt(str, 10);
  const unit = str.slice(-1);
  if (unit === 'd') return num * 24 * 60 * 60 * 1000;
  if (unit === 'h') return num * 60 * 60 * 1000;
  if (unit === 'm') return num * 60 * 1000;
  if (unit === 's') return num * 1000;
  return 12 * 60 * 60 * 1000; // fallback
}

const cookieOptions = () => ({
  httpOnly: true,
  secure: env.isProduction,
  sameSite: env.isProduction ? 'none' : 'lax',
  path: '/',
  maxAge: parseExpiresInMs(env.jwtExpiresIn),
});

export const DEFAULT_DEPARTMENTS = [
  'Engineering', 'Human Resources', 'Finance', 'Sales', 'Operations', 'Marketing'
];
export const DEFAULT_DESIGNATIONS = [
  'Software Engineer', 'Senior Engineer', 'HR Manager', 'HR Officer', 'Accountant',
  'Sales Executive', 'Operations Associate', 'Marketing Specialist', 'Team Lead'
];

export async function setupStatus(req, res) {
  const [org, adminExists] = await Promise.all([
    Organization.findOne({ singleton: 'primary' }).lean(),
    User.exists({ role: 'admin' })
  ]);
  ok(res, {
    setupRequired: !org && !adminExists,
    companyName: org?.name || null
  });
}

/** First-run bootstrap: creates the company + exactly one initial Admin. */
export async function setup(req, res) {
  const existingOrg = await Organization.findOne({ singleton: 'primary' });
  const existingAdmin = await User.exists({ role: 'admin' });
  if (existingOrg || existingAdmin) {
    throw conflict('This installation is already initialised. Please sign in.');
  }

  const body = validateBody(req.body, {
    companyName: (value) => requireString(value, 'Company name', { min: 2, max: 160 }),
    adminName: (value) => requireString(value, 'Your name', { min: 2, max: 120 }),
    email: (value) => requireEmail(value),
    password: (value) => {
      const password = String(value || '');
      const problem = validatePassword(password);
      if (problem) throw new AppError(400, problem);
      return password;
    },
    timezone: (value) => optionalString(value, 64) || 'Asia/Karachi',
    currency: (value) => (optionalString(value, 8) || 'PKR').toUpperCase()
  });

  const org = await Organization.create({
    singleton: 'primary',
    name: body.companyName,
    currency: body.currency,
    timezone: body.timezone,
    workStartTime: '09:00',
    graceMinutes: 15,
    halfDayHours: 5,
    weekendDays: [6, 0],
    departments: DEFAULT_DEPARTMENTS.map((name) => ({ name })),
    designations: DEFAULT_DESIGNATIONS,
    leavePolicy: { annual: 14, sick: 8, casual: 10, unpaid: null },
    publicHolidays: [],
    setupCompleted: true,
    initializedAt: new Date()
  });

  const admin = await User.create({
    name: body.adminName,
    email: body.email,
    passwordHash: await hashPassword(body.password),
    role: 'admin',
    isActive: true,
    mustChangePassword: false
  });

  await recordAudit({
    req,
    actor: admin,
    action: 'organization.setup',
    entityType: 'Organization',
    entityId: org._id,
    summary: `Initial company setup for ${org.name}`,
    after: { name: org.name, currency: org.currency, timezone: org.timezone }
  });

  const token = signToken(admin);
  res.cookie('token', token, cookieOptions());
  ok(res, { token, user: admin.toSafeJSON(), organization: org.toPublicJSON() }, 201);
}

export async function login(req, res) {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!email || !password) throw new AppError(400, 'Email and password are required.');

  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) throw unauthorized('Invalid email or password.');
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) throw unauthorized('Invalid email or password.');
  if (!user.isActive) throw new AppError(403, 'This account has been deactivated. Contact your administrator.');

  user.lastLoginAt = new Date();
  await user.save();
  await recordAudit({
    req, actor: user, action: 'auth.login', entityType: 'User', entityId: user._id, summary: `${user.role} signed in`
  });

  const token = signToken(user);
  res.cookie('token', token, cookieOptions());
  ok(res, {
    token,
    user: user.toSafeJSON(),
    organization: user.role === 'employee' ? (await getOrganization()).toPublicJSON() : (await getOrganization()).toPublicJSON()
  });
}

export async function me(req, res) {
  const organization = await getOrganization({ required: false });
  const employee = req.employee
    ? await Employee.findById(req.employee._id).lean()
    : req.user.employee
      ? await Employee.findById(req.user.employee).lean()
      : null;
  if (employee) {
    employee.id = employee._id.toString();
  }
  ok(res, {
    user: req.user.toSafeJSON(),
    employee: employee || null,
    organization: organization ? organization.toPublicJSON() : null
  });
}

export async function changePassword(req, res) {
  const currentPassword = String(req.body?.currentPassword || '');
  const newPassword = String(req.body?.newPassword || '');
  if (!currentPassword) throw new AppError(400, 'Current password is required.');
  const problem = validatePassword(newPassword);
  if (problem) throw new AppError(400, problem);

  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw unauthorized('Current password is incorrect.');
  }
  if (await verifyPassword(newPassword, user.passwordHash)) {
    throw new AppError(400, 'The new password must be different from the current password.');
  }
  user.passwordHash = await hashPassword(newPassword);
  user.mustChangePassword = false;
  user.passwordChangedAt = new Date();
  await user.save();

  await recordAudit({
    req, actor: user, action: 'auth.password_changed', entityType: 'User', entityId: user._id,
    summary: 'Password updated by account owner'
  });
  ok(res, { user: user.toSafeJSON(), message: 'Password updated.' });
}

export async function logout(req, res) {
  res.clearCookie('token', cookieOptions());
  if (req.user) {
    await recordAudit({
      req, actor: req.user, action: 'auth.logout', entityType: 'User', entityId: req.user._id, summary: 'Signed out'
    });
  }
  ok(res, { message: 'Signed out.' });
}

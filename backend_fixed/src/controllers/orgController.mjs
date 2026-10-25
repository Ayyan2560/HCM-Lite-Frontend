import { Organization } from '../models/Organization.mjs';
import { Employee } from '../models/Employee.mjs';
import { User } from '../models/User.mjs';
import { AppError, ok } from '../utils/http.mjs';
import { requireString, requireArray, requireNumber, optionalString } from '../utils/validate.mjs';
import { getOrganization } from '../services/orgService.mjs';
import { recordAudit } from '../services/auditService.mjs';
import { isValidDateKey } from '../utils/dates.mjs';
import { temporaryPassword, hashPassword } from '../utils/password.mjs';

export async function getOrganizationSettings(req, res) {
  const org = await getOrganization();
  ok(res, org.toPublicJSON());
}

export async function updateOrganizationSettings(req, res) {
  const org = await getOrganization();
  const before = org.toPublicJSON();
  const body = req.body || {};

  if (body.name !== undefined) org.name = requireString(body.name, 'Company name', { min: 2, max: 160 });
  if (body.currency !== undefined) org.currency = (requireString(body.currency, 'Currency', { min: 2, max: 8 })).toUpperCase();
  if (body.timezone !== undefined) org.timezone = requireString(body.timezone, 'Timezone', { min: 3, max: 64 });
  if (body.workStartTime !== undefined) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(body.workStartTime))) {
      throw new AppError(400, 'Work start time must be HH:mm.');
    }
    org.workStartTime = body.workStartTime;
  }
  if (body.graceMinutes !== undefined) org.graceMinutes = requireNumber(body.graceMinutes, 'Grace period', { min: 0, max: 240, integer: true });
  if (body.halfDayHours !== undefined) org.halfDayHours = requireNumber(body.halfDayHours, 'Half-day threshold', { min: 1, max: 12 });
  if (body.weekendDays !== undefined) {
    const days = requireArray(body.weekendDays, 'Weekend days', { max: 7 }).map((day) =>
      requireNumber(day, 'Weekend day', { min: 0, max: 6, integer: true })
    );
    org.weekendDays = [...new Set(days)];
  }
  if (body.officeLatitude !== undefined) org.officeLatitude = requireNumber(body.officeLatitude, 'Office latitude', { min: -90, max: 90 });
  if (body.officeLongitude !== undefined) org.officeLongitude = requireNumber(body.officeLongitude, 'Office longitude', { min: -180, max: 180 });
  if (body.geofenceRadius !== undefined) org.geofenceRadius = requireNumber(body.geofenceRadius, 'Geofence radius', { min: 20, max: 5000 });
  if (body.geofenceEnabled !== undefined) org.geofenceEnabled = Boolean(body.geofenceEnabled);

  if (body.leavePolicy !== undefined) {
    const policy = body.leavePolicy || {};
    org.leavePolicy = {
      annual: requireNumber(policy.annual, 'Annual leave quota', { min: 0, max: 365 }),
      sick: requireNumber(policy.sick, 'Sick leave quota', { min: 0, max: 365 }),
      casual: requireNumber(policy.casual, 'Casual leave quota', { min: 0, max: 365 }),
      unpaid: policy.unpaid === null || policy.unpaid === '' || policy.unpaid === undefined
        ? null
        : requireNumber(policy.unpaid, 'Unpaid leave quota', { min: 0, max: 365 })
    };
  }

  if (body.publicHolidays !== undefined) {
    const holidays = requireArray(body.publicHolidays, 'Public holidays', { max: 200 }).map((holiday) => {
      if (!isValidDateKey(holiday?.date)) throw new AppError(400, 'Each holiday needs a valid date (YYYY-MM-DD).');
      return { date: holiday.date, name: requireString(holiday.name, 'Holiday name', { min: 2, max: 120 }) };
    });
    org.publicHolidays = holidays;
  }

  if (body.departments !== undefined) {
    const usedDepartments = await Employee.distinct('department');
    const departments = requireArray(body.departments, 'Departments', { max: 60 })
      .map((department) => requireString(typeof department === 'string' ? department : department?.name, 'Department name', { max: 80 }));
    const removed = usedDepartments.filter((name) => !departments.includes(name));
    if (removed.length) {
      throw new AppError(409, `Cannot remove departments that still have employees: ${removed.join(', ')}.`);
    }
    org.departments = [...new Set(departments)].map((name) => ({ name }));
  }

  if (body.designations !== undefined) {
    org.designations = requireArray(body.designations, 'Designations', { max: 100 })
      .map((designation) => optionalString(designation, 80))
      .filter(Boolean);
  }

  await org.save();
  await recordAudit({
    req,
    actor: req.user,
    action: 'organization.updated',
    entityType: 'Organization',
    entityId: org._id,
    summary: 'Organization configuration updated',
    before,
    after: org.toPublicJSON()
  });

  ok(res, org.toPublicJSON());
}

/** Admin-only HR account management. No endpoint can create another Admin. */
export async function listUsers(req, res) {
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  const users = await User.find(filter).sort({ role: 1, createdAt: 1 }).populate('employee', 'code department designation').lean();
  ok(res, users.map((user) => ({
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
    lastLoginAt: user.lastLoginAt,
    employee: user.employee ? {
      id: user.employee._id.toString(),
      code: user.employee.code,
      department: user.employee.department,
      designation: user.employee.designation
    } : null,
    createdAt: user.createdAt
  })));
}

export async function createHrAccount(req, res) {
  const name = requireString(req.body?.name, 'Name', { min: 2, max: 120 });
  const email = requireString(req.body?.email, 'Email', { min: 5, max: 160 }).toLowerCase();
  if (req.body?.role && req.body.role !== 'hr') {
    throw new AppError(403, 'Only HR accounts can be provisioned from this endpoint.');
  }

  const password = temporaryPassword();
  const user = await User.create({
    name,
    email,
    passwordHash: await hashPassword(password),
    role: 'hr',
    isActive: true,
    mustChangePassword: true
  });
  await recordAudit({
    req, actor: req.user, action: 'user.hr_created', entityType: 'User', entityId: user._id,
    summary: `HR account provisioned for ${email}`, after: { email, role: 'hr' }
  });
  ok(res, { user: user.toSafeJSON(), temporaryPassword: password }, 201);
}

export async function setUserActive(req, res) {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError(404, 'User not found.');
  if (user.role === 'admin') throw new AppError(403, 'Admin accounts cannot be modified here.');
  if (String(user._id) === String(req.user._id)) throw new AppError(400, 'You cannot deactivate your own account.');
  const isActive = Boolean(req.body?.isActive);
  user.isActive = isActive;
  await user.save();
  if (user.employee) {
    await Employee.findByIdAndUpdate(user.employee, { status: isActive ? 'active' : 'inactive' });
  }
  await recordAudit({
    req, actor: req.user, action: isActive ? 'user.activated' : 'user.deactivated',
    entityType: 'User', entityId: user._id, summary: `${user.email} ${isActive ? 'activated' : 'deactivated'}`,
    before: { isActive: !isActive }, after: { isActive }
  });
  ok(res, { user: user.toSafeJSON() });
}

import { Employee } from '../models/Employee.mjs';
import { User } from '../models/User.mjs';
import { AppError, badRequest, conflict, notFound, ok, paginate } from '../utils/http.mjs';
import { hashPassword, temporaryPassword } from '../utils/password.mjs';
import { requireDateKey, requireEmail, requireEnum, requireNumber, requireString, optionalString } from '../utils/validate.mjs';
import { getOrganization, orgConfig } from '../services/orgService.mjs';
import { recordAudit } from '../services/auditService.mjs';
import { isValidDateKey, nowParts } from '../utils/dates.mjs';

function serializeEmployee(employee) {
  return {
    id: employee._id.toString(),
    code: employee.code,
    firstName: employee.firstName,
    lastName: employee.lastName,
    fullName: `${employee.firstName} ${employee.lastName}`.trim(),
    email: employee.email,
    phone: employee.phone,
    department: employee.department,
    designation: employee.designation,
    joiningDate: employee.joiningDate,
    basicSalary: employee.basicSalary,
    employmentType: employee.employmentType,
    status: employee.status,
    address: employee.address,
    emergencyContact: employee.emergencyContact,
    avatarUrl: employee.avatarUrl || null,
    hasAccount: Boolean(employee.user),
    userId: employee.user ? employee.user.toString() : null,
    createdAt: employee.createdAt
  };
}

function validateEmployeeInput(body, org) {
  const config = orgConfig(org);
  const departmentNames = (org.departments || []).map((department) => department.name);
  const firstName = requireString(body.firstName, 'First name', { max: 80 });
  const lastName = requireString(body.lastName, 'Last name', { max: 80 });
  const email = requireEmail(body.email);
  const code = requireString(body.code, 'Employee code', { min: 2, max: 24 }).toUpperCase();
  const department = requireString(body.department, 'Department', { max: 80 });
  if (!departmentNames.includes(department)) {
    throw badRequest(`Unknown department "${department}". Choose one of: ${departmentNames.join(', ')}.`);
  }
  const designation = requireString(body.designation, 'Designation', { max: 80 });
  const joiningDate = requireDateKey(body.joiningDate, 'Joining date');
  if (joiningDate > '2100-01-01') throw badRequest('Joining date is out of range.');
  const basicSalary = requireNumber(body.basicSalary, 'Basic salary', { min: 1, max: 100000000 });
  const employmentType = requireEnum(body.employmentType || 'full-time', ['full-time', 'part-time', 'contract'], 'Employment type');
  return {
    firstName,
    lastName,
    email,
    code,
    department,
    designation,
    joiningDate,
    basicSalary,
    employmentType,
    phone: optionalString(body.phone, 30),
    address: optionalString(body.address, 300),
    emergencyContact: optionalString(body.emergencyContact, 120),
    currency: config.currency
  };
}

export async function listEmployees(req, res) {
  const { page, limit, skip } = paginate(req.query);
  const filter = {};
  if (req.query.search) {
    // Escape special regex characters to prevent ReDoS attacks.
    const escaped = String(req.query.search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (escaped) {
      const pattern = new RegExp(escaped, 'i');
      filter.$or = [
        { firstName: pattern },
        { lastName: pattern },
        { code: pattern },
        { email: pattern },
        { designation: pattern }
      ];
    }
  }
  if (req.query.department) filter.department = req.query.department;
  if (req.query.status) filter.status = req.query.status;

  const [items, total] = await Promise.all([
    Employee.find(filter).sort({ code: 1 }).skip(skip).limit(limit).lean(),
    Employee.countDocuments(filter)
  ]);
  ok(res, {
    items: items.map(serializeEmployee),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  });
}

export async function employeeMeta(req, res) {
  const org = await getOrganization();
  const config = orgConfig(org);
  ok(res, {
    departments: config.departments?.map?.((department) => department.name) || org.departments.map((department) => department.name),
    designations: org.designations,
    currency: config.currency,
    defaultWorkStart: config.workStartTime
  });
}

export async function getEmployee(req, res) {
  const employee = await Employee.findById(req.params.id).lean();
  if (!employee) throw notFound('Employee not found.');
  const isSelf = req.employee && String(req.employee._id) === String(employee._id);
  if (!['admin', 'hr'].includes(req.user.role) && !isSelf) {
    throw new AppError(403, 'You may only view your own profile.');
  }
  const payload = serializeEmployee(employee);
  if (!['admin', 'hr'].includes(req.user.role) && !isSelf) delete payload.basicSalary;
  ok(res, payload);
}

export async function createEmployee(req, res) {
  const org = await getOrganization();
  const input = validateEmployeeInput(req.body, org);

  const [existingCode, existingEmail] = await Promise.all([
    Employee.findOne({ code: input.code }).lean(),
    Employee.findOne({ email: input.email }).lean()
  ]);
  if (existingCode) throw conflict(`Employee code ${input.code} is already in use.`);
  if (existingEmail) throw conflict(`Email ${input.email} is already in use.`);
  if (await User.exists({ email: input.email })) throw conflict('A login account already uses this email.');

  const password = temporaryPassword();
  const user = await User.create({
    name: `${input.firstName} ${input.lastName}`.trim(),
    email: input.email,
    passwordHash: await hashPassword(password),
    role: 'employee',
    isActive: true,
    mustChangePassword: true
  });

  let employee;
  try {
    employee = await Employee.create({
      ...input,
      status: 'active',
      user: user._id,
      createdBy: req.user._id
    });
  } catch (error) {
    await User.findByIdAndDelete(user._id);
    throw error;
  }
  await User.findByIdAndUpdate(user._id, { employee: employee._id });

  await recordAudit({
    req, actor: req.user, action: 'employee.created', entityType: 'Employee', entityId: employee._id,
    summary: `Employee ${employee.code} created`, after: serializeEmployee(employee)
  });

  ok(res, { employee: serializeEmployee(employee), credentials: { email: input.email, temporaryPassword: password } }, 201);
}

export async function updateEmployee(req, res) {
  const employee = await Employee.findById(req.params.id);
  if (!employee) throw notFound('Employee not found.');
  const org = await getOrganization();
  const before = serializeEmployee(employee);

  const body = req.body || {};
  const departmentNames = (org.departments || []).map((department) => department.name);
  if (body.firstName !== undefined) employee.firstName = requireString(body.firstName, 'First name', { max: 80 });
  if (body.lastName !== undefined) employee.lastName = requireString(body.lastName, 'Last name', { max: 80 });
  if (body.phone !== undefined) employee.phone = optionalString(body.phone, 30);
  if (body.address !== undefined) employee.address = optionalString(body.address, 300);
  if (body.emergencyContact !== undefined) employee.emergencyContact = optionalString(body.emergencyContact, 120);
  if (body.designation !== undefined) employee.designation = requireString(body.designation, 'Designation', { max: 80 });
  if (body.joiningDate !== undefined) employee.joiningDate = requireDateKey(body.joiningDate, 'Joining date');
  if (body.employmentType !== undefined) {
    employee.employmentType = requireEnum(body.employmentType, ['full-time', 'part-time', 'contract'], 'Employment type');
  }
  if (body.basicSalary !== undefined) {
    // Salary changes are limited to Admin/HR (route guard) and always audited.
    employee.basicSalary = requireNumber(body.basicSalary, 'Basic salary', { min: 1, max: 100000000 });
  }
  if (body.department !== undefined) {
    const department = requireString(body.department, 'Department', { max: 80 });
    if (!departmentNames.includes(department)) throw badRequest(`Unknown department "${department}".`);
    employee.department = department;
  }
  if (body.email !== undefined) {
    const email = requireEmail(body.email);
    if (email !== employee.email) {
      if (await Employee.exists({ email, _id: { $ne: employee._id } })) throw conflict('Email already in use by another employee.');
      if (await User.exists({ email, _id: { $ne: employee.user } })) throw conflict('Email already in use by another account.');
      employee.email = email;
      if (employee.user) await User.findByIdAndUpdate(employee.user, { email });
    }
  }
  await employee.save();

  await recordAudit({
    req, actor: req.user, action: 'employee.updated', entityType: 'Employee', entityId: employee._id,
    summary: `Employee ${employee.code} updated`, before, after: serializeEmployee(employee)
  });
  ok(res, serializeEmployee(employee));
}

export async function deactivateEmployee(req, res) {
  const employee = await Employee.findById(req.params.id);
  if (!employee) throw notFound('Employee not found.');
  if (req.employee && String(req.employee._id) === String(employee._id)) {
    throw badRequest('You cannot deactivate your own employee record.');
  }
  const before = { status: employee.status };
  employee.status = 'inactive';
  await employee.save();
  if (employee.user) await User.findByIdAndUpdate(employee.user, { isActive: false });
  await recordAudit({
    req, actor: req.user, action: 'employee.deactivated', entityType: 'Employee', entityId: employee._id,
    summary: `Employee ${employee.code} deactivated`, before, after: { status: 'inactive' }
  });
  ok(res, serializeEmployee(employee));
}

export async function activateEmployee(req, res) {
  const employee = await Employee.findById(req.params.id);
  if (!employee) throw notFound('Employee not found.');
  employee.status = 'active';
  await employee.save();
  if (employee.user) await User.findByIdAndUpdate(employee.user, { isActive: true });
  await recordAudit({
    req, actor: req.user, action: 'employee.activated', entityType: 'Employee', entityId: employee._id,
    summary: `Employee ${employee.code} reactivated`, after: { status: 'active' }
  });
  ok(res, serializeEmployee(employee));
}

export async function myProfile(req, res) {
  if (!req.employee) throw notFound('No employee profile linked to this account.');
  ok(res, serializeEmployee(req.employee));
}

export async function updateMyProfile(req, res) {
  if (!req.employee) throw notFound('No employee profile linked to this account.');
  const employee = await Employee.findById(req.employee._id);
  const before = serializeEmployee(employee);
  const body = req.body || {};
  // Self-service is limited to contact details. Salary, role, department and
  // designation remain HR-controlled.
  if (body.phone !== undefined) employee.phone = optionalString(body.phone, 30);
  if (body.address !== undefined) employee.address = optionalString(body.address, 300);
  if (body.emergencyContact !== undefined) employee.emergencyContact = optionalString(body.emergencyContact, 120);
  await employee.save();
  await recordAudit({
    req, actor: req.user, action: 'employee.self_updated', entityType: 'Employee', entityId: employee._id,
    summary: 'Employee updated contact details', before, after: serializeEmployee(employee)
  });
  ok(res, serializeEmployee(employee));
}

/* ── CSV import / export ─────────────────────────────────────────── */

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const input = String(text || '').replace(/^\uFEFF/, '');
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((cell) => String(cell).trim() !== ''));
}

const HEADER_MAP = {
  employeecode: 'code', code: 'code',
  firstname: 'firstName', lastname: 'lastName',
  email: 'email', phone: 'phone',
  department: 'department', designation: 'designation',
  joiningdate: 'joiningDate', basicsalary: 'basicSalary',
  employmenttype: 'employmentType'
};

export async function importEmployees(req, res) {
  const org = await getOrganization();
  const csv = String(req.body?.csv || '');
  if (!csv.trim()) throw badRequest('CSV content is required.');
  // Accepts boolean false or the string "false" from form submissions.
  const dryRunValue = req.body?.dryRun;
  const dryRun = dryRunValue === undefined || dryRunValue === null
    ? true
    : dryRunValue === false || String(dryRunValue).toLowerCase() === 'false'
      ? false
      : Boolean(dryRunValue);
  const rows = parseCsv(csv);
  if (rows.length < 2) throw badRequest('CSV must include a header row and at least one employee row.');

  const headers = rows[0].map((header) => HEADER_MAP[String(header).trim().toLowerCase()] || null);
  const required = ['code', 'firstName', 'lastName', 'email', 'department', 'designation', 'joiningDate', 'basicSalary'];
  const missingHeaders = required.filter((field) => !headers.includes(field));
  if (missingHeaders.length) throw badRequest(`CSV is missing required column(s): ${missingHeaders.join(', ')}.`);

  const departmentNames = (org.departments || []).map((department) => department.name.toLowerCase());
  const seenCodes = new Set();
  const seenEmails = new Set();
  const valid = [];
  const invalid = [];

  rows.slice(1).forEach((cells, index) => {
    const rowNumber = index + 2;
    const raw = {};
    headers.forEach((field, column) => {
      if (field) raw[field] = String(cells[column] ?? '').trim();
    });
    const errors = {};
    if (!raw.code) errors.code = 'Employee code is required.';
    else if (!/^[A-Za-z0-9_-]{2,24}$/.test(raw.code)) errors.code = 'Code must be 2–24 alphanumeric characters.';
    else if (seenCodes.has(raw.code.toUpperCase())) errors.code = 'Duplicate code inside the CSV.';
    if (!raw.firstName) errors.firstName = 'First name is required.';
    if (!raw.lastName) errors.lastName = 'Last name is required.';
    if (!raw.email) errors.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.email)) errors.email = 'Email is invalid.';
    else if (seenEmails.has(raw.email.toLowerCase())) errors.email = 'Duplicate email inside the CSV.';
    if (!raw.department) errors.department = 'Department is required.';
    else if (!departmentNames.includes(raw.department.toLowerCase())) errors.department = `Unknown department "${raw.department}".`;
    if (!raw.designation) errors.designation = 'Designation is required.';
    if (!raw.joiningDate) errors.joiningDate = 'Joining date is required.';
    else if (!isValidDateKey(raw.joiningDate)) errors.joiningDate = 'Use ISO format YYYY-MM-DD.';
    const salary = Number(raw.basicSalary);
    if (!raw.basicSalary) errors.basicSalary = 'Basic salary is required.';
    else if (!Number.isFinite(salary) || salary <= 0) errors.basicSalary = 'Salary must be a positive number.';
    if (raw.employmentType && !['full-time', 'part-time', 'contract'].includes(raw.employmentType.toLowerCase())) {
      errors.employmentType = 'Must be full-time, part-time or contract.';
    }

    if (raw.code) seenCodes.add(raw.code.toUpperCase());
    if (raw.email) seenEmails.add(raw.email.toLowerCase());
    if (Object.keys(errors).length) invalid.push({ row: rowNumber, code: raw.code || null, email: raw.email || null, errors });
    else valid.push({ row: rowNumber, ...raw, basicSalary: salary, employmentType: (raw.employmentType || 'full-time').toLowerCase() });
  });

  // Database-level duplicates (batch query)
  const codes = valid.map((row) => row.code.toUpperCase());
  const emails = valid.map((row) => row.email.toLowerCase());
  const [existingEmployees, existingUsers] = await Promise.all([
    Employee.find({ $or: [{ code: { $in: codes } }, { email: { $in: emails } }] }).select('code email').lean(),
    User.find({ email: { $in: emails } }).select('email').lean()
  ]);
  const existingCodeSet = new Set(existingEmployees.map((employee) => employee.code));
  const existingEmailSet = new Set([
    ...existingEmployees.map((employee) => employee.email),
    ...existingUsers.map((user) => user.email)
  ]);
  const importable = valid.filter((row) => {
    const errors = {};
    if (existingCodeSet.has(row.code.toUpperCase())) errors.code = 'Employee code already exists.';
    if (existingEmailSet.has(row.email.toLowerCase())) errors.email = 'Email already exists.';
    if (Object.keys(errors).length) {
      invalid.push({ row: row.row, code: row.code, email: row.email, errors });
      return false;
    }
    return true;
  });

  if (dryRun) {
    return ok(res, {
      dryRun: true,
      summary: { total: rows.length - 1, valid: importable.length, invalid: invalid.length },
      valid: importable.map((row) => ({ row: row.row, code: row.code, email: row.email, department: row.department })),
      invalid
    });
  }

  if (!importable.length) throw badRequest('No valid rows to import.', { invalid });

  const created = [];
  for (const row of importable) {
    const password = temporaryPassword();
    const user = await User.create({
      name: `${row.firstName} ${row.lastName}`.trim(),
      email: row.email.toLowerCase(),
      passwordHash: await hashPassword(password),
      role: 'employee',
      isActive: true,
      mustChangePassword: true
    });
    const employee = await Employee.create({
      code: row.code.toUpperCase(),
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email.toLowerCase(),
      phone: row.phone || '',
      department: row.department,
      designation: row.designation,
      joiningDate: row.joiningDate,
      basicSalary: row.basicSalary,
      employmentType: row.employmentType,
      status: 'active',
      user: user._id,
      createdBy: req.user._id
    });
    await User.findByIdAndUpdate(user._id, { employee: employee._id });
    created.push({ id: employee._id.toString(), code: employee.code, email: employee.email, temporaryPassword: password });
  }

  await recordAudit({
    req, actor: req.user, action: 'employee.imported', entityType: 'Employee', entityId: null,
    summary: `${created.length} employee(s) imported from CSV`, after: { count: created.length, codes: created.map((row) => row.code) }
  });
  ok(res, { dryRun: false, imported: created.length, invalid, credentials: created }, 201);
}

export async function exportEmployees(req, res) {
  const employees = await Employee.find().sort({ code: 1 }).lean();
  const header = ['EmployeeCode', 'FirstName', 'LastName', 'Email', 'Phone', 'Department', 'Designation', 'JoiningDate', 'BasicSalary', 'EmploymentType', 'Status'];
  const escape = (value) => {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const csv = [header.join(','), ...employees.map((employee) => [
    employee.code, employee.firstName, employee.lastName, employee.email, employee.phone,
    employee.department, employee.designation, employee.joiningDate, employee.basicSalary,
    employee.employmentType, employee.status
  ].map(escape).join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="hcm-lite-employees.csv"');
  res.send(csv);
}

import { uploadToCloudinary } from '../middlewares/uploadMiddleware.js'

export async function uploadAvatar (req, res) {
  if (!req.employee) {
    throw notFound('No employee profile linked to this account.')
  }

  if (!req.file) {
    throw badRequest('No image file was uploaded.')
  }

  const employee = await Employee.findById(req.employee._id)
  if (!employee) {
    throw notFound('Employee not found.')
  }

  const result = await uploadToCloudinary(req.file)

  employee.avatarUrl = result.secure_url
  await employee.save()

  await recordAudit({
    req,
    actor: req.user,
    action: 'employee.avatar_updated',
    entityType: 'Employee',
    entityId: employee._id,
    summary: `Avatar updated for ${employee.code}`
  })

  ok(res, { avatarUrl: employee.avatarUrl })
}


export { serializeEmployee, parseCsv };

import { Attendance } from '../models/Attendance.mjs';
import { AttendanceCorrection } from '../models/AttendanceCorrection.mjs';
import { Employee } from '../models/Employee.mjs';
import { AppError, badRequest, conflict, notFound, ok, paginate } from '../utils/http.mjs';
import { requireDateKey, requireEnum, requireString, requireTime } from '../utils/validate.mjs';
import { addDays, formatDateLabel, nowParts, zonedDateTimeToUtc } from '../utils/dates.mjs';
import { getOrganization, orgConfig } from '../services/orgService.mjs';
import {
  buildMatrix, checkIn as createCheckIn, checkOut as createCheckOut, classifyRecord, currentTime, summarizeDays
} from '../services/attendanceService.mjs';
import { recordAudit } from '../services/auditService.mjs';
import { notifyEmployee, notifyRole } from '../services/notificationService.mjs';

function locationFrom(body = {}) {
  const latitude = body.latitude === undefined || body.latitude === null || body.latitude === '' ? null : Number(body.latitude);
  const longitude = body.longitude === undefined || body.longitude === null || body.longitude === '' ? null : Number(body.longitude);
  const accuracy = body.accuracy === undefined || body.accuracy === null || body.accuracy === '' ? null : Number(body.accuracy);
  return { latitude, longitude, accuracy };
}

export async function checkIn(req, res) {
  if (!req.employee) throw badRequest('No employee profile is linked to this account.');
  const org = await getOrganization();
  const record = await createCheckIn({
    employee: req.employee,
    org,
    user: req.user,
    location: locationFrom(req.body),
    note: requireString(req.body?.note || '', 'Note', { min: 0, max: 300 })
  });
  const config = orgConfig(org);
  ok(res, {
    id: record._id.toString(),
    date: record.date,
    checkIn: record.checkIn,
    status: record.status,
    lateMinutes: record.lateMinutes,
    officeStart: config.workStartTime,
    graceMinutes: config.graceMinutes
  }, 201);
}

export async function checkOut(req, res) {
  if (!req.employee) throw badRequest('No employee profile is linked to this account.');
  const org = await getOrganization();
  const record = await createCheckOut({
    employee: req.employee,
    org,
    location: locationFrom(req.body),
    note: requireString(req.body?.note || '', 'Note', { min: 0, max: 300 })
  });
  ok(res, {
    id: record._id.toString(),
    date: record.date,
    checkIn: record.checkIn,
    checkOut: record.checkOut,
    status: record.status,
    workedMinutes: record.workedMinutes,
    lateMinutes: record.lateMinutes
  });
}

export async function myAttendance(req, res) {
  if (!req.employee) throw notFound('No employee profile linked to this account.');
  const org = await getOrganization();
  const config = orgConfig(org);
  const { dateKey: todayKey } = nowParts(config.timezone);
  const to = req.query.to ? requireDateKey(req.query.to, 'End date') : todayKey;
  const from = req.query.from ? requireDateKey(req.query.from, 'Start date') : `${todayKey.slice(0, 7)}-01`;
  if (from > to) throw badRequest('"from" must be before "to".');
  if (to > todayKey) throw badRequest('Cannot request future attendance.');

  const matrix = await buildMatrix({ org, employees: [req.employee], from, to, todayKey });
  const days = matrix.byEmployee.get(req.employee._id.toString()) || [];
  const records = await Attendance.find({ employee: req.employee._id, date: { $gte: from, $lte: to } })
    .sort({ date: -1 })
    .lean();
  const todayRecord = records.find((record) => record.date === todayKey);
  const classification = todayRecord ? classifyRecord(todayRecord, { org, dateKey: todayKey, todayKey }) : null;

  ok(res, {
    from,
    to,
    today: {
      date: todayKey,
      record: todayRecord
        ? {
            checkIn: todayRecord.checkIn,
            checkOut: todayRecord.checkOut,
            status: classification.status,
            lateMinutes: classification.lateMinutes,
            workedMinutes: classification.workedMinutes,
            open: classification.isOpen
          }
        : null
    },
    summary: summarizeDays(days),
    days: days.map((day) => {
      const record = records.find((item) => item.date === day.date);
      return {
        ...day,
        checkIn: record?.checkIn || null,
        checkOut: record?.checkOut || null
      };
    })
  });
}

export async function hrOverview(req, res) {
  const org = await getOrganization();
  const config = orgConfig(org);
  const { dateKey: todayKey } = nowParts(config.timezone);
  const date = req.query.date ? requireDateKey(req.query.date, 'Date') : todayKey;
  if (date > todayKey) throw badRequest('Cannot view future attendance.');

  const filter = { status: 'active' };
  if (req.query.department) filter.department = req.query.department;
  const employees = await Employee.find(filter).sort({ department: 1, firstName: 1 }).lean();
  const matrix = await buildMatrix({ org, employees, from: date, to: date, todayKey });
  const records = await Attendance.find({
    employee: { $in: employees.map((employee) => employee._id) },
    date
  }).lean();
  const recordMap = new Map(records.map((record) => [record.employee.toString(), record]));

  const rows = employees.map((employee) => {
    const day = matrix.days.find((item) => item.employee === employee._id.toString());
    const record = recordMap.get(employee._id.toString());
    return {
      employeeId: employee._id.toString(),
      code: employee.code,
      name: `${employee.firstName} ${employee.lastName}`.trim(),
      department: employee.department,
      designation: employee.designation,
      kind: day?.kind || 'not_joined',
      leaveType: day?.leaveType || null,
      checkIn: record?.checkIn || null,
      checkOut: record?.checkOut || null,
      lateMinutes: day?.lateMinutes || 0,
      workedMinutes: day?.workedMinutes || 0
    };
  });

  const filteredRows = req.query.status && req.query.status !== 'all'
    ? rows.filter((row) => row.kind === req.query.status)
    : rows;

  ok(res, {
    date,
    workingDay: matrix.days.some((day) => day.kind !== 'non_working'),
    summary: summarizeDays(matrix.days),
    rows: filteredRows,
    departments: [...new Set(employees.map((employee) => employee.department))].sort()
  });
}

export async function attendanceRecords(req, res) {
  const { page, limit, skip } = paginate(req.query);
  const filter = {};
  if (req.query.employeeId) filter.employee = req.query.employeeId;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.from || req.query.to) {
    filter.date = {};
    if (req.query.from) filter.date.$gte = requireDateKey(req.query.from, 'From date');
    if (req.query.to) filter.date.$lte = requireDateKey(req.query.to, 'To date');
  }
  if (req.query.department) {
    const employees = await Employee.find({ department: req.query.department }).select('_id').lean();
    filter.employee = { $in: employees.map((employee) => employee._id) };
  }
  const [items, total] = await Promise.all([
    Attendance.find(filter)
      .populate('employee', 'code firstName lastName department designation')
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Attendance.countDocuments(filter)
  ]);
  ok(res, {
    items: items.map((record) => ({
      id: record._id.toString(),
      date: record.date,
      employee: record.employee ? {
        id: record.employee._id.toString(),
        code: record.employee.code,
        name: `${record.employee.firstName} ${record.employee.lastName}`.trim(),
        department: record.employee.department
      } : null,
      checkIn: record.checkIn,
      checkOut: record.checkOut,
      status: record.status,
      lateMinutes: record.lateMinutes,
      workedMinutes: record.workedMinutes
    })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  });
}

export async function requestCorrection(req, res) {
  if (!req.employee) throw notFound('No employee profile linked to this account.');
  const date = requireDateKey(req.body?.date, 'Date');
  const org = await getOrganization();
  const { dateKey: todayKey } = nowParts(orgConfig(org).timezone);
  if (date > todayKey) throw badRequest('Corrections can only be requested for past or current dates.');
  if (date < addDays(todayKey, -30)) throw badRequest('Corrections can only be requested for the last 30 days.');

  const requestedCheckIn = requireTime(req.body?.requestedCheckIn, 'Requested check-in');
  const requestedCheckOut = req.body?.requestedCheckOut
    ? requireTime(req.body.requestedCheckOut, 'Requested check-out')
    : null;
  if (requestedCheckOut && requestedCheckOut <= requestedCheckIn) {
    throw badRequest('Check-out time must be after check-in.');
  }
  const reason = requireString(req.body?.reason, 'Reason', { min: 10, max: 500 });

  const duplicate = await AttendanceCorrection.exists({ employee: req.employee._id, date, status: 'pending' });
  if (duplicate) throw conflict('A pending correction already exists for this date.');

  const correction = await AttendanceCorrection.create({
    employee: req.employee._id,
    date,
    requestedCheckIn,
    requestedCheckOut,
    reason,
    requestedBy: req.user._id
  });

  await notifyRole(['hr', 'admin'], {
    title: 'Attendance correction requested',
    message: `${req.employee.firstName} ${req.employee.lastName} requested a correction for ${formatDateLabel(date)}.`,
    type: 'attendance',
    link: '/attendance'
  });
  await recordAudit({
    req, actor: req.user, action: 'attendance.correction_requested', entityType: 'AttendanceCorrection',
    entityId: correction._id, summary: `Correction requested for ${date}`,
    after: { date, requestedCheckIn, requestedCheckOut, reason }
  });
  ok(res, { id: correction._id.toString(), status: correction.status }, 201);
}

export async function listCorrections(req, res) {
  const filter = {};
  if (req.user.role === 'employee') filter.employee = req.employee?._id;
  if (req.query.status) filter.status = requireEnum(req.query.status, ['pending', 'approved', 'rejected'], 'Status');
  if (req.query.department) {
    const employees = await Employee.find({ department: req.query.department }).select('_id').lean();
    filter.employee = { $in: employees.map((employee) => employee._id) };
  }
  const corrections = await AttendanceCorrection.find(filter)
    .populate('employee', 'code firstName lastName department')
    .populate('decidedBy', 'name role')
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  ok(res, corrections.map((correction) => ({
    id: correction._id.toString(),
    date: correction.date,
    requestedCheckIn: correction.requestedCheckIn,
    requestedCheckOut: correction.requestedCheckOut,
    reason: correction.reason,
    status: correction.status,
    decisionComment: correction.decisionComment,
    decidedAt: correction.decidedAt,
    decidedBy: correction.decidedBy?.name || null,
    employee: correction.employee ? {
      id: correction.employee._id.toString(),
      code: correction.employee.code,
      name: `${correction.employee.firstName} ${correction.employee.lastName}`.trim(),
      department: correction.employee.department
    } : null,
    createdAt: correction.createdAt
  })));
}

export async function decideCorrection(req, res) {
  const correction = await AttendanceCorrection.findById(req.params.id).populate('employee', 'firstName lastName code');
  if (!correction) throw notFound('Correction request not found.');
  if (correction.status !== 'pending') throw conflict(`This correction is already ${correction.status}.`);
  if (req.employee && String(correction.employee._id) === String(req.employee._id)) {
    throw new AppError(403, 'You cannot decide your own correction request.');
  }
  const decision = requireEnum(req.body?.decision, ['approved', 'rejected'], 'Decision');
  const comment = requireString(req.body?.comment || '', 'Comment', { min: 0, max: 500 });

  if (decision === 'approved') {
    const org = await getOrganization();
    const config = orgConfig(org);
    const checkInDate = zonedDateTimeToUtc(correction.date, correction.requestedCheckIn, config.timezone);
    const checkOutDate = correction.requestedCheckOut
      ? zonedDateTimeToUtc(correction.date, correction.requestedCheckOut, config.timezone)
      : null;
    const existing = await Attendance.findOne({ employee: correction.employee._id, date: correction.date });
    const workedMinutes = checkOutDate ? Math.round((checkOutDate - checkInDate) / 60000) : 0;
    const [h, m] = correction.requestedCheckIn.split(':').map(Number);
    const startMinutes = Number(config.workStartTime.split(':')[0]) * 60 + Number(config.workStartTime.split(':')[1]);
    const lateMinutes = Math.max(0, h * 60 + m - (startMinutes + config.graceMinutes));
    const status = checkOutDate && workedMinutes < config.halfDayHours * 60
      ? 'half_day'
      : checkOutDate
        ? lateMinutes > 0 ? 'late' : 'present'
        : lateMinutes > 0 ? 'late' : 'present';
    const payload = {
      checkIn: checkInDate,
      checkOut: checkOutDate,
      status,
      lateMinutes,
      workedMinutes,
      source: 'correction',
      note: `Correction approved: ${correction.reason}`
    };
    if (existing) {
      Object.assign(existing, payload);
      await existing.save();
    } else {
      await Attendance.create({ employee: correction.employee._id, date: correction.date, ...payload });
    }
  }

  correction.status = decision;
  correction.decidedBy = req.user._id;
  correction.decidedAt = new Date();
  correction.decisionComment = comment;
  await correction.save();

  await notifyEmployee(correction.employee._id, {
    title: `Attendance correction ${decision}`,
    message: `Your correction for ${formatDateLabel(correction.date)} was ${decision} by ${req.user.name}.`,
    type: 'attendance',
    link: '/attendance'
  });
  await recordAudit({
    req, actor: req.user, action: `attendance.correction_${decision}`, entityType: 'AttendanceCorrection',
    entityId: correction._id, summary: `Correction for ${correction.employee.code} on ${correction.date} ${decision}`,
    after: { decision, comment, date: correction.date, employee: correction.employee.code }
  });
  ok(res, { id: correction._id.toString(), status: correction.status });
}



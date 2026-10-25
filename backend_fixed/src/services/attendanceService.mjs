import { Attendance } from '../models/Attendance.mjs';
import { LeaveRequest } from '../models/LeaveRequest.mjs';
import { conflict, notFound, unprocessable } from '../utils/http.mjs';
import {
  holidaySet, isWeekend, listWorkingDays, minutesFromTime, timeInZone, timezoneOffsetMs, zonedDateTimeToUtc
} from '../utils/dates.mjs';
import { distanceMeters, orgConfig } from './orgService.mjs';

/**
 * Single classification engine used by attendance history, dashboards and
 * payroll. A stored record may be re-classified from its raw timestamps so
 * that a change of office start/grace time can never desynchronise modules.
 */
export function classifyRecord(record, { org, dateKey, todayKey }) {
  if (!record || !record.checkIn) return null;
  const config = orgConfig(org);
  const timeZone = config.timezone;
  const checkInMinutes = minutesFromTime(timeInZone(record.checkIn, timeZone));
  const lateThreshold = minutesFromTime(config.workStartTime) + config.graceMinutes;
  const lateMinutes = Math.max(0, checkInMinutes - lateThreshold);
  const workedMinutes = record.checkOut
    ? Math.max(0, Math.round((new Date(record.checkOut).getTime() - new Date(record.checkIn).getTime()) / 60000))
    : 0;
  const halfDayLimit = config.halfDayHours * 60;

  let status = 'present';
  if (record.checkOut && workedMinutes < halfDayLimit) status = 'half_day';
  else if (!record.checkOut && dateKey < todayKey) status = 'missing_checkout';
  else if (lateMinutes > 0) status = 'late';

  return {
    status,
    late: lateMinutes > 0,
    lateMinutes,
    workedMinutes,
    isHalfDay: status === 'half_day',
    isMissingCheckout: status === 'missing_checkout',
    isOpen: !record.checkOut
  };
}

export function summarizeDays(days) {
  const counts = {
    present: 0,
    late: 0,
    halfDay: 0,
    missingCheckout: 0,
    absent: 0,
    onLeave: 0,
    paidLeave: 0,
    unpaidLeave: 0,
    expectedWorkingDays: 0,
    workingDays: 0
  };
  for (const day of days) {
    if (day.kind === 'non_working' || day.kind === 'upcoming' || day.kind === 'not_joined') continue;
    if (day.kind === 'leave') {
      counts.onLeave += 1;
      if (day.leaveType === 'unpaid') counts.unpaidLeave += 1;
      else counts.paidLeave += 1;
      continue;
    }
    counts.expectedWorkingDays += 1;
    if (day.kind === 'absent') counts.absent += 1;
    else if (day.kind === 'half_day') counts.halfDay += 1;
    else if (day.kind === 'missing_checkout') counts.missingCheckout += 1;
    else if (day.kind === 'late') counts.late += 1;
    else if (day.kind === 'present') counts.present += 1;
  }
  counts.workingDays = counts.expectedWorkingDays + counts.onLeave;
  counts.attendanceRate = calculateAttendanceRate(counts);
  return counts;
}

/**
 * PRD formula:
 * (Present + Late + MissingCheckout + 0.5 * HalfDay) / (WorkingDays - OnLeave) * 100
 * Zero denominators return null instead of a misleading 0 or NaN.
 */
export function calculateAttendanceRate(counts) {
  const denominator = (counts.expectedWorkingDays || 0);
  if (denominator <= 0) return null;
  const numerator = (counts.present || 0) + (counts.late || 0) + (counts.missingCheckout || 0) + 0.5 * (counts.halfDay || 0);
  return Math.round((numerator / denominator) * 1000) / 10;
}

/**
 * Build a per-employee/day classification matrix for [from, to].
 * @returns {Promise<{days: Array, byEmployee: Map, employees: Array}>}
 */
export async function buildMatrix({ org, employees, from, to, todayKey }) {
  const config = orgConfig(org);
  const employeeIds = employees.map((employee) => employee._id);
  if (!employeeIds.length) return { days: [], byEmployee: new Map(), employees };

  const [records, leaves] = await Promise.all([
    Attendance.find({ employee: { $in: employeeIds }, date: { $gte: from, $lte: to } }).lean(),
    LeaveRequest.find({
      employee: { $in: employeeIds },
      status: 'approved',
      startDate: { $lte: to },
      endDate: { $gte: from }
    }).lean()
  ]);

  const recordKey = (employeeId, dateKey) => `${employeeId}_${dateKey}`;
  const recordMap = new Map(records.map((record) => [recordKey(record.employee, record.date), record]));
  const leaveMap = new Map();
  for (const leave of leaves) {
    let cursor = leave.startDate > from ? leave.startDate : from;
    const end = leave.endDate < to ? leave.endDate : to;
    while (cursor <= end) {
      leaveMap.set(recordKey(leave.employee, cursor), leave);
      cursor = shiftDate(cursor);
    }
  }

  const holidays = holidaySet(config.publicHolidays);
  const workingDays = new Set(listWorkingDays(from, to, config));

  const days = [];
  const byEmployee = new Map();

  for (const employee of employees) {
    const employeeId = employee._id.toString();
    if (!byEmployee.has(employeeId)) byEmployee.set(employeeId, []);
    for (const dateKey of enumerateDays(from, to)) {
      const base = {
        employee: employeeId,
        employeeCode: employee.code,
        employeeName: `${employee.firstName} ${employee.lastName}`.trim(),
        department: employee.department,
        date: dateKey,
        leaveType: null,
        lateMinutes: 0,
        workedMinutes: 0
      };
      let day;
      if (dateKey > todayKey) day = { ...base, kind: 'upcoming' };
      else if (dateKey < employee.joiningDate) day = { ...base, kind: 'not_joined' };
      else if (!workingDays.has(dateKey) || isWeekend(dateKey, config.weekendDays) || holidays.has(dateKey)) {
        day = { ...base, kind: 'non_working' };
      } else {
        const leave = leaveMap.get(recordKey(employee._id, dateKey));
        if (leave) {
          day = { ...base, kind: 'leave', leaveType: leave.type, leaveId: leave._id.toString() };
        } else {
          const record = recordMap.get(recordKey(employee._id, dateKey));
          if (record) {
            const classification = classifyRecord(record, { org, dateKey, todayKey });
            day = {
              ...base,
              kind: classification.status,
              lateMinutes: classification.lateMinutes,
              workedMinutes: classification.workedMinutes,
              attendanceId: record._id.toString()
            };
          } else {
            day = { ...base, kind: 'absent' };
          }
        }
      }
      days.push(day);
      byEmployee.get(employeeId).push(day);
    }
  }

  return { days, byEmployee, employees };
}

function enumerateDays(from, to) {
  const dates = [];
  let cursor = from;
  let guard = 0;
  while (cursor <= to && guard < 400) {
    dates.push(cursor);
    cursor = shiftDate(cursor);
    guard += 1;
  }
  return dates;
}

function shiftDate(dateKey) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function geofenceValidation({ org, latitude, longitude, accuracy }) {
  const config = orgConfig(org);
  if (!config.geofenceEnabled) return { enforced: false };
  if (latitude === null || longitude === null || latitude === undefined || longitude === undefined) {
    throw unprocessable('Location is required to check in while geofencing is enabled.', {
      fields: { location: 'Share your location to continue.' }
    });
  }
  if (accuracy === null || accuracy === undefined || Number(accuracy) > 100) {
    throw unprocessable('GPS accuracy is too low (must be 100 m or better).', {
      fields: { accuracy: 'Move to an open area and retry.' }
    });
  }
  const distance = distanceMeters(
    Number(config.officeLatitude), Number(config.officeLongitude), Number(latitude), Number(longitude)
  );
  if (distance > config.geofenceRadius) {
    throw unprocessable(`You are ${distance} m from the office (limit ${config.geofenceRadius} m).`, {
      distance,
      radius: config.geofenceRadius
    });
  }
  return { enforced: true, distance };
}

export async function checkIn({ employee, org, user, location = {}, note = '' }) {
  const config = orgConfig(org);
  const { dateKey, time } = currentTime(config);
  const existing = await Attendance.findOne({ employee: employee._id, date: dateKey });
  if (existing) throw conflict('An attendance record already exists for today.');
  const geo = geofenceValidation({ org, ...location });
  const checkInDate = zonedDateTimeToUtc(dateKey, time, config.timezone);
  const lateThreshold = minutesFromTime(config.workStartTime) + config.graceMinutes;
  const lateMinutes = Math.max(0, minutesFromTime(time) - lateThreshold);
  try {
    return await Attendance.create({
      employee: employee._id,
      date: dateKey,
      checkIn: checkInDate,
      checkOut: null,
      status: lateMinutes > 0 ? 'late' : 'present',
      lateMinutes,
      workedMinutes: 0,
      checkInMeta: { ...location, distance: geo.distance ?? null },
      source: 'web',
      note
    });
  } catch (error) {
    if (error?.code === 11000) throw conflict('An attendance record already exists for today.');
    throw error;
  }
}

export async function checkOut({ employee, org, location = {}, note = '' }) {
  const config = orgConfig(org);
  const { dateKey, time } = currentTime(config);
  const record = await Attendance.findOne({ employee: employee._id, date: dateKey });
  if (!record) throw notFound('No check-in found for today.');
  if (record.checkOut) throw conflict('You have already checked out today.');
  const geo = geofenceValidation({ org, ...location });
  record.checkOut = zonedDateTimeToUtc(dateKey, time, config.timezone);
  record.workedMinutes = Math.max(0, Math.round((record.checkOut - record.checkIn) / 60000));
  record.status = record.workedMinutes < config.halfDayHours * 60 ? 'half_day' : record.lateMinutes > 0 ? 'late' : 'present';
  record.checkOutMeta = { ...location, distance: geo.distance ?? null };
  record.note = note || record.note;
  await record.save();
  return record;
}

export function currentTime(config) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: config.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(now);
  const pick = (type) => parts.find((part) => part.type === type)?.value;
  const hour = pick('hour') === '24' ? '00' : pick('hour');
  return { dateKey: `${pick('year')}-${pick('month')}-${pick('day')}`, time: `${hour}:${pick('minute')}` };
}

export { timezoneOffsetMs };

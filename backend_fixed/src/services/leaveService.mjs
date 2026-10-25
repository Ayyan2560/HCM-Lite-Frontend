import { LeaveRequest } from '../models/LeaveRequest.mjs';
import { unprocessable, conflict } from '../utils/http.mjs';
import { countWorkingDays, isValidDateKey, overlap } from '../utils/dates.mjs';
import { orgConfig } from './orgService.mjs';

export const LEAVE_TYPE_LABELS = {
  annual: 'Annual leave',
  sick: 'Sick leave',
  casual: 'Casual leave',
  unpaid: 'Unpaid leave'
};

/**
 * Balance policy (documented):
 * - Only approved requests consume quota.
 * - Pending requests RESERVE quota so concurrent submissions cannot overbook.
 * - Rejected / cancelled requests never consume quota.
 */
export function getLeaveBalances({ org, leaves, year }) {
  const config = orgConfig(org);
  const types = ['annual', 'sick', 'casual', 'unpaid'];
  return types.map((type) => {
    const quota = config.leavePolicy[type];
    const unlimited = type === 'unpaid' || quota === null || quota === undefined;
    const relevant = leaves.filter((leave) => leave.type === type && Number(leave.year) === Number(year));
    const used = relevant
      .filter((leave) => leave.status === 'approved')
      .reduce((sum, leave) => sum + Number(leave.days || 0), 0);
    const pending = relevant
      .filter((leave) => leave.status === 'pending')
      .reduce((sum, leave) => sum + Number(leave.days || 0), 0);
    const total = unlimited ? null : Number(quota);
    return {
      type,
      label: LEAVE_TYPE_LABELS[type],
      quota: total,
      unlimited,
      used: round(used),
      pending: round(pending),
      available: unlimited ? null : round(Math.max(0, total - used - pending)),
      reserved: round(pending)
    };
  });
}

export function computeLeaveDays({ org, startDate, endDate }) {
  if (!isValidDateKey(startDate) || !isValidDateKey(endDate)) {
    throw unprocessable('Start and end dates must be valid ISO dates.', {
      fields: { startDate: 'Use YYYY-MM-DD.', endDate: 'Use YYYY-MM-DD.' }
    });
  }
  if (startDate > endDate) {
    throw unprocessable('The end date must be on or after the start date.', {
      fields: { endDate: 'End date cannot precede the start date.' }
    });
  }
  const config = orgConfig(org);
  const days = countWorkingDays(startDate, endDate, config);
  if (days <= 0) {
    throw unprocessable('The selected range contains no working days (weekends/holidays only).', {
      fields: { startDate: 'Choose dates that include at least one working day.' }
    });
  }
  return { days, workingDays: days };
}

export async function validateLeaveApplication({ org, employeeId, type, startDate, endDate, excludeId = null }) {
  const config = orgConfig(org);
  const { days } = computeLeaveDays({ org, startDate, endDate });
  const year = Number(startDate.slice(0, 4));

  const overlapping = await LeaveRequest.find({
    employee: employeeId,
    status: { $in: ['pending', 'approved'] },
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
    ...(excludeId ? { _id: { $ne: excludeId } } : {})
  }).lean();

  if (overlapping.length) {
    throw unprocessable('This request overlaps an existing pending or approved leave request.', {
      fields: { startDate: `Overlaps ${overlapping[0].startDate} → ${overlapping[0].endDate}.` },
      overlapping: overlapping.map((leave) => ({
        id: leave._id.toString(), startDate: leave.startDate, endDate: leave.endDate, status: leave.status
      }))
    });
  }

  if (type !== 'unpaid') {
    const quota = config.leavePolicy[type];
    if (quota !== null && quota !== undefined) {
      const yearLeaves = await LeaveRequest.find({
        employee: employeeId,
        type,
        year,
        status: { $in: ['pending', 'approved'] },
        ...(excludeId ? { _id: { $ne: excludeId } } : {})
      }).lean();
      const committed = yearLeaves.reduce((sum, leave) => sum + Number(leave.days || 0), 0);
      const available = Math.max(0, Number(quota) - committed);
      if (days > available) {
        throw unprocessable(
          `Insufficient ${LEAVE_TYPE_LABELS[type].toLowerCase()} balance: requested ${days} day(s), available ${round(available)}.`,
          { available: round(available), requested: days, quota }
        );
      }
    }
  }

  return { days, year };
}

export async function reserveLeave({ employee, org, type, startDate, endDate, reason, }) {
  const { days, year } = await validateLeaveApplication({ org, employeeId: employee._id, type, startDate, endDate });
  try {
    return await LeaveRequest.create({
      employee: employee._id, type, startDate, endDate, days, reason, status: 'pending', year
    });
  } catch (error) {
    if (error?.code === 11000) throw conflict('Duplicate leave request detected.');
    throw error;
  }
}

export async function decideLeave({ leaveId, decision, actor, comment = '' }) {
  const leave = await LeaveRequest.findById(leaveId);
  if (!leave) throw unprocessable('Leave request not found.');
  if (leave.status !== 'pending') throw conflict(`This request is already ${leave.status}.`);
  // Prevent HR/admin who also have an employee record from deciding their own leave.
  if (actor.employee && String(leave.employee) === String(actor.employee)) {
    throw unprocessable('You cannot approve or reject your own leave request.');
  }
  leave.status = decision;
  leave.decidedBy = actor._id;
  leave.decidedAt = new Date();
  leave.decisionComment = comment;
  await leave.save();
  return leave;
}

export function round(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

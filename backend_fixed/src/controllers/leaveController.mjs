import { LeaveRequest } from '../models/LeaveRequest.mjs';
import { Employee } from '../models/Employee.mjs';
import { AppError, badRequest, conflict, notFound, ok, paginate, unprocessable } from '../utils/http.mjs';
import { requireDateKey, requireEnum, requireString } from '../utils/validate.mjs';
import { formatDateLabel, nowParts } from '../utils/dates.mjs';
import { getOrganization, orgConfig } from '../services/orgService.mjs';
import { decideLeave, getLeaveBalances, reserveLeave } from '../services/leaveService.mjs';
import { recordAudit } from '../services/auditService.mjs';
import { notifyEmployee, notifyRole } from '../services/notificationService.mjs';

function serializeLeave(leave, employee = null) {
  return {
    id: leave._id.toString(),
    type: leave.type,
    startDate: leave.startDate,
    endDate: leave.endDate,
    days: leave.days,
    reason: leave.reason,
    status: leave.status,
    decisionComment: leave.decisionComment,
    decidedAt: leave.decidedAt,
    year: leave.year,
    createdAt: leave.createdAt,
    employee: employee ? {
      id: employee._id.toString(),
      code: employee.code,
      name: `${employee.firstName} ${employee.lastName}`.trim(),
      department: employee.department
    } : leave.employee && leave.employee.code ? {
      id: leave.employee._id.toString(),
      code: leave.employee.code,
      name: `${leave.employee.firstName} ${leave.employee.lastName}`.trim(),
      department: leave.employee.department
    } : null
  };
}

export async function applyLeave(req, res) {
  if (!req.employee) throw notFound('No employee profile linked to this account.');
  const org = await getOrganization();
  const type = requireEnum(req.body?.type, ['annual', 'sick', 'casual', 'unpaid'], 'Leave type');
  const startDate = requireDateKey(req.body?.startDate, 'Start date');
  const endDate = requireDateKey(req.body?.endDate, 'End date');
  const reason = requireString(req.body?.reason, 'Reason', { min: 5, max: 500 });

  const leave = await reserveLeave({ employee: req.employee, org, type, startDate, endDate, reason });

  await notifyRole(['hr', 'admin'], {
    title: 'New leave request',
    message: `${req.employee.firstName} ${req.employee.lastName} requested ${leave.days} day(s) of ${type} leave (${formatDateLabel(startDate)} → ${formatDateLabel(endDate)}).`,
    type: 'leave',
    link: '/leave'
  });
  await recordAudit({
    req, actor: req.user, action: 'leave.requested', entityType: 'LeaveRequest', entityId: leave._id,
    summary: `${leave.days} day(s) ${type} leave requested`,
    after: { type, startDate, endDate, days: leave.days, status: 'pending' }
  });

  const year = Number(startDate.slice(0, 4));
  const leaves = await LeaveRequest.find({ employee: req.employee._id, year }).lean();
  ok(res, {
    leave: serializeLeave(leave),
    balances: getLeaveBalances({ org, leaves, year })
  }, 201);
}

export async function myLeaves(req, res) {
  if (!req.employee) throw notFound('No employee profile linked to this account.');
  const org = await getOrganization();
  const year = Number(req.query.year) || Number(nowParts(orgConfig(org).timezone).dateKey.slice(0, 4));
  const [leaves, yearLeaves] = await Promise.all([
    LeaveRequest.find({ employee: req.employee._id }).sort({ createdAt: -1 }).limit(100).lean(),
    LeaveRequest.find({ employee: req.employee._id, year }).lean()
  ]);
  ok(res, {
    year,
    balances: getLeaveBalances({ org, leaves: yearLeaves, year }),
    policy: orgConfig(org).leavePolicy,
    items: leaves.map((leave) => serializeLeave(leave))
  });
}

export async function cancelLeave(req, res) {
  if (!req.employee) throw notFound('No employee profile linked to this account.');
  const leave = await LeaveRequest.findById(req.params.id);
  if (!leave) throw notFound('Leave request not found.');
  if (String(leave.employee) !== String(req.employee._id)) throw new AppError(403, 'You can only cancel your own leave requests.');
  if (leave.status === 'cancelled') throw conflict('This request is already cancelled.');
  if (leave.status === 'rejected') throw conflict('A rejected request cannot be cancelled.');
  const org = await getOrganization();
  const { dateKey: todayKey } = nowParts(orgConfig(org).timezone);
  if (leave.status === 'approved' && leave.startDate <= todayKey) {
    throw conflict('An approved leave that has already started cannot be cancelled online. Contact HR.');
  }
  leave.status = 'cancelled';
  leave.cancelledAt = new Date();
  await leave.save();
  await recordAudit({
    req, actor: req.user, action: 'leave.cancelled', entityType: 'LeaveRequest', entityId: leave._id,
    summary: `Leave cancelled (${leave.startDate} → ${leave.endDate})`, after: { status: 'cancelled' }
  });
  ok(res, { id: leave._id.toString(), status: leave.status });
}

export async function listLeaves(req, res) {
  const { page, limit, skip } = paginate(req.query);
  const filter = {};
  if (req.query.status) filter.status = requireEnum(req.query.status, ['pending', 'approved', 'rejected', 'cancelled'], 'Status');
  if (req.query.type) filter.type = requireEnum(req.query.type, ['annual', 'sick', 'casual', 'unpaid'], 'Type');
  if (req.query.employeeId) filter.employee = req.query.employeeId;
  if (req.query.department) {
    const employees = await Employee.find({ department: req.query.department }).select('_id').lean();
    filter.employee = { $in: employees.map((employee) => employee._id) };
  }
  if (req.query.from) filter.endDate = { $gte: requireDateKey(req.query.from, 'From date') };
  if (req.query.to) filter.startDate = { $lte: requireDateKey(req.query.to, 'To date') };

  const [items, total] = await Promise.all([
    LeaveRequest.find(filter)
      .populate('employee', 'code firstName lastName department')
      .sort({ status: 1, startDate: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    LeaveRequest.countDocuments(filter)
  ]);
  ok(res, {
    items: items.map((leave) => serializeLeave(leave)),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  });
}

export async function decide(req, res) {
  const decision = requireEnum(req.body?.decision, ['approved', 'rejected'], 'Decision');
  const comment = requireString(req.body?.comment || '', 'Comment', { min: 0, max: 500 });
  const leave = await decideLeave({ leaveId: req.params.id, decision, actor: req.user, comment });

  const employee = await Employee.findById(leave.employee).lean();
  await notifyEmployee(leave.employee, {
    title: `Leave request ${decision}`,
    message: `Your ${leave.type} leave (${formatDateLabel(leave.startDate)} → ${formatDateLabel(leave.endDate)}) was ${decision}${comment ? `: ${comment}` : '.'}`,
    type: 'leave',
    link: '/leave'
  });
  await recordAudit({
    req, actor: req.user, action: `leave.${decision}`, entityType: 'LeaveRequest', entityId: leave._id,
    summary: `${leave.type} leave for ${employee?.code || 'employee'} ${decision}`,
    after: { status: decision, comment, startDate: leave.startDate, endDate: leave.endDate, days: leave.days }
  });
  ok(res, serializeLeave(leave, employee));
}

export async function employeeBalances(req, res) {
  const employee = await Employee.findById(req.params.employeeId).lean();
  if (!employee) throw notFound('Employee not found.');
  const org = await getOrganization();
  const year = Number(req.query.year) || Number(nowParts(orgConfig(org).timezone).dateKey.slice(0, 4));
  const leaves = await LeaveRequest.find({ employee: employee._id, year }).lean();
  ok(res, {
    employee: { id: employee._id.toString(), code: employee.code, name: `${employee.firstName} ${employee.lastName}`.trim() },
    year,
    balances: getLeaveBalances({ org, leaves, year })
  });
}

export { unprocessable, badRequest };

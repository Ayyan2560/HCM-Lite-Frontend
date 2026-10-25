import { Attendance } from '../models/Attendance.mjs';
import { Employee } from '../models/Employee.mjs';
import { LeaveRequest } from '../models/LeaveRequest.mjs';
import { Payroll } from '../models/Payroll.mjs';
import { forbidden } from '../utils/http.mjs';
import { nowParts } from '../utils/dates.mjs';
import { buildMatrix, summarizeDays } from './attendanceService.mjs';
import { getLeaveBalances } from './leaveService.mjs';
import { getOrganization, orgConfig } from './orgService.mjs';
import { getOverview } from './dashboardService.mjs';
import { currentPeriod } from '../utils/dates.mjs';

/**
 * READ-ONLY tool registry for the AI assistant.
 * Every tool re-checks the authenticated user's role and data scope.
 * There is deliberately no write tool and no raw database access.
 */
export const TOOL_DEFINITIONS = [
  {
    name: 'get_headcount',
    description: 'Total active headcount and department distribution. Admin/HR only.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    roles: ['admin', 'hr']
  },
  {
    name: 'get_attendance_summary',
    description: 'Attendance summary for a specific date (defaults to today). Admin/HR only.',
    parameters: {
      type: 'object',
      properties: { date: { type: 'string', description: 'YYYY-MM-DD' } },
      additionalProperties: false
    },
    roles: ['admin', 'hr']
  },
  {
    name: 'get_late_comers',
    description: 'Employees who arrived late on a date. Admin/HR only.',
    parameters: {
      type: 'object',
      properties: { date: { type: 'string', description: 'YYYY-MM-DD' } },
      additionalProperties: false
    },
    roles: ['admin', 'hr']
  },
  {
    name: 'get_leave_summary',
    description: 'Pending and approved leave counts, company-wide. Admin/HR only.',
    parameters: {
      type: 'object',
      properties: {},
      additionalProperties: false
    },
    roles: ['admin', 'hr']
  },
  {
    name: 'get_my_leave_balance',
    description: 'The signed-in employee’s own leave balances. Employee only.',
    parameters: {
      type: 'object',
      properties: {},
      additionalProperties: false
    },
    roles: ['employee']
  },
  {
    name: 'get_payroll_summary',
    description: 'Latest payroll totals and status. Admin/HR only.',
    parameters: {
      type: 'object',
      properties: {},
      additionalProperties: false
    },
    roles: ['admin', 'hr']
  },
  {
    name: 'search_employees',
    description: 'Search the employee directory by name, code, department or designation. Admin/HR only.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search text' },
        department: { type: 'string' }
      },
      required: ['query'],
      additionalProperties: false
    },
    roles: ['admin', 'hr']
  }
];

const TOOL_MAP = new Map(TOOL_DEFINITIONS.map((tool) => [tool.name, tool]));

export function getAllowedTools(user) {
  return TOOL_DEFINITIONS.filter((tool) => tool.roles.includes(user.role)).map((tool) => ({
    type: 'function',
    function: { name: tool.name, description: tool.description, parameters: tool.parameters }
  }));
}

export async function executeTool(name, args, user) {
  const tool = TOOL_MAP.get(name);
  if (!tool) throw forbidden(`Unknown tool "${name}".`);
  if (!tool.roles.includes(user.role)) {
    throw forbidden(`Your role is not allowed to use ${name}.`);
  }
  const org = await getOrganization();
  const config = orgConfig(org);
  const { dateKey: todayKey } = nowParts(config.timezone);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(args?.date || '') ? args.date : todayKey;

  switch (name) {
    case 'get_headcount': {
      const employees = await Employee.find({ status: 'active' }).lean();
      const byDepartment = {};
      for (const employee of employees) {
        byDepartment[employee.department] = (byDepartment[employee.department] || 0) + 1;
      }
      return { headcount: employees.length, departments: byDepartment };
    }
    case 'get_attendance_summary': {
      const employees = await Employee.find({ status: 'active' }).lean();
      const matrix = await buildMatrix({ org, employees, from: date, to: date, todayKey });
      const summary = summarizeDays(matrix.days);
      return { date, headcount: employees.length, ...summary };
    }
    case 'get_late_comers': {
      const records = await Attendance.find({ date, status: { $in: ['late', 'half_day'] }, lateMinutes: { $gt: 0 } })
        .populate('employee', 'firstName lastName code department')
        .lean();
      return {
        date,
        count: records.length,
        employees: records.map((record) => ({
          code: record.employee?.code,
          name: `${record.employee?.firstName || ''} ${record.employee?.lastName || ''}`.trim(),
          department: record.employee?.department,
          lateMinutes: record.lateMinutes,
          checkIn: record.checkIn
        }))
      };
    }
    case 'get_leave_summary': {
      const [pending, approvedThisMonth, byType] = await Promise.all([
        LeaveRequest.countDocuments({ status: 'pending' }),
        LeaveRequest.countDocuments({ status: 'approved', startDate: { $gte: `${todayKey.slice(0, 7)}-01`, $lte: todayKey } }),
        LeaveRequest.aggregate([
          { $match: { status: 'pending' } },
          { $group: { _id: '$type', count: { $sum: 1 }, days: { $sum: '$days' } } }
        ])
      ]);
      return {
        pending,
        approvedThisMonth,
        pendingByType: byType.map((row) => ({ type: row._id, requests: row.count, days: row.days }))
      };
    }
    case 'get_my_leave_balance': {
      if (!user.employee) throw forbidden('No employee profile is linked to this account.');
      const year = Number(todayKey.slice(0, 4));
      const leaves = await LeaveRequest.find({ employee: user.employee, year }).lean();
      return { year, balances: getLeaveBalances({ org, leaves, year }) };
    }
    case 'get_payroll_summary': {
      const [latest, current] = await Promise.all([
        Payroll.find().sort({ period: -1 }).limit(1).lean(),
        Payroll.findOne({ period: currentPeriod(todayKey) }).lean()
      ]);
      const format = (payroll) => payroll && {
        period: payroll.period,
        status: payroll.status,
        currency: payroll.currency,
        employees: payroll.totals?.employees || 0,
        gross: payroll.totals?.gross || 0,
        deductions: payroll.totals?.deductions || 0,
        tax: payroll.totals?.tax || 0,
        net: payroll.totals?.net || 0
      };
      return { latest: format(latest[0]), current: format(current) };
    }
    case 'search_employees': {
      const query = String(args?.query || '').trim();
      if (!query) return { count: 0, employees: [] };
      const filter = {
        status: 'active',
        $or: [
          { firstName: new RegExp(query, 'i') },
          { lastName: new RegExp(query, 'i') },
          { code: new RegExp(query, 'i') },
          { email: new RegExp(query, 'i') },
          { department: new RegExp(query, 'i') },
          { designation: new RegExp(query, 'i') }
        ]
      };
      if (args?.department) filter.department = args.department;
      const employees = await Employee.find(filter).limit(10).lean();
      return {
        count: employees.length,
        employees: employees.map((employee) => ({
          code: employee.code,
          name: `${employee.firstName} ${employee.lastName}`.trim(),
          department: employee.department,
          designation: employee.designation,
          status: employee.status
        }))
      };
    }
    case 'get_department_attendance': {
      const overview = await getOverview({ org, from: date, to: date, department: args?.department || '', includePayroll: false });
      return {
        date,
        department: args?.department || 'all',
        summary: overview.period,
        departments: overview.departments
      };
    }
    default:
      throw forbidden(`The tool "${name}" is not part of the read-only allowlist.`);
  }
}

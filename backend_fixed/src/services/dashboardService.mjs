import { Attendance } from '../models/Attendance.mjs';
import { AttendanceCorrection } from '../models/AttendanceCorrection.mjs';
import { Announcement } from '../models/Announcement.mjs';
import { Employee } from '../models/Employee.mjs';
import { LeaveRequest } from '../models/LeaveRequest.mjs';
import { Notification } from '../models/Notification.mjs';
import { Payroll } from '../models/Payroll.mjs';
import { buildMatrix, classifyRecord, summarizeDays } from './attendanceService.mjs';
import { getLeaveBalances } from './leaveService.mjs';
import { orgConfig } from './orgService.mjs';
import { currentPeriod, nowParts } from '../utils/dates.mjs';

function groupByDepartment(employees, days) {
  const departments = new Map();
  for (const employee of employees) {
    if (!departments.has(employee.department)) departments.set(employee.department, { employees: 0, days: [] });
    departments.get(employee.department).employees += 1;
  }
  for (const day of days) {
    const bucket = departments.get(day.department);
    if (bucket) bucket.days.push(day);
  }
  return [...departments.entries()].map(([name, bucket]) => {
    const counts = summarizeDays(bucket.days);
    return { department: name, headcount: bucket.employees, ...counts };
  }).sort((a, b) => b.headcount - a.headcount);
}

function trendByDate(days, from, to) {
  const map = new Map();
  for (const day of days) {
    if (!map.has(day.date)) map.set(day.date, []);
    map.get(day.date).push(day);
  }
  return [...map.entries()]
    .map(([date, items]) => {
      const counts = summarizeDays(items);
      return {
        date,
        present: counts.present,
        late: counts.late,
        halfDay: counts.halfDay,
        missingCheckout: counts.missingCheckout,
        absent: counts.absent,
        onLeave: counts.onLeave,
        attendanceRate: counts.attendanceRate
      };
    })
    .filter((point) => point.date >= from && point.date <= to)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

async function payrollSnapshot(period) {
  const latest = await Payroll.find({ period: { $lte: period } })
    .sort({ period: -1 })
    .limit(3)
    .select('period status currency totals finalizedAt')
    .lean();
  return latest.map((item) => ({
    id: item._id.toString(),
    period: item.period,
    status: item.status,
    currency: item.currency,
    totals: item.totals,
    finalizedAt: item.finalizedAt
  }));
}

/**
 * Company-wide analytics used by Admin + HR dashboards.
 * Every figure is computed from live records through the shared attendance engine.
 */
export async function getOverview({ org, from, to, department = '', includePayroll = true }) {
  const config = orgConfig(org);
  const { dateKey: todayKey } = nowParts(config.timezone);
  const employeeFilter = { status: 'active' };
  if (department) employeeFilter.department = department;

  const employees = await Employee.find(employeeFilter).sort({ department: 1, firstName: 1 }).lean();
  const employeeIds = employees.map((employee) => employee._id);

  const [matrix, pendingLeaves, pendingCorrections, approvedLeaves, announcements, payroll, salaryAgg] =
    await Promise.all([
      buildMatrix({ org, employees, from, to, todayKey }),
      LeaveRequest.countDocuments({ employee: { $in: employeeIds }, status: 'pending' }),
      AttendanceCorrection.countDocuments({ employee: { $in: employeeIds }, status: 'pending' }),
      LeaveRequest.find({
        employee: { $in: employeeIds },
        status: 'approved',
        year: Number(todayKey.slice(0, 4))
      }).lean(),
      Announcement.find().sort({ pinned: -1, createdAt: -1 }).limit(4).lean(),
      includePayroll ? payrollSnapshot(currentPeriod(todayKey)) : Promise.resolve([]),
      Employee.aggregate([
        { $match: { status: 'active', ...(department ? { department } : {}) } },
        { $group: { _id: '$department', headcount: { $sum: 1 }, avgBasic: { $avg: '$basicSalary' } } },
        { $sort: { headcount: -1 } }
      ])
    ]);

  const summary = summarizeDays(matrix.days);
  const departments = groupByDepartment(employees, matrix.days);
  const trendStart = from;
  const trend = trendByDate(matrix.days, trendStart, to);

  const leaveUtilization = ['annual', 'sick', 'casual', 'unpaid'].map((type) => {
    const used = approvedLeaves.filter((leave) => leave.type === type).reduce((sum, leave) => sum + Number(leave.days || 0), 0);
    return { type, days: used };
  });

  const todayMatrix = await buildMatrix({ org, employees, from: todayKey, to: todayKey, todayKey });
  const todaySummary = summarizeDays(todayMatrix.days);

  return {
    scope: { from, to, department: department || null, today: todayKey },
    headcount: employees.length,
    today: { date: todayKey, ...todaySummary },
    period: summary,
    departments,
    trend,
    leaveUtilization,
    pending: { leaves: pendingLeaves, corrections: pendingCorrections },
    payroll,
    salaryByDepartment: salaryAgg.map((row) => ({
      department: row._id,
      headcount: row.headcount,
      averageBasic: Math.round(row.avgBasic || 0)
    })),
    announcements: announcements.map((announcement) => ({
      id: announcement._id.toString(),
      title: announcement.title,
      body: announcement.body,
      category: announcement.category,
      authorName: announcement.authorName,
      createdAt: announcement.createdAt
    }))
  };
}

export async function getEmployeeDashboard({ org, user, employee }) {
  const config = orgConfig(org);
  const { dateKey: todayKey } = nowParts(config.timezone);
  const monthStart = `${todayKey.slice(0, 7)}-01`;
  const year = Number(todayKey.slice(0, 4));

  const [matrix, leaves, balancesRaw, payrolls, announcements, unread] = await Promise.all([
    buildMatrix({ org, employees: [employee], from: monthStart, to: todayKey, todayKey }),
    LeaveRequest.find({ employee: employee._id }).sort({ createdAt: -1 }).limit(5).lean(),
    LeaveRequest.find({ employee: employee._id, year }).lean(),
    Payroll.find({ status: 'finalized', 'entries.employee': employee._id }).sort({ period: -1 }).limit(3).lean(),
    Announcement.find().sort({ pinned: -1, createdAt: -1 }).limit(4).lean(),
    Notification.countDocuments({ user: user._id, read: false })
  ]);

  const todayRecord = await Attendance.findOne({ employee: employee._id, date: todayKey }).lean();
  const todayClassification = todayRecord
    ? classifyRecord(todayRecord, { org, dateKey: todayKey, todayKey })
    : null;
  const summary = summarizeDays(matrix.byEmployee.get(employee._id.toString()) || []);
  const balances = getLeaveBalances({ org, leaves: balancesRaw, year });

  const payslips = payrolls.map((payroll) => {
    const entry = payroll.entries.find((item) => String(item.employee) === String(employee._id));
    return {
      payrollId: payroll._id.toString(),
      period: payroll.period,
      status: payroll.status,
      currency: payroll.currency,
      gross: entry?.gross || 0,
      net: entry?.net || 0,
      tax: entry?.monthlyTax || 0,
      deductions: entry?.totalDeductions || 0
    };
  });

  return {
    today: {
      date: todayKey,
      record: todayRecord
        ? {
            checkIn: todayRecord.checkIn,
            checkOut: todayRecord.checkOut,
            status: todayClassification?.status,
            lateMinutes: todayClassification?.lateMinutes || 0,
            workedMinutes: todayClassification?.workedMinutes || 0,
            open: todayClassification?.isOpen
          }
        : null
    },
    month: summary,
    balances,
    recentLeaves: leaves.map((leave) => ({
      id: leave._id.toString(),
      type: leave.type,
      startDate: leave.startDate,
      endDate: leave.endDate,
      days: leave.days,
      status: leave.status,
      reason: leave.reason,
      createdAt: leave.createdAt
    })),
    payslips,
    announcements: announcements.map((announcement) => ({
      id: announcement._id.toString(),
      title: announcement.title,
      body: announcement.body,
      category: announcement.category,
      authorName: announcement.authorName,
      createdAt: announcement.createdAt
    })),
    unreadNotifications: unread
  };
}

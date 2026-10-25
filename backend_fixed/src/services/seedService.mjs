import { Organization } from '../models/Organization.mjs';
import { User } from '../models/User.mjs';
import { Employee } from '../models/Employee.mjs';
import { Attendance } from '../models/Attendance.mjs';
import { LeaveRequest } from '../models/LeaveRequest.mjs';
import { Payroll } from '../models/Payroll.mjs';
import { Announcement } from '../models/Announcement.mjs';
import { Notification } from '../models/Notification.mjs';
import { AuditLog } from '../models/AuditLog.mjs';
import { hashPassword } from '../utils/password.mjs';
import { addDays, listWorkingDays, monthRange, nowParts, previousPeriod, zonedDateTimeToUtc } from '../utils/dates.mjs';
import { orgConfig } from './orgService.mjs';
import { generateDraft, finalizePayroll } from './payrollService.mjs';

export const DEMO_ACCOUNTS = [
  { role: 'admin', name: 'Sara Ahmed', email: 'admin@hcm-lite.demo', password: 'Admin@12345' },
  { role: 'hr', name: 'Daniyal Hussain', email: 'hr@hcm-lite.demo', password: 'Hr@12345' },
  { role: 'employee', name: 'Ayesha Khan', email: 'employee@hcm-lite.demo', password: 'Employee@12345' }
];

const STAFF = [
  { code: 'EMP-001', firstName: 'Ayesha', lastName: 'Khan', department: 'Engineering', designation: 'Senior Engineer', joiningDate: '2023-02-13', basicSalary: 120000, email: 'employee@hcm-lite.demo', phone: '+92 300 1112233' },
  { code: 'EMP-002', firstName: 'Bilal', lastName: 'Ahmed', department: 'Engineering', designation: 'Software Engineer', joiningDate: '2024-01-08', basicSalary: 90000, email: 'bilal.ahmed@hcm-lite.demo', phone: '+92 301 9988776' },
  { code: 'EMP-003', firstName: 'Sana', lastName: 'Malik', department: 'Human Resources', designation: 'HR Officer', joiningDate: '2022-09-05', basicSalary: 85000, email: 'sana.malik@hcm-lite.demo', phone: '+92 302 4455661' },
  { code: 'EMP-004', firstName: 'Omar', lastName: 'Farooq', department: 'Finance', designation: 'Accountant', joiningDate: '2023-06-19', basicSalary: 95000, email: 'omar.farooq@hcm-lite.demo', phone: '+92 303 7766554' },
  { code: 'EMP-005', firstName: 'Hira', lastName: 'Siddiqui', department: 'Sales', designation: 'Sales Executive', joiningDate: '2024-04-01', basicSalary: 80000, email: 'hira.siddiqui@hcm-lite.demo', phone: '+92 304 3322110' },
  { code: 'EMP-006', firstName: 'Usman', lastName: 'Tariq', department: 'Operations', designation: 'Operations Associate', joiningDate: '2023-11-27', basicSalary: 75000, email: 'usman.tariq@hcm-lite.demo', phone: '+92 305 8899001' },
  { code: 'EMP-007', firstName: 'Zainab', lastName: 'Raza', department: 'Marketing', designation: 'Marketing Specialist', joiningDate: '2024-08-12', basicSalary: 82000, email: 'zainab.raza@hcm-lite.demo', phone: '+92 306 5566778' }
];

function holidayList(year) {
  return [
    { date: `${year}-03-23`, name: 'Pakistan Day' },
    { date: `${year}-08-14`, name: 'Independence Day' },
    { date: `${year}-12-25`, name: 'Quaid-e-Azam Day' }
  ];
}

async function ensureOrganization() {
  const { dateKey } = nowParts('Asia/Karachi');
  const year = Number(dateKey.slice(0, 4));
  let org = await Organization.findOne({ singleton: 'primary' });
  if (!org) {
    org = await Organization.create({
      singleton: 'primary',
      name: 'Northstar Technologies',
      legalName: 'Northstar Technologies (Pvt) Ltd',
      currency: 'PKR',
      timezone: 'Asia/Karachi',
      workStartTime: '09:00',
      graceMinutes: 15,
      halfDayHours: 5,
      weekendDays: [6, 0],
      officeLatitude: 24.8607,
      officeLongitude: 67.0011,
      geofenceRadius: 150,
      geofenceEnabled: false,
      departments: ['Engineering', 'Human Resources', 'Finance', 'Sales', 'Operations', 'Marketing'].map((name) => ({ name })),
      designations: ['Software Engineer', 'Senior Engineer', 'HR Manager', 'HR Officer', 'Accountant', 'Sales Executive', 'Operations Associate', 'Marketing Specialist', 'Team Lead'],
      leavePolicy: { annual: 14, sick: 8, casual: 10, unpaid: null },
      publicHolidays: holidayList(year),
      setupCompleted: true,
      initializedAt: new Date()
    });
  } else if (!org.publicHolidays?.length) {
    org.publicHolidays = holidayList(year);
    await org.save();
  }
  return org;
}

async function ensureUser({ name, email, password, role, employee = null }) {
  const existing = await User.findOne({ email });
  if (existing) {
    if (employee && !existing.employee) {
      existing.employee = employee;
      await existing.save();
    }
    return existing;
  }
  return User.create({
    name,
    email,
    passwordHash: await hashPassword(password),
    role,
    employee,
    isActive: true,
    mustChangePassword: false
  });
}

async function ensureEmployee(org, staff, createdBy) {
  const existing = await Employee.findOne({ code: staff.code });
  if (existing) return existing;
  const demoAccount = DEMO_ACCOUNTS.find((account) => account.email === staff.email);
  let user = null;
  if (demoAccount) {
    user = await ensureUser({
      name: `${staff.firstName} ${staff.lastName}`,
      email: demoAccount.email,
      password: demoAccount.password,
      role: 'employee'
    });
  }
  const employee = await Employee.create({
    ...staff,
    status: 'active',
    employmentType: 'full-time',
    user: user?._id || null,
    createdBy
  });
  if (user) {
    user.employee = employee._id;
    await user.save();
  }
  return employee;
}

function demoStatus(employeeIndex, dayIndex, dateKey) {
  const seed = employeeIndex * 13 + dayIndex;
  if (seed % 17 === 5) return 'missing';
  if (seed % 11 === 4) return 'half';
  if (seed % 7 === 3) return 'late';
  return 'present';
}

async function seedAttendance(org, employees, days = 80) {
  const config = orgConfig(org);
  const { dateKey: todayKey } = nowParts(config.timezone);
  const start = addDays(todayKey, -days);
  const workingDays = listWorkingDays(start, todayKey, config);
  let created = 0;

  for (const [employeeIndex, employee] of employees.entries()) {
    for (const [dayIndex, dateKey] of workingDays.entries()) {
      if (dateKey < employee.joiningDate) continue;
      const exists = await Attendance.exists({ employee: employee._id, date: dateKey });
      if (exists) continue;
      const variant = demoStatus(employeeIndex, dayIndex, dateKey);
      // Weekend/holiday trading is impossible here; workingDays already excludes them.
      const startTime = variant === 'late' ? '09:32' : '08:52';
      const endTime = variant === 'half' ? '12:40' : '17:45';
      const checkIn = zonedDateTimeToUtc(dateKey, startTime, config.timezone);
      const checkOut = variant === 'missing' ? null : zonedDateTimeToUtc(dateKey, endTime, config.timezone);
      const checkoutMinutes = variant === 'half' ? 760 : 1065;
      const checkinMinutes = variant === 'late' ? 572 : 532;
      const workedMinutes = checkOut ? checkoutMinutes - checkinMinutes : 0;
      await Attendance.create({
        employee: employee._id,
        date: dateKey,
        checkIn,
        checkOut,
        status: variant === 'half' ? 'half_day' : variant === 'late' ? 'late' : checkOut ? 'present' : 'missing_checkout',
        lateMinutes: variant === 'late' ? 17 : 0,
        workedMinutes,
        source: 'web',
        checkInMeta: { latitude: 24.8609, longitude: 67.0013, accuracy: 18, distance: 12 }
      });
      created += 1;
    }
  }
  return created;
}

async function ensureLeave(employee, payload) {
  const existing = await LeaveRequest.findOne({
    employee: employee._id,
    type: payload.type,
    startDate: payload.startDate,
    endDate: payload.endDate
  });
  if (existing) return existing;
  return LeaveRequest.create({
    employee: employee._id,
    ...payload,
    year: Number(payload.startDate.slice(0, 4))
  });
}

export async function seedDemoData({ force = false } = {}) {
  const adminAccount = DEMO_ACCOUNTS[0];
  const org = await ensureOrganization();
  const config = orgConfig(org);
  const { dateKey: todayKey } = nowParts(config.timezone);

  let admin = await User.findOne({ email: adminAccount.email });
  if (!admin) {
    admin = await ensureUser({ ...adminAccount, role: 'admin' });
  }

  await ensureUser({ ...DEMO_ACCOUNTS[1], role: 'hr' });

  const employees = [];
  for (const staff of STAFF) employees.push(await ensureEmployee(org, staff, admin._id));
  const demoEmployee = employees[0];

  const attendanceCreated = await seedAttendance(org, employees);

  // ── Leave requests ──────────────────────────────────────────────
  const annualStart = addDays(todayKey, -12);
  const annualEnd = addDays(todayKey, -10);
  const annualDays = listWorkingDays(annualStart, annualEnd, config).length || 1;
  await ensureLeave(demoEmployee, {
    type: 'annual', startDate: annualStart, endDate: annualEnd, days: annualDays,
    reason: 'Family trip planned earlier this month.', status: 'approved',
    decidedBy: admin._id, decidedAt: new Date(), decisionComment: 'Approved — enjoy your time off.'
  });
  await ensureLeave(employees[1], {
    type: 'sick', startDate: addDays(todayKey, 1), endDate: addDays(todayKey, 2), days: 2,
    reason: 'Scheduled medical appointment and recovery.', status: 'pending'
  });
  await ensureLeave(employees[2], {
    type: 'casual', startDate: addDays(todayKey, -25), endDate: addDays(todayKey, -25), days: 1,
    reason: 'Personal errand.', status: 'approved', decidedBy: admin._id, decidedAt: new Date()
  });
  await ensureLeave(employees[4], {
    type: 'annual', startDate: addDays(todayKey, 6), endDate: addDays(todayKey, 8), days: 2,
    reason: 'Wedding in the family.', status: 'pending'
  });
  await ensureLeave(employees[5], {
    type: 'casual', startDate: addDays(todayKey, -40), endDate: addDays(todayKey, -40), days: 1,
    reason: 'Personal matter.', status: 'rejected', decidedBy: admin._id, decidedAt: new Date(),
    decisionComment: 'Critical release week — please reschedule.'
  });
  await ensureLeave(employees[3], {
    type: 'unpaid', startDate: addDays(todayKey, -32), endDate: addDays(todayKey, -31), days: 2,
    reason: 'Extended personal leave.', status: 'approved', decidedBy: admin._id, decidedAt: new Date()
  });

  // ── Payroll: one finalized snapshot + one live draft ────────────
  const current = todayKey.slice(0, 7);
  const lastMonth = previousPeriod(current);
  const twoMonthsAgo = previousPeriod(lastMonth);
  let payrollCreated = 0;

  for (const period of [twoMonthsAgo, lastMonth]) {
    if (period !== current) {
      await generateDraft({ org, period, actor: admin, notes: 'Seeded payroll run.', todayKey });
      payrollCreated += 1;
    }
  }
  const finalizedTarget = await Payroll.findOne({ period: twoMonthsAgo });
  if (finalizedTarget && finalizedTarget.status === 'draft') {
    await finalizePayroll({ payrollId: finalizedTarget._id, actor: admin, todayKey });
  }

  // ── Announcements ───────────────────────────────────────────────
  const announcements = [
    {
      title: 'Quarterly town hall — Thursday 4:00 PM',
      body: 'Join us in the main conference room for a company-wide update on Q3 results, the new client pipeline, and the roadmap for next quarter. Remote colleagues can join via the usual meeting link.',
      category: 'event', pinned: true
    },
    {
      title: 'Updated leave policy reminder',
      body: 'Annual leave is 14 days, sick leave 8 days and casual leave 10 days. Pending requests reserve your balance, so please cancel requests you no longer need. Weekends and public holidays are not counted.',
      category: 'policy', pinned: false
    },
    {
      title: 'Payroll cutoff for this month',
      body: 'Attendance corrections and leave requests for the current cycle must be submitted before the 25th. HR will circulate payroll drafts for review on the 26th.',
      category: 'payroll', pinned: false
    }
  ];
  for (const announcement of announcements) {
    const exists = await Announcement.findOne({ title: announcement.title });
    if (!exists) {
      await Announcement.create({
        ...announcement,
        author: admin._id,
        authorName: admin.name,
        authorRole: 'admin'
      });
    }
  }

  // ── Notifications for the demo employee ─────────────────────────
  const demoUser = await User.findOne({ email: DEMO_ACCOUNTS[2].email });
  if (demoUser && (await Notification.countDocuments({ user: demoUser._id })) === 0) {
    await Notification.insertMany([
      {
        user: demoUser._id,
        title: 'Payslip available',
        message: 'Your finalized payslip is ready to download from the Payslips page.',
        type: 'payroll',
        link: '/payslips'
      },
      {
        user: demoUser._id,
        title: 'Leave request approved',
        message: 'Your recent annual leave request was approved by HR.',
        type: 'leave',
        link: '/leave'
      },
      {
        user: demoUser._id,
        title: 'New announcement',
        message: 'Quarterly town hall — Thursday 4:00 PM',
        type: 'announcement',
        link: '/announcements'
      }
    ]);
  }

  if ((await AuditLog.countDocuments()) === 0) {
    await AuditLog.create({
      actor: admin._id,
      actorName: admin.name,
      actorRole: 'admin',
      action: 'demo.seeded',
      entityType: 'System',
      summary: 'Demo dataset generated',
      after: { employees: employees.length, attendanceRecords: attendanceCreated }
    });
  }

  return {
    company: org.name,
    employees: employees.length,
    attendanceCreated,
    payrollCreated,
    accounts: DEMO_ACCOUNTS.map((account) => ({
      role: account.role,
      email: account.email,
      password: account.password
    }))
  };
}

export { monthRange };

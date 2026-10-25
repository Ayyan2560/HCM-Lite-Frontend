import { Employee } from '../models/Employee.mjs';
import { Payroll } from '../models/Payroll.mjs';
import { conflict, notFound, unprocessable } from '../utils/http.mjs';
import { currentPeriod, listWorkingDays, monthRange } from '../utils/dates.mjs';
import { buildMatrix, summarizeDays } from './attendanceService.mjs';
import { orgConfig } from './orgService.mjs';

export function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function salaryComponents(basicSalary) {
  const basic = Number(basicSalary) || 0;
  const hra = round2(basic * 0.4);
  const medical = round2(basic * 0.1);
  const gross = round2(basic * 1.5);
  return { basic, hra, medical, gross };
}

/**
 * Progressive annual tax slabs (hackathon-specified assumptions):
 * 0 – 600k: 0% | 600k – 1.2M: 5% | 1.2M – 2.4M: 30k + 15%
 * 2.4M – 3.6M: 210k + 25% | above 3.6M: 510k + 35%
 */
export function calculateAnnualTax(annualGross) {
  const income = Math.max(0, Number(annualGross) || 0);
  if (income <= 600000) return 0;
  if (income <= 1200000) return round2((income - 600000) * 0.05);
  if (income <= 2400000) return round2(30000 + (income - 1200000) * 0.15);
  if (income <= 3600000) return round2(210000 + (income - 2400000) * 0.25);
  return round2(510000 + (income - 3600000) * 0.35);
}

export function calculateTax(monthlyGross) {
  const annualGross = round2(Number(monthlyGross) * 12);
  const annualTax = calculateAnnualTax(annualGross);
  return { annualGross, annualTax, monthlyTax: round2(annualTax / 12) };
}

/**
 * Deduction precedence per employee/work-date (exactly one applies):
 * 1. Approved paid leave      → no deduction
 * 2. Approved unpaid leave    → 1.0 day
 * 3. Half-day attendance      → 0.5 day
 * 4. Present / late / missing checkout → no deduction
 * 5. Otherwise (expected working day up to cutoff) → 1.0 day absent
 */
export function deductionForDay(day) {
  if (day.kind === 'leave') return day.leaveType === 'unpaid' ? 1 : 0;
  if (day.kind === 'half_day') return 0.5;
  if (day.kind === 'absent') return 1;
  return 0;
}

export function buildEntry({ employee, days, workingDays, currency, period }) {
  const { basic, hra, medical, gross } = salaryComponents(employee.basicSalary);
  const dailyRate = workingDays > 0 ? round2(gross / workingDays) : 0;
  const counts = summarizeDays(days);
  const absenceDays = days.filter((day) => day.kind === 'absent').length;
  const halfDays = counts.halfDay;
  const unpaidLeaveDays = days.filter((day) => day.kind === 'leave' && day.leaveType === 'unpaid').length;
  const paidLeaveDays = counts.onLeave - unpaidLeaveDays;
  const absenceDeduction = round2(absenceDays * dailyRate);
  const halfDayDeduction = round2(halfDays * dailyRate * 0.5);
  const unpaidLeaveDeduction = round2(unpaidLeaveDays * dailyRate);
  const totalDeductions = round2(absenceDeduction + halfDayDeduction + unpaidLeaveDeduction);
  const tax = calculateTax(gross);
  const net = round2(gross - totalDeductions - tax.monthlyTax);
  return {
    employee: employee._id,
    code: employee.code,
    name: `${employee.firstName} ${employee.lastName}`.trim(),
    department: employee.department,
    basicSalary: basic,
    hra,
    medical,
    gross,
    dailyRate,
    workingDays,
    presentDays: counts.present,
    lateDays: counts.late,
    halfDays,
    absentDays: absenceDays,
    paidLeaveDays,
    unpaidLeaveDays,
    missingCheckoutDays: counts.missingCheckout,
    absenceDeduction,
    halfDayDeduction,
    unpaidLeaveDeduction,
    totalDeductions,
    annualGross: tax.annualGross,
    annualTax: tax.annualTax,
    monthlyTax: tax.monthlyTax,
    net,
    currency,
    period
  };
}

export async function generateDraft({ org, period, actor, notes = '', todayKey }) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(period))) {
    throw unprocessable('Payroll period must use the YYYY-MM format.');
  }
  const existing = await Payroll.findOne({ period });
  if (existing?.status === 'finalized') {
    throw conflict(`Payroll for ${period} is finalized and locked.`);
  }
  if (period > currentPeriod(todayKey)) {
    throw unprocessable('Cannot generate payroll for a future period.');
  }

  const config = orgConfig(org);
  const range = monthRange(period);
  const cutoffDate = todayKey < range.endKey ? todayKey : range.endKey;

  const employees = await Employee.find({
    joiningDate: { $lte: range.endKey },
    status: 'active'
  }).sort({ code: 1 }).lean();

  const matrix = await buildMatrix({
    org,
    employees,
    from: range.startKey,
    to: range.endKey,
    todayKey: cutoffDate
  });

  const workingDays = listWorkingDays(range.startKey, range.endKey, config).length;

  const entries = employees.map((employee) => {
    const days = matrix.byEmployee.get(employee._id.toString()) || [];
    return buildEntry({
      employee,
      days,
      workingDays,
      currency: config.currency,
      period
    });
  });

  const totals = entries.reduce(
    (accumulator, entry) => ({
      employees: accumulator.employees + 1,
      gross: round2(accumulator.gross + entry.gross),
      deductions: round2(accumulator.deductions + entry.totalDeductions),
      tax: round2(accumulator.tax + entry.monthlyTax),
      net: round2(accumulator.net + entry.net)
    }),
    { employees: 0, gross: 0, deductions: 0, tax: 0, net: 0 }
  );

  const payload = {
    period,
    status: 'draft',
    currency: config.currency,
    workingDays,
    cutoffDate,
    entries,
    totals,
    notes,
    createdBy: actor._id,
    updatedBy: actor._id
  };

  if (existing) {
    Object.assign(existing, payload);
    await existing.save();
    return existing;
  }
  return Payroll.create(payload);
}

export async function finalizePayroll({ payrollId, actor, todayKey }) {
  const payroll = await Payroll.findById(payrollId);
  if (!payroll) throw notFound('Payroll draft not found.');
  if (payroll.status === 'finalized') throw conflict('Payroll is already finalized.');
  if (!payroll.entries.length) throw unprocessable('Cannot finalize an empty payroll draft.');
  if (payroll.cutoffDate && payroll.cutoffDate < monthRange(payroll.period).endKey) {
    throw unprocessable(
      `This draft only covers up to ${payroll.cutoffDate}. Finalize after the period ends (or regenerate the draft).`
    );
  }
  if (payroll.period > currentPeriod(todayKey)) {
    throw unprocessable('Cannot finalize a future payroll period.');
  }
  payroll.status = 'finalized';
  payroll.finalizedBy = actor._id;
  payroll.finalizedAt = new Date();
  await payroll.save();
  return payroll;
}

export function assertEditable(payroll) {
  if (!payroll) throw notFound('Payroll not found.');
  if (payroll.status === 'finalized') {
    throw conflict('This payroll is finalized and locked.');
  }
  return payroll;
}



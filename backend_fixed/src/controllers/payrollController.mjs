import PDFDocument from 'pdfkit';
import { Payroll } from '../models/Payroll.mjs';
import { Employee } from '../models/Employee.mjs';
import { AppError, conflict, notFound, ok, paginate } from '../utils/http.mjs';
import { requireString } from '../utils/validate.mjs';
import { formatPeriodLabel, monthRange, nowParts } from '../utils/dates.mjs';
import { getOrganization, orgConfig } from '../services/orgService.mjs';
import { finalizePayroll, generateDraft } from '../services/payrollService.mjs';
import { recordAudit } from '../services/auditService.mjs';
import { notifyEmployee } from '../services/notificationService.mjs';

function summaryShape(payroll) {
  return {
    id: payroll._id.toString(),
    period: payroll.period,
    periodLabel: formatPeriodLabel(payroll.period),
    status: payroll.status,
    currency: payroll.currency,
    workingDays: payroll.workingDays,
    cutoffDate: payroll.cutoffDate,
    totals: payroll.totals,
    notes: payroll.notes,
    finalizedAt: payroll.finalizedAt,
    createdAt: payroll.createdAt,
    updatedAt: payroll.updatedAt
  };
}

export async function listPayrolls(req, res) {
  const { page, limit, skip } = paginate(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const [items, total] = await Promise.all([
    Payroll.find(filter).sort({ period: -1 }).skip(skip).limit(limit).lean(),
    Payroll.countDocuments(filter)
  ]);
  ok(res, {
    items: items.map(summaryShape),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  });
}

export async function createDraft(req, res) {
  const org = await getOrganization();
  const config = orgConfig(org);
  const { dateKey: todayKey } = nowParts(config.timezone);
  const period = requireString(req.body?.period, 'Payroll period', { min: 7, max: 7 });
  const notes = requireString(req.body?.notes || '', 'Notes', { min: 0, max: 500 });
  const payroll = await generateDraft({ org, period, actor: req.user, notes, todayKey });
  await recordAudit({
    req, actor: req.user, action: 'payroll.draft_generated', entityType: 'Payroll', entityId: payroll._id,
    summary: `Payroll draft for ${period} (${payroll.entries.length} employees)`,
    after: { period, status: payroll.status, totals: payroll.totals, workingDays: payroll.workingDays }
  });
  ok(res, {
    payroll: summaryShape(payroll),
    entries: payroll.entries
  }, 201);
}

export async function getPayroll(req, res) {
  const payroll = await Payroll.findById(req.params.id).lean();
  if (!payroll) throw notFound('Payroll not found.');
  ok(res, { payroll: summaryShape(payroll), entries: payroll.entries });
}

export async function updatePayrollNotes(req, res) {
  const payroll = await Payroll.findById(req.params.id);
  if (!payroll) throw notFound('Payroll not found.');
  if (payroll.status === 'finalized') throw conflict('This payroll is finalized and locked.');
  payroll.notes = requireString(req.body?.notes || '', 'Notes', { min: 0, max: 500 });
  payroll.updatedBy = req.user._id;
  await payroll.save();
  await recordAudit({
    req, actor: req.user, action: 'payroll.notes_updated', entityType: 'Payroll', entityId: payroll._id,
    summary: `Payroll notes updated for ${payroll.period}`, after: { notes: payroll.notes }
  });
  ok(res, summaryShape(payroll));
}

export async function finalize(req, res) {
  const org = await getOrganization();
  const { dateKey: todayKey } = nowParts(orgConfig(org).timezone);
  const payroll = await finalizePayroll({ payrollId: req.params.id, actor: req.user, todayKey });

  await Promise.all(
    payroll.entries.map((entry) =>
      notifyEmployee(entry.employee, {
        title: 'Payslip available',
        message: `Your payslip for ${formatPeriodLabel(payroll.period)} is now available. Net pay ${payroll.currency} ${entry.net.toLocaleString('en-US')}.`,
        type: 'payroll',
        link: '/payslips'
      })
    )
  );
  await recordAudit({
    req, actor: req.user, action: 'payroll.finalized', entityType: 'Payroll', entityId: payroll._id,
    summary: `Payroll finalized for ${payroll.period}`,
    before: { status: 'draft' },
    after: { status: 'finalized', totals: payroll.totals, finalizedAt: payroll.finalizedAt }
  });
  ok(res, summaryShape(payroll));
}

export async function myPayslips(req, res) {
  if (!req.employee) throw notFound('No employee profile linked to this account.');
  const payrolls = await Payroll.find({ status: 'finalized', 'entries.employee': req.employee._id })
    .sort({ period: -1 })
    .lean();
  const currency = payrolls[0]?.currency || orgConfig(await getOrganization()).currency;
  ok(res, {
    currency,
    items: payrolls.flatMap((payroll) => {
      const entry = payroll.entries.find((item) => String(item.employee) === String(req.employee._id));
      // Skip payrolls where this employee has no entry (e.g. joined after finalization).
      if (!entry) return [];
      return [{
        payrollId: payroll._id.toString(),
        period: payroll.period,
        periodLabel: formatPeriodLabel(payroll.period),
        currency: payroll.currency,
        basicSalary: entry.basicSalary,
        hra: entry.hra,
        medical: entry.medical,
        gross: entry.gross,
        deductions: entry.totalDeductions,
        tax: entry.monthlyTax,
        net: entry.net,
        workingDays: entry.workingDays,
        presentDays: entry.presentDays,
        absentDays: entry.absentDays,
        halfDays: entry.halfDays,
        paidLeaveDays: entry.paidLeaveDays,
        unpaidLeaveDays: entry.unpaidLeaveDays,
        finalizedAt: payroll.finalizedAt
      }];
    })
  });
}

export async function downloadPayslip(req, res) {
  const payroll = await Payroll.findById(req.params.id).lean();
  if (!payroll) throw notFound('Payslip not found.');
  const employee = await Employee.findById(req.params.employeeId).lean();
  if (!employee) throw notFound('Employee not found.');

  const isSelf = req.employee && String(req.employee._id) === String(employee._id);
  const isHrOrAdmin = ['admin', 'hr'].includes(req.user.role);
  if (!isSelf && !isHrOrAdmin) throw new AppError(403, 'You can only download your own payslip.');
  if (payroll.status !== 'finalized' && !isHrOrAdmin) throw new AppError(403, 'Payslips are available after payroll finalization.');

  const entry = payroll.entries.find((item) => String(item.employee) === String(employee._id));
  if (!entry) throw notFound('No payroll entry found for this employee.');

  const org = await getOrganization();
  const currency = payroll.currency || org.currency || 'PKR';
  const money = (value) => `${currency} ${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="payslip-${employee.code}-${payroll.period}.pdf"`);

  const doc = new PDFDocument({ size: 'A4', margin: 48 });
  doc.pipe(res);

  doc.rect(0, 0, 595, 96).fill('#0b1220');
  doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold').text(org.name, 48, 30);
  doc.fontSize(9).font('Helvetica').fillColor('#9fb3d9').text('Payslip · Confidential', 48, 58);
  doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold')
    .text(formatPeriodLabel(payroll.period), 400, 34, { width: 145, align: 'right' });
  doc.fontSize(8).font('Helvetica').fillColor('#9fb3d9')
    .text(`Finalized ${new Date(payroll.finalizedAt || Date.now()).toISOString().slice(0, 10)}`, 400, 52, { width: 145, align: 'right' });

  doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(12).text('Employee details', 48, 124);
  const rows = [
    ['Employee', entry.name],
    ['Employee code', entry.code],
    ['Department', entry.department || employee.department],
    ['Designation', employee.designation],
    ['Joining date', employee.joiningDate],
    ['Pay period', `${monthRange(payroll.period).startKey} → ${monthRange(payroll.period).endKey}`]
  ];
  let y = 146;
  doc.fontSize(9);
  for (const [label, value] of rows) {
    doc.font('Helvetica').fillColor('#64748b').text(label, 48, y);
    doc.font('Helvetica-Bold').fillColor('#0f172a').text(String(value || '—'), 180, y);
    y += 17;
  }

  y += 10;
  doc.rect(48, y, 499, 24).fill('#f1f5fb');
  doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10);
  doc.text('Earnings', 56, y + 7);
  doc.text('Amount', 300, y + 7, { width: 100, align: 'right' });
  doc.text('Deductions', 390, y + 7);
  doc.text('Amount', 456, y + 7, { width: 82, align: 'right' });
  y += 34;

  const earnings = [
    ['Basic salary', entry.basicSalary],
    ['House rent allowance (40%)', entry.hra],
    ['Medical allowance (10%)', entry.medical],
    ['Gross salary', entry.gross]
  ];
  const deductions = [
    ['Absence (days)', entry.absenceDeduction],
    ['Half-day (days)', entry.halfDayDeduction],
    ['Unpaid leave', entry.unpaidLeaveDeduction],
    ['Income tax (monthly)', entry.monthlyTax]
  ];
  const startY = y;
  doc.font('Helvetica').fontSize(9);
  earnings.forEach(([label, value], index) => {
    doc.fillColor('#334155').text(label, 56, y + index * 16);
    doc.fillColor('#0f172a').text(money(value), 270, y + index * 16, { width: 130, align: 'right' });
  });
  deductions.forEach(([label, value], index) => {
    doc.fillColor('#334155').text(label, 390, y + index * 16);
    doc.fillColor('#0f172a').text(money(value), 446, y + index * 16, { width: 92, align: 'right' });
  });
  y = startY + Math.max(earnings.length, deductions.length) * 16 + 10;

  doc.moveTo(48, y).lineTo(547, y).strokeColor('#e2e8f0').stroke();
  y += 12;
  doc.font('Helvetica').fillColor('#334155')
    .text(`Working days: ${entry.workingDays} · Present: ${entry.presentDays} · Late: ${entry.lateDays} · Half-day: ${entry.halfDays} · Absent: ${entry.absentDays} · Paid leave: ${entry.paidLeaveDays} · Unpaid leave: ${entry.unpaidLeaveDays}`, 48, y, { width: 499 });
  y += 34;

  doc.rect(48, y, 499, 52).fill('#0b1220');
  doc.fillColor('#9fb3d9').font('Helvetica').fontSize(9).text('NET PAYABLE', 60, y + 12);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(18).text(money(entry.net), 330, y + 12, { width: 200, align: 'right' });
  y += 70;

  doc.fillColor('#64748b').font('Helvetica').fontSize(8)
    .text('Deduction precedence per work date: approved paid leave → no deduction; approved unpaid leave → 1 day; half-day attendance → 0.5 day; otherwise full absence. Weekly offs and public holidays are excluded.', 48, y, { width: 499 });
  doc.text('This is a system-generated payslip from HCM Lite. Tax figures follow the configured hackathon tax slab assumptions.', 48, y + 34, { width: 499 });

  doc.end();
}

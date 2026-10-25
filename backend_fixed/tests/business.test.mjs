import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateAnnualTax, calculateTax, deductionForDay, salaryComponents, round2 } from '../src/services/payrollService.mjs';
import { calculateAttendanceRate, summarizeDays } from '../src/services/attendanceService.mjs';
import { computeLeaveDays } from '../src/services/leaveService.mjs';
import { countWorkingDays, listWorkingDays, zonedDateTimeToUtc, timeInZone } from '../src/utils/dates.mjs';
import { distanceMeters } from '../src/services/orgService.mjs';

const org = {
  name: 'Test Co',
  weekendDays: [0, 6],
  publicHolidays: [{ date: '2026-10-09', name: 'Test Holiday' }],
  leavePolicy: { annual: 14, sick: 8, casual: 10, unpaid: null }
};

test('salary components follow 40% HRA, 10% medical and 1.5x gross', () => {
  const result = salaryComponents(100000);
  assert.equal(result.hra, 40000);
  assert.equal(result.medical, 10000);
  assert.equal(result.gross, 150000);
});

test('tax slabs are correct at and around every boundary', () => {
  assert.equal(calculateAnnualTax(0), 0);
  assert.equal(calculateAnnualTax(600000), 0);
  assert.equal(calculateAnnualTax(600001), 0.05);
  assert.equal(calculateAnnualTax(1200000), 30000);
  assert.equal(calculateAnnualTax(1200001), round2(30000 + 0.15));
  assert.equal(calculateAnnualTax(1800000), 120000);
  assert.equal(calculateAnnualTax(2400000), 210000);
  assert.equal(calculateAnnualTax(2400001), round2(210000 + 0.25));
  assert.equal(calculateAnnualTax(3600000), 510000);
  assert.equal(calculateAnnualTax(3600001), round2(510000 + 0.35));
});

test('monthly tax derives from annual gross and net reconciles', () => {
  const tax = calculateTax(150000);
  assert.equal(tax.annualGross, 1800000);
  assert.equal(tax.annualTax, 120000);
  assert.equal(tax.monthlyTax, 10000);
  assert.equal(round2(150000 - 10000), 140000);
});

test('weekends and public holidays are excluded from working days', () => {
  // 2026-10-09 (Fri, holiday) → 2026-10-12 (Mon)
  assert.equal(countWorkingDays('2026-10-09', '2026-10-12', org), 1);
  assert.deepEqual(listWorkingDays('2026-10-09', '2026-10-12', org), ['2026-10-12']);
  // 2026-10-10 Sat / 11 Sun excluded
  assert.equal(countWorkingDays('2026-10-10', '2026-10-11', org), 0);
});

test('leave day calculation spans month and year boundaries', () => {
  assert.equal(computeLeaveDays({ org, startDate: '2026-10-08', endDate: '2026-10-12' }).days, 2);
  assert.equal(computeLeaveDays({ org, startDate: '2026-12-30', endDate: '2027-01-04' }).days, 4);
  assert.throws(
    () => computeLeaveDays({ org, startDate: '2026-10-10', endDate: '2026-10-11' }),
    /no working days/i
  );
  assert.throws(
    () => computeLeaveDays({ org, startDate: '2026-10-12', endDate: '2026-10-08' }),
    /end date/i
  );
});

test('attendance rate follows the PRD formula and guards zero denominators', () => {
  const rate = calculateAttendanceRate({
    present: 8, late: 1, missingCheckout: 1, halfDay: 2, absent: 0, expectedWorkingDays: 12
  });
  assert.equal(rate, 91.7);
  assert.equal(calculateAttendanceRate({ present: 0, late: 0, missingCheckout: 0, halfDay: 0, absent: 0, expectedWorkingDays: 0 }), null);
});

test('approved leave is excluded from the attendance denominator', () => {
  const days = [
    ...Array.from({ length: 5 }, () => ({ kind: 'present' })),
    { kind: 'leave', leaveType: 'annual' },
    { kind: 'absent' }
  ];
  const summary = summarizeDays(days);
  assert.equal(summary.onLeave, 1);
  assert.equal(summary.expectedWorkingDays, 6);
  assert.equal(summary.attendanceRate, 83.3);
});

test('deduction precedence never double counts a work date', () => {
  assert.equal(deductionForDay({ kind: 'leave', leaveType: 'annual' }), 0);
  assert.equal(deductionForDay({ kind: 'leave', leaveType: 'unpaid' }), 1);
  assert.equal(deductionForDay({ kind: 'half_day' }), 0.5);
  assert.equal(deductionForDay({ kind: 'present' }), 0);
  assert.equal(deductionForDay({ kind: 'late' }), 0);
  assert.equal(deductionForDay({ kind: 'missing_checkout' }), 0);
  assert.equal(deductionForDay({ kind: 'absent' }), 1);
});

test('server timestamps convert company wall-clock time correctly', () => {
  const instant = zonedDateTimeToUtc('2026-10-12', '09:00', 'Asia/Karachi');
  assert.equal(timeInZone(instant, 'Asia/Karachi'), '09:00');
});

test('haversine geofence distance is accurate', () => {
  const distance = distanceMeters(24.8607, 67.0011, 24.8617, 67.0011);
  assert.ok(distance >= 110 && distance <= 112, `expected ~111m, received ${distance}`);
});

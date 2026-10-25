/**
 * Calendar/date helpers. Business dates are stored as plain `YYYY-MM-DD`
 * strings so that timezone conversions can never shift an attendance day.
 * "Now" is always resolved in the company timezone from the database config.
 */

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function isValidDateKey(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function dateKeyFromDate(date, timeZone = 'UTC') {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date instanceof Date ? date : new Date(date));
  const pick = (type) => parts.find((part) => part.type === type)?.value;
  return `${pick('year')}-${pick('month')}-${pick('day')}`;
}

export function nowParts(timeZone) {
  const now = new Date();
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(now);
  return { dateKey: dateKeyFromDate(now, timeZone), time, now };
}

export function minutesFromTime(time = '00:00') {
  const [hours, minutes] = String(time).split(':').map(Number);
  return (Number(hours) || 0) * 60 + (Number(minutes) || 0);
}

export function timeFromMinutes(total) {
  const normalized = ((Math.round(total) % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
}

export function toUtcDate(dateKey) {
  if (!isValidDateKey(dateKey)) throw new Error(`Invalid date key: ${dateKey}`);
  return new Date(`${dateKey}T00:00:00.000Z`);
}

export function addDays(dateKey, amount) {
  const date = toUtcDate(dateKey);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

/** Combine a business date + wall-clock time in the company timezone into an instant. */
export function zonedDateTimeToUtc(dateKey, time, timeZone) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const [hour, minute] = String(time).split(':').map(Number);
  // first guess: treat wall clock as UTC, then correct by the zone offset at that instant
  let guess = Date.UTC(year, month - 1, day, hour || 0, minute || 0, 0, 0);
  for (let i = 0; i < 3; i += 1) {
    const offset = timezoneOffsetMs(new Date(guess), timeZone);
    const next = Date.UTC(year, month - 1, day, hour || 0, minute || 0, 0, 0) - offset;
    if (next === guess) break;
    guess = next;
  }
  return new Date(guess);
}

export function timezoneOffsetMs(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  const parts = formatter.formatToParts(date);
  const map = {};
  for (const part of parts) map[part.type] = part.value;
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour === '24' ? '0' : map.hour),
    Number(map.minute),
    Number(map.second)
  );
  return asUtc - date.getTime();
}

export function timeInZone(date, timeZone) {
  if (!date) return null;
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(date));
}

export function weekdayOf(dateKey) {
  return toUtcDate(dateKey).getUTCDay();
}

export function isWeekend(dateKey, weekendDays = [0, 6]) {
  return (weekendDays || []).includes(weekdayOf(dateKey));
}

export function holidaySet(publicHolidays = []) {
  return new Set((publicHolidays || []).map((holiday) => holiday.date));
}

export function isHoliday(dateKey, publicHolidays = []) {
  return holidaySet(publicHolidays).has(dateKey);
}

/** Every calendar date in [start, end] inclusive. */
export function eachDate(startKey, endKey) {
  const dates = [];
  let cursor = startKey;
  let guard = 0;
  while (cursor <= endKey && guard < 1000) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
    guard += 1;
  }
  return dates;
}

/** Working days in the inclusive range, excluding weekends and public holidays. */
export function countWorkingDays(startKey, endKey, org = {}) {
  if (!isValidDateKey(startKey) || !isValidDateKey(endKey) || startKey > endKey) return 0;
  const weekendDays = org.weekendDays || [0, 6];
  const holidays = holidaySet(org.publicHolidays);
  return eachDate(startKey, endKey).filter(
    (dateKey) => !isWeekend(dateKey, weekendDays) && !holidays.has(dateKey)
  ).length;
}

export function listWorkingDays(startKey, endKey, org = {}) {
  const weekendDays = org.weekendDays || [0, 6];
  const holidays = holidaySet(org.publicHolidays);
  return eachDate(startKey, endKey).filter(
    (dateKey) => !isWeekend(dateKey, weekendDays) && !holidays.has(dateKey)
  );
}

export function monthRange(period) {
  if (!/^\d{4}-\d{2}$/.test(String(period))) throw new Error(`Invalid payroll period: ${period}`);
  const [year, month] = period.split('-').map(Number);
  if (month < 1 || month > 12) throw new Error(`Invalid payroll period: ${period}`);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    startKey: `${period}-01`,
    endKey: `${period}-${String(lastDay).padStart(2, '0')}`,
    year,
    month
  };
}

export function currentPeriod(dateKey) {
  return dateKey.slice(0, 7);
}

export function previousPeriod(period) {
  const [year, month] = period.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));
  date.setUTCMonth(date.getUTCMonth() - 1);
  return date.toISOString().slice(0, 7);
}

export function formatPeriodLabel(period) {
  const [year, month] = period.split('-').map(Number);
  return `${MONTH_LABELS[month - 1]} ${year}`;
}

export function formatDateLabel(dateKey) {
  if (!isValidDateKey(dateKey)) return dateKey || '—';
  const [year, month, day] = dateKey.split('-').map(Number);
  return `${String(day).padStart(2, '0')} ${MONTH_LABELS[month - 1].slice(0, 3)} ${year}`;
}

export function overlap(startA, endA, startB, endB) {
  return startA <= endB && startB <= endA;
}

export function yearsBetween(startKey, endKey) {
  return Number(endKey.slice(0, 4)) - Number(startKey.slice(0, 4)) + 1;
}

import { Organization } from '../models/Organization.mjs';
import { notFound } from '../utils/http.mjs';
import { monthRange, nowParts, listWorkingDays } from '../utils/dates.mjs';

/** The single source of truth for organization configuration. */
export async function getOrganization({ required = true } = {}) {
  const org = await Organization.findOne({ singleton: 'primary' });
  if (!org && required) throw notFound('Company setup has not been completed yet.');
  return org;
}

export function orgConfig(org) {
  if (!org) throw notFound('Company config unavailable.');
  return {
    name: org.name,
    currency: org.currency || 'PKR',
    timezone: org.timezone || 'Asia/Karachi',
    workStartTime: org.workStartTime || '09:00',
    graceMinutes: org.graceMinutes ?? 15,
    halfDayHours: org.halfDayHours ?? 5,
    weekendDays: org.weekendDays?.length ? org.weekendDays : [0, 6],
    publicHolidays: (org.publicHolidays || []).map((holiday) => ({ date: holiday.date, name: holiday.name })),
    leavePolicy: {
      annual: org.leavePolicy?.annual ?? 14,
      sick: org.leavePolicy?.sick ?? 8,
      casual: org.leavePolicy?.casual ?? 10,
      unpaid: org.leavePolicy?.unpaid ?? null
    },
    geofenceEnabled: Boolean(org.geofenceEnabled),
    geofenceRadius: org.geofenceRadius ?? 150,
    officeLatitude: org.officeLatitude,
    officeLongitude: org.officeLongitude
  };
}

export function currentWorkDate(org) {
  return nowParts(org?.timezone || 'Asia/Karachi');
}

export function workingDaysInPeriod(org, period) {
  const range = monthRange(period);
  return {
    ...range,
    workingDays: listWorkingDays(range.startKey, range.endKey, orgConfig(org))
  };
}

/** Haversine distance in metres. */
export function distanceMeters(lat1, lon1, lat2, lon2) {
  const toRad = (value) => (Number(value) * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

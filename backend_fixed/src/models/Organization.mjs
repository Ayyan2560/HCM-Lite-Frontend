import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema(
  { name: { type: String, required: true, trim: true, maxlength: 80 } },
  { _id: true }
);

const holidaySchema = new mongoose.Schema(
  {
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    name: { type: String, required: true, trim: true, maxlength: 120 }
  },
  { _id: false }
);

const leavePolicySchema = new mongoose.Schema(
  {
    annual: { type: Number, default: 14, min: 0, max: 365 },
    sick: { type: Number, default: 8, min: 0, max: 365 },
    casual: { type: Number, default: 10, min: 0, max: 365 },
    unpaid: { type: Number, default: null, min: 0 } // null = unlimited
  },
  { _id: false }
);

const organizationSchema = new mongoose.Schema(
  {
    singleton: { type: String, default: 'primary', unique: true, immutable: true },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    legalName: { type: String, trim: true, default: '' },
    currency: { type: String, trim: true, uppercase: true, default: 'PKR', maxlength: 8 },
    timezone: { type: String, default: 'Asia/Karachi', maxlength: 64 },
    workStartTime: { type: String, default: '09:00', match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    graceMinutes: { type: Number, default: 15, min: 0, max: 240 },
    halfDayHours: { type: Number, default: 5, min: 1, max: 12 },
    weekendDays: { type: [Number], default: [6, 0] },
    officeLatitude: { type: Number, default: 24.8607, min: -90, max: 90 },
    officeLongitude: { type: Number, default: 67.0011, min: -180, max: 180 },
    geofenceRadius: { type: Number, default: 150, min: 20, max: 5000 },
    geofenceEnabled: { type: Boolean, default: false },
    departments: { type: [departmentSchema], default: [] },
    designations: { type: [String], default: [] },
    leavePolicy: { type: leavePolicySchema, default: () => ({}) },
    publicHolidays: { type: [holidaySchema], default: [] },
    setupCompleted: { type: Boolean, default: false },
    initializedAt: { type: Date, default: null }
  },
  { timestamps: true, minimize: false }
);

organizationSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    legalName: this.legalName,
    currency: this.currency,
    timezone: this.timezone,
    workStartTime: this.workStartTime,
    graceMinutes: this.graceMinutes,
    halfDayHours: this.halfDayHours,
    weekendDays: this.weekendDays,
    officeLatitude: this.officeLatitude,
    officeLongitude: this.officeLongitude,
    geofenceRadius: this.geofenceRadius,
    geofenceEnabled: this.geofenceEnabled,
    departments: (this.departments || []).map((department) => ({
      id: department._id.toString(),
      name: department.name
    })),
    designations: this.designations || [],
    leavePolicy: {
      annual: this.leavePolicy?.annual ?? 14,
      sick: this.leavePolicy?.sick ?? 8,
      casual: this.leavePolicy?.casual ?? 10,
      unpaid: this.leavePolicy?.unpaid ?? null
    },
    publicHolidays: (this.publicHolidays || []).map((holiday) => ({
      date: holiday.date,
      name: holiday.name
    })),
    setupCompleted: this.setupCompleted
  };
};

export const Organization = mongoose.model('Organization', organizationSchema);
export default Organization;

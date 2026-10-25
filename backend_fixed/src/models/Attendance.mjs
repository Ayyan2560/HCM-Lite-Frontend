import mongoose from 'mongoose';

export const ATTENDANCE_STATUSES = ['present', 'late', 'half_day', 'missing_checkout'];

const attendanceSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/, index: true },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, default: null },
    status: { type: String, enum: ATTENDANCE_STATUSES, required: true, index: true },
    lateMinutes: { type: Number, default: 0, min: 0 },
    workedMinutes: { type: Number, default: 0, min: 0 },
    checkInMeta: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      accuracy: { type: Number, default: null },
      distance: { type: Number, default: null }
    },
    checkOutMeta: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      accuracy: { type: Number, default: null },
      distance: { type: Number, default: null }
    },
    source: { type: String, enum: ['web', 'correction', 'import'], default: 'web' },
    note: { type: String, default: '', maxlength: 300 }
  },
  { timestamps: true }
);

// Database-level guard against duplicate attendance for an employee/work-date.
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

export const Attendance = mongoose.model('Attendance', attendanceSchema);
export default Attendance;

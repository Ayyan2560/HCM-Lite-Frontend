import mongoose from 'mongoose';

const correctionSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/, index: true },
    requestedCheckIn: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    requestedCheckOut: { type: String, default: null, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    decidedAt: { type: Date, default: null },
    decisionComment: { type: String, default: '', maxlength: 500 }
  },
  { timestamps: true }
);

correctionSchema.index({ employee: 1, date: 1, status: 1 });

export const AttendanceCorrection = mongoose.model('AttendanceCorrection', correctionSchema);
export default AttendanceCorrection;

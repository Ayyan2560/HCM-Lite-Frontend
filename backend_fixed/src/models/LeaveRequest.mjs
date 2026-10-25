import mongoose from 'mongoose';

export const LEAVE_TYPES = ['annual', 'sick', 'casual', 'unpaid'];
export const LEAVE_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'];

const leaveSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    type: { type: String, enum: LEAVE_TYPES, required: true },
    startDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    endDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    days: { type: Number, required: true, min: 0.5 },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    status: { type: String, enum: LEAVE_STATUSES, default: 'pending', index: true },
    year: { type: Number, required: true, index: true },
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    decidedAt: { type: Date, default: null },
    decisionComment: { type: String, default: '', maxlength: 500 },
    cancelledAt: { type: Date, default: null }
  },
  { timestamps: true }
);

leaveSchema.index({ employee: 1, status: 1, startDate: 1, endDate: 1 });

export const LeaveRequest = mongoose.model('LeaveRequest', leaveSchema);
export default LeaveRequest;

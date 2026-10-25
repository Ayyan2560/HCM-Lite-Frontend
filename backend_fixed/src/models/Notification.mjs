import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    message: { type: String, required: true, trim: true, maxlength: 600 },
    type: { type: String, enum: ['leave', 'attendance', 'payroll', 'announcement', 'system'], default: 'system' },
    link: { type: String, default: '' },
    read: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;

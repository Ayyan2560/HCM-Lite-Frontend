import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    body: { type: String, required: true, trim: true, maxlength: 3000 },
    category: { type: String, enum: ['general', 'policy', 'payroll', 'event'], default: 'general' },
    pinned: { type: Boolean, default: false },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, required: true },
    authorRole: { type: String, enum: ['admin', 'hr'], required: true }
  },
  { timestamps: true }
);

announcementSchema.index({ createdAt: -1 });

export const Announcement = mongoose.model('Announcement', announcementSchema);
export default Announcement;

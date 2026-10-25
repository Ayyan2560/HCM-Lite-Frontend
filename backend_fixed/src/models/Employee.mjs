import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    firstName: { type: String, required: true, trim: true, maxlength: 80 },
    lastName: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    phone: { type: String, trim: true, default: '', maxlength: 30 },
    department: { type: String, required: true, trim: true, index: true },
    designation: { type: String, required: true, trim: true },
    joiningDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    basicSalary: { type: Number, required: true, min: 0 },
    employmentType: { type: String, enum: ['full-time', 'part-time', 'contract'], default: 'full-time' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
    address: { type: String, trim: true, default: '', maxlength: 300 },
    emergencyContact: { type: String, trim: true, default: '', maxlength: 120 },
    avatarUrl: { type: String, trim: true, default: null, maxlength: 500 },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true }
);

employeeSchema.virtual('fullName').get(function fullName() {
  return `${this.firstName} ${this.lastName}`.trim();
});

employeeSchema.set('toJSON', { virtuals: true, transform(_doc, ret) { delete ret.__v; return ret; } });
employeeSchema.index({ firstName: 'text', lastName: 'text', code: 'text', email: 'text' });

export const Employee = mongoose.model('Employee', employeeSchema);
export default Employee;

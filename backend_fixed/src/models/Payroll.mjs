import mongoose from 'mongoose';

const payrollEntrySchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    code: { type: String, required: true },
    name: { type: String, required: true },
    department: { type: String, default: '' },
    basicSalary: { type: Number, required: true },
    hra: { type: Number, required: true },
    medical: { type: Number, required: true },
    gross: { type: Number, required: true },
    dailyRate: { type: Number, required: true },
    workingDays: { type: Number, required: true },
    presentDays: { type: Number, default: 0 },
    lateDays: { type: Number, default: 0 },
    halfDays: { type: Number, default: 0 },
    absentDays: { type: Number, default: 0 },
    paidLeaveDays: { type: Number, default: 0 },
    unpaidLeaveDays: { type: Number, default: 0 },
    missingCheckoutDays: { type: Number, default: 0 },
    absenceDeduction: { type: Number, default: 0 },
    halfDayDeduction: { type: Number, default: 0 },
    unpaidLeaveDeduction: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    annualGross: { type: Number, default: 0 },
    annualTax: { type: Number, default: 0 },
    monthlyTax: { type: Number, default: 0 },
    net: { type: Number, default: 0 }
  },
  { _id: false }
);

const payrollSchema = new mongoose.Schema(
  {
    period: { type: String, required: true, unique: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ },
    status: { type: String, enum: ['draft', 'finalized'], default: 'draft', index: true },
    currency: { type: String, default: 'PKR' },
    workingDays: { type: Number, default: 0 },
    cutoffDate: { type: String, default: null },
    entries: { type: [payrollEntrySchema], default: [] },
    totals: {
      employees: { type: Number, default: 0 },
      gross: { type: Number, default: 0 },
      deductions: { type: Number, default: 0 },
      tax: { type: Number, default: 0 },
      net: { type: Number, default: 0 }
    },
    notes: { type: String, default: '', maxlength: 500 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    finalizedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    finalizedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

export const Payroll = mongoose.model('Payroll', payrollSchema);
export default Payroll;

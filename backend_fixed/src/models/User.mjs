import mongoose from 'mongoose';

export const ROLES = ['admin', 'hr', 'employee'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true, index: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    isActive: { type: Boolean, default: true },
    mustChangePassword: { type: Boolean, default: false },
    lastLoginAt: { type: Date, default: null },
    passwordChangedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    role: this.role,
    employee: this.employee ? this.employee.toString() : null,
    isActive: this.isActive,
    mustChangePassword: this.mustChangePassword,
    lastLoginAt: this.lastLoginAt
  };
};

userSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  }
});

export const User = mongoose.model('User', userSchema);
export default User;

import mongoose, { Schema, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IAdmin extends Document {
  name: string;
  email: string;
  password?: string;
  role: 'SUPER_ADMIN' | 'ADMIN';
  roleId?: Types.ObjectId;
  isActive: boolean;
  permissions: string[];
  resetPasswordToken?: string;
  resetPasswordExpire?: Date;
  matchPassword(enteredPassword: string): Promise<boolean>;
}

const adminSchema = new Schema<IAdmin>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address'],
    },
    password: { type: String, required: true },
    role: { type: String, enum: ['SUPER_ADMIN', 'ADMIN'], default: 'ADMIN' },
    roleId: { type: Schema.Types.ObjectId, ref: 'Role' },
    isActive: { type: Boolean, default: true },
    permissions: {
      type: [String],
      default: [],
    },
    resetPasswordToken: { type: String },
    resetPasswordExpire: { type: Date },
  },
  { timestamps: true }
);

// Async pre-save hook (No next() parameter needed in modern Mongoose)
adminSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

adminSchema.methods.matchPassword = async function (enteredPassword: string): Promise<boolean> {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model<IAdmin>('Admin', adminSchema);
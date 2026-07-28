import mongoose, { Schema, Document } from 'mongoose';

export const SYSTEM_PERMISSIONS = [
  // Attendance
  'CHECK_IN',
  'CHECK_OUT',
  'APPROVE_ATTENDANCE',
  'REJECT_ATTENDANCE',
  'VIEW_PENDING_ATTENDANCE',
  'VIEW_MY_ATTENDANCE',
  'VIEW_ALL_ATTENDANCE',
  // Settings
  'VIEW_SETTINGS',
  'MANAGE_SETTINGS',
  // Holidays
  'VIEW_HOLIDAYS',
  'MANAGE_HOLIDAYS',
  // Leaves
  'APPLY_LEAVE',
  'VIEW_MY_LEAVES',
  'VIEW_ALL_LEAVES',
  'APPROVE_LEAVE',
  'REJECT_LEAVE',
  'VIEW_LEAVE_BALANCE',
  // Employee Management
  'MANAGE_EMPLOYEES',
  'VIEW_EMPLOYEES',
  // Admin Management
  'MANAGE_ADMINS',
  // Reports
  'VIEW_REPORTS',
  'EXPORT_REPORTS',
  // Roles Management
  'MANAGE_ROLES'
];

export interface IRole extends Document {
  name: string; // e.g. 'SUPER_ADMIN', 'HR_MANAGER', 'EMPLOYEE_DEFAULT'
  permissions: string[];
  description?: string;
}

const roleSchema = new Schema<IRole>(
  {
    name: { type: String, required: true, unique: true, uppercase: true, trim: true },
    permissions: {
      type: [String],
      enum: SYSTEM_PERMISSIONS,
      default: [],
    },
    description: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IRole>('Role', roleSchema);

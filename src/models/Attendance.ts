import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAttendance extends Document {
  employeeId: Types.ObjectId;
  date: Date;
  dateStr: string; // YYYY-MM-DD format
  checkInTime: Date;
  checkOutTime?: Date;
  checkInGps?: {
    latitude: number;
    longitude: number;
  };
  checkOutGps?: {
    latitude: number;
    longitude: number;
  };
  isLateArrival: boolean;
  isEarlyCheckout: boolean;
  isHolidayWork: boolean;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NOT_REQUIRED';
  remarks?: string;
  approvedBy?: Types.ObjectId;
}

const attendanceSchema = new Schema<IAttendance>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: Date, required: true },
    dateStr: { type: String, required: true },
    checkInTime: { type: Date, required: true },
    checkOutTime: { type: Date },
    checkInGps: {
      latitude: { type: Number },
      longitude: { type: Number },
    },
    checkOutGps: {
      latitude: { type: Number },
      longitude: { type: Number },
    },
    isLateArrival: { type: Boolean, default: false },
    isEarlyCheckout: { type: Boolean, default: false },
    isHolidayWork: { type: Boolean, default: false },
    approvalStatus: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'NOT_REQUIRED'],
      default: 'NOT_REQUIRED',
    },
    remarks: { type: String },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true }
);

// Compound index to guarantee one attendance record per employee per day
attendanceSchema.index({ employeeId: 1, dateStr: 1 }, { unique: true });

export default mongoose.model<IAttendance>('Attendance', attendanceSchema);

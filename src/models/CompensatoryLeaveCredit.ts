import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICompensatoryLeaveCredit extends Document {
  employeeId: Types.ObjectId;
  attendanceId: Types.ObjectId;
  leaveId?: Types.ObjectId;
  status: 'AVAILABLE' | 'USED';
  earnedDate: Date;
}

const compensatoryLeaveCreditSchema = new Schema<ICompensatoryLeaveCredit>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    attendanceId: { type: Schema.Types.ObjectId, ref: 'Attendance', required: true },
    leaveId: { type: Schema.Types.ObjectId, ref: 'Leave' },
    status: {
      type: String,
      enum: ['AVAILABLE', 'USED'],
      default: 'AVAILABLE',
    },
    earnedDate: { type: Date, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<ICompensatoryLeaveCredit>(
  'CompensatoryLeaveCredit',
  compensatoryLeaveCreditSchema
);

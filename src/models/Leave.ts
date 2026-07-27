import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ILeave extends Document {
  employeeId: Types.ObjectId;
  type: 'CASUAL' | 'SICK' | 'COMPENSATORY' | 'OTHER';
  fromDate: Date;
  toDate: Date;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  remarks?: string;
  approvedBy?: Types.ObjectId;
}

const leaveSchema = new Schema<ILeave>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    type: {
      type: String,
      enum: ['CASUAL', 'SICK', 'COMPENSATORY', 'OTHER'],
      required: true,
    },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },
    remarks: { type: String },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true }
);

leaveSchema.index({ employeeId: 1, fromDate: 1, toDate: 1 });

export default mongoose.model<ILeave>('Leave', leaveSchema);

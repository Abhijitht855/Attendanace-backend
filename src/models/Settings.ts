import mongoose, { Schema, Document } from 'mongoose';

export interface ISettings extends Document {
  officeStartTime: string; // HH:MM format
  officeEndTime: string;   // HH:MM format
  gracePeriod: number;     // in minutes
}

const settingsSchema = new Schema<ISettings>(
  {
    officeStartTime: { type: String, required: true, default: '09:00' },
    officeEndTime: { type: String, required: true, default: '18:00' },
    gracePeriod: { type: Number, required: true, default: 15 },
  },
  { timestamps: true }
);

export default mongoose.model<ISettings>('Settings', settingsSchema);

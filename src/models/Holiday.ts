import mongoose, { Schema, Document } from 'mongoose';

export interface IHoliday extends Document {
  date: Date;
  dateStr: string; // YYYY-MM-DD format
  name: string;
}

const holidaySchema = new Schema<IHoliday>(
  {
    date: { type: Date, required: true },
    dateStr: { type: String, required: true, unique: true },
    name: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IHoliday>('Holiday', holidaySchema);

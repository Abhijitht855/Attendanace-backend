import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IEmployee extends Document {
    name: string;
    email: string;
    password?: string;
    department: string;
    isApproved: boolean;
    isActive: boolean;
    resetPasswordToken?: string;
    resetPasswordExpire?: Date;
    matchPassword(enteredPassword: string): Promise<boolean>;
}

const employeeSchema = new Schema<IEmployee>(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        department: { type: String, required: true },
        isApproved: { type: Boolean, default: false },
        isActive: { type: Boolean, default: true },
        resetPasswordToken: { type: String },
        resetPasswordExpire: { type: Date },
    },
    { timestamps: true }
);

// Async pre-save hook (No next() parameter needed in modern Mongoose)
employeeSchema.pre('save', async function () {
    if (!this.isModified('password') || !this.password) return;

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

employeeSchema.methods.matchPassword = async function (enteredPassword: string): Promise<boolean> {
    if (!this.password) return false;
    return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model<IEmployee>('Employee', employeeSchema);
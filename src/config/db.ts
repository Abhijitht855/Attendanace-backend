import mongoose from 'mongoose';
import Role, { SYSTEM_PERMISSIONS } from '../models/Role';

const bootstrapRoles = async () => {
  try {
    // 1. SUPER_ADMIN
    const superAdminExists = await Role.findOne({ name: 'SUPER_ADMIN' });
    if (!superAdminExists) {
      await Role.create({
        name: 'SUPER_ADMIN',
        permissions: SYSTEM_PERMISSIONS,
        description: 'Super Administrator Role with full system access',
      });
      console.log('✔ Default SUPER_ADMIN role bootstrapped');
    }

    // 2. ADMIN_DEFAULT
    const adminDefaultExists = await Role.findOne({ name: 'ADMIN_DEFAULT' });
    if (!adminDefaultExists) {
      const adminPerms = [
        'MANAGE_EMPLOYEES',
        'VIEW_EMPLOYEES',
        'APPROVE_ATTENDANCE',
        'REJECT_ATTENDANCE',
        'VIEW_PENDING_ATTENDANCE',
        'VIEW_ALL_ATTENDANCE',
        'VIEW_SETTINGS',
        'MANAGE_SETTINGS',
        'VIEW_HOLIDAYS',
        'MANAGE_HOLIDAYS',
        'VIEW_ALL_LEAVES',
        'APPROVE_LEAVE',
        'REJECT_LEAVE',
        'VIEW_LEAVE_BALANCE',
        'VIEW_REPORTS',
        'EXPORT_REPORTS'
      ];
      await Role.create({
        name: 'ADMIN_DEFAULT',
        permissions: adminPerms,
        description: 'Default Admin Role for managing staff, leaves, and configurations',
      });
      console.log('✔ Default ADMIN_DEFAULT role bootstrapped');
    }

    // 3. EMPLOYEE_DEFAULT
    const employeeDefaultExists = await Role.findOne({ name: 'EMPLOYEE_DEFAULT' });
    if (!employeeDefaultExists) {
      const employeePerms = [
        'CHECK_IN',
        'CHECK_OUT',
        'VIEW_MY_ATTENDANCE',
        'VIEW_SETTINGS',
        'VIEW_HOLIDAYS',
        'APPLY_LEAVE',
        'VIEW_MY_LEAVES',
        'VIEW_LEAVE_BALANCE'
      ];
      await Role.create({
        name: 'EMPLOYEE_DEFAULT',
        permissions: employeePerms,
        description: 'Default Employee Role for daily check-in, leaves, and history',
      });
      console.log('✔ Default EMPLOYEE_DEFAULT role bootstrapped');
    }
  } catch (err) {
    console.error('Failed to bootstrap roles:', (err as Error).message);
  }
};

export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI as string);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Bootstrap standard Roles
    await bootstrapRoles();
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }
};
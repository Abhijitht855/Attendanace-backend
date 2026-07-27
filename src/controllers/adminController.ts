import { Request, Response } from 'express';
import Admin from '../models/Admin';

// Email validation helper using regex
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// @desc    Setup First Super Admin using Secret Passkey
// @route   POST /api/admin/setup-super-admin
export const setupSuperAdmin = async (req: Request, res: Response) => {
  const { name, email, password, passkey } = req.body;

  // 1. Basic empty field validations
  if (!name || !email || !password || !passkey) {
    return res.status(400).json({ message: 'All fields (name, email, password, passkey) are required' });
  }

  // 2. Email format validation
  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'Please provide a valid email address' });
  }

  // 3. Password length check
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long' });
  }

  // 4. Secret Passkey verification
  if (passkey !== process.env.SUPER_ADMIN_PASSKEY) {
    return res.status(401).json({ message: 'Invalid Super Admin Passkey' });
  }

  // 5. Check if ANY Super Admin already exists in DB
  const existingSuperAdmin = await Admin.findOne({ role: 'SUPER_ADMIN' });
  if (existingSuperAdmin) {
    return res.status(400).json({
      message: 'Super Admin already exists. Only one Super Admin setup is allowed.',
    });
  }

  // 6. Check email uniqueness (case-insensitive check)
  const formattedEmail = email.toLowerCase().trim();
  const existingEmail = await Admin.findOne({ email: formattedEmail });
  if (existingEmail) {
    return res.status(400).json({ message: 'Email already in use' });
  }

  // Create Super Admin
  const admin = await Admin.create({
    name: name.trim(),
    email: formattedEmail,
    password,
    role: 'SUPER_ADMIN',
    isActive: true,
  });

  res.status(201).json({
    message: 'Super Admin configured successfully',
    _id: admin._id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
  });
};

// @desc    Direct Create Admin
// @route   POST /api/admin/create
export const createAdmin = async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body;

  // 1. Empty field checks
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
  }

  // 2. Email format check
  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'Please provide a valid email address' });
  }

  // 3. Password length check
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long' });
  }

  // Prevent creating another SUPER_ADMIN through general endpoint
  if (role === 'SUPER_ADMIN') {
    return res.status(403).json({
      message: 'Cannot create another Super Admin account.',
    });
  }

  const formattedEmail = email.toLowerCase().trim();
  const existingAdmin = await Admin.findOne({ email: formattedEmail });
  if (existingAdmin) {
    return res.status(400).json({ message: 'Admin with this email already exists' });
  }

  const admin = await Admin.create({
    name: name.trim(),
    email: formattedEmail,
    password,
    role: role || 'ADMIN',
  });

  res.status(201).json({
    _id: admin._id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
  });
};

// @desc    Get all admins
// @route   GET /api/admin/list
export const getAdmins = async (_req: Request, res: Response) => {
  const admins = await Admin.find().select('-password');
  res.json(admins);
};

// @desc    Update Admin Status (ACTIVE / DEACTIVE)
// @route   PATCH /api/admin/:id/status
export const updateAdminStatus = async (req: Request, res: Response) => {
  const { status } = req.body;

  // 1. Validate input status format
  const normalizedStatus = status?.toString().toUpperCase();
  if (!['ACTIVE', 'DEACTIVE', 'INACTIVE'].includes(normalizedStatus)) {
    return res.status(400).json({ 
      message: 'Invalid status. Expected ACTIVE or DEACTIVE' 
    });
  }

  // 2. Find admin by ID
  const admin = await Admin.findById(req.params.id);
  if (!admin) return res.status(404).json({ message: 'Admin not found' });

  // 3. Prevent deactivating Super Admin
  if (admin.role === 'SUPER_ADMIN' && normalizedStatus !== 'ACTIVE') {
    return res.status(400).json({ message: 'Cannot deactivate Super Admin' });
  }

  const targetIsActive = normalizedStatus === 'ACTIVE';

  // 4. Check if current status is already the same as requested status
  if (admin.isActive === targetIsActive) {
    return res.status(400).json({ 
      message: `Admin is already ${admin.isActive ? 'active' : 'inactive'}` 
    });
  }

  // 5. Update and save new status
  admin.isActive = targetIsActive;
  await admin.save();

  res.json({
    message: `Admin status updated to ${normalizedStatus}`,
    _id: admin._id,
    isActive: admin.isActive
  });
};
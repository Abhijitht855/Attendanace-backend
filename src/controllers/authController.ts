import { Request, Response } from 'express';
import crypto from 'crypto';
import Admin from '../models/Admin';
import Employee from '../models/Employee';
import { generateToken } from '../utils/generateToken';
import { sendResetEmail } from '../services/emailService';

// Email validation helper using regex
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// @desc    Universal Login (Admin & Employee)
// @route   POST /api/auth/login
export const loginUser = async (req: Request, res: Response) => {
  // Support both 'email' (from JSON frontend) and 'username' (from Swagger OAuth2 form)
  const rawEmail = req.body.email || req.body.username;
  const { password } = req.body;

  // 1. Basic Validation
  if (!rawEmail || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const email = rawEmail.toLowerCase().trim();

  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address' });
  }

  // 2. Check Admin Collection first
  const admin = await Admin.findOne({ email });
  if (admin && (await admin.matchPassword(password))) {
    if (!admin.isActive) {
      return res.status(403).json({ message: 'Admin account is deactivated' });
    }

    return res.json({
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      access_token: generateToken(admin._id.toString(), admin.role),
      token_type: 'Bearer',
    });
  }

  // 3. Check Employee Collection
  const employee = await Employee.findOne({ email });
  if (employee && (await employee.matchPassword(password))) {
    if (!employee.isApproved) {
      return res.status(403).json({ message: 'Your account is pending approval by Admin' });
    }
    if (!employee.isActive) {
      return res.status(403).json({ message: 'Your account is deactivated' });
    }

    return res.json({
      _id: employee._id,
      name: employee.name,
      email: employee.email,
      role: 'EMPLOYEE',
      access_token: generateToken(employee._id.toString(), 'EMPLOYEE'),
      token_type: 'Bearer',
    });
  }

  // 4. Invalid Credentials Fallback
  return res.status(401).json({ message: 'Invalid email or password' });
};

// @desc    Get Logged-in User Profile
// @route   GET /api/auth/profile
export const getUserProfile = async (req: Request, res: Response) => {
  const user = req.user;

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: (user as any).role || 'EMPLOYEE',
    ...((user as any).department && { department: (user as any).department }),
    ...((user as any).isActive !== undefined && { isActive: (user as any).isActive }),
  });
};

// @desc    Change Password (Authenticated)
// @route   POST /api/auth/change-password
export const changePassword = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (!user) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Forgot Password Request
// @route   POST /api/auth/forgot-password
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const formattedEmail = email.toLowerCase().trim();
    if (!isValidEmail(formattedEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    // 1. Search in Admin collection
    let user: any = await Admin.findOne({ email: formattedEmail });

    // 2. Search in Employee collection if not found in Admin
    if (!user) {
      user = await Employee.findOne({ email: formattedEmail });
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found with this email' });
    }

    // 3. Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = new Date(Date.now() + 3600000); // 1 hour validity

    await user.save();

    // 4. Send email
    const resetUrl = `${req.protocol}://${req.get('host')}/api/auth/reset-password/${resetToken}`;
    const mailSent = await sendResetEmail(user.email, resetUrl);

    const isProduction = process.env.NODE_ENV === 'production';

    res.json({
      message: mailSent 
        ? 'Password reset email sent successfully.' 
        : 'Password reset request processed. Check your email for the reset link.',
      // Only expose token in development mode for local testing convenience
      ...(!isProduction && { resetToken, resetUrl }),
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Reset Password using token
// @route   POST /api/auth/reset-password/:token
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'New password is required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Find user with matching token and valid expiry date
    let user: any = await Admin.findOne({
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: new Date() },
    });

    if (!user) {
      user = await Employee.findOne({
        resetPasswordToken: token,
        resetPasswordExpire: { $gt: new Date() },
      });
    }

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired password reset token' });
    }

    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.json({ message: 'Password reset successful. You can now login with your new password.' });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
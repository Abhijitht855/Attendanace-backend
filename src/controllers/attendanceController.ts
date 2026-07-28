import { Request, Response } from 'express';
import Attendance from '../models/Attendance';
import Settings from '../models/Settings';
import Holiday from '../models/Holiday';
import CompensatoryLeaveCredit from '../models/CompensatoryLeaveCredit';
import { getISTDateTime, timeToMinutes, parseUTCDate } from '../utils/timeZone';

// @desc    Employee Check-In
// @route   POST /api/attendance/check-in
export const checkIn = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;

    // Enforce employee only (Admins cannot check in/out)
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Admins cannot perform check-in/out operations' });
    }

    // Block unapproved employees from checking in
    if (user.isApproved === false) {
      return res.status(403).json({ message: 'Your account is pending approval. Contact admin.' });
    }

    const now = new Date();
    const { dateStr, timeStr } = getISTDateTime(now);

    // Check for duplicate check-in today
    const existingAttendance = await Attendance.findOne({
      employeeId: user._id,
      dateStr,
    });

    if (existingAttendance) {
      return res.status(400).json({ message: 'You have already checked in for today' });
    }

    // Check if today is a company holiday
    const holiday = await Holiday.findOne({ dateStr });
    const isHolidayWork = !!holiday;

    // Load office settings for late arrival calculation
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({
        officeStartTime: '09:00',
        officeEndTime: '18:00',
        gracePeriod: 15,
      });
    }

    // Calculate Late Arrival
    const checkInMin = timeToMinutes(timeStr);
    const officeStartMin = timeToMinutes(settings.officeStartTime);
    const isLateArrival = checkInMin > officeStartMin + settings.gracePeriod;

    // approvalStatus determines if admin needs to review
    const approvalStatus = isLateArrival ? 'PENDING' : 'NOT_REQUIRED';

    const { latitude, longitude } = req.body;
    const gpsCoords =
      latitude !== undefined && longitude !== undefined
        ? { latitude: Number(latitude), longitude: Number(longitude) }
        : undefined;

    // Create the attendance record
    const attendance = await Attendance.create({
      employeeId: user._id,
      date: parseUTCDate(dateStr),
      dateStr,
      checkInTime: now,
      checkInGps: gpsCoords,
      isLateArrival,
      isEarlyCheckout: false,
      isHolidayWork,
      approvalStatus,
    });

    // Generate compensatory leave credit if working on a holiday
    if (isHolidayWork) {
      await CompensatoryLeaveCredit.create({
        employeeId: user._id,
        attendanceId: attendance._id,
        status: 'AVAILABLE',
        earnedDate: now,
      });
    }

    res.status(201).json({
      message: 'Check-in registered successfully' + (isHolidayWork ? ' (Holiday Work detected, comp-off credited)' : ''),
      attendance,
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Employee Check-Out
// @route   POST /api/attendance/check-out
export const checkOut = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;

    // Enforce employee only
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Admins cannot perform check-in/out operations' });
    }

    const now = new Date();
    const { dateStr, timeStr } = getISTDateTime(now);

    // Find active check-in record for today
    const attendance = await Attendance.findOne({
      employeeId: user._id,
      dateStr,
    });

    if (!attendance) {
      return res.status(400).json({ message: 'No check-in record found for today. Please check-in first.' });
    }

    if (attendance.checkOutTime) {
      return res.status(400).json({ message: 'You have already checked out for today' });
    }

    // Load office settings for early check-out calculation
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({
        officeStartTime: '09:00',
        officeEndTime: '18:00',
        gracePeriod: 15,
      });
    }

    // Calculate Early Check-Out
    const checkOutMin = timeToMinutes(timeStr);
    const officeEndMin = timeToMinutes(settings.officeEndTime);
    const isEarlyCheckout = checkOutMin < officeEndMin;

    const { latitude, longitude } = req.body;
    const gpsCoords =
      latitude !== undefined && longitude !== undefined
        ? { latitude: Number(latitude), longitude: Number(longitude) }
        : undefined;

    // Update attendance record
    attendance.checkOutTime = now;
    attendance.checkOutGps = gpsCoords;
    attendance.isEarlyCheckout = isEarlyCheckout;

    // If early checkout is detected, force approval status to PENDING
    if (isEarlyCheckout) {
      attendance.approvalStatus = 'PENDING';
    }

    await attendance.save();

    res.json({
      message: 'Check-out registered successfully',
      attendance,
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Get pending late-arrival/early-checkout approvals
// @route   GET /api/attendance/pending-approvals
export const getPendingApprovals = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (!user.role) {
      return res.status(403).json({ message: 'Forbidden. Admin access required.' });
    }

    const pending = await Attendance.find({ approvalStatus: 'PENDING' })
      .populate('employeeId', 'name email department')
      .sort({ createdAt: -1 });

    res.json(pending);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Admin Approve attendance exception (Late/Early checkout)
// @route   PATCH /api/attendance/:id/approve
export const approveAttendance = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (!user.role) {
      return res.status(403).json({ message: 'Forbidden. Admin access required.' });
    }

    const { remarks } = req.body;
    const attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    if (attendance.approvalStatus !== 'PENDING') {
      return res.status(400).json({ message: `Attendance exception is already ${attendance.approvalStatus}` });
    }

    attendance.approvalStatus = 'APPROVED';
    attendance.remarks = remarks || '';
    attendance.approvedBy = user._id;

    await attendance.save();

    res.json({
      message: 'Attendance exception approved successfully',
      attendance,
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Admin Reject attendance exception (Late/Early checkout)
// @route   PATCH /api/attendance/:id/reject
export const rejectAttendance = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (!user.role) {
      return res.status(403).json({ message: 'Forbidden. Admin access required.' });
    }

    const { remarks } = req.body;

    if (!remarks || !remarks.trim()) {
      return res.status(400).json({ message: 'Remarks are required for rejection' });
    }

    const attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    if (attendance.approvalStatus !== 'PENDING') {
      return res.status(400).json({ message: `Attendance exception is already ${attendance.approvalStatus}` });
    }

    attendance.approvalStatus = 'REJECTED';
    attendance.remarks = remarks.trim();
    attendance.approvedBy = user._id;

    await attendance.save();

    res.json({
      message: 'Attendance exception rejected successfully',
      attendance,
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

import { Request, Response } from 'express';
import Leave from '../models/Leave';
import CompensatoryLeaveCredit from '../models/CompensatoryLeaveCredit';
import Employee from '../models/Employee';
import { parseUTCDate } from '../utils/timeZone';

// Helper to calculate days between two dates inclusive
const calculateDurationInDays = (start: Date, end: Date): number => {
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

// @desc    Apply for leave
// @route   POST /api/leaves/apply
export const applyLeave = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (user.role) {
      return res.status(403).json({ message: 'Admins cannot apply for leaves' });
    }

    const { type, fromDate, toDate, reason } = req.body;

    if (!type || !fromDate || !toDate || !reason) {
      return res.status(400).json({ message: 'All fields (type, fromDate, toDate, reason) are required' });
    }

    if (!['CASUAL', 'SICK', 'COMPENSATORY', 'OTHER'].includes(type)) {
      return res.status(400).json({ message: 'Invalid leave type. Expected CASUAL, SICK, COMPENSATORY, or OTHER' });
    }

    const start = parseUTCDate(fromDate);
    const end = parseUTCDate(toDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Invalid date formats for fromDate or toDate' });
    }

    if (start > end) {
      return res.status(400).json({ message: 'fromDate cannot be after toDate' });
    }

    // Check for leave date overlap (Pending or Approved)
    const overlappingLeave = await Leave.findOne({
      employeeId: user._id,
      status: { $in: ['PENDING', 'APPROVED'] },
      fromDate: { $lte: end },
      toDate: { $gte: start },
    });

    if (overlappingLeave) {
      return res.status(400).json({
        message: 'Leave application overlaps with an existing pending or approved leave request',
      });
    }

    const duration = calculateDurationInDays(start, end);

    // If compensatory leave, verify sufficient balance exists
    if (type === 'COMPENSATORY') {
      const availableCredits = await CompensatoryLeaveCredit.countDocuments({
        employeeId: user._id,
        status: 'AVAILABLE',
      });

      if (availableCredits < duration) {
        return res.status(400).json({
          message: `Insufficient compensatory leave balance. Requested ${duration} days, but only ${availableCredits} credits are available.`,
        });
      }
    }

    const leave = await Leave.create({
      employeeId: user._id,
      type,
      fromDate: start,
      toDate: end,
      reason: reason.trim(),
      status: 'PENDING',
    });

    res.status(201).json({
      message: 'Leave application submitted successfully',
      leave,
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    List leave applications (Admin gets all, Employee gets own)
// @route   GET /api/leaves
export const getLeaves = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    let query: Record<string, any> = {};

    if (user.role) {
      // Admin filter options
      const { employeeId, status, type } = req.query;
      if (employeeId) query.employeeId = employeeId;
      if (status) query.status = status;
      if (type) query.type = type;
    } else {
      // Employee gets own leaves only
      query.employeeId = user._id;
    }

    const leaves = await Leave.find(query)
      .populate('employeeId', 'name email department')
      .sort({ createdAt: -1 });

    res.json(leaves);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Admin Approve leave request
// @route   PATCH /api/leaves/:id/approve
export const approveLeave = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (!user.role) {
      return res.status(403).json({ message: 'Forbidden. Admin access required.' });
    }

    const { remarks } = req.body;
    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.status(404).json({ message: 'Leave application not found' });
    }

    if (leave.status !== 'PENDING') {
      return res.status(400).json({ message: `Leave application is already ${leave.status}` });
    }

    // For COMPENSATORY off, consume the credit elements
    if (leave.type === 'COMPENSATORY') {
      const duration = calculateDurationInDays(leave.fromDate, leave.toDate);
      const availableCredits = await CompensatoryLeaveCredit.find({
        employeeId: leave.employeeId,
        status: 'AVAILABLE',
      }).sort({ earnedDate: 1 });

      if (availableCredits.length < duration) {
        return res.status(400).json({
          message: `Employee has insufficient compensatory leave credits. Requires ${duration}, has ${availableCredits.length}.`,
        });
      }

      // Mark credits as USED and link them to this leave application
      for (let i = 0; i < duration; i++) {
        availableCredits[i].status = 'USED';
        availableCredits[i].leaveId = leave._id as any;
        await availableCredits[i].save();
      }
    }

    leave.status = 'APPROVED';
    leave.remarks = remarks || '';
    leave.approvedBy = user._id;

    await leave.save();

    res.json({
      message: 'Leave application approved successfully',
      leave,
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Admin Reject leave request
// @route   PATCH /api/leaves/:id/reject
export const rejectLeave = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (!user.role) {
      return res.status(403).json({ message: 'Forbidden. Admin access required.' });
    }

    const { remarks } = req.body;
    if (!remarks || !remarks.trim()) {
      return res.status(400).json({ message: 'Remarks are required for rejecting a leave request' });
    }

    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.status(404).json({ message: 'Leave application not found' });
    }

    if (leave.status !== 'PENDING') {
      return res.status(400).json({ message: `Leave application is already ${leave.status}` });
    }

    leave.status = 'REJECTED';
    leave.remarks = remarks.trim();
    leave.approvedBy = user._id;

    await leave.save();

    res.json({
      message: 'Leave application rejected successfully',
      leave,
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Get leave balance of an employee (including comp-off credits)
// @route   GET /api/leaves/balance/:employeeId
export const getLeaveBalance = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { employeeId } = req.params;

    // Enforce authorization
    if (!user.role && user._id.toString() !== employeeId) {
      return res.status(403).json({ message: 'Forbidden. You can only view your own leave balance' });
    }

    // Verify employee exists
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Calculate leaves taken in current calendar year
    const currentYear = new Date().getFullYear();
    const yearStart = parseUTCDate(`${currentYear}-01-01`);
    const yearEnd = parseUTCDate(`${currentYear}-12-31`);

    const approvedLeaves = await Leave.find({
      employeeId,
      status: 'APPROVED',
      fromDate: { $lte: yearEnd },
      toDate: { $gte: yearStart },
    });

    let casualTaken = 0;
    let sickTaken = 0;
    let otherTaken = 0;
    let compensatoryTaken = 0;

    approvedLeaves.forEach((leave) => {
      // Calculate overlap days with the current calendar year
      const start = leave.fromDate < yearStart ? yearStart : leave.fromDate;
      const end = leave.toDate > yearEnd ? yearEnd : leave.toDate;
      const days = calculateDurationInDays(start, end);

      if (leave.type === 'CASUAL') casualTaken += days;
      else if (leave.type === 'SICK') sickTaken += days;
      else if (leave.type === 'OTHER') otherTaken += days;
      else if (leave.type === 'COMPENSATORY') compensatoryTaken += days;
    });

    // Fetch compensatory off credits details
    const totalCompCredits = await CompensatoryLeaveCredit.countDocuments({ employeeId });
    const availableCompCredits = await CompensatoryLeaveCredit.countDocuments({ employeeId, status: 'AVAILABLE' });
    const usedCompCredits = await CompensatoryLeaveCredit.countDocuments({ employeeId, status: 'USED' });

    res.json({
      employee: {
        _id: employee._id,
        name: employee.name,
        email: employee.email,
        department: employee.department,
      },
      balances: {
        CASUAL: {
          allowed: 12,
          taken: casualTaken,
          remaining: Math.max(0, 12 - casualTaken),
        },
        SICK: {
          allowed: 12,
          taken: sickTaken,
          remaining: Math.max(0, 12 - sickTaken),
        },
        COMPENSATORY: {
          earned: totalCompCredits,
          used: usedCompCredits,
          remaining: availableCompCredits,
        },
        OTHER: {
          taken: otherTaken,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

import { Types } from 'mongoose';
import Attendance from '../models/Attendance';
import Leave from '../models/Leave';
import Holiday from '../models/Holiday';
import Employee, { IEmployee } from '../models/Employee';
import { parseUTCDate } from '../utils/timeZone';

export interface ReportItem {
  employee: {
    _id: string;
    name: string;
    email: string;
    department: string;
  };
  totalWorkingDays: number;
  present: number;
  absent: number;
  lateArrivals: number;
  earlyCheckouts: number;
  leavesTaken: number;
  holidayWorkDays: number;
}

/**
 * Returns a list of date strings (YYYY-MM-DD) between two Date objects (inclusive).
 */
const getDatesInRange = (startDate: Date, endDate: Date): string[] => {
  const dates: string[] = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    dates.push(current.toISOString().split('T')[0]);
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
};

/**
 * Aggregates attendance statistics for employees in a given date range.
 */
export const generateReportData = async (
  startDateStr: string,
  endDateStr: string,
  employeeId?: string
): Promise<ReportItem[]> => {
  const startDate = parseUTCDate(startDateStr);
  const endDate = parseUTCDate(endDateStr);

  // 1. Fetch holidays in range
  const holidays = await Holiday.find({
    date: { $gte: startDate, $lte: endDate },
  });
  const holidayDateStrs = holidays.map((h) => h.dateStr);

  // 2. Generate all calendar days in range
  const allDays = getDatesInRange(startDate, endDate);

  // 3. Determine official working days (excluding Saturday (6), Sunday (0), and Holidays)
  const workingDays = allDays.filter((dStr) => {
    const d = parseUTCDate(dStr);
    const dayOfWeek = d.getUTCDay();
    return dayOfWeek !== 0 && dayOfWeek !== 6 && !holidayDateStrs.includes(dStr);
  });

  // 4. Fetch Employees
  let employees: IEmployee[] = [];
  if (employeeId) {
    const emp = await Employee.findById(employeeId);
    if (emp) employees.push(emp);
  } else {
    employees = await Employee.find({ isApproved: true, isActive: true });
  }

  const reports: ReportItem[] = [];

  for (const emp of employees) {
    const empId = (emp._id as any).toString();

    // Fetch Attendance records in range
    const attendanceRecords = await Attendance.find({
      employeeId: empId,
      date: { $gte: startDate, $lte: endDate },
    });

    // Fetch Approved leaves in range
    const approvedLeaves = await Leave.find({
      employeeId: empId,
      status: 'APPROVED',
      fromDate: { $lte: endDate },
      toDate: { $gte: startDate },
    });

    // Extract set of leave dates falling in this range and are working days
    const leaveDateSet = new Set<string>();
    for (const leave of approvedLeaves) {
      const leaveDays = getDatesInRange(leave.fromDate, leave.toDate);
      for (const day of leaveDays) {
        if (day >= startDateStr && day <= endDateStr && workingDays.includes(day)) {
          leaveDateSet.add(day);
        }
      }
    }

    // Map attendance records by dateStr
    const attendanceMap = new Map<string, typeof attendanceRecords[0]>();
    attendanceRecords.forEach((rec) => {
      attendanceMap.set(rec.dateStr, rec);
    });

    let present = 0;
    let lateArrivals = 0;
    let earlyCheckouts = 0;
    let holidayWorkDays = 0;
    let absent = 0;

    // We count present days for any check-in in the period (working day or weekend/holiday)
    attendanceRecords.forEach((rec) => {
      present++;
      if (rec.isHolidayWork) {
        holidayWorkDays++;
      }
      // Check for unapproved or pending late/early arrivals (not regularized yet)
      // Requirement: "Both cases must require Admin Approval before being marked as regularized/valid attendance"
      // So late/early flags apply unless approved.
      if (rec.isLateArrival && rec.approvalStatus !== 'APPROVED') {
        lateArrivals++;
      }
      if (rec.isEarlyCheckout && rec.approvalStatus !== 'APPROVED') {
        earlyCheckouts++;
      }
    });

    // Absent logic: for each official working day, if there is no check-in and no approved leave
    workingDays.forEach((dStr) => {
      if (!attendanceMap.has(dStr) && !leaveDateSet.has(dStr)) {
        absent++;
      }
    });

    reports.push({
      employee: {
        _id: empId.toString(),
        name: emp.name,
        email: emp.email,
        department: emp.department,
      },
      totalWorkingDays: workingDays.length,
      present,
      absent,
      lateArrivals,
      earlyCheckouts,
      leavesTaken: leaveDateSet.size,
      holidayWorkDays,
    });
  }

  return reports;
};

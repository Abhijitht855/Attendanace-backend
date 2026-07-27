import { Router } from 'express';
import {
  checkIn,
  checkOut,
  getPendingApprovals,
  approveAttendance,
  rejectAttendance,
} from '../controllers/attendanceController';
import {
  getAttendanceHistory,
  getWeeklyReport,
  getMonthlyReport,
  exportReport,
} from '../controllers/reportController';
import { protect } from '../middleware/auth';

const router = Router();

// Protect all attendance routes
router.use(protect);

/**
 * @swagger
 * /api/attendance/check-in:
 *   post:
 *     summary: Employee Check-In (Employee Only)
 *     tags: [Attendance Management]
 *     security:
 *       - OAuth2Password: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               latitude:
 *                 type: number
 *                 example: 12.9716
 *               longitude:
 *                 type: number
 *                 example: 77.5946
 *     responses:
 *       201:
 *         description: Check-in registered successfully
 *       400:
 *         description: Duplicate check-in or invalid input
 *       403:
 *         description: Forbidden (Admin accounts cannot check in)
 */
router.post('/check-in', checkIn);

/**
 * @swagger
 * /api/attendance/check-out:
 *   post:
 *     summary: Employee Check-Out (Employee Only)
 *     tags: [Attendance Management]
 *     security:
 *       - OAuth2Password: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               latitude:
 *                 type: number
 *                 example: 12.9716
 *               longitude:
 *                 type: number
 *                 example: 77.5946
 *     responses:
 *       200:
 *         description: Check-out registered successfully
 *       400:
 *         description: No active check-in or already checked out
 *       403:
 *         description: Forbidden
 */
router.post('/check-out', checkOut);

/**
 * @swagger
 * /api/attendance/pending-approvals:
 *   get:
 *     summary: Get pending late-arrival/early-checkout exceptions (Admin Only)
 *     tags: [Attendance Management]
 *     security:
 *       - OAuth2Password: []
 *     responses:
 *       200:
 *         description: List of pending attendance records
 *       403:
 *         description: Forbidden (Admin access required)
 */
router.get('/pending-approvals', getPendingApprovals);

/**
 * @swagger
 * /api/attendance/{id}/approve:
 *   patch:
 *     summary: Admin Approve attendance exception (Admin Only)
 *     tags: [Attendance Management]
 *     security:
 *       - OAuth2Password: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Attendance record ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               remarks:
 *                 type: string
 *                 example: "Approved due to heavy rains"
 *     responses:
 *       200:
 *         description: Exception approved successfully
 *       400:
 *         description: Record not pending
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Record not found
 */
router.patch('/:id/approve', approveAttendance);

/**
 * @swagger
 * /api/attendance/{id}/reject:
 *   patch:
 *     summary: Admin Reject attendance exception (Admin Only)
 *     tags: [Attendance Management]
 *     security:
 *       - OAuth2Password: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Attendance record ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [remarks]
 *             properties:
 *               remarks:
 *                 type: string
 *                 example: "No valid reason provided"
 *     responses:
 *       200:
 *         description: Exception rejected successfully
 *       400:
 *         description: Remarks missing or record not pending
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Record not found
 */
router.patch('/:id/reject', rejectAttendance);

/**
 * @swagger
 * /api/attendance/history/{employeeId}:
 *   get:
 *     summary: Get Employee Attendance History (Self or Admin)
 *     tags: [Reports]
 *     security:
 *       - OAuth2Password: []
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start Date (YYYY-MM-DD), default first day of current month
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End Date (YYYY-MM-DD), default today
 *     responses:
 *       200:
 *         description: History retrieved successfully
 *       403:
 *         description: Forbidden (Employees can only query own history)
 */
router.get('/history/:employeeId', getAttendanceHistory);

/**
 * @swagger
 * /api/attendance/weekly-report:
 *   get:
 *     summary: Weekly Attendance Summary Report (Admin gets all, Employee gets own)
 *     tags: [Reports]
 *     security:
 *       - OAuth2Password: []
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: string
 *         description: Filter by employee ID (Admin Only)
 *     responses:
 *       200:
 *         description: Weekly report data
 */
router.get('/weekly-report', getWeeklyReport);

/**
 * @swagger
 * /api/attendance/monthly-report:
 *   get:
 *     summary: Monthly Attendance Summary Report (Admin gets all, Employee gets own)
 *     tags: [Reports]
 *     security:
 *       - OAuth2Password: []
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: string
 *         description: Filter by employee ID (Admin Only)
 *     responses:
 *       200:
 *         description: Monthly report data
 */
router.get('/monthly-report', getMonthlyReport);

/**
 * @swagger
 * /api/attendance/report/export:
 *   get:
 *     summary: Export Weekly/Monthly Attendance Reports (Stream Excel/PDF)
 *     tags: [Reports]
 *     security:
 *       - OAuth2Password: []
 *     parameters:
 *       - in: query
 *         name: format
 *         required: true
 *         schema:
 *           type: string
 *           enum: [excel, pdf]
 *         description: Output format
 *       - in: query
 *         name: range
 *         required: true
 *         schema:
 *           type: string
 *           enum: [weekly, monthly]
 *         description: Report timeframe range
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: string
 *         description: Filter by specific Employee ID (Admin Only)
 *     responses:
 *       200:
 *         description: Downloadable Excel sheet or PDF document
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Missing or invalid parameters
 */
router.get('/report/export', exportReport);

export default router;

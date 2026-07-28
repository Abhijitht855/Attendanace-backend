import { Router } from 'express';
import {
  applyLeave,
  getLeaves,
  approveLeave,
  rejectLeave,
  getLeaveBalance,
  cancelLeave,
} from '../controllers/leaveController';
import { protect } from '../middleware/auth';

const router = Router();

// Protect all leave routes
router.use(protect);

/**
 * @swagger
 * /api/leaves/apply:
 *   post:
 *     summary: Apply for Leave (Employee Only)
 *     tags: [Leave Management]
 *     security:
 *       - OAuth2Password: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, fromDate, toDate, reason]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [CASUAL, SICK, COMPENSATORY, OTHER]
 *                 example: CASUAL
 *               fromDate:
 *                 type: string
 *                 format: date
 *                 example: "2026-08-01"
 *               toDate:
 *                 type: string
 *                 format: date
 *                 example: "2026-08-03"
 *               reason:
 *                 type: string
 *                 example: "Family vacation"
 *     responses:
 *       201:
 *         description: Leave application submitted successfully
 *       400:
 *         description: Date overlap, insufficient comp-off balance, or invalid parameters
 *       403:
 *         description: Forbidden
 */
router.post('/apply', applyLeave);

/**
 * @swagger
 * /api/leaves:
 *   get:
 *     summary: List Leave Applications (Admin gets all with filters, Employee gets own)
 *     tags: [Leave Management]
 *     security:
 *       - OAuth2Password: []
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: string
 *         description: Filter by employee ID (Admin Only)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED]
 *         description: Filter by approval status (Admin Only)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [CASUAL, SICK, COMPENSATORY, OTHER]
 *         description: Filter by leave type (Admin Only)
 *     responses:
 *       200:
 *         description: List of leave applications
 *       401:
 *         description: Not authorized
 */
router.get('/', getLeaves);

/**
 * @swagger
 * /api/leaves/{id}/approve:
 *   patch:
 *     summary: Admin Approve Leave application (Admin Only)
 *     tags: [Leave Management]
 *     security:
 *       - OAuth2Password: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Leave application ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               remarks:
 *                 type: string
 *                 example: "Enjoy your leave"
 *     responses:
 *       200:
 *         description: Leave approved successfully
 *       400:
 *         description: Leave already processed or insufficient credits
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Leave not found
 */
router.patch('/:id/approve', approveLeave);

/**
 * @swagger
 * /api/leaves/{id}/reject:
 *   patch:
 *     summary: Admin Reject Leave application (Admin Only)
 *     tags: [Leave Management]
 *     security:
 *       - OAuth2Password: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Leave application ID
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
 *                 example: "Business requirements prevent approval at this time"
 *     responses:
 *       200:
 *         description: Leave rejected successfully
 *       400:
 *         description: Remarks missing or leave already processed
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Leave not found
 */
router.patch('/:id/reject', rejectLeave);

/**
 * @swagger
 * /api/leaves/balance/{employeeId}:
 *   get:
 *     summary: Get Leave Balance of Employee (Self or Admin)
 *     tags: [Leave Management]
 *     security:
 *       - OAuth2Password: []
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID to query balance for
 *     responses:
 *       200:
 *         description: Leave balance retrieval successful
 *       403:
 *         description: Forbidden (Employees can only query own balance)
 *       404:
 *         description: Employee not found
 */
router.get('/balance/:employeeId', getLeaveBalance);

/**
 * @swagger
 * /api/leaves/{id}/cancel:
 *   patch:
 *     summary: Cancel a pending leave request (Employee cancels own)
 *     tags: [Leave Management]
 *     security:
 *       - OAuth2Password: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Leave application ID
 *     responses:
 *       200:
 *         description: Leave cancelled successfully
 *       400:
 *         description: Leave is already processed
 *       403:
 *         description: Not your leave or forbidden
 *       404:
 *         description: Leave not found
 */
router.patch('/:id/cancel', cancelLeave);

export default router;

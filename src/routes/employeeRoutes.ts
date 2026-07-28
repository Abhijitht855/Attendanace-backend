import { Router } from 'express';
import {
  registerEmployee,
  getEmployees,
  approveEmployee,
  rejectEmployee,
  updateEmployeeStatus,
  updateEmployee,
  updateEmployeeRole,
} from '../controllers/employeeController';
import { protect } from '../middleware/auth';

const router = Router();

// Protected Routes for Admin to manage employees
router.use(protect);

/**
 * @swagger
 * /api/employees/register:
 *   post:
 *     summary: Create Employee (Admin Only)
 *     tags: [Employee Management]
 *     security:
 *       - OAuth2Password: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, department]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               department:
 *                 type: string
 *     responses:
 *       201:
 *         description: Employee created successfully
 *       403:
 *         description: Forbidden (Admin access required)
 */
router.post('/register', registerEmployee);

/**
 * @swagger
 * /api/employees:
 *   get:
 *     summary: Get employees list with optional status filter
 *     tags: [Employee Management]
 *     security:
 *       - OAuth2Password: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ALL, APPROVED, PENDING]
 *           default: APPROVED
 *         description: Filter employees by approval status (Defaults to APPROVED)
 *     responses:
 *       200:
 *         description: List of employees
 */
router.get('/', getEmployees);

/**
 * @swagger
 * /api/employees/{id}/approve:
 *   patch:
 *     summary: Approve pending employee
 *     tags: [Employee Management]
 *     security:
 *       - OAuth2Password: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Employee approved successfully
 */
router.patch('/:id/approve', approveEmployee);

/**
 * @swagger
 * /api/employees/{id}/reject:
 *   delete:
 *     summary: Reject employee registration
 *     tags: [Employee Management]
 *     security:
 *       - OAuth2Password: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Request rejected and deleted
 */
router.delete('/:id/reject', rejectEmployee);

/**
 * @swagger
 * /api/employees/{id}/status:
 *   patch:
 *     summary: Update Employee Account Status (ACTIVE / DEACTIVE)
 *     tags: [Employee Management]
 *     security:
 *       - OAuth2Password: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, DEACTIVE]
 *                 example: ACTIVE
 *     responses:
 *       200:
 *         description: Status updated successfully
 * 
 */
router.patch('/:id/status', updateEmployeeStatus);

/**
 * @swagger
 * /api/employees/{id}:
 *   patch:
 *     summary: Update Employee Details (Admin Only)
 *     tags: [Employee Management]
 *     security:
 *       - OAuth2Password: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Arjun K"
 *               email:
 *                 type: string
 *                 example: "arjun.new@company.com"
 *               department:
 *                 type: string
 *                 example: "Product Management"
 *     responses:
 *       200:
 *         description: Employee details updated successfully
 *       400:
 *         description: Invalid input or duplicate email
 *       403:
 *         description: Forbidden (Admin access required)
 *       404:
 *         description: Employee not found
 */
router.patch('/:id', updateEmployee);

/**
 * @swagger
 * /api/employees/{id}/role:
 *   patch:
 *     summary: Assign Role to Employee (Admin/Super Admin Only)
 *     tags: [Employee Management]
 *     security:
 *       - OAuth2Password: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [roleId]
 *             properties:
 *               roleId:
 *                 type: string
 *                 example: "6a66e7521126d3507decd094"
 *     responses:
 *       200:
 *         description: Employee role updated successfully
 *       403:
 *         description: Forbidden (Admin access required)
 *       404:
 *         description: Employee or Role not found
 */
router.patch('/:id/role', updateEmployeeRole);

export default router;
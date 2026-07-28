import { Router } from 'express';
import { setupSuperAdmin, createAdmin, getAdmins, updateAdminStatus, updateAdminPermissions, getAvailablePermissions, updateAdminRole } from '../controllers/adminController';
import { protect } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * /api/admin/setup-super-admin:
 *   post:
 *     summary: Setup First Super Admin using Secret Passkey
 *     tags: [Admin Management]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, passkey]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               passkey:
 *                 type: string
 *     responses:
 *       201:
 *         description: Super Admin created
 */
router.post('/setup-super-admin', setupSuperAdmin);

// Protected Admin Routes
router.use(protect);

/**
 * @swagger
 * /api/admin/create:
 *   post:
 *     summary: Direct Create Admin by Super Admin
 *     tags: [Admin Management]
 *     security:
 *       - OAuth2Password: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [ADMIN, SUPER_ADMIN]
 *     responses:
 *       201:
 *         description: Admin created
 */
router.post('/create', createAdmin);

/**
 * @swagger
 * /api/admin/list:
 *   get:
 *     summary: Get all admins list
 *     tags: [Admin Management]
 *     security:
 *       - OAuth2Password: []
 *     responses:
 *       200:
 *         description: List of admins
 */
router.get('/list', getAdmins);

/**
 * @swagger
 * /api/admin/{id}/status:
 *   patch:
 *     summary: Update Admin Account Status (ACTIVE / DEACTIVE)
 *     tags: [Admin Management]
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
 */
router.patch('/:id/status', updateAdminStatus);

/**
 * @swagger
 * /api/admin/{id}/permissions:
 *   patch:
 *     summary: Update Admin Permissions (Super Admin Only)
 *     tags: [Admin Management]
 *     security:
 *       - OAuth2Password: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Admin User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [permissions]
 *             properties:
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["MANAGE_EMPLOYEES", "APPROVE_ATTENDANCE", "VIEW_REPORTS"]
 *     responses:
 *       200:
 *         description: Admin permissions updated successfully
 *       400:
 *         description: Invalid permissions array or target is Super Admin
 *       403:
 *         description: Forbidden (Super Admin access required)
 *       404:
 *         description: Admin not found
 */
router.patch('/:id/permissions', updateAdminPermissions);

/**
 * @swagger
 * /api/admin/permissions:
 *   get:
 *     summary: Get all available system permissions (Admin/Super Admin Only)
 *     tags: [Admin Management]
 *     security:
 *       - OAuth2Password: []
 *     responses:
 *       200:
 *         description: List of available system permissions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 *               example: ["MANAGE_EMPLOYEES", "APPROVE_ATTENDANCE", "MANAGE_LEAVES", "MANAGE_HOLIDAYS", "VIEW_REPORTS", "MANAGE_SETTINGS"]
 *       403:
 *         description: Forbidden (Admin access required)
 */
router.get('/permissions', getAvailablePermissions);

/**
 * @swagger
 * /api/admin/{id}/role:
 *   patch:
 *     summary: Assign Role to Admin (Super Admin Only)
 *     tags: [Admin Management]
 *     security:
 *       - OAuth2Password: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Admin User ID
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
 *         description: Admin role updated successfully
 *       403:
 *         description: Forbidden (Super Admin access required)
 *       404:
 *         description: Admin or Role not found
 */
router.patch('/:id/role', updateAdminRole);

export default router;
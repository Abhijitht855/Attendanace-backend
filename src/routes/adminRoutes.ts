import { Router } from 'express';
import { setupSuperAdmin, createAdmin, getAdmins, updateAdminStatus } from '../controllers/adminController';
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

export default router;
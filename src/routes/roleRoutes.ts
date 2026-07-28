import { Router } from 'express';
import { createRole, getRoles, updateRole, deleteRole } from '../controllers/roleController';
import { protect } from '../middleware/auth';
import { checkPermission } from '../middleware/checkPermission';

const router = Router();

// Protect all role routes
router.use(protect);

/**
 * @swagger
 * /api/roles:
 *   post:
 *     summary: Create a custom role (Super Admin Only)
 *     tags: [Roles Management]
 *     security:
 *       - OAuth2Password: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "HR_OFFICER"
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["MANAGE_EMPLOYEES", "VIEW_EMPLOYEES", "APPLY_LEAVE"]
 *               description:
 *                 type: string
 *                 example: "Human Resources Officer Role"
 *     responses:
 *       201:
 *         description: Role created successfully
 *       400:
 *         description: Role already exists or invalid permissions
 *       403:
 *         description: Forbidden (Super Admin only)
 */
router.post('/', checkPermission('MANAGE_ROLES'), createRole);

/**
 * @swagger
 * /api/roles:
 *   get:
 *     summary: Get all roles list
 *     tags: [Roles Management]
 *     security:
 *       - OAuth2Password: []
 *     responses:
 *       200:
 *         description: List of roles retrieved successfully
 */
router.get('/', getRoles);

/**
 * @swagger
 * /api/roles/{id}:
 *   patch:
 *     summary: Update a custom role details/permissions (Super Admin Only)
 *     tags: [Roles Management]
 *     security:
 *       - OAuth2Password: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Role ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "HR_MANAGER"
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["MANAGE_EMPLOYEES", "VIEW_EMPLOYEES", "APPROVE_LEAVE", "REJECT_LEAVE"]
 *               description:
 *                 type: string
 *                 example: "Updated description"
 *     responses:
 *       200:
 *         description: Role updated successfully
 *       400:
 *         description: Cannot modify system-critical protected role name or invalid permissions
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Role not found
 */
router.patch('/:id', checkPermission('MANAGE_ROLES'), updateRole);

/**
 * @swagger
 * /api/roles/{id}:
 *   delete:
 *     summary: Delete a custom role (Super Admin Only)
 *     tags: [Roles Management]
 *     security:
 *       - OAuth2Password: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Role ID
 *     responses:
 *       200:
 *         description: Role deleted successfully
 *       400:
 *         description: Cannot delete protected default system roles
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Role not found
 */
router.delete('/:id', checkPermission('MANAGE_ROLES'), deleteRole);

export default router;

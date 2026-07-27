import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController';
import { protect } from '../middleware/auth';

const router = Router();

// Protect all settings routes
router.use(protect);

/**
 * @swagger
 * /api/settings:
 *   get:
 *     summary: Get Office Hours and Settings
 *     tags: [Settings Management]
 *     security:
 *       - OAuth2Password: []
 *     responses:
 *       200:
 *         description: Settings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 officeStartTime:
 *                   type: string
 *                   example: "09:00"
 *                 officeEndTime:
 *                   type: string
 *                   example: "18:00"
 *                 gracePeriod:
 *                   type: number
 *                   example: 15
 *       401:
 *         description: Not authorized
 */
router.get('/', getSettings);

/**
 * @swagger
 * /api/settings:
 *   patch:
 *     summary: Update Office Hours and Settings (Admin Only)
 *     tags: [Settings Management]
 *     security:
 *       - OAuth2Password: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               officeStartTime:
 *                 type: string
 *                 example: "09:00"
 *               officeEndTime:
 *                 type: string
 *                 example: "18:00"
 *               gracePeriod:
 *                 type: number
 *                 example: 15
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *       400:
 *         description: Invalid input format
 *       403:
 *         description: Forbidden (Admin access required)
 */
router.patch('/', updateSettings);

export default router;

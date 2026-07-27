import { Router } from 'express';
import { addHoliday, getHolidays } from '../controllers/holidayController';
import { protect } from '../middleware/auth';

const router = Router();

// Protect holiday routes
router.use(protect);

/**
 * @swagger
 * /api/holidays:
 *   post:
 *     summary: Add Company Holiday (Admin Only)
 *     tags: [Holiday Management]
 *     security:
 *       - OAuth2Password: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [date, name]
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2026-12-25"
 *               name:
 *                 type: string
 *                 example: "Christmas Day"
 *     responses:
 *       201:
 *         description: Holiday added successfully
 *       400:
 *         description: Duplicate date or invalid input format
 *       403:
 *         description: Forbidden (Admin access required)
 */
router.post('/', addHoliday);

/**
 * @swagger
 * /api/holidays:
 *   get:
 *     summary: List Company Holidays
 *     tags: [Holiday Management]
 *     security:
 *       - OAuth2Password: []
 *     responses:
 *       200:
 *         description: List of holidays retrieved successfully
 *       401:
 *         description: Not authorized
 */
router.get('/', getHolidays);

export default router;

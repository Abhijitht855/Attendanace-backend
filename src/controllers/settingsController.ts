import { Request, Response } from 'express';
import Settings from '../models/Settings';

// Helper to validate HH:MM time format
const isValidTimeFormat = (time: string): boolean => {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
};

// @desc    Get office settings
// @route   GET /api/settings
export const getSettings = async (req: Request, res: Response) => {
  let settings = await Settings.findOne();

  // Create default settings if they do not exist
  if (!settings) {
    settings = await Settings.create({
      officeStartTime: '09:00',
      officeEndTime: '18:00',
      gracePeriod: 15,
    });
  }

  res.json(settings);
};

// @desc    Update office settings
// @route   PATCH /api/settings
export const updateSettings = async (req: Request, res: Response) => {
  const user = req.user as any;
  if (!user || !user.role) {
    return res.status(403).json({ message: 'Forbidden. Admin access required.' });
  }

  const { officeStartTime, officeEndTime, gracePeriod } = req.body;

  let settings = await Settings.findOne();
  if (!settings) {
    settings = new Settings();
  }

  if (officeStartTime !== undefined) {
    if (!isValidTimeFormat(officeStartTime)) {
      return res.status(400).json({ message: 'officeStartTime must be in HH:MM format' });
    }
    settings.officeStartTime = officeStartTime;
  }

  if (officeEndTime !== undefined) {
    if (!isValidTimeFormat(officeEndTime)) {
      return res.status(400).json({ message: 'officeEndTime must be in HH:MM format' });
    }
    settings.officeEndTime = officeEndTime;
  }

  if (gracePeriod !== undefined) {
    const period = Number(gracePeriod);
    if (isNaN(period) || period < 0) {
      return res.status(400).json({ message: 'gracePeriod must be a non-negative number' });
    }
    settings.gracePeriod = period;
  }

  await settings.save();

  res.json({
    message: 'Office settings updated successfully',
    settings,
  });
};

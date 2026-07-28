import { Request, Response } from 'express';
import Holiday from '../models/Holiday';
import { parseUTCDate } from '../utils/timeZone';

// Helper to validate date format (YYYY-MM-DD)
const isValidDateStr = (dateStr: string): boolean => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
};

// @desc    Add a company holiday
// @route   POST /api/holidays
export const addHoliday = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (!user.role) {
      return res.status(403).json({ message: 'Forbidden. Admin access required.' });
    }

    const { date, name } = req.body;

    if (!date || !name) {
      return res.status(400).json({ message: 'Date and name are required' });
    }

    if (!isValidDateStr(date)) {
      return res.status(400).json({ message: 'Date must be in YYYY-MM-DD format' });
    }

    const parsedDate = parseUTCDate(date);

    // Check if holiday already exists for this date
    const existingHoliday = await Holiday.findOne({ dateStr: date });
    if (existingHoliday) {
      return res.status(400).json({ message: `Holiday for date ${date} already exists: ${existingHoliday.name}` });
    }

    const holiday = await Holiday.create({
      date: parsedDate,
      dateStr: date,
      name: name.trim(),
    });

    res.status(201).json({
      message: 'Holiday added successfully',
      holiday,
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Get all holidays
// @route   GET /api/holidays
export const getHolidays = async (req: Request, res: Response) => {
  try {
    const holidays = await Holiday.find().sort({ date: 1 });
    res.json(holidays);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Delete a company holiday
// @route   DELETE /api/holidays/:id
export const deleteHoliday = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (!user.role) {
      return res.status(403).json({ message: 'Forbidden. Admin access required.' });
    }

    const holiday = await Holiday.findById(req.params.id);

    if (!holiday) {
      return res.status(404).json({ message: 'Holiday not found' });
    }

    await holiday.deleteOne();

    res.json({
      message: `Holiday "${holiday.name}" has been removed successfully`,
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

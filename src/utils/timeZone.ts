/**
 * Utility functions to handle Timezone-safe calculations.
 * Default timezone used is Indian Standard Time (IST, Asia/Kolkata).
 */

export const getISTDateTime = (date: Date = new Date()) => {
  // Format Date to YYYY-MM-DD in Asia/Kolkata
  const formatterDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  // Format Time to HH:MM:SS in Asia/Kolkata
  const formatterTime = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const dateStr = formatterDate.format(date); // 'YYYY-MM-DD'
  const timeStr = formatterTime.format(date); // 'HH:MM:SS'

  return { dateStr, timeStr };
};

/**
 * Converts a time string (HH:MM or HH:MM:SS) into minutes from midnight.
 */
export const timeToMinutes = (timeStr: string): number => {
  const parts = timeStr.split(':');
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  return hours * 60 + minutes;
};

/**
 * Parses YYYY-MM-DD date string into a Date object representing UTC midnight.
 * This ensures no timezone shifts occur during database storage or calculations.
 */
export const parseUTCDate = (dateStr: string): Date => {
  return new Date(`${dateStr}T00:00:00.000Z`);
};

import { Request, Response } from 'express';
import Attendance from '../models/Attendance';
import Employee from '../models/Employee';
import { generateReportData, ReportItem } from '../services/reportService';
import { getISTDateTime, parseUTCDate } from '../utils/timeZone';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

// Helper to get date strings for last N days
const getLastNDaysRange = (n: number) => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (n - 1));

  const { dateStr: endDateStr } = getISTDateTime(end);
  const { dateStr: startDateStr } = getISTDateTime(start);

  return { startDateStr, endDateStr };
};

// @desc    Get attendance history for one employee
// @route   GET /api/attendance/history/:employeeId
export const getAttendanceHistory = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { employeeId } = req.params;

    // Enforce authorization
    if (!user.role && user._id.toString() !== employeeId) {
      return res.status(403).json({ message: 'Forbidden. You can only view your own attendance history' });
    }

    const { startDate, endDate } = req.query;

    let query: Record<string, any> = { employeeId };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = parseUTCDate(startDate as string);
      }
      if (endDate) {
        query.date.$lte = parseUTCDate(endDate as string);
      }
    } else {
      // Default to current month's history
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
      const startStr = `${currentYear}-${currentMonth}-01`;
      const { dateStr: endStr } = getISTDateTime(now);

      query.date = {
        $gte: parseUTCDate(startStr),
        $lte: parseUTCDate(endStr),
      };
    }

    const history = await Attendance.find(query).sort({ date: 1 });
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Get weekly report summary
// @route   GET /api/attendance/weekly-report
export const getWeeklyReport = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    let targetEmployeeId = req.query.employeeId as string | undefined;

    // If employee, force their own ID
    if (!user.role) {
      targetEmployeeId = user._id.toString();
    }

    const { startDateStr, endDateStr } = getLastNDaysRange(7);
    const reports = await generateReportData(startDateStr, endDateStr, targetEmployeeId);

    res.json({
      startDate: startDateStr,
      endDate: endDateStr,
      reports,
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Get monthly report summary
// @route   GET /api/attendance/monthly-report
export const getMonthlyReport = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    let targetEmployeeId = req.query.employeeId as string | undefined;

    // If employee, force their own ID
    if (!user.role) {
      targetEmployeeId = user._id.toString();
    }

    const { startDateStr, endDateStr } = getLastNDaysRange(30);
    const reports = await generateReportData(startDateStr, endDateStr, targetEmployeeId);

    res.json({
      startDate: startDateStr,
      endDate: endDateStr,
      reports,
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Export attendance reports in Excel or PDF format
// @route   GET /api/attendance/report/export
export const exportReport = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const format = (req.query.format as string)?.toLowerCase();
    const range = (req.query.range as string)?.toLowerCase();
    let targetEmployeeId = req.query.employeeId as string | undefined;

    if (!format || !['excel', 'pdf'].includes(format)) {
      return res.status(400).json({ message: 'Invalid format. Use format=excel or format=pdf' });
    }

    if (!range || !['weekly', 'monthly'].includes(range)) {
      return res.status(400).json({ message: 'Invalid range. Use range=weekly or range=monthly' });
    }

    // Force employee to see only their own report
    if (!user.role) {
      targetEmployeeId = user._id.toString();
    }

    const daysCount = range === 'weekly' ? 7 : 30;
    const { startDateStr, endDateStr } = getLastNDaysRange(daysCount);

    const reportData = await generateReportData(startDateStr, endDateStr, targetEmployeeId);

    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Attendance Report');

      // Title Row
      worksheet.mergeCells('A1:J1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = `Attendance Report (${range.toUpperCase()})`;
      titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(1).height = 40;

      // Subtitle Row
      worksheet.mergeCells('A2:J2');
      const subtitleCell = worksheet.getCell('A2');
      subtitleCell.value = `Period: ${startDateStr} to ${endDateStr}`;
      subtitleCell.font = { name: 'Arial', size: 11, italic: true };
      subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(2).height = 20;

      // Empty separator row
      worksheet.getRow(3).height = 10;

      // Headers
      const headers = [
        'Employee Name',
        'Email',
        'Department',
        'Total Working Days',
        'Present Days',
        'Absent Days',
        'Late Arrivals (Unapproved)',
        'Early Checkouts',
        'Leaves Taken',
        'Holiday Work Days',
      ];
      const headerRow = worksheet.addRow(headers);
      headerRow.height = 25;
      headerRow.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F5597' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });

      // Data Rows
      reportData.forEach((item) => {
        const row = worksheet.addRow([
          item.employee.name,
          item.employee.email,
          item.employee.department,
          item.totalWorkingDays,
          item.present,
          item.absent,
          item.lateArrivals,
          item.earlyCheckouts,
          item.leavesTaken,
          item.holidayWorkDays,
        ]);
        row.height = 20;
        row.eachCell((cell, colNumber) => {
          cell.font = { name: 'Arial', size: 10 };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
            left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
            bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
            right: { style: 'thin', color: { argb: 'FFD9D9D9' } },
          };
          if (colNumber > 3) {
            cell.alignment = { horizontal: 'center' };
          } else {
            cell.alignment = { horizontal: 'left' };
          }
        });
      });

      // Column widths optimization
      worksheet.columns.forEach((column) => {
        let maxLen = 0;
        column.eachCell && column.eachCell({ includeEmpty: false }, (cell) => {
          const val = cell.value ? String(cell.value) : '';
          if (val.length > maxLen) maxLen = val.length;
        });
        column.width = Math.max(maxLen + 4, 12);
      });

      // Stream to Response
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=attendance_report_${range}_${startDateStr}_to_${endDateStr}.xlsx`);

      await workbook.xlsx.write(res);
      res.end();
    } else if (format === 'pdf') {
      const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });

      // Stream directly to HTTP response
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=attendance_report_${range}_${startDateStr}_to_${endDateStr}.pdf`);
      doc.pipe(res);

      // Title & Header Design
      doc.rect(30, 30, 782, 50).fill('#1F4E79');
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(18).text(`Attendance Report (${range.toUpperCase()})`, 40, 48);
      
      // Subtitle
      doc.fillColor('#333333').font('Helvetica-Oblique').fontSize(10).text(`Period: ${startDateStr} to ${endDateStr}`, 30, 95);

      // Draw horizontal dividing line
      doc.moveTo(30, 110).lineTo(812, 110).stroke('#2F5597');

      // Table Setup
      let y = 125;
      const headers = [
        { label: 'Employee Name', x: 30, w: 150 },
        { label: 'Department', x: 185, w: 100 },
        { label: 'Working Days', x: 290, w: 75 },
        { label: 'Present', x: 370, w: 60 },
        { label: 'Absent', x: 435, w: 60 },
        { label: 'Late', x: 500, w: 60 },
        { label: 'Early', x: 565, w: 60 },
        { label: 'Leaves', x: 630, w: 60 },
        { label: 'Holiday Work', x: 695, w: 85 },
      ];

      // Draw table header backgrounds
      doc.rect(30, y, 782, 22).fill('#2F5597');
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9);
      
      headers.forEach((h) => {
        doc.text(h.label, h.x, y + 6, { width: h.w, align: h.label === 'Employee Name' || h.label === 'Department' ? 'left' : 'center' });
      });

      y += 22;

      // Draw Table Rows
      doc.fillColor('#333333').font('Helvetica').fontSize(9);
      
      reportData.forEach((item, index) => {
        // Alternating row background color
        if (index % 2 === 1) {
          doc.rect(30, y, 782, 20).fill('#F2F2F2');
          doc.fillColor('#333333');
        }

        doc.text(item.employee.name, 30, y + 6, { width: 150, align: 'left' });
        doc.text(item.employee.department, 185, y + 6, { width: 100, align: 'left' });
        doc.text(String(item.totalWorkingDays), 290, y + 6, { width: 75, align: 'center' });
        doc.text(String(item.present), 370, y + 6, { width: 60, align: 'center' });
        doc.text(String(item.absent), 435, y + 6, { width: 60, align: 'center' });
        doc.text(String(item.lateArrivals), 500, y + 6, { width: 60, align: 'center' });
        doc.text(String(item.earlyCheckouts), 565, y + 6, { width: 60, align: 'center' });
        doc.text(String(item.leavesTaken), 630, y + 6, { width: 60, align: 'center' });
        doc.text(String(item.holidayWorkDays), 695, y + 6, { width: 85, align: 'center' });

        // Draw light horizontal lines between rows
        doc.moveTo(30, y + 20).lineTo(812, y + 20).stroke('#E0E0E0');
        y += 20;

        // Simple page breaking check if content overflows landscape heights
        if (y > 520) {
          doc.addPage({ margin: 30, size: 'A4', layout: 'landscape' });
          y = 30;
          doc.rect(30, y, 782, 22).fill('#2F5597');
          doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9);
          headers.forEach((h) => {
            doc.text(h.label, h.x, y + 6, { width: h.w, align: h.label === 'Employee Name' || h.label === 'Department' ? 'left' : 'center' });
          });
          y += 22;
          doc.fillColor('#333333').font('Helvetica').fontSize(9);
        }
      });

      // End Document
      doc.end();
    }
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ message: (error as Error).message });
    }
  }
};

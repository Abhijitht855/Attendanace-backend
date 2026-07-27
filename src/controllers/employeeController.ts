import { Request, Response } from 'express';
import Employee from '../models/Employee';
import Admin from '../models/Admin';

// Helper function to validate email
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// @desc    Create a new Employee (Admin Only)
// @route   POST /api/employees/register
export const registerEmployee = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (!user || !user.role) {
      return res.status(403).json({ message: 'Forbidden. Admin access required.' });
    }

    const { name, email, password, department } = req.body;

    // 1. Basic empty check
    if (!name || !email || !password || !department) {
      return res.status(400).json({ message: 'Name, email, password, and department are required' });
    }

    // 2. Email validation
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    // 3. Password length check
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const formattedEmail = email.toLowerCase().trim();

    // 4. Duplicate Check
    const existingEmployee = await Employee.findOne({ email: formattedEmail });
    if (existingEmployee) {
      return res.status(400).json({ message: 'Employee with this email already exists' });
    }

    const employee = await Employee.create({
      name: name.trim(),
      email: formattedEmail,
      password,
      department: department.trim(),
      isApproved: true, // Automatically approved as it is created by an Admin
      isActive: true,
    });

    res.status(201).json({
      message: 'Employee created successfully.',
      _id: employee._id,
      name: employee.name,
      email: employee.email,
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Get employees list with optional status filter
// @route   GET /api/employees?status=APPROVED|PENDING|ALL
export const getEmployees = async (req: Request, res: Response) => {
  try {
    const statusParam = (req.query.status as string)?.toUpperCase() || 'APPROVED';

    let query: Record<string, any> = {};

    if (statusParam === 'PENDING') {
      query.isApproved = false;
    } else if (statusParam === 'APPROVED') {
      query.isApproved = true;
    } else if (statusParam !== 'ALL') {
      return res.status(400).json({ 
        message: 'Invalid status filter. Use APPROVED, PENDING, or ALL' 
      });
    }

    const employees = await Employee.find(query).select('-password');
    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Approve pending employee
// @route   PATCH /api/employees/:id/approve
export const approveEmployee = async (req: Request, res: Response) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    if (employee.isApproved) {
      return res.status(400).json({ message: 'Employee is already approved' });
    }

    employee.isApproved = true;
    await employee.save();

    res.json({ message: 'Employee approved successfully', _id: employee._id });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Reject employee registration
// @route   DELETE /api/employees/:id/reject
export const rejectEmployee = async (req: Request, res: Response) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    if (employee.isApproved) {
      return res.status(400).json({ message: 'Cannot reject an already approved employee. Use status change instead.' });
    }

    await Employee.findByIdAndDelete(req.params.id);

    res.json({ message: 'Employee registration rejected and removed' });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Update Employee Status (ACTIVE / DEACTIVE)
// @route   PATCH /api/employees/:id/status
export const updateEmployeeStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.body;

    // 1. Validate status format
    const normalizedStatus = status?.toString().toUpperCase();
    if (!['ACTIVE', 'DEACTIVE', 'INACTIVE'].includes(normalizedStatus)) {
      return res.status(400).json({ 
        message: 'Invalid status. Expected ACTIVE or DEACTIVE' 
      });
    }

    // 2. Find employee
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    const targetIsActive = normalizedStatus === 'ACTIVE';

    // 3. Prevent redundant status updates
    if (employee.isActive === targetIsActive) {
      return res.status(400).json({ 
        message: `Employee is already ${employee.isActive ? 'active' : 'inactive'}` 
      });
    }

    // 4. Update status
    employee.isActive = targetIsActive;
    await employee.save();

    res.json({
      message: `Employee status updated to ${normalizedStatus}`,
      _id: employee._id,
      isActive: employee.isActive
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Edit Employee details (Admin Only)
// @route   PATCH /api/employees/:id
export const updateEmployee = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (!user || !user.role) {
      return res.status(403).json({ message: 'Forbidden. Admin access required.' });
    }

    const { name, email, department } = req.body;
    const employee = await Employee.findById(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    if (name !== undefined) {
      employee.name = name.trim();
    }

    if (email !== undefined) {
      const formattedEmail = email.toLowerCase().trim();
      if (!isValidEmail(formattedEmail)) {
        return res.status(400).json({ message: 'Please enter a valid email address' });
      }

      // Check duplicate among other employees
      const duplicateEmp = await Employee.findOne({ email: formattedEmail, _id: { $ne: employee._id } });
      const duplicateAdmin = await Admin.findOne({ email: formattedEmail });
      
      if (duplicateEmp || duplicateAdmin) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      employee.email = formattedEmail;
    }

    if (department !== undefined) {
      employee.department = department.trim();
    }

    await employee.save();

    res.json({
      message: 'Employee updated successfully',
      employee: {
        _id: employee._id,
        name: employee.name,
        email: employee.email,
        department: employee.department,
        isActive: employee.isActive,
        isApproved: employee.isApproved,
      }
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin';
import Employee from '../models/Employee';
import { SYSTEM_PERMISSIONS } from '../models/Role';

interface JwtPayload {
  id: string;
}

export const protect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  let token: string | undefined;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123') as JwtPayload;

      // 1. First check in Admin Collection
      let user: any = await Admin.findById(decoded.id).populate('roleId').select('-password');

      // 2. If not found in Admin, check in Employee Collection
      if (!user) {
        user = await Employee.findById(decoded.id).populate('roleId').select('-password');
      }

      if (!user) {
        res.status(401).json({ message: 'User not found or token invalid' });
        return;
      }

      if (!user.isActive) {
        res.status(403).json({ message: 'Account is deactivated' });
        return;
      }

      // Dynamically attach permissions based on populated roleId
      if (user.role === 'SUPER_ADMIN' || (user.roleId && user.roleId.name === 'SUPER_ADMIN')) {
        user.permissions = SYSTEM_PERMISSIONS;
      } else if (user.roleId) {
        user.permissions = user.roleId.permissions || [];
      } else {
        user.permissions = [];
      }

      req.user = user;
      next();
    } catch (error) {
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};
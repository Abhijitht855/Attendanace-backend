import { Request, Response, NextFunction } from 'express';

export const checkPermission = (requiredPermission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user as any;

    if (!user) {
      res.status(401).json({ message: 'Unauthorized access' });
      return;
    }

    // Super Admin has full access
    if (user.role === 'SUPER_ADMIN') {
      next();
      return;
    }

    // Check specific permissions array if exists
    if (user.permissions && user.permissions.includes(requiredPermission)) {
      next();
      return;
    }

    res.status(403).json({ message: 'Permission denied for this operation' });
  };
};
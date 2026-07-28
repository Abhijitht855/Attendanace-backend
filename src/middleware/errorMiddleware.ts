import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  const isProduction = process.env.NODE_ENV === 'production';
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid resource ID format';
  }

  // Handle Mongoose Validation Errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const validationErrors = Object.values((err as any).errors).map((e: any) => e.message);
    message = `Validation failed: ${validationErrors.join(', ')}`;
  }

  // Handle Mongoose Duplicate Key Error (code 11000)
  if ((err as any).code === 11000) {
    statusCode = 400;
    const duplicateField = Object.keys((err as any).keyValue || {}).join(', ');
    message = `Duplicate value for field: ${duplicateField}. This record already exists.`;
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token has expired. Please login again.';
  }

  res.status(statusCode).json({
    message,
    ...(! isProduction && { stack: err.stack }),
  });
};
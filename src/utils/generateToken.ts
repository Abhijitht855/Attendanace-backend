import jwt, { SignOptions } from 'jsonwebtoken';

export const generateToken = (id: string, role?: string): string => {
  const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'];
  const secret = process.env.JWT_SECRET || 'secret123';
  return jwt.sign({ id, role }, secret, { expiresIn });
};

export default generateToken;
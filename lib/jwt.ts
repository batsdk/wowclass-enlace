import jwt from 'jsonwebtoken';
import { Request, Response } from 'express'; // For typing in API routes
import { TokenPayload } from '@/app/api/auth/login/route';

const SECRET = process.env.JWT_SECRET || 'your-strong-secret-key'; // Add to .env; generate a long random string

export function generateToken(user: TokenPayload) {
  const payload = {
    sub: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    id: user.id,
  };
  return jwt.sign(payload, SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, SECRET) as { sub: string; role: 'teacher' | 'student'; name?: string; email?: string };
  } catch {
    return null;
  }
}

export function setTokenCookie(res: Response, token: string) {
  res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 3600 * 1000 });
}

export function clearTokenCookie(res: Response) {
  res.clearCookie('token');
}
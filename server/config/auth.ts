import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const isProduction = process.env.NODE_ENV === 'production';

let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  if (isProduction) {
    console.error('FATAL: JWT_SECRET environment variable is missing in production!');
    process.exit(1);
  } else {
    console.warn(
      '⚠️  [SECURITY WARNING] JWT_SECRET is not configured. Falling back to local development secret.'
    );
    jwtSecret = 'smart_market_pos_dev_secret_key_2026_antigravity';
  }
}

export const JWT_SECRET: string = jwtSecret;
export const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '24h';

export interface JwtPayload {
  userId: string;
  username: string;
  role: string;
  branchId: string;
  iat?: number;
  exp?: number;
}

export function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export function hashPassword(plainText: string): string {
  return bcrypt.hashSync(plainText, 10);
}

export function comparePassword(plainText: string, hash: string): boolean {
  return bcrypt.compareSync(plainText, hash);
}

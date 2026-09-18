import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../config/auth.ts';
import { db } from '../db.ts';
import { User } from '../../src/types/index.ts';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'TOKEN_MISSING',
        message: 'Authorization token is required',
        messageAr: 'رمز الدخول مفقود أو غير صحيح، يرجى تسجيل الدخول',
      },
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyToken(token);
    const user = db.getUsers().find((u) => u.id === payload.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User belonging to this token no longer exists',
          messageAr: 'المستخدم صاحب هذا الرمز غير موجود بالنظام',
        },
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'USER_DEACTIVATED',
          message: 'Account is deactivated',
          messageAr: 'تم تعطيل هذا الحساب، يرجى مراجعة إدارة النظام',
        },
      });
    }

    req.user = user;
    next();
  } catch (err: any) {
    const isExpired = err.name === 'TokenExpiredError';
    return res.status(401).json({
      success: false,
      error: {
        code: isExpired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
        message: isExpired ? 'Token has expired' : 'Invalid authorization token',
        messageAr: isExpired ? 'انتهت صلاحية جلسة العمل، يرجى تسجيل الدخول مجدداً' : 'رمز الدخول غير صالح',
      },
    });
  }
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyToken(token);
    const user = db.getUsers().find((u) => u.id === payload.userId);
    if (user && user.status === 'active') {
      req.user = user;
    }
  } catch {
    // Ignore invalid tokens in optional auth
  }

  next();
}

import { Request, Response, NextFunction } from 'express';

export interface AppErrorOptions {
  statusCode?: number;
  code?: string;
  message: string;
  messageAr?: string;
  details?: any;
}

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public messageAr: string;
  public details?: any;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.statusCode = options.statusCode || 400;
    this.code = options.code || 'APPLICATION_ERROR';
    this.messageAr = options.messageAr || options.message;
    this.details = options.details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const isProduction = process.env.NODE_ENV === 'production';

  const statusCode = err.statusCode || (err.status && typeof err.status === 'number' ? err.status : 500);
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'An unexpected error occurred';
  const messageAr = err.messageAr || 'حدث خطأ غير متوقع في النظام، يرجى المحاولة لاحقاً';

  console.error(`[API ERROR] ${req.method} ${req.originalUrl}:`, {
    statusCode,
    code,
    message,
    stack: !isProduction ? err.stack : undefined,
  });

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      messageAr,
      details: !isProduction ? err.details || err.stack : undefined,
    },
  });
}

import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function rateLimiter(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = config.rateLimit.windowMs;
  const maxRequests = config.rateLimit.maxRequests;

  const key = `${ip}:${req.path}`;
  const record = requestCounts.get(key);

  if (!record || now > record.resetTime) {
    requestCounts.set(key, { count: 1, resetTime: now + windowMs });
    next();
    return;
  }

  if (record.count >= maxRequests) {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
      },
    });
    return;
  }

  record.count++;
  next();
}

setInterval(() => {
  const now = Date.now();
  for (const [key, record] of requestCounts.entries()) {
    if (now > record.resetTime) {
      requestCounts.delete(key);
    }
  }
}, config.rateLimit.windowMs);
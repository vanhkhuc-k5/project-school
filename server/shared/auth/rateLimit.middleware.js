/**
 * Authentication Rate Limiter Middleware
 * Protects login and password recovery endpoints from brute-force attacks.
 */

import { logSecurityEvent } from './securityLogger.js';

class MemoryRateLimitStore {
  constructor() {
    /** @type {Map<string, { count: number, resetTime: number }>} */
    this.hits = new Map();
  }

  increment(key, windowMs) {
    const now = Date.now();
    const record = this.hits.get(key);

    if (!record || now > record.resetTime) {
      const newRecord = { count: 1, resetTime: now + windowMs };
      this.hits.set(key, newRecord);
      return { count: 1, resetTime: newRecord.resetTime };
    }

    record.count++;
    return { count: record.count, resetTime: record.resetTime };
  }

  reset(key) {
    this.hits.delete(key);
  }

  clear() {
    this.hits.clear();
  }
}

export const defaultAuthRateLimitStore = new MemoryRateLimitStore();

/**
 * Creates an Express rate limiting middleware.
 * @param {object} options
 * @param {number} [options.windowMs=60000] - Time window in milliseconds (default 1 min)
 * @param {number} [options.max=15] - Maximum requests allowed within window
 * @param {string} [options.message] - Custom rejection message
 * @param {boolean} [options.skipInTest=true] - Skip rate limiting during automated test runs
 */
export function createAuthRateLimiter({
  windowMs = 60 * 1000,
  max = 15,
  message = 'Quá nhiều yêu cầu xác thực. Vui lòng thử lại sau ít phút.',
  skipInTest = true,
} = {}) {
  const store = new MemoryRateLimitStore();

  return (req, res, next) => {
    const isProduction = process.env.NODE_ENV === 'production';
    const isTestMode = process.env.NODE_ENV === 'test' || (!isProduction && (req.headers['x-test-runner'] === 'true' || req.headers['x-bypass-rate-limit'] === 'true'));
    const isExplicitRateLimitTest = req.headers['x-test-rate-limit'] === 'true';

    // In non-production, skip rate limiting during automated test runs unless explicitly testing rate limits
    if (skipInTest && isTestMode && !isExplicitRateLimitTest) {
      return next();
    }

    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-ip';
    const key = `${ip}:${req.path}:${isExplicitRateLimitTest ? 'test' : 'normal'}`;
    const { count, resetTime } = store.increment(key, windowMs);

    const remaining = Math.max(0, max - count);
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000));

    if (count > max) {
      logSecurityEvent('AUTH_RATE_LIMIT_EXCEEDED', {
        ip,
        path: req.path,
        count,
        max,
      });

      return res.status(429).json({
        success: false,
        code: 'RATE_LIMIT_EXCEEDED',
        message,
      });
    }

    next();
  };
}

export const loginRateLimiter = createAuthRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Quá nhiều yêu cầu đăng nhập. Vui lòng thử lại sau 1 phút.',
});

export const passwordResetRateLimiter = createAuthRateLimiter({
  windowMs: 60 * 1000,
  max: 5,
  message: 'Quá nhiều yêu cầu đặt lại mật khẩu. Vui lòng thử lại sau.',
});

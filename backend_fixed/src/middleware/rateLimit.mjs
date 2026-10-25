import rateLimit from 'express-rate-limit';

const message = (text) => ({ success: false, message: text, code: 'RATE_LIMITED' });

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: message('Too many requests. Please slow down.')
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: message('Too many authentication attempts. Try again in a few minutes.')
});

/** 20 AI requests per hour, keyed by authenticated user (fallback: IP). */
export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  message: message('AI assistant limit reached: 20 requests per hour. Please try again later.')
});

const rateLimit = require('express-rate-limit');

// Helper to determine if we should skip rate limiting (always skip in dev mode)
const shouldSkip = () => process.env.NODE_ENV === 'development';

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // Default: 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // Default: 100 requests per window
  skip: shouldSkip,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Stricter rate limiter for authentication routes (login, register)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Limit each IP to 15 login/register requests per window
  skip: shouldSkip,
  message: {
    success: false,
    message: 'Too many login or registration attempts. Please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiter for submissions (prevent spamming the code execution engine)
const submissionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 submissions per minute
  skip: shouldSkip,
  message: {
    success: false,
    message: 'Too many submission requests. Please wait a minute before submitting code again.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  apiLimiter,
  authLimiter,
  submissionLimiter
};

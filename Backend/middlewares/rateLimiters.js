import rateLimit from "express-rate-limit";

const windowMs =
  (Number(process.env.RATE_LIMIT_WINDOW) || 15) * 60 * 1000;
const max = Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;

export const globalLimiter = rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
  message: { message: "Too many requests, please try again later." },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
  message: { message: "Too many auth attempts, please try again later." },
});

export const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.SEARCH_RATE_LIMIT_MAX) || 30,
  skip: (req) => req.method === 'OPTIONS',
  message: { message: "Search rate limit exceeded." },
});

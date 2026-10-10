import rateLimit from "express-rate-limit";

/**
 * General API rate limiter to mitigate denial-of-service and brute-force scanning.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "test" ? 1000 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many requests from this IP address, please try again after 15 minutes.",
  },
});

/**
 * Strict authentication rate limiter for login, register, and verification endpoints.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "test" ? 20 : 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many authentication attempts from this IP address, please try again after 15 minutes.",
  },
});


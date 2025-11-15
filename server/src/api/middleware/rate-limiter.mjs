import rateLimit from "express-rate-limit";

/**
 * Rate limiter for production environment
 * Limits: 50 requests per minute per IP
 */
export const productionRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50, // 50 requests per windowMs
  message: {
    error: "Too many requests from this IP, please try again after a minute.",
    retryAfter: 60,
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  handler: (req, res) => {
    res.status(429).json({
      error: "Too many requests",
      message:
        "You have exceeded the 50 requests per minute limit. Please try again later.",
      retryAfter: "60 seconds",
    });
  },
});

/**
 * Development rate limiter (more lenient)
 * Limits: 1000 requests per minute per IP
 */
export const developmentRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // 1000 requests per windowMs
  message: {
    error: "Too many requests from this IP, please try again after a minute.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Get the appropriate rate limiter based on environment
 * In development, returns a pass-through (no limiting)
 */
export const getRateLimiter = () => {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    return productionRateLimiter;
  }

  // In development, return a no-op middleware that doesn't limit
  return (req, res, next) => next();
};

/**
 * Strict rate limiter for sensitive endpoints (like authentication)
 * Limits: 10 requests per minute per IP
 */
export const strictRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per windowMs
  message: {
    error:
      "Too many requests to this endpoint, please try again after a minute.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: "Too many requests",
      message:
        "You have exceeded the rate limit for this endpoint. Please try again later.",
      retryAfter: "60 seconds",
    });
  },
});

export default getRateLimiter;

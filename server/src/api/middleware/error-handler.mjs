/**
 * Global error handler middleware
 */
export function errorHandler(err, req, res, _next) {
  // Always log errors to console
  console.error("[ERROR]", {
    path: req.path,
    method: req.method,
    error: err.message,
    stack: err.stack,
  });

  // Set status code
  const statusCode = err.statusCode || 500;

  // Prepare error response
  const errorResponse = {
    error: err.name || "Error",
    message: err.message || "An unexpected error occurred",
  };

  // Add stack trace in development
  if (process.env.NODE_ENV === "development" || process.env.DEBUG) {
    errorResponse.stack = err.stack;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
}

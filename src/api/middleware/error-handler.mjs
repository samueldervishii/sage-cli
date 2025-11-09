/**
 * Global error handler middleware
 */
export function errorHandler(err, req, res, _next) {
  // Log error in debug mode
  if (process.env.DEBUG) {
    console.error("[Error]", err);
  }

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

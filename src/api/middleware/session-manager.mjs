import { v4 as uuidv4 } from "uuid";

/**
 * Session management middleware
 * Maintains chat sessions across API requests
 */

// In-memory session store (replace with Redis in production)
const sessions = new Map();

// Session timeout (30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000;

/**
 * Clean up expired sessions
 */
function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.lastAccess > SESSION_TIMEOUT) {
      sessions.delete(sessionId);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredSessions, 5 * 60 * 1000);

/**
 * Session manager middleware
 */
export function sessionManager(req, res, next) {
  // Get session ID from header or create new one
  let sessionId = req.headers["x-session-id"];

  if (!sessionId || !sessions.has(sessionId)) {
    sessionId = uuidv4();
    sessions.set(sessionId, {
      id: sessionId,
      createdAt: Date.now(),
      lastAccess: Date.now(),
      data: {},
    });
  } else {
    // Update last access time
    const session = sessions.get(sessionId);
    session.lastAccess = Date.now();
  }

  // Attach session to request
  req.session = sessions.get(sessionId);
  req.sessionId = sessionId;

  // Send session ID in response header
  res.setHeader("X-Session-ID", sessionId);

  next();
}

/**
 * Get session by ID
 */
export function getSession(sessionId) {
  return sessions.get(sessionId);
}

/**
 * Delete session by ID
 */
export function deleteSession(sessionId) {
  return sessions.delete(sessionId);
}

/**
 * Get all active sessions count
 */
export function getActiveSessionsCount() {
  return sessions.size;
}

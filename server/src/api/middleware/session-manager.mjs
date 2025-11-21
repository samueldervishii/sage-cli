import { v4 as uuidv4 } from "uuid";

/**
 * Session management middleware
 * Maintains chat sessions across API requests
 */

// In-memory session store (replace with Redis in production)
const sessions = new Map();

// Session timeout (30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000;

// Maximum number of concurrent sessions (prevent memory exhaustion)
const MAX_SESSIONS = 10000;

/**
 * Clean up expired sessions
 * Returns array of deleted session IDs for cleanup in other services
 */
function cleanupExpiredSessions() {
  const now = Date.now();
  const deletedSessions = [];

  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.lastAccess > SESSION_TIMEOUT) {
      sessions.delete(sessionId);
      deletedSessions.push(sessionId);
    }
  }

  if (deletedSessions.length > 0) {
    console.log(
      `[SessionManager] Cleaned up ${deletedSessions.length} expired sessions`
    );
  }

  return deletedSessions;
}

/**
 * Evict least recently used session if at capacity
 */
function evictLRUIfNeeded() {
  if (sessions.size >= MAX_SESSIONS) {
    let oldestSessionId = null;
    let oldestAccessTime = Date.now();

    for (const [sessionId, session] of sessions.entries()) {
      if (session.lastAccess < oldestAccessTime) {
        oldestAccessTime = session.lastAccess;
        oldestSessionId = sessionId;
      }
    }

    if (oldestSessionId) {
      sessions.delete(oldestSessionId);
      console.log(
        `[SessionManager] Evicted LRU session (at capacity: ${MAX_SESSIONS})`
      );
      return oldestSessionId;
    }
  }
  return null;
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
    // Evict LRU session if at capacity
    evictLRUIfNeeded();

    sessionId = uuidv4();
    sessions.set(sessionId, {
      id: sessionId,
      createdAt: Date.now(),
      lastAccess: Date.now(),
      data: {},
    });
  } else {
    // Update last access time atomically
    const session = sessions.get(sessionId);
    if (session) {
      session.lastAccess = Date.now();
    } else {
      // Race condition: session was deleted between has() and get()
      // Create a new session instead
      sessionId = uuidv4();
      sessions.set(sessionId, {
        id: sessionId,
        createdAt: Date.now(),
        lastAccess: Date.now(),
        data: {},
      });
    }
  }

  // Attach session to request (with additional safety check)
  const session = sessions.get(sessionId);
  if (!session) {
    // Extremely rare: session deleted between previous check and this one
    // Return error to prevent undefined session usage
    return res.status(500).json({
      error: "Session Error",
      message: "Session was invalidated, please retry",
    });
  }

  req.session = session;
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

/**
 * Export cleanup function for other services to trigger
 */
export { cleanupExpiredSessions };

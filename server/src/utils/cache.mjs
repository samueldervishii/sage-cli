/**
 * Simple in-memory cache with TTL support
 * For production, consider using Redis
 */
class SimpleCache {
  constructor() {
    this.cache = new Map();
    this.ttls = new Map();

    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  /**
   * Set a value in cache with optional TTL (in milliseconds)
   */
  set(key, value, ttl = null) {
    this.cache.set(key, value);

    if (ttl) {
      this.ttls.set(key, Date.now() + ttl);
    }
  }

  /**
   * Get a value from cache
   * Returns null if not found or expired
   */
  get(key) {
    // Check if expired
    if (this.ttls.has(key)) {
      const expiresAt = this.ttls.get(key);
      if (Date.now() > expiresAt) {
        // Expired, remove from cache
        this.cache.delete(key);
        this.ttls.delete(key);
        return null;
      }
    }

    return this.cache.get(key) || null;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key) {
    const value = this.get(key);
    return value !== null;
  }

  /**
   * Delete a specific key
   */
  delete(key) {
    this.cache.delete(key);
    this.ttls.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
    this.ttls.clear();
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, expiresAt] of this.ttls.entries()) {
      if (now > expiresAt) {
        this.cache.delete(key);
        this.ttls.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`[Cache] Cleaned up ${cleanedCount} expired entries`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      totalEntries: this.cache.size,
      entriesWithTTL: this.ttls.size,
    };
  }

  /**
   * Get or set pattern (cache aside)
   * If key exists, return cached value
   * Otherwise, execute loader function, cache result, and return
   */
  async getOrSet(key, loaderFn, ttl = null) {
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    const value = await loaderFn();
    this.set(key, value, ttl);
    return value;
  }
}

// Export singleton instance
export default new SimpleCache();

/**
 * Cache Utility - Centralized caching for expensive operations
 * Provides in-memory caching with TTL support
 */

const cacheStore = new Map();

/**
 * Set a value in cache with optional TTL
 * @param {string} key - Cache key
 * @param {*} value - Value to cache
 * @param {number} ttlSeconds - Time to live in seconds (default: 60)
 */
export function setCache(key, value, ttlSeconds = 60) {
  const expiry = Date.now() + (ttlSeconds * 1000);
  cacheStore.set(key, { value, expiry });
}

/**
 * Get a value from cache
 * @param {string} key - Cache key
 * @returns {*} Cached value or undefined if expired/not found
 */
export function getCache(key) {
  const entry = cacheStore.get(key);
  if (!entry) return undefined;
  
  if (Date.now() > entry.expiry) {
    cacheStore.delete(key);
    return undefined;
  }
  
  return entry.value;
}

/**
 * Check if key exists in cache and is not expired
 * @param {string} key - Cache key
 * @returns {boolean}
 */
export function hasCache(key) {
  return getCache(key) !== undefined;
}

/**
 * Delete a specific key from cache
 * @param {string} key - Cache key
 * @returns {boolean} True if deleted
 */
export function deleteCache(key) {
  return cacheStore.delete(key);
}

/**
 * Clear all cache entries
 */
export function clearCache() {
  cacheStore.clear();
}

/**
 * Clean up expired entries
 */
export function cleanupExpired() {
  const now = Date.now();
  for (const [key, entry] of cacheStore.entries()) {
    if (now > entry.expiry) {
      cacheStore.delete(key);
    }
  }
}

/**
 * Get cache statistics
 * @returns {object} Stats about cache
 */
export function getCacheStats() {
  const now = Date.now();
  let total = 0;
  let expired = 0;
  
  for (const [, entry] of cacheStore.entries()) {
    total++;
    if (now > entry.expiry) expired++;
  }
  
  return { total, expired, active: total - expired };
}

// Auto-cleanup every 5 minutes
setInterval(cleanupExpired, 5 * 60 * 1000);

export default {
  setCache,
  getCache,
  hasCache,
  deleteCache,
  clearCache,
  cleanupExpired,
  getCacheStats
};

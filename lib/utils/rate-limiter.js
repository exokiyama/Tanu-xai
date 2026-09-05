/**
 * Rate Limiter - Prevent abuse of expensive operations
 * Implements per-user rate limiting with configurable limits
 */

const rateLimitStore = new Map();

/**
 * Check if a user has exceeded their rate limit
 * @param {string} userId - User identifier (e.g., phone number or JID)
 * @param {string} action - Action being rate limited
 * @param {number} maxRequests - Maximum requests allowed
 * @param {number} windowSeconds - Time window in seconds
 * @returns {object} { allowed: boolean, remaining: number, resetAt: number }
 */
function checkRateLimit(userId, action, maxRequests = 10, windowSeconds = 60) {
  const key = `${userId}:${action}`;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  
  let entry = rateLimitStore.get(key);
  
  // Create new entry if none exists or window expired
  if (!entry || now > entry.windowEnd) {
    entry = {
      count: 0,
      windowEnd: now + windowMs
    };
    rateLimitStore.set(key, entry);
  }
  
  entry.count++;
  
  const remaining = Math.max(0, maxRequests - entry.count);
  const resetAt = entry.windowEnd;
  const allowed = entry.count <= maxRequests;
  
  return {
    allowed,
    remaining,
    resetAt,
    retryAfter: allowed ? 0 : Math.ceil((resetAt - now) / 1000)
  };
}

/**
 * Get current rate limit status for a user/action
 * @param {string} userId - User identifier
 * @param {string} action - Action name
 * @param {number} maxRequests - Max requests allowed
 * @param {number} windowSeconds - Time window
 * @returns {object} Status info
 */
function getRateLimitStatus(userId, action, maxRequests = 10, windowSeconds = 60) {
  const key = `${userId}:${action}`;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  
  const entry = rateLimitStore.get(key);
  
  if (!entry || now > entry.windowEnd) {
    return {
      allowed: true,
      remaining: maxRequests,
      resetAt: now + windowMs,
      retryAfter: 0
    };
  }
  
  const remaining = Math.max(0, maxRequests - entry.count);
  const resetAt = entry.windowEnd;
  const allowed = entry.count < maxRequests;
  
  return {
    allowed,
    remaining,
    resetAt,
    retryAfter: allowed ? 0 : Math.ceil((resetAt - now) / 1000)
  };
}

/**
 * Reset rate limit for a specific user/action
 * @param {string} userId - User identifier
 * @param {string} action - Action name
 */
function resetRateLimit(userId, action) {
  const key = `${userId}:${action}`;
  rateLimitStore.delete(key);
}

/**
 * Clear all rate limits
 */
function clearAllRateLimits() {
  rateLimitStore.clear();
}

/**
 * Clean up expired entries
 */
function cleanupExpired() {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.windowEnd) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Format rate limit error message
 * @param {object} result - Result from checkRateLimit
 * @returns {string} Formatted message
 */
function formatRateLimitMessage(result) {
  if (result.allowed) return '';
  
  const seconds = result.retryAfter;
  if (seconds >= 60) {
    const minutes = Math.ceil(seconds / 60);
    return `⚠️ Rate limit exceeded. Please wait ${minutes} minute(s) before trying again.`;
  }
  return `⚠️ Rate limit exceeded. Please wait ${seconds} seconds before trying again.`;
}

// Auto-cleanup every 2 minutes
setInterval(cleanupExpired, 2 * 60 * 1000);

// Module exports will be added by the conversion script

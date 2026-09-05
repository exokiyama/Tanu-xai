/**
 * System Utilities - Safe system information retrieval
 * Provides sanitized system data without exposing sensitive info
 */

const startTime = Date.now();

/**
 * Get formatted uptime string
 * @returns {string} Human-readable uptime
 */
function getUptimeString() {
  const uptime = process.uptime();
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Get uptime in seconds
 * @returns {number} Uptime in seconds
 */
function getUptimeSeconds() {
  return Math.floor(process.uptime());
}

/**
 * Get memory usage information (sanitized)
 * @returns {object} Memory stats in MB
 */
function getMemoryUsage() {
  const memory = process.memoryUsage();
  return {
    used: Math.round(memory.heapUsed / 1024 / 1024),
    total: Math.round(memory.heapTotal / 1024 / 1024),
    rss: Math.round(memory.rss / 1024 / 1024),
    external: Math.round(memory.external / 1024 / 1024)
  };
}

/**
 * Get formatted memory string
 * @returns {string} Memory usage as "used / total MB"
 */
function getMemoryString() {
  const mem = getMemoryUsage();
  return `${mem.used}MB / ${mem.total}MB`;
}

/**
 * Get Node.js version
 * @returns {string} Node version
 */
function getNodeVersion() {
  return process.version;
}

/**
 * Get platform name (sanitized - no detailed OS info)
 * @returns {string} Platform identifier
 */
function getPlatform() {
  // Return generic platform name, not detailed OS info
  const platform = process.platform;
  const platformMap = {
    'linux': 'Linux',
    'darwin': 'macOS',
    'win32': 'Windows',
    'freebsd': 'FreeBSD',
    'openbsd': 'OpenBSD',
    'sunos': 'Solaris'
  };
  return platformMap[platform] || 'Unknown';
}

/**
 * Get CPU count (safe - just the count, no model info)
 * @returns {number} Number of CPU cores
 */
function getCpuCount() {
  try {
    return require('os').cpus().length;
  } catch {
    return 1;
  }
}

/**
 * Get bot status object with all relevant info
 * @param {string} botName - Bot name
 * @param {string} ownerName - Owner name
 * @param {string} prefix - Command prefix
 * @param {string} version - Bot version
 * @returns {object} Bot status
 */
function getBotStatus(botName, ownerName, prefix, version = '1.0.0') {
  return {
    name: botName,
    owner: ownerName,
    prefix: prefix,
    version: version,
    uptime: getUptimeString(),
    uptimeSeconds: getUptimeSeconds(),
    memory: getMemoryUsage(),
    memoryString: getMemoryString(),
    nodeVersion: getNodeVersion(),
    platform: getPlatform(),
    cpuCount: getCpuCount()
  };
}

/**
 * Calculate ping/latency
 * @returns {Promise<number>} Latency in ms
 */
async function measurePing() {
  const start = Date.now();
  // Simple measurement - actual network ping would require external call
  await Promise.resolve();
  return Date.now() - start;
}

/**
 * Get system health status
 * @returns {object} Health indicators
 */
function getHealthStatus() {
  const mem = getMemoryUsage();
  const memPercent = (mem.used / mem.total) * 100;
  
  let status = 'healthy';
  if (memPercent > 90) status = 'critical';
  else if (memPercent > 75) status = 'warning';
  
  return {
    status,
    memoryPercent: Math.round(memPercent),
    uptime: getUptimeSeconds(),
    timestamp: new Date().toISOString()
  };
}

/**
 * SECURITY NOTE: This module intentionally does NOT expose:
 * - File paths
 * - Environment variables
 * - Network interfaces
 * - Detailed CPU model information
 * - Hostname
 * - User information
 * - Process arguments
 */

// Module exports will be added by the conversion script

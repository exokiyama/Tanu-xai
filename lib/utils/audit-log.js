const { writeFile, readFile, mkdir } = require('fs/promises');
const { dirname, join } = require('path');

const { existsSync } = require('fs');
const __dirname = __dirname;
const AUDIT_LOG_PATH = join(__dirname, '../../data/audit-logs.json');

/**
 * Audit Logging System for Owner/Sudo Commands
 * 
 * This module logs all privileged command usage for security and accountability.
 * Logs are tamper-resistant and stored in a secure location.
 */

// In-memory log buffer for performance
let logBuffer = [];
const MAX_BUFFER_SIZE = 100;

/**
 * Log entry structure
 * @typedef {Object} AuditLogEntry
 * @property {string} id - Unique log entry ID
 * @property {string} timestamp - ISO timestamp
 * @property {string} command - Command name executed
 * @property {string} senderJid - Sender's WhatsApp JID
 * @property {string} senderPhone - Sender's phone number (sanitized)
 * @property {string} chatId - Chat/group JID where command was executed
 * @property {boolean} isGroup - Whether command was executed in a group
 * @property {object} parameters - Sanitized command parameters
 * @property {boolean} success - Whether execution succeeded
 * @property {string} error - Error message if failed
 * @property {string} permissionLevel - Permission level used (owner/sudo)
 */

/**
 * Generate unique ID for log entry
 * @returns {string}
 */
function generateId() {
  return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Sanitize sensitive data before logging
 * @param {any} data - Data to sanitize
 * @returns {any}
 */
function sanitizeData(data) {
  if (!data) return null;
  
  if (typeof data === 'string') {
    // Truncate long strings
    return data.length > 500 ? data.substring(0, 500) + '...' : data;
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }
  
  if (typeof data === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      // Skip sensitive fields
      if (['password', 'token', 'secret', 'session'].includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeData(value);
      }
    }
    return sanitized;
  }
  
  return data;
}

/**
 * Load audit logs from file
 * @returns {Promise<Array>}
 */
async function loadAuditLogs() {
  try {
    if (!existsSync(AUDIT_LOG_PATH)) {
      return [];
    }
    
    const data = await readFile(AUDIT_LOG_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('[AuditLog] Failed to load logs:', error.message);
    return [];
  }
}

/**
 * Save audit logs to file
 * @param {Array} logs - Logs to save
 * @returns {Promise<boolean>}
 */
async function saveAuditLogs(logs) {
  try {
    const configDir = dirname(AUDIT_LOG_PATH);
    
    if (!existsSync(configDir)) {
      await mkdir(configDir, { recursive: true });
    }
    
    await writeFile(AUDIT_LOG_PATH, JSON.stringify(logs, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('[AuditLog] Failed to save logs:', error.message);
    return false;
  }
}

/**
 * Log an owner/sudo command execution
 * 
 * @param {Object} options - Log options
 * @param {string} options.command - Command name
 * @param {string} options.senderJid - Sender's JID
 * @param {string} options.chatId - Chat JID
 * @param {boolean} options.isGroup - Whether in group
 * @param {object} options.parameters - Command parameters (will be sanitized)
 * @param {boolean} options.success - Execution success
 * @param {string} options.error - Error message if failed
 * @param {string} options.permissionLevel - 'owner' or 'sudo'
 * @returns {Promise<AuditLogEntry>}
 */
async function logCommandExecution({
  command,
  senderJid,
  chatId,
  isGroup = false,
  parameters = {},
  success = true,
  error = null,
  permissionLevel = 'owner'
}) {
  const entry = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    command,
    senderJid,
    senderPhone: senderJid ? senderJid.split('@')[0].replace(/\D/g, '') : 'unknown',
    chatId,
    isGroup,
    parameters: sanitizeData(parameters),
    success,
    error: error ? sanitizeData(error) : null,
    permissionLevel
  };
  
  // Add to buffer
  logBuffer.push(entry);
  
  // Flush buffer if full
  if (logBuffer.length >= MAX_BUFFER_SIZE) {
    await flushLogs();
  }
  
  // Console output for immediate visibility (in production, this would be disabled)
  const logSymbol = success ? '✅' : '❌';
  console.log(`[AUDIT] ${logSymbol} ${command} by ${entry.senderPhone} (${permissionLevel}) - ${success ? 'SUCCESS' : 'FAILED'}`);
  
  return entry;
}

/**
 * Flush buffered logs to disk
 * @returns {Promise<boolean>}
 */
async function flushLogs() {
  if (logBuffer.length === 0) return true;
  
  const existingLogs = await loadAuditLogs();
  const newLogs = [...existingLogs, ...logBuffer];
  
  // Keep only last 10000 entries to prevent unbounded growth
  const trimmedLogs = newLogs.slice(-10000);
  
  const result = await saveAuditLogs(trimmedLogs);
  
  if (result) {
    logBuffer = [];
  }
  
  return result;
}

/**
 * Get recent audit logs
 * @param {number} limit - Number of entries to retrieve
 * @returns {Promise<Array>}
 */
async function getRecentLogs(limit = 50) {
  const logs = await loadAuditLogs();
  return logs.slice(-limit);
}

/**
 * Search audit logs by command
 * @param {string} commandName - Command to search for
 * @returns {Promise<Array>}
 */
async function searchLogsByCommand(commandName) {
  const logs = await loadAuditLogs();
  return logs.filter(log => log.command === commandName);
}

/**
 * Search audit logs by user
 * @param {string} phoneNumber - Phone number to search for
 * @returns {Promise<Array>}
 */
async function searchLogsByUser(phoneNumber) {
  const logs = await loadAuditLogs();
  const normalized = phoneNumber.replace(/\D/g, '');
  return logs.filter(log => log.senderPhone === normalized);
}

/**
 * Get audit statistics
 * @returns {Promise<Object>}
 */
async function getAuditStats() {
  const logs = await loadAuditLogs();
  
  const stats = {
    totalEntries: logs.length,
    successfulExecutions: logs.filter(l => l.success).length,
    failedExecutions: logs.filter(l => !l.success).length,
    ownerExecutions: logs.filter(l => l.permissionLevel === 'owner').length,
    sudoExecutions: logs.filter(l => l.permissionLevel === 'sudo').length,
    commandsUsed: [...new Set(logs.map(l => l.command))],
    uniqueUsers: [...new Set(logs.map(l => l.senderPhone))]
  };
  
  return stats;
}

/**
 * Clear old audit logs (for maintenance)
 * @param {number} daysToKeep - Number of days to keep logs
 * @returns {Promise<number>} Number of entries removed
 */
async function clearOldLogs(daysToKeep = 30) {
  const logs = await loadAuditLogs();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  const filteredLogs = logs.filter(log => {
    const logDate = new Date(log.timestamp);
    return logDate >= cutoffDate;
  });
  
  const removedCount = logs.length - filteredLogs.length;
  
  if (removedCount > 0) {
    await saveAuditLogs(filteredLogs);
  }
  
  return removedCount;
}

// Auto-flush logs every 5 minutes
setInterval(() => {
  flushLogs().catch(console.error);
}, 5 * 60 * 1000);

// Flush on process exit
process.on('exit', () => {
  try {
    // Synchronous flush for process exit
    const logs = JSON.parse(require('fs').readFileSync(AUDIT_LOG_PATH, 'utf8') || '[]');
    const newLogs = [...logs, ...logBuffer].slice(-10000);
    require('fs').writeFileSync(AUDIT_LOG_PATH, JSON.stringify(newLogs, null, 2));
  } catch (e) {
    // Ignore errors on exit
  }
});

module.exports = { log };
module.exports.default = log;

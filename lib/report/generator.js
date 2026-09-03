/**
 * Report Generator - Generates daily report content
 * Collects data from various sources and formats it into a readable report
 */

const config = require('../config/config');
const { formatBytes, formatDuration } = require('./format');

// In-memory cache for recent messages (avoids DB queries on every message)
const recentMessages = [];
const MAX_RECENT_MESSAGES = 50;

/**
 * Store a message for later inclusion in reports
 * Called by message handler, batched to avoid excessive memory usage
 */
function storeMessage(messageData) {
  recentMessages.push({
    timestamp: messageData.timestamp || new Date(),
    senderJid: messageData.senderJid,
    senderName: messageData.senderName,
    messageType: messageData.messageType,
    content: messageData.content,
    caption: messageData.caption,
    groupId: messageData.groupId,
    groupName: messageData.groupName
  });
  
  // Keep only recent messages
  if (recentMessages.length > MAX_RECENT_MESSAGES) {
    recentMessages.shift();
  }
}

/**
 * Format a single message as chat-like text
 */
function formatMessage(msg) {
  const time = new Date(msg.timestamp).toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
  
  let content = '';
  
  switch (msg.messageType) {
    case 'text':
      content = `💬 ${msg.content || ''}`;
      break;
    case 'image':
      content = `📷 [Image]${msg.caption ? `\n📝 Caption: ${msg.caption}` : ''}`;
      break;
    case 'video':
      content = `🎥 [Video]${msg.caption ? `\n📝 Caption: ${msg.caption}` : ''}`;
      break;
    case 'audio':
      content = `🎵 [Audio]`;
      break;
    case 'sticker':
      content = `✨ [Sticker]`;
      break;
    case 'document':
      content = `📄 [Document: ${msg.content || 'unknown'}]`;
      break;
    case 'location':
      content = `📍 [Location: ${msg.content || 'lat/lng'}]`;
      break;
    case 'contact':
      content = `👤 [Contact: ${msg.content || 'name'}]`;
      break;
    case 'command':
      content = `⚙️ ${msg.content || ''}`;
      break;
    default:
      content = `📦 [${msg.messageType || 'Unknown'}]`;
  }
  
  const sender = msg.groupId 
    ? `${msg.senderName} (${msg.groupName})`
    : msg.senderName;
  
  return `👤 ${sender}\n${content}\n🕐 ${time}`;
}

/**
 * Generate the raw messages section of the report
 */
function generateMessagesSection() {
  if (recentMessages.length === 0) {
    return 'No recent messages recorded.';
  }
  
  let text = '╭────────────────────────\n';
  text += '│ 💬 Recent Messages\n';
  text += '╰────────────────────────\n\n';
  
  for (const msg of recentMessages) {
    text += formatMessage(msg) + '\n\n';
  }
  
  return text.trim();
}

/**
 * Get bot status information
 */
async function getBotStatus(db) {
  const uptime = process.uptime();
  const memUsage = process.memoryUsage();
  
  return {
    uptime: formatDuration(uptime),
    memory: {
      used: formatBytes(memUsage.heapUsed),
      total: formatBytes(memUsage.heapTotal)
    },
    platform: process.platform,
    nodeVersion: process.version,
    connected: true // Would be set by main index.js
  };
}

/**
 * Get command statistics from database or cache
 */
async function getCommandStats(db) {
  if (!db || !db.isConnected()) {
    return {
      total: 0,
      topCommands: [],
      todayCount: 0
    };
  }
  
  try {
    // Query would go here if DB is available
    // For now, return placeholder
    return {
      total: 0,
      topCommands: [],
      todayCount: 0
    };
  } catch (error) {
    console.error('[ReportGenerator] Error getting command stats:', error);
    return {
      total: 0,
      topCommands: [],
      todayCount: 0
    };
  }
}

/**
 * Get user activity statistics
 */
async function getUserStats(db) {
  if (!db || !db.isConnected()) {
    return {
      activeUsers: 0,
      newRegistrations: 0
    };
  }
  
  try {
    return {
      activeUsers: 0,
      newRegistrations: 0
    };
  } catch (error) {
    console.error('[ReportGenerator] Error getting user stats:', error);
    return {
      activeUsers: 0,
      newRegistrations: 0
    };
  }
}

/**
 * Get group activity statistics
 */
async function getGroupStats(db) {
  if (!db || !db.isConnected()) {
    return {
      activeGroups: 0,
      messageCount: 0
    };
  }
  
  try {
    return {
      activeGroups: 0,
      messageCount: 0
    };
  } catch (error) {
    console.error('[ReportGenerator] Error getting group stats:', error);
    return {
      activeGroups: 0,
      messageCount: 0
    };
  }
}

/**
 * Get RPG statistics (if applicable)
 */
async function getRpgStats(db) {
  if (!db || !db.isConnected()) {
    return {
      totalTransactions: 0,
      topEarners: []
    };
  }
  
  try {
    return {
      totalTransactions: 0,
      topEarners: []
    };
  } catch (error) {
    console.error('[ReportGenerator] Error getting RPG stats:', error);
    return {
      totalTransactions: 0,
      topEarners: []
    };
  }
}

/**
 * Get protection events statistics
 */
async function getProtectionStats(db) {
  if (!db || !db.isConnected()) {
    return {
      messagesBlocked: 0,
      warningsIssued: 0
    };
  }
  
  try {
    return {
      messagesBlocked: 0,
      warningsIssued: 0
    };
  } catch (error) {
    console.error('[ReportGenerator] Error getting protection stats:', error);
    return {
      messagesBlocked: 0,
      warningsIssued: 0
    };
  }
}

/**
 * Get error summary
 */
async function getErrorSummary(db) {
  if (!db || !db.isConnected()) {
    return {
      errorCount: 0,
      criticalErrors: []
    };
  }
  
  try {
    return {
      errorCount: 0,
      criticalErrors: []
    };
  } catch (error) {
    console.error('[ReportGenerator] Error getting error summary:', error);
    return {
      errorCount: 0,
      criticalErrors: []
    };
  }
}

/**
 * Get database status
 */
async function getDatabaseStatus(db) {
  if (!db || !db.isConnected()) {
    return {
      connected: false,
      queryCount: 0,
      slowQueries: 0
    };
  }
  
  try {
    return {
      connected: true,
      queryCount: 0,
      slowQueries: 0
    };
  } catch (error) {
    console.error('[ReportGenerator] Error getting DB status:', error);
    return {
      connected: false,
      queryCount: 0,
      slowQueries: 0
    };
  }
}

/**
 * Redact sensitive data from report content
 */
function redactSensitiveData(text) {
  const sensitivePatterns = [
    { pattern: /password[=:]\s*["']?[\w@#$%^&*!]+["']?/gi, replacement: 'password=[REDACTED]' },
    { pattern: /secret[=:]\s*["']?[\w@#$%^&*!]+["']?/gi, replacement: 'secret=[REDACTED]' },
    { pattern: /token[=:]\s*["']?[\w@#$%^&*!]+["']?/gi, replacement: 'token=[REDACTED]' },
    { pattern: /api_key[=:]\s*["']?[\w@#$%^&*!]+["']?/gi, replacement: 'api_key=[REDACTED]' },
    { pattern: /SMTP_PASSWORD[=:]\s*["']?[\w@#$%^&*!]+["']?/gi, replacement: 'SMTP_PASSWORD=[REDACTED]' }
  ];
  
  let redacted = text;
  for (const { pattern, replacement } of sensitivePatterns) {
    redacted = redacted.replace(pattern, replacement);
  }
  
  return redacted;
}

/**
 * Generate complete report
 * @param {object} db - Database connection
 * @returns {Promise<string>} Formatted report text
 */
async function generate(db) {
  const now = new Date();
  const timestamp = now.toLocaleString('en-US', { 
    timeZone: config.TIMEZONE || 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  
  // Gather all statistics
  const [botStatus, cmdStats, userStats, groupStats, rpgStats, protectionStats, errorSummary, dbStatus] = await Promise.all([
    getBotStatus(db),
    getCommandStats(db),
    getUserStats(db),
    getGroupStats(db),
    getRpgStats(db),
    getProtectionStats(db),
    getErrorSummary(db),
    getDatabaseStatus(db)
  ]);
  
  // Build report header
  let report = '╔═══════════════════════════════════╗\n';
  report += `║     📊 ${config.BOT_NAME} DAILY REPORT     ║\n`;
  report += '╚═══════════════════════════════════╝\n\n';
  
  report += `🕐 Generated: ${timestamp}\n`;
  report += `⏱️ Uptime: ${botStatus.uptime}\n`;
  report += `💾 Memory: ${botStatus.memory.used} / ${botStatus.memory.total}\n\n`;
  
  // Bot Status Section
  report += '╭────────────────────────\n';
  report += '│ 🤖 Bot Status\n';
  report += '╰────────────────────────\n';
  report += `  • Platform: ${botStatus.platform}\n`;
  report += `  • Node.js: ${botStatus.nodeVersion}\n`;
  report += `  • Connection: ${botStatus.connected ? '✅ Active' : '❌ Disconnected'}\n\n`;
  
  // Command Statistics Section
  report += '╭────────────────────────\n';
  report += '│ ⚙️ Command Statistics\n';
  report += '╰────────────────────────\n';
  report += `  • Total Executed: ${cmdStats.total}\n`;
  report += `  • Today: ${cmdStats.todayCount}\n`;
  if (cmdStats.topCommands.length > 0) {
    report += '  • Top Commands:\n';
    for (const cmd of cmdStats.topCommands.slice(0, 5)) {
      report += `    - ${cmd.name}: ${cmd.count}\n`;
    }
  }
  report += '\n';
  
  // User Activity Section
  report += '╭────────────────────────\n';
  report += '│ 👥 User Activity\n';
  report += '╰────────────────────────\n';
  report += `  • Active Users: ${userStats.activeUsers}\n`;
  report += `  • New Registrations: ${userStats.newRegistrations}\n\n`;
  
  // Group Activity Section
  report += '╭────────────────────────\n';
  report += '│ 🏠 Group Activity\n';
  report += '╰────────────────────────\n';
  report += `  • Active Groups: ${groupStats.activeGroups}\n`;
  report += `  • Messages: ${groupStats.messageCount}\n\n`;
  
  // RPG Statistics Section (if applicable)
  report += '╭────────────────────────\n';
  report += '│ 🎮 RPG Statistics\n';
  report += '╰────────────────────────\n';
  report += `  • Total Transactions: ${rpgStats.totalTransactions}\n`;
  if (rpgStats.topEarners.length > 0) {
    report += '  • Top Earners:\n';
    for (const earner of rpgStats.topEarners.slice(0, 3)) {
      report += `    - ${earner.name}: ${earner.amount}\n`;
    }
  }
  report += '\n';
  
  // Protection Events Section
  report += '╭────────────────────────\n';
  report += '│ 🛡️ Protection Events\n';
  report += '╰────────────────────────\n';
  report += `  • Messages Blocked: ${protectionStats.messagesBlocked}\n`;
  report += `  • Warnings Issued: ${protectionStats.warningsIssued}\n\n`;
  
  // Error Summary Section
  report += '╭────────────────────────\n';
  report += '│ ❌ Error Summary\n';
  report += '╰────────────────────────\n';
  report += `  • Total Errors: ${errorSummary.errorCount}\n`;
  if (errorSummary.criticalErrors.length > 0) {
    report += '  • Critical Errors:\n';
    for (const err of errorSummary.criticalErrors.slice(0, 5)) {
      report += `    - ${err}\n`;
    }
  }
  report += '\n';
  
  // Database Status Section
  report += '╭────────────────────────\n';
  report += '│ 🗄️ Database Status\n';
  report += '╰────────────────────────\n';
  report += `  • Connection: ${dbStatus.connected ? '✅ Active' : '❌ Disconnected'}\n`;
  report += `  • Query Count: ${dbStatus.queryCount}\n`;
  report += `  • Slow Queries: ${dbStatus.slowQueries}\n\n`;
  
  // Raw Messages Section
  report += generateMessagesSection();
  report += '\n\n';
  
  // Footer
  report += '╭────────────────────────\n';
  report += '│ End of Report\n';
  report += '╰────────────────────────\n';
  
  // Redact sensitive data before returning
  return redactSensitiveData(report);
}

module.exports = {
  generate,
  storeMessage,
  redactSensitiveData
};

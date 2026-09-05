```javascript
/**
 * Tanu XAI - Daily Report Generator
 *
 * PostgreSQL is used for:
 * - RPG statistics
 * - command statistics
 * - user statistics
 * - group statistics
 * - daily report persistence/data
 *
 * Recent messages stay in memory so PostgreSQL is NOT queried
 * for every incoming WhatsApp message.
 */

const { config } = require('../../config/config.js');
const { formatBytes, formatDuration } = require('./format');

/* =========================================================
 * IN-MEMORY RECENT MESSAGES
 * ========================================================= */

const recentMessages = [];
const MAX_RECENT_MESSAGES = 50;

function storeMessage(messageData = {}) {
  recentMessages.push({
    timestamp: messageData.timestamp || new Date(),
    senderJid: messageData.senderJid || null,
    senderName: messageData.senderName || 'Unknown',
    messageType: messageData.messageType || 'unknown',
    content: messageData.content || '',
    caption: messageData.caption || '',
    groupId: messageData.groupId || null,
    groupName: messageData.groupName || null
  });

  if (recentMessages.length > MAX_RECENT_MESSAGES) {
    recentMessages.shift();
  }
}

/* =========================================================
 * MESSAGE FORMAT
 * ========================================================= */

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
      content =
        `📷 [Image]` +
        (msg.caption ? `\n📝 Caption: ${msg.caption}` : '');
      break;

    case 'video':
      content =
        `🎥 [Video]` +
        (msg.caption ? `\n📝 Caption: ${msg.caption}` : '');
      break;

    case 'audio':
      content = '🎵 [Audio]';
      break;

    case 'sticker':
      content = '✨ [Sticker]';
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
    ? `${msg.senderName || 'Unknown'} (${msg.groupName || 'Unknown Group'})`
    : msg.senderName || 'Unknown';

  return `👤 ${sender}\n${content}\n🕐 ${time}`;
}

/* =========================================================
 * RECENT MESSAGE SECTION
 * ========================================================= */

function generateMessagesSection() {
  if (recentMessages.length === 0) {
    return '╭────────────────────────\n' +
           '│ 💬 Recent Messages\n' +
           '╰────────────────────────\n\n' +
           'No recent messages recorded.';
  }

  let text = '╭────────────────────────\n';
  text += '│ 💬 Recent Messages\n';
  text += '╰────────────────────────\n\n';

  for (const msg of recentMessages) {
    text += formatMessage(msg) + '\n\n';
  }

  return text.trim();
}

/* =========================================================
 * DATABASE HELPER
 * ========================================================= */

function isDatabaseAvailable(db) {
  if (!db) return false;

  if (typeof db.is_connected === 'function') {
    return db.is_connected();
  }

  if (typeof db.isConnected === 'function') {
    return db.isConnected();
  }

  return false;
}

/* =========================================================
 * BOT STATUS
 * ========================================================= */

async function getBotStatus() {
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

    connected: true
  };
}

/* =========================================================
 * COMMAND STATISTICS
 * ========================================================= */

async function getCommandStats(db) {
  if (!isDatabaseAvailable(db)) {
    return {
      total: 0,
      todayCount: 0,
      topCommands: []
    };
  }

  try {
    const totalResult = await db.query(`
      SELECT COUNT(*)::int AS total
      FROM command_usage
    `);

    const todayResult = await db.query(`
      SELECT COUNT(*)::int AS today_count
      FROM command_usage
      WHERE created_at >= CURRENT_DATE
    `);

    const topResult = await db.query(`
      SELECT
        command_name AS name,
        COUNT(*)::int AS count
      FROM command_usage
      WHERE created_at >= CURRENT_DATE
      GROUP BY command_name
      ORDER BY count DESC
      LIMIT 5
    `);

    return {
      total: totalResult.rows[0]?.total || 0,

      todayCount:
        todayResult.rows[0]?.today_count || 0,

      topCommands: topResult.rows || []
    };

  } catch (error) {
    console.error(
      '[ReportGenerator] Error getting command stats:',
      error.message
    );

    return {
      total: 0,
      todayCount: 0,
      topCommands: []
    };
  }
}

/* =========================================================
 * USER STATISTICS
 * ========================================================= */

async function getUserStats(db) {
  if (!isDatabaseAvailable(db)) {
    return {
      activeUsers: 0,
      newRegistrations: 0
    };
  }

  try {
    const activeResult = await db.query(`
      SELECT COUNT(*)::int AS count
      FROM users
      WHERE updated_at >= CURRENT_DATE
    `);

    const registrationResult = await db.query(`
      SELECT COUNT(*)::int AS count
      FROM users
      WHERE created_at >= CURRENT_DATE
    `);

    return {
      activeUsers: activeResult.rows[0]?.count || 0,
      newRegistrations: registrationResult.rows[0]?.count || 0
    };

  } catch (error) {
    console.error(
      '[ReportGenerator] Error getting user stats:',
      error.message
    );

    return {
      activeUsers: 0,
      newRegistrations: 0
    };
  }
}

/* =========================================================
 * GROUP STATISTICS
 * ========================================================= */

async function getGroupStats(db) {
  if (!isDatabaseAvailable(db)) {
    return {
      activeGroups: 0,
      messageCount: 0
    };
  }

  try {
    /*
     * If your message statistics table is available,
     * use it here.
     *
     * We intentionally do not assume a messages table exists,
     * because the current RPG schema may not contain one.
     */

    let activeGroups = 0;
    let messageCount = recentMessages.length;

    try {
      const groupResult = await db.query(`
        SELECT COUNT(DISTINCT group_id)::int AS count
        FROM command_usage
        WHERE created_at >= CURRENT_DATE
          AND group_id IS NOT NULL
      `);

      activeGroups = groupResult.rows[0]?.count || 0;

    } catch (_) {
      /*
       * group_id may not exist in command_usage.
       * Keep report generation working.
       */
      activeGroups = 0;
    }

    return {
      activeGroups,
      messageCount
    };

  } catch (error) {
    console.error(
      '[ReportGenerator] Error getting group stats:',
      error.message
    );

    return {
      activeGroups: 0,
      messageCount: recentMessages.length
    };
  }
}

/* =========================================================
 * RPG STATISTICS
 * ========================================================= */

async function getRpgStats(db) {
  if (!isDatabaseAvailable(db)) {
    return {
      totalTransactions: 0,
      topEarners: []
    };
  }

  try {
    const transactionResult = await db.query(`
      SELECT COUNT(*)::int AS total
      FROM transactions
      WHERE created_at >= CURRENT_DATE
    `);

    const topResult = await db.query(`
      SELECT
        u.display_name AS name,
        e.coins::bigint AS amount
      FROM economy e
      JOIN users u
        ON u.id = e.user_id
      ORDER BY e.coins DESC
      LIMIT 3
    `);

    return {
      totalTransactions:
        transactionResult.rows[0]?.total || 0,

      topEarners: (topResult.rows || []).map(row => ({
        name: row.name || 'Unknown',
        amount: Number(row.amount) || 0
      }))
    };

  } catch (error) {
    console.error(
      '[ReportGenerator] Error getting RPG stats:',
      error.message
    );

    return {
      totalTransactions: 0,
      topEarners: []
    };
  }
}

/* =========================================================
 * PROTECTION STATISTICS
 * ========================================================= */

async function getProtectionStats(db) {
  /*
   * Protection counters can later be connected to a
   * protection_events table.
   *
   * For now we safely return zero instead of making
   * assumptions about tables that may not exist.
   */

  return {
    messagesBlocked: 0,
    warningsIssued: 0
  };
}

/* =========================================================
 * ERROR SUMMARY
 * ========================================================= */

async function getErrorSummary(db) {
  /*
   * This remains zero until a persistent error table/log
   * is connected to the report system.
   */

  return {
    errorCount: 0,
    criticalErrors: []
  };
}

/* =========================================================
 * DATABASE STATUS
 * ========================================================= */

async function getDatabaseStatus(db) {
  if (!isDatabaseAvailable(db)) {
    return {
      connected: false,
      queryCount: 0,
      slowQueries: 0
    };
  }

  try {
    /*
     * Keep this lightweight.
     * Do not spam PostgreSQL with unnecessary health queries.
     */

    await db.query('SELECT 1');

    return {
      connected: true,
      queryCount: 0,
      slowQueries: 0
    };

  } catch (error) {
    console.error(
      '[ReportGenerator] Error checking DB status:',
      error.message
    );

    return {
      connected: false,
      queryCount: 0,
      slowQueries: 0
    };
  }
}

/* =========================================================
 * SENSITIVE DATA REDACTION
 * ========================================================= */

function redactSensitiveData(text) {
  const sensitivePatterns = [
    {
      pattern: /password[=:]\s*["']?[\w@#$%^&*!]+["']?/gi,
      replacement: 'password=[REDACTED]'
    },

    {
      pattern: /secret[=:]\s*["']?[\w@#$%^&*!]+["']?/gi,
      replacement: 'secret=[REDACTED]'
    },

    {
      pattern: /token[=:]\s*["']?[\w@#$%^&*!]+["']?/gi,
      replacement: 'token=[REDACTED]'
    },

    {
      pattern: /api[_-]?key[=:]\s*["']?[\w@#$%^&*!]+["']?/gi,
      replacement: 'api_key=[REDACTED]'
    },

    {
      pattern: /SMTP_PASSWORD[=:]\s*["']?[\w@#$%^&*!]+["']?/gi,
      replacement: 'SMTP_PASSWORD=[REDACTED]'
    },

    {
      pattern: /DATABASE_URL[=:]\s*["']?[^ \n]+/gi,
      replacement: 'DATABASE_URL=[REDACTED]'
    }
  ];

  let redacted = text;

  for (const { pattern, replacement } of sensitivePatterns) {
    redacted = redacted.replace(pattern, replacement);
  }

  return redacted;
}

/* =========================================================
 * GENERATE COMPLETE REPORT
 * ========================================================= */

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

  /*
   * Gather all statistics.
   *
   * IMPORTANT:
   * Every DB-dependent function receives the central
   * database object. No command creates its own pool.
   */

  const [
    botStatus,
    cmdStats,
    userStats,
    groupStats,
    rpgStats,
    protectionStats,
    errorSummary,
    dbStatus
  ] = await Promise.all([
    getBotStatus(db),
    getCommandStats(db),
    getUserStats(db),
    getGroupStats(db),
    getRpgStats(db),
    getProtectionStats(db),
    getErrorSummary(db),
    getDatabaseStatus(db)
  ]);

  /* =======================================================
   * REPORT HEADER
   * ======================================================= */

  let report =
    '╔═══════════════════════════════════╗\n';

  report +=
    `║     📊 ${config.BOT_NAME || 'Tanu XAI'} DAILY REPORT     ║\n`;

  report +=
    '╚═══════════════════════════════════╝\n\n';

  report += `🕐 Generated: ${timestamp}\n`;
  report += `⏱️ Uptime: ${botStatus.uptime}\n`;
  report +=
    `💾 Memory: ${botStatus.memory.used} / ${botStatus.memory.total}\n\n`;

  /* =======================================================
   * BOT STATUS
   * ======================================================= */

  report += '╭────────────────────────\n';
  report += '│ 🤖 Bot Status\n';
  report += '╰────────────────────────\n';

  report += `  • Platform: ${botStatus.platform}\n`;
  report += `  • Node.js: ${botStatus.nodeVersion}\n`;
  report +=
    `  • Connection: ${
      botStatus.connected
        ? '✅ Active'
        : '❌ Disconnected'
    }\n\n`;

  /* =======================================================
   * COMMAND STATISTICS
   * ======================================================= */

  report += '╭────────────────────────\n';
  report += '│ ⚙️ Command Statistics\n';
  report += '╰────────────────────────\n';

  report += `  • Total Executed: ${cmdStats.total}\n`;
  report += `  • Today: ${cmdStats.todayCount}\n`;

  if (cmdStats.topCommands.length > 0) {
    report += '  • Top Commands:\n';

    for (const cmd of cmdStats.topCommands.slice(0, 5)) {
      report +=
        `    - ${cmd.name}: ${cmd.count}\n`;
    }
  }

  report += '\n';

  /* =======================================================
   * USER ACTIVITY
   * ======================================================= */

  report += '╭────────────────────────\n';
  report += '│ 👥 User Activity\n';
  report += '╰────────────────────────\n';

  report +=
    `  • Active Users: ${userStats.activeUsers}\n`;

  report +=
    `  • New Registrations: ${userStats.newRegistrations}\n\n`;

  /* =======================================================
   * GROUP ACTIVITY
   * ======================================================= */

  report += '╭────────────────────────\n';
  report += '│ 🏠 Group Activity\n';
  report += '╰────────────────────────\n';

  report +=
    `  • Active Groups: ${groupStats.activeGroups}\n`;

  report +=
    `  • Messages: ${groupStats.messageCount}\n\n`;

  /* =======================================================
   * RPG STATISTICS
   * ======================================================= */

  report += '╭────────────────────────\n';
  report += '│ 🎮 RPG Statistics\n';
  report += '╰────────────────────────\n';

  report +=
    `  • Total Transactions: ${rpgStats.totalTransactions}\n`;

  if (rpgStats.topEarners.length > 0) {
    report += '  • Top Earners:\n';

    for (const earner of rpgStats.topEarners.slice(0, 3)) {
      report +=
        `    - ${earner.name}: ${earner.amount}\n`;
    }
  }

  report += '\n';

  /* =======================================================
   * PROTECTION
   * ======================================================= */

  report += '╭────────────────────────\n';
  report += '│ 🛡️ Protection Events\n';
  report += '╰────────────────────────\n';

  report +=
    `  • Messages Blocked: ${protectionStats.messagesBlocked}\n`;

  report +=
    `  • Warnings Issued: ${protectionStats.warningsIssued}\n\n`;

  /* =======================================================
   * ERRORS
   * ======================================================= */

  report += '╭────────────────────────\n';
  report += '│ ❌ Error Summary\n';
  report += '╰────────────────────────\n';

  report +=
    `  • Total Errors: ${errorSummary.errorCount}\n`;

  if (errorSummary.criticalErrors.length > 0) {
    report += '  • Critical Errors:\n';

    for (const err of errorSummary.criticalErrors.slice(0, 5)) {
      report += `    - ${err}\n`;
    }
  }

  report += '\n';

  /* =======================================================
   * DATABASE
   * ======================================================= */

  report += '╭────────────────────────\n';
  report += '│ 🗄️ Database Status\n';
  report += '╰────────────────────────\n';

  report +=
    `  • Connection: ${
      dbStatus.connected
        ? '✅ Active'
        : '❌ Disconnected'
    }\n`;

  report +=
    `  • Query Count: ${dbStatus.queryCount}\n`;

  report +=
    `  • Slow Queries: ${dbStatus.slowQueries}\n\n`;

  /* =======================================================
   * RECENT MESSAGES
   * ======================================================= */

  report += generateMessagesSection();
  report += '\n\n';

  /* =======================================================
   * FOOTER
   * ======================================================= */

  report += '╭────────────────────────\n';
  report += '│ End of Report\n';
  report += '╰────────────────────────';

  return redactSensitiveData(report);
}

/* =========================================================
 * EXPORTS
 * ========================================================= */

module.exports = {
  generate,
  storeMessage,
  redactSensitiveData
};
```

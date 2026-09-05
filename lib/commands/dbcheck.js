/**
 * Command: dbcheck
 * Category: developer (hidden)
 * Description: Shows database connection status and statistics
 * Owner-only, hidden from menu
 */

const redactor = require('../utils/redactor');
const formatter = require('../utils/debug-formatter');
const { isOwner } = require('../utils/permissions.js');

module.exports = {
  name: 'dbcheck',
  pattern: 'dbcheck',
  aliases: ['dbstats', 'dbhealth'],
  category: 'developer',
  description: 'Shows database connection status and statistics',
  usage: '<command>',
  ownerOnly: true,
  groupOnly: false,
  hidden: true,
  
  async execute(sock, message, args, context) {
    const { senderJid } = context;
    
    // CRITICAL: Only permanent owner can access debug commands (no sudo)
    if (!isOwner(senderJid)) {
      await sock.sendMessage(message.key.remoteJid, { 
        text: '❌ This command is restricted to the permanent owner only.' 
      });
      return;
    }
    
    try {
      const jid = message.key.remoteJid;
      
      let output = formatter.createHeader('🗄️ DATABASE DIAGNOSTICS');
      
      // Try to get database instance
      const db = context.db || global.db;
      
      if (!db) {
        output += '\n❌ Database instance not available\n';
        output = redactor.redactString(output);
        await sock.sendMessage(jid, { text: output });
        return;
      }
      
      // Get database status
      let dbStatus = { connected: false };
      try {
        if (typeof db.getStatus === 'function') {
          dbStatus = db.getStatus();
        } else if (db.status) {
          dbStatus = db.status;
        }
      } catch (e) {
        console.error('[DBCHECK] Error getting DB status:', e);
      }
      
      output += formatter.formatSection('Connection Status', {
        'Status': dbStatus.connected ? '✅ Connected' : '❌ Disconnected',
        'Type': dbStatus.type || 'SQLite',
        'Path': dbStatus.path ? redactor.redactString(dbStatus.path) : 'Unknown'
      });
      
      // Get pool statistics if available
      if (dbStatus.pool) {
        output += `\n📊 Pool Statistics\n`;
        output += formatter.formatKeyValue('Active Connections', dbStatus.pool.active || 0);
        output += formatter.formatKeyValue('Idle Connections', dbStatus.pool.idle || 0);
        output += formatter.formatKeyValue('Max Pool Size', dbStatus.pool.max || 10, true);
      }
      
      // Get query statistics if available
      if (dbStatus.queries) {
        output += `\n📈 Query Statistics\n`;
        output += formatter.formatKeyValue('Total Queries', dbStatus.queries.total || 0);
        output += formatter.formatKeyValue('Avg Response Time', `${dbStatus.queries.avgTime || 0}ms`);
        if (dbStatus.queries.slowCount > 0) {
          output += formatter.formatKeyValue('Slow Queries (>100ms)', dbStatus.queries.slowCount, true);
        }
      }
      
      // Get table row counts if available
      try {
        if (typeof db.getTableStats === 'function') {
          const tableStats = db.getTableStats();
          if (tableStats && Object.keys(tableStats).length > 0) {
            output += `\n📋 Table Row Counts\n`;
            const tables = Object.entries(tableStats);
            for (let i = 0; i < Math.min(tables.length, 10); i++) {
              const [table, count] = tables[i];
              const isLast = i === Math.min(tables.length, 10) - 1;
              output += formatter.formatKeyValue(table, `${count} rows`, isLast);
            }
            if (tables.length > 10) {
              output += `  └─ ... and ${tables.length - 10} more tables\n`;
            }
          }
        }
      } catch (e) {
        // Table stats unavailable, skip silently
      }
      
      // Redact any sensitive data before sending
      output = redactor.redactString(output);
      
      await sock.sendMessage(jid, { text: output });
      
    } catch (error) {
      console.error('[DBCHECK] Error executing dbcheck command:', error);
      await sock.sendMessage(message.key.remoteJid, { 
        text: '❌ Database check failed. Check logs for details.' 
      });
    }
  }
};

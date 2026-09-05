/**
 * Command: debug
 * Category: developer (hidden)
 * Description: Shows comprehensive system diagnostics
 * Owner-only, hidden from menu
 */

const { config } = require('../../config/config.js');
const redactor = require('../utils/redactor');
const formatter = require('../utils/debug-formatter');
const { isOwner } = require('../utils/permissions.js');

module.exports = {
  name: 'debug',
  pattern: 'debug',
  aliases: ['diag', 'diagnostics'],
  category: 'developer',
  description: 'Shows comprehensive system diagnostics',
  usage: '<command>',
  ownerOnly: true,
  groupOnly: false,
  hidden: true,
  
  async execute(sock, message, args, context) {
    const { registry, senderJid } = context;
    
    // CRITICAL: Only permanent owner can access debug commands (no sudo)
    if (!isOwner(senderJid)) {
      await sock.sendMessage(message.key.remoteJid, { 
        text: '❌ This command is restricted to the permanent owner only.' 
      });
      return;
    }
    
    try {
      const jid = message.key.remoteJid;
      
      // Gather system information
      const uptime = process.uptime();
      const memUsage = process.memoryUsage();
      const nodeVersion = process.version;
      const platform = `${process.platform} ${process.arch}`;
      
      // Get command registry stats
      const allCommands = registry.getAllCommands();
      const commandCount = allCommands.length;
      
      // Build diagnostic output
      let output = formatter.createHeader('🔧 DEBUG DIAGNOSTICS');
      
      // System Information
      output += formatter.formatSection('System Information', {
        'Node.js': nodeVersion,
        'Platform': platform,
        'Uptime': formatter.formatUptime(uptime),
        'Memory': formatter.formatMemory(memUsage.heapUsed, memUsage.heapTotal)
      });
      
      // WhatsApp Connection Status
      const waStatus = context.waConnection?.status || 'unknown';
      const waUser = context.waConnection?.user?.id || 'Not connected';
      output += `\n🔌 WhatsApp Connection\n`;
      output += formatter.formatKeyValue('Status', waStatus === 'connected' ? '✅ Connected' : '❌ Disconnected');
      output += formatter.formatKeyValue('User', waUser, true);
      
      // Command Registry
      output += `\n📦 Command Registry\n`;
      output += formatter.formatKeyValue('Total Commands', commandCount);
      
      // Database Status (if available)
      try {
        const db = context.db || global.db;
        if (db && typeof db.getStatus === 'function') {
          const dbStatus = db.getStatus();
          output += `\n🗄️ Database Status\n`;
          output += formatter.formatKeyValue('Connection', dbStatus.connected ? '✅ Connected' : '❌ Disconnected');
        } else {
          output += `\n🗄️ Database Status\n`;
          output += formatter.formatKeyValue('Connection', '⚠️ Status unavailable');
        }
      } catch (e) {
        output += `\n🗄️ Database Status\n`;
        output += formatter.formatKeyValue('Connection', '⚠️ Error checking status');
      }
      
      // Cache Status
      try {
        const cacheStats = require('../utils/cache').getCacheStats();
        output += `\n💾 Cache Statistics\n`;
        output += formatter.formatKeyValue('Total Entries', cacheStats.total);
        output += formatter.formatKeyValue('Active', cacheStats.active);
        output += formatter.formatKeyValue('Expired', cacheStats.expired, true);
      } catch (e) {
        output += `\n💾 Cache Statistics\n`;
        output += formatter.formatKeyValue('Status', '⚠️ Unavailable');
      }
      
      // Redact any sensitive data before sending
      output = redactor.redactString(output);
      
      await sock.sendMessage(jid, { text: output });
      
    } catch (error) {
      console.error('[DEBUG] Error executing debug command:', error);
      await sock.sendMessage(message.key.remoteJid, { 
        text: '❌ Debug diagnostic failed. Check logs for details.' 
      });
    }
  }
};

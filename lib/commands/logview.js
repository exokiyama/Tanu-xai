/**
 * Command: logview
 * Category: developer (hidden)
 * Description: Shows recent log entries with optional filtering
 * Owner-only, hidden from menu
 */

const fs = require('fs');
const path = require('path');
const redactor = require('../utils/redactor');
const formatter = require('../utils/debug-formatter');
const { isOwner } = require('../utils/permissions.js');

// Log file location
const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'bot.log');

module.exports = {
  name: 'logview',
  pattern: 'logview',
  aliases: ['logtail', 'logsearch'],
  category: 'developer',
  description: 'Shows recent log entries with optional filtering',
  usage: '<level> | <count> | <search-term>',
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
      
      let output = formatter.createHeader('📜 LOG VIEWER');
      
      // Parse arguments
      let count = 20; // Default lines
      let filter = null;
      let searchTerm = null;
      
      for (const arg of args) {
        const num = parseInt(arg, 10);
        if (!isNaN(num) && num > 0 && num <= 100) {
          count = num;
        } else if (['error', 'warn', 'info', 'debug'].includes(arg.toLowerCase())) {
          filter = arg.toLowerCase();
        } else if (arg.startsWith('--') || arg.startsWith('-')) {
          // Skip flags
          continue;
        } else {
          searchTerm = arg;
        }
      }
      
      // Check if log file exists
      if (!fs.existsSync(LOG_FILE)) {
        output += '\n⚠️ Log file not found.\n';
        output += `   Expected location: ${LOG_FILE}\n`;
        output = redactor.redactString(output);
        await sock.sendMessage(jid, { text: output });
        return;
      }
      
      // Read log file
      let logContent = fs.readFileSync(LOG_FILE, 'utf8');
      let lines = logContent.split('\n').filter(line => line.trim());
      
      // Apply level filter
      if (filter) {
        lines = lines.filter(line => line.toLowerCase().includes(filter));
      }
      
      // Apply search term
      if (searchTerm) {
        lines = lines.filter(line => line.toLowerCase().includes(searchTerm.toLowerCase()));
      }
      
      // Get last N lines
      const totalLines = lines.length;
      lines = lines.slice(-count);
      
      output += `\n📊 Log Overview\n`;
      output += formatter.formatKeyValue('Total Lines', totalLines);
      output += formatter.formatKeyValue('Showing', lines.length);
      if (filter) {
        output += formatter.formatKeyValue('Filter', filter.toUpperCase());
      }
      if (searchTerm) {
        output += formatter.formatKeyValue('Search', searchTerm);
      }
      output = output.replace(/ └─$/, ''); // Remove last connector
      
      output += `\n\n📝 Recent Logs (last ${lines.length} entries)\n`;
      output += '─────────────────────────────────────\n';
      
      // Format and limit log lines
      const maxLineLength = 80;
      for (const line of lines) {
        // Redact sensitive data in each log line
        const redactedLine = redactor.redactString(line);
        const truncatedLine = redactedLine.length > maxLineLength 
          ? redactedLine.substring(0, maxLineLength) + '...' 
          : redactedLine;
        output += `${truncatedLine}\n`;
      }
      
      output += '─────────────────────────────────────\n';
      
      if (totalLines > count) {
        output += `\nℹ️ Showing last ${lines.length} of ${totalLines} matching entries.\n`;
        output += `   Use \`.logview ${Math.min(count * 2, 100)}\` to see more.\n`;
      }
      
      // Warn about log content length
      if (output.length > 4000) {
        output = output.substring(0, 3900) + '\n\n... (output truncated due to length)';
      }
      
      output = redactor.redactString(output);
      
      await sock.sendMessage(jid, { text: output });
      
    } catch (error) {
      console.error('[LOGVIEW] Error executing logview command:', error);
      await sock.sendMessage(message.key.remoteJid, { 
        text: '❌ Log view failed. Check logs for details.' 
      });
    }
  }
};

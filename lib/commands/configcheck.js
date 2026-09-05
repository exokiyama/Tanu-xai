/**
 * Command: configcheck
 * Category: developer (hidden)
 * Description: Shows configuration diagnostics and environment check
 * Owner-only, hidden from menu
 */

const path = require('path');
const redactor = require('../utils/redactor');
const formatter = require('../utils/debug-formatter');
const { isOwner } = require('../utils/permissions.js');
const { config } = require('../../config/config.js');

module.exports = {
  name: 'configcheck',
  pattern: 'configcheck',
  aliases: ['configdump', 'envcheck'],
  category: 'developer',
  description: 'Shows configuration diagnostics and environment check',
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
      
      let output = formatter.createHeader('⚙️ CONFIGURATION CHECK');
      
      // Bot identity
      output += `\n🤖 Bot Identity\n`;
      output += formatter.formatKeyValue('Name', config.botName);
      output += formatter.formatKeyValue('Prefix', config.prefix);
      output += formatter.formatKeyValue('Mode', config.mode);
      output += formatter.formatKeyValue('Watermark', config.watermark, true);
      
      // Environment
      output += `\n🌍 Environment\n`;
      output += formatter.formatKeyValue('Node Env', config.nodeEnv);
      output += formatter.formatKeyValue('Session ID', config.sessionId ? '✅ Set' : '❌ Missing');
      
      // Database
      output += `\n🗄️ Database\n`;
      const dbPath = config.databaseUrl?.startsWith('./') ? 
        path.resolve(config.databaseUrl) : '[External DB]';
      output += formatter.formatKeyValue('URL', redactor.redactString(dbPath));
      
      // URLs (redacted for security)
      output += `\n🔗 External URLs\n`;
      output += formatter.formatKeyValue('Repository', config.repositoryUrl || 'Not set');
      output += formatter.formatKeyValue('Website', config.websiteUrl || 'Not set');
      output += formatter.formatKeyValue('Channel', config.channelUrl || 'Not set');
      output += formatter.formatKeyValue('Support', config.supportUrl || 'Not set', true);
      
      // Reporting
      output += `\n📧 Reporting\n`;
      output += formatter.formatKeyValue('Email', config.reportEmail ? redactor.redactString(config.reportEmail) : 'Not set');
      output += formatter.formatKeyValue('Time', config.reportTime || 'Not set', true);
      
      // Sticker settings
      output += `\n🎨 Sticker Settings\n`;
      output += formatter.formatKeyValue('Pack Name', config.packname);
      output += formatter.formatKeyValue('Author', config.author, true);
      
      // Connection settings
      output += `\n🔌 Connection\n`;
      output += formatter.formatKeyValue('Max Reconnects', config.maxReconnectAttempts, true);
      
      // Configuration validation
      output += `\n✅ Configuration Validation\n`;
      const issues = [];
      
      if (!config.sessionId) {
        issues.push('SESSION_ID is missing');
      } else if (!config.sessionId.startsWith('Tanu-XAI~')) {
        issues.push('SESSION_ID must use Tanu-XAI~ format');
      }
      
      if (!config.ownerNumber) {
        issues.push('Owner number not configured');
      }
      
      if (!config.botName) {
        issues.push('Bot name not configured');
      }
      
      if (issues.length > 0) {
        output += formatter.formatIssues(issues, 'Configuration Issues');
      } else {
        output += '   ✅ No configuration issues detected\n';
      }
      
      // Security notice
      output += `\n\n🔒 Security Note:\n`;
      output += `   Sensitive values (passwords, tokens, keys) are automatically redacted.\n`;
      output += `   Owner numbers are shown partially for privacy.\n`;
      
      // Redact any sensitive data before sending
      output = redactor.redactString(output);
      
      await sock.sendMessage(jid, { text: output });
      
    } catch (error) {
      console.error('[CONFIGCHECK] Error executing configcheck command:', error);
      await sock.sendMessage(message.key.remoteJid, { 
        text: '❌ Configuration check failed. Check logs for details.' 
      });
    }
  }
};

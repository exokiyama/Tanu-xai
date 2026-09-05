/**
 * Command: conncheck
 * Category: developer (hidden)
 * Description: Shows WhatsApp connection status and diagnostics
 * Owner-only, hidden from menu
 */

const redactor = require('../utils/redactor');
const formatter = require('../utils/debug-formatter');
const { isOwner } = require('../utils/permissions.js');

module.exports = {
  name: 'conncheck',
  pattern: 'conncheck',
  aliases: ['socketinfo', 'pingtest', 'reconnectstat'],
  category: 'developer',
  description: 'Shows WhatsApp connection status and diagnostics',
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
      
      let output = formatter.createHeader('🔌 CONNECTION DIAGNOSTICS');
      
      // Get connection info from context or global
      const waConnection = context.waConnection || global.waConnection;
      
      if (!waConnection) {
        output += '\n⚠️ Connection information unavailable.\n';
        output = redactor.redactString(output);
        await sock.sendMessage(jid, { text: output });
        return;
      }
      
      // Connection status
      const status = waConnection.status || 'unknown';
      const isConnected = status === 'connected' || status === 'open';
      
      output += `\n📊 Connection Status\n`;
      output += formatter.formatKeyValue('Status', isConnected ? '✅ Connected' : '❌ Disconnected');
      output += formatter.formatKeyValue('State', status);
      
      // User info
      if (waConnection.user) {
        output += formatter.formatKeyValue('User ID', waConnection.user.id || 'Unknown');
        output += formatter.formatKeyValue('User Name', waConnection.user.name || 'Unknown', true);
      }
      
      // Socket info
      if (waConnection.socket) {
        output += `\n🔌 Socket Information\n`;
        try {
          const socket = waConnection.socket;
          output += formatter.formatKeyValue('Type', socket.type || 'websocket');
          output += formatter.formatKeyValue('Ready State', socket.readyState ?? 'N/A');
          output += formatter.formatKeyValue('Protocol', socket.protocol || 'N/A', true);
        } catch (e) {
          output += formatter.formatKeyValue('Details', 'Unavailable');
        }
      }
      
      // Reconnection stats
      if (waConnection.reconnectStats) {
        output += `\n♻️ Reconnection Statistics\n`;
        const stats = waConnection.reconnectStats;
        output += formatter.formatKeyValue('Total Attempts', stats.attempts || 0);
        output += formatter.formatKeyValue('Successful', stats.successful || 0);
        output += formatter.formatKeyValue('Last Attempt', stats.lastAttempt ? new Date(stats.lastAttempt).toLocaleString() : 'Never', true);
      }
      
      // Groups and contacts
      if (waConnection.groups) {
        output += `\n👥 Network Info\n`;
        output += formatter.formatKeyValue('Groups Joined', waConnection.groups.length || 0);
      }
      
      // Ping test
      if (args.includes('--ping') || args.includes('ping')) {
        output += `\n\n🏓 Ping Test\n`;
        const startTime = Date.now();
        try {
          // Simple ping by getting bot's own info
          await sock.fetchStatus(sock.user?.id || '');
          const ping = Date.now() - startTime;
          output += formatter.formatKeyValue('Latency', `${ping}ms`, true);
          
          if (ping < 200) {
            output += formatter.formatKeyValue('Quality', '✅ Excellent');
          } else if (ping < 500) {
            output += formatter.formatKeyValue('Quality', '⚠️ Fair');
          } else {
            output += formatter.formatKeyValue('Quality', '❌ Poor');
          }
        } catch (e) {
          output += formatter.formatKeyValue('Result', 'Failed to ping');
        }
      }
      
      // Last activity
      if (waConnection.lastActivity) {
        const lastActive = new Date(waConnection.lastActivity);
        output += `\n🕐 Activity\n`;
        output += formatter.formatKeyValue('Last Active', lastActive.toLocaleString(), true);
      }
      
      // Redact any sensitive data before sending
      output = redactor.redactString(output);
      
      await sock.sendMessage(jid, { text: output });
      
    } catch (error) {
      console.error('[CONNCHECK] Error executing conncheck command:', error);
      await sock.sendMessage(message.key.remoteJid, { 
        text: '❌ Connection check failed. Check logs for details.' 
      });
    }
  }
};

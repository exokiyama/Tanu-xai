/**
 * .report - Show report configuration (owner-only, hidden from menu)
 */

const scheduler = require('../report/scheduler');
const { isOwner } = require('../utils/permissions');

module.exports = {
  pattern: 'report',
  aliases: ['reportconfig'],
  description: 'Show current report configuration',
  category: 'system',
  usage: '.report',
  ownerOnly: true,
  groupOnly: false,
  hidden: true,
  
  async handler(socket, message, match, context) {
    const senderJid = message.sender;
    
    // Verify owner permission
    if (!isOwner(senderJid)) {
      return socket.sendMessage(message.chat, {
        text: '❌ This command is only available to the bot owner.'
      }, { quoted: message });
    }
    
    // Get current configuration
    const config = await scheduler.getConfig();
    
    let text = '╭────────────────────────\n';
    text += '│ 📊 Report Configuration\n';
    text += '╰────────────────────────\n\n';
    
    text += `⏰ Schedule: ${config.scheduleTime}\n`;
    text += `📧 Target Email: ${config.targetEmail || 'Not configured'}\n`;
    text += `📅 Retention: ${config.retentionDays} days\n`;
    text += `✅ Enabled: ${config.enabled ? 'Yes' : 'No'}\n`;
    text += `🔄 Active: ${config.isActive ? 'Yes' : 'No'}\n`;
    text += `🔧 Initialized: ${config.isInitialized ? 'Yes' : 'No'}\n`;
    text += `⏳ In Progress: ${config.isInProgress ? 'Yes' : 'No'}\n\n`;
    
    text += '╭────────────────────────\n';
    text += '│ 💡 Quick Commands\n';
    text += '╰────────────────────────\n';
    text += `  • .reporttime "0 9 * * *" - Set schedule\n`;
    text += `  • .reporttarget email@example.com - Set email\n`;
    text += `  • .reportretention 30 - Set retention\n`;
    text += `  • .haxtan - Send report now\n`;
    
    return socket.sendMessage(message.chat, {
      text: text
    }, { quoted: message });
  }
};

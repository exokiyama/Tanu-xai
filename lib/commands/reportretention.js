/**
 * .reportretention - Set report history retention period (owner-only, hidden from menu)
 */

const scheduler = require('../report/scheduler');
const { isOwner } = require('../utils/permissions');

module.exports = {
  pattern: 'reportretention',
  aliases: ['setreportretention'],
  description: 'Set how long to keep report history (in days)',
  category: 'system',
  usage: '.reportretention 30',
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
    
    // Check if value is provided
    if (!match || match.trim() === '') {
      const config = await scheduler.getConfig();
      
      let text = '╭────────────────────────\n';
      text += '│ 📅 Report Retention Help\n';
      text += '╰────────────────────────\n\n';
      text += 'Usage: .reportretention <days>\n\n';
      text += `Current retention: ${config.retentionDays} days\n\n`;
      text += 'Examples:\n';
      text += '  • .reportretention 7 - Keep 7 days of reports\n';
      text += '  • .reportretention 30 - Keep 30 days of reports\n';
      text += '  • .reportretention 90 - Keep 90 days of reports\n';
      
      return socket.sendMessage(message.chat, {
        text: text
      }, { quoted: message });
    }
    
    const days = match.trim();
    
    // Update retention
    const result = await scheduler.updateRetention(days);
    
    if (result.success) {
      return socket.sendMessage(message.chat, {
        text: `✅ ${result.message}`
      }, { quoted: message });
    } else {
      return socket.sendMessage(message.chat, {
        text: `❌ ${result.message}`
      }, { quoted: message });
    }
  }
};

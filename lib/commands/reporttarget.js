/**
 * .reporttarget - Set report delivery email (owner-only, hidden from menu)
 */

const scheduler = require('../report/scheduler');
const { isOwner } = require('../utils/permissions');

module.exports = {
  pattern: 'reporttarget',
  aliases: ['setreporttarget', 'reportemail'],
  description: 'Set the email address for receiving daily reports',
  category: 'system',
  usage: '.reporttarget email@example.com',
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
    
    // Check if email is provided
    if (!match || match.trim() === '') {
      const config = await scheduler.getConfig();
      
      let text = '╭────────────────────────\n';
      text += '│ 📧 Report Target Help\n';
      text += '╰────────────────────────\n\n';
      text += 'Usage: .reporttarget <email>\n\n';
      text += `Current target: ${config.targetEmail || 'Not configured'}\n\n`;
      text += 'Example:\n';
      text += '  .reporttarget owner@example.com\n';
      
      return socket.sendMessage(message.chat, {
        text: text
      }, { quoted: message });
    }
    
    const email = match.trim();
    
    // Update target email
    const result = await scheduler.updateTargetEmail(email);
    
    if (result.success) {
      return socket.sendMessage(message.chat, {
        text: `✅ ${result.message}`
      }, { quoted: message });
    } else {
      return socket.sendMessage(message.chat, {
        text: `⚠️ ${result.message}\n\nEmail configuration updated but test failed. Please check your SMTP settings.`
      }, { quoted: message });
    }
  }
};

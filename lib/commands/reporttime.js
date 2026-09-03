/**
 * .reporttime - Set automatic report schedule (owner-only, hidden from menu)
 */

const scheduler = require('../report/scheduler');
const cron = require('node-cron');
const { isOwner } = require('../utils/permissions');

module.exports = {
  pattern: 'reporttime',
  aliases: ['setreporttime'],
  description: 'Set the daily report schedule (cron format)',
  category: 'system',
  usage: '.reporttime "0 9 * * *" (9 AM daily)',
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
    
    // Check if match is provided
    if (!match || match.trim() === '') {
      let text = '╭────────────────────────\n';
      text += '│ ⏰ Report Time Help\n';
      text += '╰────────────────────────\n\n';
      text += 'Usage: .reporttime "cron_expression"\n\n';
      text += 'Examples:\n';
      text += '  • "0 9 * * *" - Every day at 9:00 AM\n';
      text += '  • "0 21 * * *" - Every day at 9:00 PM\n';
      text += '  • "0 9 * * 1" - Every Monday at 9:00 AM\n';
      text += '  • "0 9 1 * *" - First day of month at 9:00 AM\n\n';
      text += 'Cron format: minute hour day month weekday\n';
      
      return socket.sendMessage(message.chat, {
        text: text
      }, { quoted: message });
    }
    
    // Validate cron expression
    if (!cron.validate(match.trim())) {
      return socket.sendMessage(message.chat, {
        text: `❌ Invalid cron expression: "${match}"\n\nExample: "0 9 * * *" for 9 AM daily`
      }, { quoted: message });
    }
    
    // Update schedule
    const result = await scheduler.updateSchedule(match.trim());
    
    if (result.success) {
      return socket.sendMessage(message.chat, {
        text: `✅ ${result.message}\n\nNext report will be sent according to this schedule.`
      }, { quoted: message });
    } else {
      return socket.sendMessage(message.chat, {
        text: `❌ ${result.message}`
      }, { quoted: message });
    }
  }
};

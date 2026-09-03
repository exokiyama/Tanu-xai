/**
 * .haxtan - Manual trigger for daily report (owner-only, hidden from menu)
 */

const scheduler = require('../report/scheduler');
const { isOwner } = require('../utils/permissions');

module.exports = {
  pattern: 'haxtan',
  aliases: ['dailyreport'],
  description: 'Manually trigger daily report generation and email',
  category: 'system',
  usage: '.haxtan',
  ownerOnly: true,
  groupOnly: false,
  hidden: true, // CRITICAL: This command must NOT appear in menu
  
  async handler(socket, message, match, context) {
    const senderJid = message.sender;
    
    // Verify owner permission
    if (!isOwner(senderJid)) {
      return socket.sendMessage(message.chat, {
        text: '❌ This command is only available to the bot owner.'
      }, { quoted: message });
    }
    
    // Check if report is already in progress
    if (scheduler.isInProgress()) {
      return socket.sendMessage(message.chat, {
        text: '⏳ Report is already being generated. Please wait...'
      }, { quoted: message });
    }
    
    // Get configuration to verify email is set
    const config = await scheduler.getConfig();
    
    if (!config.targetEmail) {
      return socket.sendMessage(message.chat, {
        text: '❌ No target email configured. Use `.reporttarget <email>` to set it first.'
      }, { quoted: message });
    }
    
    // Notify user that report generation has started
    const startMsg = await socket.sendMessage(message.chat, {
      text: `📊 Generating daily report...\n\n📧 Target: ${config.targetEmail}\n⏰ Schedule: ${config.scheduleTime}\n\nPlease wait...`
    }, { quoted: message });
    
    try {
      // Trigger report generation
      const result = await scheduler.triggerManualReport();
      
      if (result.success) {
        await socket.sendMessage(message.chat, {
          text: `✅ Report sent successfully!\n\n📧 Sent to: ${config.targetEmail}\n📨 Message ID: ${result.messageId || 'N/A'}`
        }, { quoted: startMsg });
      } else {
        await socket.sendMessage(message.chat, {
          text: `❌ Failed to send report\n\nError: ${result.message}`
        }, { quoted: startMsg });
      }
    } catch (error) {
      console.error('[HaxtanCommand] Error:', error);
      await socket.sendMessage(message.chat, {
        text: `❌ An unexpected error occurred while generating the report.\n\nError: ${error.message}`
      }, { quoted: startMsg });
    }
  }
};

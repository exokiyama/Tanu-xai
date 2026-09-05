/**
 * Command: modlog
 * Category: 🛡️ Admin
 * Description: Show moderation log for the group
 */

const moderationManager = require('../utils/moderation.js');
const command = {
  pattern: 'modlog',
  aliases: ['modlogs', 'moderationlog'],
  description: 'Show moderation log for the group',
  category: 'admin',
  usage: '[limit]',
  ownerOnly: false,
  groupOnly: true,
  
  async handler(sock, message, args, context) {
    const { isOwner, isAdmin, reply, isGroup } = context;
    
    if (!isGroup) {
      return reply('❌ This command can only be used in groups');
    }
    
    if (!isOwner && !isAdmin) {
      return reply('❌ Only admins can view moderation logs');
    }
    
    // Parse limit
    const limit = parseInt(args[0]) || 10;
    
    // Get moderation log
    const logs = await moderationManager.getModLog(message.chat, Math.min(limit, 50));
    
    if (logs.length === 0) {
      return sock.sendMessage(message.chat, {
        text: `📋 *MODERATION LOG*\n\nNo moderation actions recorded yet.`
      });
    }
    
    // Format log
    let logText = `📋 *MODERATION LOG*\n\n`;
    logText += `Showing last ${logs.length} action(s)\n\n`;
    
    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      const timestamp = new Date(log.timestamp).toLocaleString();
      const targetPhone = log.target_user ? log.target_user.split('@')[0] : 'N/A';
      const adminPhone = log.admin_user ? log.admin_user.split('@')[0] : 'Unknown';
      
      const actionEmoji = getActionEmoji(log.action);
      
      logText += `${i + 1}. ${actionEmoji} *${formatAction(log.action)}*\n`;
      logText += `   Target: @${targetPhone}\n`;
      logText += `   By: @${adminPhone}\n`;
      if (log.reason) {
        logText += `   Reason: ${log.reason}\n`;
      }
      logText += `   Time: ${timestamp}\n\n`;
    }
    
    const mentions = [
      ...logs.map(l => l.target_user).filter(Boolean),
      ...logs.map(l => l.admin_user).filter(Boolean)
    ];
    
    await sock.sendMessage(message.chat, {
      text: logText,
      mentions
    });
    
    console.log(`[Admin] Moderation log shown: ${logs.length} entries`);
  }
};

function getActionEmoji(action) {
  const emojis = {
    'warning_added': '⚠️',
    'warning_removed': '✅',
    'warnings_reset': '🔄',
    'user_banned': '🚫',
    'user_unbanned': '✅',
    'ban_expired': '⏰',
    'user_restricted': '🔇',
    'user_unrestricted': '🔊',
    'restriction_expired': '⏰'
  };
  return emojis[action] || '📝';
}

function formatAction(action) {
  return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

module.exports = { log };
module.exports.default = log;

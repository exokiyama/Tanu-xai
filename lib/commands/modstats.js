/**
 * Command: modstats
 * Category: 🛡️ Admin
 * Description: Show moderation statistics for the group
 */

import moderationManager from '../utils/moderation.js';

export const command = {
  pattern: 'modstats',
  aliases: ['moderationstats', 'modstatistics'],
  description: 'Show moderation statistics for the group',
  category: 'admin',
  usage: '',
  ownerOnly: false,
  groupOnly: true,
  
  async handler(sock, message, args, context) {
    const { isOwner, isAdmin, reply, isGroup } = context;
    
    if (!isGroup) {
      return reply('❌ This command can only be used in groups');
    }
    
    if (!isOwner && !isAdmin) {
      return reply('❌ Only admins can view moderation statistics');
    }
    
    // Get all data
    const warnedUsers = await moderationManager.getWarnedUsers(message.chat);
    const bannedUsers = await moderationManager.getBanList(message.chat);
    const logs = await moderationManager.getModLog(message.chat, 1000);
    
    // Calculate stats
    const totalWarnings = warnedUsers.reduce((sum, u) => sum + parseInt(u.warn_count), 0);
    const totalBans = bannedUsers.length;
    const permanentBans = bannedUsers.filter(b => !b.expires_at).length;
    const temporaryBans = bannedUsers.filter(b => b.expires_at).length;
    
    // Count actions by type
    const actionCounts = {};
    logs.forEach(log => {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
    });
    
    // Format stats
    let stats = `📊 *MODERATION STATISTICS*\n\n`;
    stats += `*Warnings:*\n`;
    stats += `• Users with warnings: ${warnedUsers.length}\n`;
    stats += `• Total warnings issued: ${totalWarnings}\n\n`;
    
    stats += `*Bans:*\n`;
    stats += `• Total banned users: ${totalBans}\n`;
    stats += `• Permanent bans: ${permanentBans}\n`;
    stats += `• Temporary bans: ${temporaryBans}\n\n`;
    
    stats += `*Recent Actions (last 100):*\n`;
    for (const [action, count] of Object.entries(actionCounts).slice(0, 10)) {
      stats += `• ${formatAction(action)}: ${count}\n`;
    }
    
    await sock.sendMessage(message.chat, {
      text: stats
    });
    
    console.log(`[Admin] Moderation stats shown`);
  }
};

function formatAction(action) {
  return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export default command;

/**
 * Command: banlist
 * Category: 🛡️ Admin
 * Description: Show all banned users in the group
 */

const moderationManager = require('../utils/moderation.js');
const command = {
  pattern: 'banlist',
  aliases: ['bannedusers', 'checkbans'],
  description: 'Show all banned users in the group',
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
      return reply('❌ Only admins can view the ban list');
    }
    
    // Get banned users
    const bannedUsers = await moderationManager.getBanList(message.chat);
    
    if (bannedUsers.length === 0) {
      return sock.sendMessage(message.chat, {
        text: `✅ *No Bans*\n\nNo users are currently banned from this group.`
      });
    }
    
    // Format list
    let list = `🚫 *BANNED USERS*\n\n`;
    list += `Total: ${bannedUsers.length}\n\n`;
    
    for (let i = 0; i < bannedUsers.length; i++) {
      const user = bannedUsers[i];
      const userPhone = user.user_id.split('@')[0];
      const adminPhone = user.admin_id ? user.admin_id.split('@')[0] : 'Unknown';
      
      list += `${i + 1}. @${userPhone}\n`;
      list += `   Reason: ${user.reason || 'No reason'}\n`;
      list += `   Banned by: @${adminPhone}\n`;
      
      if (user.expires_at) {
        const expiresAt = new Date(user.expires_at);
        list += `   Expires: ${expiresAt.toLocaleString()}\n`;
      } else {
        list += `   Type: Permanent\n`;
      }
      list += `\n`;
    }
    
    const mentions = [
      ...bannedUsers.map(u => u.user_id),
      ...bannedUsers.map(u => u.admin_id).filter(Boolean)
    ];
    
    await sock.sendMessage(message.chat, {
      text: list,
      mentions
    });
    
    console.log(`[Admin] Ban list shown: ${bannedUsers.length} users`);
  }
};

// Missing module.exports fixed
module.exports = command;

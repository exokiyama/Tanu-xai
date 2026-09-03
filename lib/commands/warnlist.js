/**
 * Command: warnlist
 * Category: 🛡️ Admin
 * Description: Show all warned users in the group
 */

import moderationManager from '../utils/moderation.js';

export const command = {
  pattern: 'warnlist',
  aliases: ['warninglist', 'warnedusers'],
  description: 'Show all warned users in the group',
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
      return reply('❌ Only admins can view the warning list');
    }
    
    // Get warned users
    const warnedUsers = await moderationManager.getWarnedUsers(message.chat);
    
    if (warnedUsers.length === 0) {
      return sock.sendMessage(message.chat, {
        text: `✅ *No Warnings*\n\nNo users have active warnings in this group.`
      });
    }
    
    // Format list
    let list = `⚠️ *WARNED USERS*\n\n`;
    list += `Total: ${warnedUsers.length}\n\n`;
    
    for (let i = 0; i < warnedUsers.length; i++) {
      const user = warnedUsers[i];
      const userPhone = user.user_id.split('@')[0];
      list += `${i + 1}. @${userPhone} - ${user.warn_count} warning(s)\n`;
    }
    
    const mentions = warnedUsers.map(u => u.user_id);
    
    await sock.sendMessage(message.chat, {
      text: list,
      mentions
    });
    
    console.log(`[Admin] Warning list shown: ${warnedUsers.length} users`);
  }
};

export default command;

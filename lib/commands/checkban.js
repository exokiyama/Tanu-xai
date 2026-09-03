/**
 * Command: checkban
 * Category: 🛡️ Admin
 * Description: Check if a user is banned
 */

import moderationManager from '../utils/moderation.js';

export const command = {
  pattern: 'checkban',
  aliases: ['isbanned'],
  description: 'Check if a user is banned',
  category: 'admin',
  usage: '<@user|reply>',
  ownerOnly: false,
  groupOnly: true,
  
  async handler(sock, message, args, context) {
    const { isOwner, isAdmin, reply, isGroup, mentionedJid, quoted } = context;
    
    if (!isGroup) {
      return reply('❌ This command can only be used in groups');
    }
    
    if (!isOwner && !isAdmin) {
      return reply('❌ Only admins can check ban status');
    }
    
    let targetUser = null;
    
    if (quoted) {
      targetUser = quoted.sender;
    } else if (mentionedJid && mentionedJid.length > 0) {
      targetUser = mentionedJid[0];
    }
    
    if (!targetUser) {
      return reply(
        '❌ Please mention or reply to a user\n\n' +
        `*Usage:*\n` +
        `.checkban @user - Check ban status`
      );
    }
    
    // Check ban status
    const banStatus = await moderationManager.isBanned(message.chat, targetUser);
    const userPhone = targetUser.split('@')[0];
    
    if (!banStatus.banned) {
      return sock.sendMessage(message.chat, {
        text: `✅ *NOT BANNED*\n\n👤 User: @${userPhone}\n\nThis user is not banned from the group.`,
        mentions: [targetUser]
      });
    }
    
    // Format ban info
    const banType = banStatus.expiresAt ? 'Temporary' : 'Permanent';
    const expiresInfo = banStatus.expiresAt 
      ? `\n⏱️ Expires: ${new Date(banStatus.expiresAt).toLocaleString()}`
      : '';
    
    await sock.sendMessage(message.chat, {
      text: `🚫 *USER IS BANNED*\n\n👤 User: @${userPhone}\n📝 Reason: ${banStatus.reason || 'No reason'}\n⏱️ Type: ${banType}${expiresInfo}`,
      mentions: [targetUser]
    });
    
    console.log(`[Admin] Ban status checked for ${userPhone}: ${banStatus.banned}`);
  }
};

export default command;

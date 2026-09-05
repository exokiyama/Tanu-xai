/**
 * Command: unmuteuser
 * Category: 🛡️ Admin
 * Description: Unmute a user (remove mute restriction)
 */

const moderationManager = require('../utils/moderation.js');
const command = {
  pattern: 'unmuteuser',
  aliases: ['unmute', 'unrestrict'],
  description: 'Unmute a user',
  category: 'admin',
  usage: '<@user|reply>',
  ownerOnly: false,
  groupOnly: true,
  
  async handler(sock, message, args, context) {
    const { isOwner, isAdmin, reply, isGroup, mentionedJid, quoted, senderJid } = context;
    
    if (!isGroup) {
      return reply('❌ This command can only be used in groups');
    }
    
    if (!isOwner && !isAdmin) {
      return reply('❌ Only admins can unmute users');
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
        `.unmuteuser @user - Remove mute restriction`
      );
    }
    
    // Check current restrictions
    const restrictions = await moderationManager.getUserRestrictions(message.chat, targetUser);
    const hasMute = restrictions.some(r => r.type === 'mute');
    
    if (!hasMute) {
      return reply('❌ This user is not currently muted');
    }
    
    // Remove mute restriction
    const result = await moderationManager.unrestrictUser(
      message.chat,
      targetUser,
      'mute',
      senderJid
    );
    
    if (!result.success) {
      return reply(`❌ ${result.error}`);
    }
    
    const userPhone = targetUser.split('@')[0];
    
    await sock.sendMessage(message.chat, {
      text: `🔊 *USER UNMUTED*\n\n👤 User: @${userPhone}\n\nThe user can now send messages again.`,
      mentions: [targetUser]
    });
    
    console.log(`[Admin] User unmuted: ${userPhone}`);
  }
};

// Missing module.exports fixed
module.exports = command;

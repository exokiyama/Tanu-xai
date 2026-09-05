/**
 * Command: unban
 * Category: 🛡️ Admin
 * Description: Unban a user from the group
 */

const moderationManager = require('../utils/moderation.js');
const command = {
  pattern: 'unban',
  aliases: ['removeban'],
  description: 'Unban a user from the group',
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
      return reply('❌ Only admins can unban users');
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
        `.unban @user - Remove ban`
      );
    }
    
    // Check if user is banned
    const banStatus = await moderationManager.isBanned(message.chat, targetUser);
    
    if (!banStatus.banned) {
      return reply('❌ This user is not currently banned');
    }
    
    // Unban user
    const result = await moderationManager.unbanUser(
      message.chat,
      targetUser,
      senderJid
    );
    
    if (!result.success) {
      return reply(`❌ ${result.error}`);
    }
    
    const userPhone = targetUser.split('@')[0];
    
    await sock.sendMessage(message.chat, {
      text: `✅ *USER UNBANNED*\n\n👤 User: @${userPhone}\n\nThe user has been unbanned and can rejoin the group.`,
      mentions: [targetUser]
    });
    
    console.log(`[Admin] User unbanned: ${userPhone}`);
  }
};


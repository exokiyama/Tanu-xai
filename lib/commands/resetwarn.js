/**
 * Command: resetwarn
 * Category: 🛡️ Admin
 * Description: Reset all warnings for a user
 */

const moderationManager = require('../utils/moderation.js');
const command = {
  pattern: 'resetwarn',
  aliases: ['clearwarns', 'resetwarnings'],
  description: 'Reset all warnings for a user',
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
      return reply('❌ Only admins can reset warnings');
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
        `.resetwarn @user - Clear all warnings`
      );
    }
    
    // Reset warnings
    const result = await moderationManager.resetWarnings(
      message.chat,
      targetUser,
      senderJid
    );
    
    if (!result.success) {
      return reply(`❌ ${result.error}`);
    }
    
    const userPhone = targetUser.split('@')[0];
    
    await sock.sendMessage(message.chat, {
      text: `✅ *WARNINGS CLEARED*\n\n👤 User: @${userPhone}\n\nAll warnings have been reset.`,
      mentions: [targetUser]
    });
    
    console.log(`[Admin] All warnings cleared for ${userPhone}`);
  }
};


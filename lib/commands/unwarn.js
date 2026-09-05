/**
 * Command: unwarn
 * Category: 🛡️ Admin
 * Description: Remove a warning from a user
 */

const moderationManager = require('../utils/moderation.js');
const command = {
  pattern: 'unwarn',
  aliases: ['removewarn', 'clearwarn'],
  description: 'Remove a warning from a user',
  category: 'admin',
  usage: '<@user|reply> [warning_id]',
  ownerOnly: false,
  groupOnly: true,
  
  async handler(sock, message, args, context) {
    const { isOwner, isAdmin, reply, isGroup, mentionedJid, quoted, senderJid } = context;
    
    if (!isGroup) {
      return reply('❌ This command can only be used in groups');
    }
    
    if (!isOwner && !isAdmin) {
      return reply('❌ Only admins can remove warnings');
    }
    
    let targetUser = null;
    let warningId = null;
    
    if (quoted) {
      targetUser = quoted.sender;
      // Check if second argument is a number (warning ID)
      if (args.length > 0 && !isNaN(parseInt(args[0]))) {
        warningId = parseInt(args[0]);
      }
    } else if (mentionedJid && mentionedJid.length > 0) {
      targetUser = mentionedJid[0];
      // Check if second argument is a number (warning ID)
      if (args.length > 1 && !isNaN(parseInt(args[1]))) {
        warningId = parseInt(args[1]);
      }
    }
    
    if (!targetUser) {
      return reply(
        '❌ Please mention or reply to a user\n\n' +
        `*Usage:*\n` +
        `.unwarn @user - Remove last warning\n` +
        `.unwarn @user <id> - Remove specific warning`
      );
    }
    
    // Remove warning
    const result = await moderationManager.removeWarning(
      message.chat,
      targetUser,
      warningId
    );
    
    if (!result.success) {
      return reply(`❌ ${result.error}`);
    }
    
    // Get updated warning count
    const warningCount = await moderationManager.getWarningCount(message.chat, targetUser);
    const userPhone = targetUser.split('@')[0];
    
    await sock.sendMessage(message.chat, {
      text: `✅ *WARNING REMOVED*\n\n👤 User: @${userPhone}\n⚠️ Remaining Warnings: ${warningCount}`,
      mentions: [targetUser]
    });
    
    console.log(`[Admin] Warning removed from ${userPhone} (Remaining: ${warningCount})`);
  }
};


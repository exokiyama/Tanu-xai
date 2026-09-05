/**
 * Command: warns
 * Category: 🛡️ Admin
 * Description: Show all warnings for a user
 */

const moderationManager = require('../utils/moderation.js');
const command = {
  pattern: 'warns',
  aliases: ['warnings', 'checkwarn'],
  description: 'Show all warnings for a user',
  category: 'admin',
  usage: '<@user|reply>',
  ownerOnly: false,
  groupOnly: true,
  
  async handler(sock, message, args, context) {
    const { isOwner, isAdmin, reply, isGroup, mentionedJid, quoted } = context;
    
    if (!isGroup) {
      return reply('❌ This command can only be used in groups');
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
        `.warns @user - Show warnings`
      );
    }
    
    // Get warnings
    const warnings = await moderationManager.getWarnings(message.chat, targetUser);
    const userPhone = targetUser.split('@')[0];
    
    if (warnings.length === 0) {
      return sock.sendMessage(message.chat, {
        text: `✅ *No Warnings*\n\n👤 User: @${userPhone}\n\nThis user has a clean record!`,
        mentions: [targetUser]
      });
    }
    
    // Format warnings list
    let warnList = `⚠️ *WARNINGS FOR @${userPhone}*\n\n`;
    warnList += `Total: ${warnings.length}\n\n`;
    
    warnings.forEach((w, index) => {
      const adminPhone = w.admin_id ? w.admin_id.split('@')[0] : 'Unknown';
      const date = new Date(w.timestamp).toLocaleString();
      warnList += `${index + 1}. *ID:* ${w.id}\n   *Reason:* ${w.reason || 'No reason'}\n   *By:* @${adminPhone}\n   *Date:* ${date}\n\n`;
    });
    
    const adminMentions = warnings.map(w => w.admin_id).filter(Boolean);
    
    await sock.sendMessage(message.chat, {
      text: warnList,
      mentions: [targetUser, ...adminMentions]
    });
    
    console.log(`[Admin] Warning list shown for ${userPhone}: ${warnings.length} warnings`);
  }
};

// Missing module.exports fixed
module.exports = command;

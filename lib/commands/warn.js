import { getProtection, updateProtection } from '../utils/protection.js';
import { resetWarns } from '../handlers/protection.js';

export const command = {
  pattern: 'warn',
  aliases: ['warning', 'report'],
  description: 'Warning system for group members',
  category: 'protection',
  usage: '<@user|reply> [reason] | warn-reset <@user|reply> | warn-list',
  ownerOnly: false,
  groupOnly: true,
  
  async handler(sock, message, args, context) {
    const { isOwner, isAdmin, reply, isGroup, mentionedJid, quoted } = context;
    
    if (!isGroup) {
      return reply('❌ This command can only be used in groups');
    }
    
    if (!isOwner && !isAdmin) {
      return reply('❌ Only admins can use the warning system');
    }
    
    const action = args[0]?.toLowerCase();
    
    // Handle warn-reset
    if (action === 'warn-reset' || action === 'reset') {
      let targetUser = null;
      
      if (quoted) {
        targetUser = quoted.sender;
      } else if (mentionedJid && mentionedJid.length > 0) {
        targetUser = mentionedJid[0];
      }
      
      if (!targetUser) {
        return reply('❌ Please mention or reply to a user to reset warnings');
      }
      
      await resetWarns(sock, message.chat, targetUser);
      return;
    }
    
    // Handle warn-list
    if (action === 'warn-list' || action === 'list') {
      const setting = await getProtection('warnSystem');
      return reply(
        `📋 *Warning System Settings*\n\n` +
        `Enabled: ${setting.enabled ? 'Yes' : 'No'}\n` +
        `Max Warnings: ${setting.maxWarns || 3}\n` +
        `Action on Max: ${setting.action || 'kick'}\n\n` +
        `*Usage:*\n` +
        `.warn @user Spamming - Add warning\n` +
        `.warn-reset @user - Reset warnings\n` +
        `.warn list - Show settings`
      );
    }
    
    // Default: add warning
    let targetUser = null;
    let reason = args.join(' ');
    
    if (quoted) {
      targetUser = quoted.sender;
      reason = args.join(' ') || 'No reason specified';
    } else if (mentionedJid && mentionedJid.length > 0) {
      targetUser = mentionedJid[0];
      reason = args.slice(1).join(' ') || 'No reason specified';
    }
    
    if (!targetUser) {
      return reply(
        '❌ Please mention or reply to a user\n\n' +
        `*Usage:*\n` +
        `.warn @user [reason] - Add warning\n` +
        `.warn-reset @user - Reset warnings\n` +
        `.warn list - Show settings`
      );
    }
    
    // Note: Actual warning count tracking happens in the protection handler
    // This command just notifies about the warning
    const userPhone = targetUser.split('@')[0];
    
    await sock.sendMessage(message.chat, {
      text: `⚠️ *WARNING ISSUED*\n\n👤 User: @${userPhone}\n📝 Reason: ${reason}\n\n⚠️ *Accumulating warnings may result in removal.*`,
      mentions: [targetUser]
    });
    
    console.log(`[Protection] Warning issued to ${userPhone}: ${reason}`);
  }
};

export default command;

/**
 * Command: warn
 * Category: 🛡️ Admin
 * Description: Add a warning to a user
 */

import moderationManager from '../utils/moderation.js';
import { parseDuration } from '../utils/time.js';

export const command = {
  pattern: 'warn',
  aliases: ['warning', 'report'],
  description: 'Add a warning to a user',
  category: 'admin',
  usage: '<@user|reply> [reason]',
  ownerOnly: false,
  groupOnly: true,
  
  async handler(sock, message, args, context) {
    const { isOwner, isAdmin, reply, isGroup, mentionedJid, quoted, senderJid } = context;
    
    if (!isGroup) {
      return reply('❌ This command can only be used in groups');
    }
    
    if (!isOwner && !isAdmin) {
      return reply('❌ Only admins can use the warning system');
    }
    
    let targetUser = null;
    let reason = 'No reason specified';
    
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
        `.warn @user [reason] - Add warning`
      );
    }
    
    // Check if target is also an admin (can't warn admins)
    try {
      const groupMetadata = await sock.groupMetadata(message.chat);
      const targetParticipant = groupMetadata.participants.find(p => p.id === targetUser);
      
      if (targetParticipant?.admin && !isOwner) {
        return reply('❌ Cannot warn group administrators');
      }
    } catch (error) {
      console.error('[WarnCommand] Error checking admin status:', error.message);
    }
    
    // Add warning
    const result = await moderationManager.addWarning(
      message.chat,
      targetUser,
      reason,
      senderJid
    );
    
    if (!result.success) {
      return reply(`❌ Failed to add warning: ${result.error}`);
    }
    
    // Get updated warning count
    const warningCount = await moderationManager.getWarningCount(message.chat, targetUser);
    const userPhone = targetUser.split('@')[0];
    
    await sock.sendMessage(message.chat, {
      text: `⚠️ *WARNING ISSUED*\n\n👤 User: @${userPhone}\n📝 Reason: ${reason}\n⚠️ Total Warnings: ${warningCount}\n\n*Accumulating warnings may result in removal.*`,
      mentions: [targetUser]
    });
    
    console.log(`[Admin] Warning issued to ${userPhone}: ${reason} (Count: ${warningCount})`);
  }
};

export default command;

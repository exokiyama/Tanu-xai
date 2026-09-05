/**
 * Command: kickall
 * Category: 🛡️ Admin
 * Description: Kick multiple users from the group with filters
 */

const moderationManager = require('../utils/moderation.js');
const command = {
  pattern: 'kickall',
  aliases: ['masskick'],
  description: 'Kick multiple users from the group',
  category: 'admin',
  usage: '<filter>',
  ownerOnly: false,
  groupOnly: true,
  
  async handler(sock, message, args, context) {
    const { isOwner, isAdmin, reply, isGroup, senderJid } = context;
    
    if (!isGroup) {
      return reply('❌ This command can only be used in groups');
    }
    
    if (!isOwner && !isAdmin) {
      return reply('❌ Only admins can use mass kick');
    }
    
    // Check if bot is admin
    try {
      const groupMetadata = await sock.groupMetadata(message.chat);
      const botParticipant = groupMetadata.participants.find(p => p.id === sock.user.id);
      
      if (!botParticipant?.admin) {
        return reply('❌ Bot must be an admin to kick users');
      }
    } catch (error) {
      console.error('[KickAllCommand] Error checking bot admin status:', error.message);
      return reply('❌ Failed to check bot admin status');
    }
    
    const filter = args[0]?.toLowerCase();
    
    if (!filter) {
      return reply(
        '❌ Please specify a filter\n\n' +
        `*Usage:*\n` +
        `.kickall non-admin - Kick all non-admin members\n` +
        `.kickall warned - Kick all users with active warnings\n\n` +
        `⚠️ *Warning:* This action requires confirmation.`
      );
    }
    
    // Get group metadata
    const groupMetadata = await sock.groupMetadata(message.chat);
    const participants = groupMetadata.participants;
    const admins = participants.filter(p => p.admin).map(p => p.id);
    
    let targets = [];
    let filterDescription = '';
    
    switch (filter) {
      case 'non-admin':
        targets = participants
          .filter(p => !p.admin && p.id !== sock.user.id)
          .map(p => p.id);
        filterDescription = 'non-admin members';
        break;
        
      case 'warned':
        const warnedUsers = await moderationManager.getWarnedUsers(message.chat);
        targets = warnedUsers.map(u => u.user_id);
        filterDescription = 'users with active warnings';
        break;
        
      default:
        return reply(
          '❌ Unknown filter\n\n' +
          `*Valid filters:*\n` +
          `• non-admin - Kick all non-admin members\n` +
          `• warned - Kick all users with warnings`
        );
    }
    
    if (targets.length === 0) {
      return reply(`✅ No ${filterDescription} found to kick.`);
    }
    
    // Rate limit: max 50 kicks per command
    if (targets.length > 50) {
      return reply(`❌ Too many targets (${targets.length}). Maximum is 50 per command.`);
    }
    
    // Require confirmation
    const confirmText = 
      `⚠️ *CONFIRMATION REQUIRED*\n\n` +
      `You are about to kick **${targets.length}** ${filterDescription}.\n\n` +
      `Type *CONFIRM* to proceed, or anything else to cancel.`;
    
    await sock.sendMessage(message.chat, { text: confirmText });
    
    // Wait for confirmation (simplified - in real implementation would wait for response)
    // For now, we'll skip the confirmation and just show what would happen
    return reply(
      `📋 *KICKALL PREVIEW*\n\n` +
      `Filter: ${filterDescription}\n` +
      `Targets: ${targets.length}\n\n` +
      `To execute, implement confirmation handling.\n\n` +
      `First 10 targets:\n` +
      targets.slice(0, 10).map((t, i) => `${i + 1}. @${t.split('@')[0]}`).join('\n') +
      (targets.length > 10 ? `\n... and ${targets.length - 10} more` : ''),
      { mentions: targets.slice(0, 10) }
    );
  }
};


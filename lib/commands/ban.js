/**
 * Command: ban
 * Category: 🛡️ Admin
 * Description: Ban a user from the group (permanent or temporary)
 */

const moderationManager = require('../utils/moderation.js');
const { parseDuration } = require('../utils/time.js');
const command = {
  pattern: 'ban',
  aliases: ['tempban'],
  description: 'Ban a user from the group',
  category: 'admin',
  usage: '<@user|reply> [reason] [duration]',
  ownerOnly: false,
  groupOnly: true,
  
  async handler(sock, message, args, context) {
    const { isOwner, isAdmin, reply, isGroup, mentionedJid, quoted, senderJid } = context;
    
    if (!isGroup) {
      return reply('❌ This command can only be used in groups');
    }
    
    if (!isOwner && !isAdmin) {
      return reply('❌ Only admins can ban users');
    }
    
    let targetUser = null;
    let reason = 'No reason specified';
    let duration = null;
    
    if (quoted) {
      targetUser = quoted.sender;
      // Parse args for reason and duration
      const lastArg = args[args.length - 1];
      const parsedDuration = parseDuration(lastArg);
      
      if (parsedDuration) {
        duration = parsedDuration;
        reason = args.slice(0, -1).join(' ') || 'No reason specified';
      } else {
        reason = args.join(' ') || 'No reason specified';
      }
    } else if (mentionedJid && mentionedJid.length > 0) {
      targetUser = mentionedJid[0];
      // Parse args for reason and duration
      const lastArg = args[args.length - 1];
      const parsedDuration = parseDuration(lastArg);
      
      if (parsedDuration) {
        duration = parsedDuration;
        reason = args.slice(1, -1).join(' ') || 'No reason specified';
      } else {
        reason = args.slice(1).join(' ') || 'No reason specified';
      }
    }
    
    if (!targetUser) {
      return reply(
        '❌ Please mention or reply to a user\n\n' +
        `*Usage:*\n` +
        `.ban @user [reason] - Permanent ban\n` +
        `.ban @user [reason] 24h - Temporary ban for 24 hours\n` +
        `.tempban @user 7d Spamming - Ban for 7 days`
      );
    }
    
    // Check if target is also an admin (can't ban admins)
    try {
      const groupMetadata = await sock.groupMetadata(message.chat);
      const targetParticipant = groupMetadata.participants.find(p => p.id === targetUser);
      
      if (targetParticipant?.admin && !isOwner) {
        return reply('❌ Cannot ban group administrators');
      }
    } catch (error) {
      console.error('[BanCommand] Error checking admin status:', error.message);
    }
    
    // Check if bot is admin
    try {
      const groupMetadata = await sock.groupMetadata(message.chat);
      const botParticipant = groupMetadata.participants.find(p => p.id === sock.user.id);
      
      if (!botParticipant?.admin) {
        return reply('❌ Bot must be an admin to ban users');
      }
    } catch (error) {
      console.error('[BanCommand] Error checking bot admin status:', error.message);
    }
    
    // Ban user
    const result = await moderationManager.banUser(
      message.chat,
      targetUser,
      reason,
      duration,
      senderJid
    );
    
    if (!result.success) {
      return reply(`❌ Failed to ban user: ${result.error}`);
    }
    
    const userPhone = targetUser.split('@')[0];
    
    // Remove user from group
    try {
      await sock.groupParticipantsUpdate(message.chat, [targetUser], 'remove');
      
      const banType = duration ? `Temporary (${formatDuration(duration)})` : 'Permanent';
      
      await sock.sendMessage(message.chat, {
        text: `🚫 *USER BANNED*\n\n👤 User: @${userPhone}\n📝 Reason: ${reason}\n⏱️ Type: ${banType}`,
        mentions: [targetUser]
      });
      
      console.log(`[Admin] User banned: ${userPhone} (${banType})`);
    } catch (error) {
      console.error('[BanCommand] Error removing user:', error.message);
      return reply(`❌ Failed to remove user from group: ${error.message}`);
    }
  }
};

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} day(s)`;
  if (hours > 0) return `${hours} hour(s)`;
  if (minutes > 0) return `${minutes} minute(s)`;
  return `${seconds} second(s)`;
}


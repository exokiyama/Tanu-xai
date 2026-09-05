/**
 * Command: tempmute
 * Category: 🛡️ Admin
 * Description: Temporarily mute a user (restrict from sending messages)
 */

const moderationManager = require('../utils/moderation.js');
const { parseDuration } = require('../utils/time.js');
const command = {
  pattern: 'tempmute',
  aliases: ['muteuser'],
  description: 'Temporarily mute a user',
  category: 'admin',
  usage: '<@user|reply> <duration>',
  ownerOnly: false,
  groupOnly: true,
  
  async handler(sock, message, args, context) {
    const { isOwner, isAdmin, reply, isGroup, mentionedJid, quoted, senderJid } = context;
    
    if (!isGroup) {
      return reply('❌ This command can only be used in groups');
    }
    
    if (!isOwner && !isAdmin) {
      return reply('❌ Only admins can mute users');
    }
    
    let targetUser = null;
    let durationStr = null;
    
    if (quoted) {
      targetUser = quoted.sender;
      durationStr = args[0];
    } else if (mentionedJid && mentionedJid.length > 0) {
      targetUser = mentionedJid[0];
      durationStr = args[1];
    }
    
    if (!targetUser || !durationStr) {
      return reply(
        '❌ Please mention or reply to a user and specify duration\n\n' +
        `*Usage:*\n` +
        `.tempmute @user 1h - Mute for 1 hour\n` +
        `.tempmute @user 30m - Mute for 30 minutes\n` +
        `.tempmute @user 24h - Mute for 24 hours`
      );
    }
    
    // Parse duration
    const duration = parseDuration(durationStr);
    
    if (!duration) {
      return reply(
        '❌ Invalid duration format\n\n' +
        `*Valid formats:*\n` +
        `30s - 30 seconds\n` +
        `5m - 5 minutes\n` +
        `1h - 1 hour\n` +
        `24h - 24 hours\n` +
        `7d - 7 days`
      );
    }
    
    // Check if bot is admin
    try {
      const groupMetadata = await sock.groupMetadata(message.chat);
      const botParticipant = groupMetadata.participants.find(p => p.id === sock.user.id);
      
      if (!botParticipant?.admin) {
        return reply('❌ Bot must be an admin to mute users');
      }
    } catch (error) {
      console.error('[TempMuteCommand] Error checking bot admin status:', error.message);
    }
    
    // Apply restriction
    const result = await moderationManager.restrictUser(
      message.chat,
      targetUser,
      'mute',
      duration,
      senderJid
    );
    
    if (!result.success) {
      return reply(`❌ Failed to mute user: ${result.error}`);
    }
    
    const userPhone = targetUser.split('@')[0];
    const expiresAt = new Date(Date.now() + duration).toLocaleString();
    
    await sock.sendMessage(message.chat, {
      text: `🔇 *USER MUTED*\n\n👤 User: @${userPhone}\n⏱️ Duration: ${formatDuration(duration)}\n📅 Expires: ${expiresAt}`,
      mentions: [targetUser]
    });
    
    console.log(`[Admin] User muted: ${userPhone} for ${formatDuration(duration)}`);
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


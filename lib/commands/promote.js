/**
 * Command: promote
 * Category: 👥 Group
 * Description: Promotes a member to admin
 */

const { getUsersFromContext, isBotAdmin, isAdmin, formatJid } = require('../utils/group.js');
const command = {
  name: 'promote',
  pattern: 'promote',
  aliases: ['makeadmin', 'admin', 'pm'],
  category: '👥 Group',
  description: 'Promotes a member to admin',
  usage: '<@user | reply to user>',
  permissions: [],
  groupOnly: true,
  adminOnly: true,
  botAdminRequired: true,

  async execute(sock, message, args, context) {
    const { chatId, senderJid, participants, botJid, isGroup } = context;

    // Verify this is a group
    if (!isGroup) {
      await sock.sendMessage(chatId, { text: '_This command can only be used in groups_' });
      return;
    }

    // Check if bot is admin
    if (!isBotAdmin(participants, botJid)) {
      await sock.sendMessage(chatId, { text: '_Bot must be an admin to use this command_' });
      return;
    }

    // Check if sender is admin
    if (!isAdmin(participants, senderJid)) {
      await sock.sendMessage(chatId, { text: '_You must be an admin to use this command_' });
      return;
    }

    // Get users to promote from context
    const text = args.join(' ');
    const usersToPromote = getUsersFromContext(message, text);

    if (usersToPromote.length === 0) {
      await sock.sendMessage(chatId, { 
        text: '_Please mention or reply to a user to promote_' 
      });
      return;
    }

    // Validate users - filter out existing admins and users not in group
    const validation = validateUsersForPromotion(usersToPromote, participants);
    
    // Notify about users who are already admins
    for (const adminUser of validation.alreadyAdmin) {
      await sock.sendMessage(chatId, {
        text: `@${formatJid(adminUser)} is already an admin`,
        mentions: [adminUser]
      });
    }

    // Notify about users not in group
    for (const missingUser of validation.notInGroup) {
      await sock.sendMessage(chatId, {
        text: `@${formatJid(missingUser)} is not in this group`,
        mentions: [missingUser]
      });
    }

    // If no valid users to promote, stop
    if (validation.valid.length === 0) {
      await sock.sendMessage(chatId, { text: '_No valid users to promote_' });
      return;
    }

    try {
      // Promote the users
      await sock.groupParticipantsUpdate(chatId, validation.valid, 'promote');
      
      const promotedNames = validation.valid.map(u => `@${formatJid(u)}`).join(', ');
      await sock.sendMessage(chatId, {
        text: `Successfully promoted ${promotedNames} to admin`,
        mentions: validation.valid
      });
    } catch (error) {
      console.error('[PromoteCommand] Error:', error);
      await sock.sendMessage(chatId, { 
        text: `_Failed to promote user(s): ${error.message}_` 
      });
    }
  }
};

// Helper function for validation
function validateUsersForPromotion(users, participants) {
  const valid = [];
  const alreadyAdmin = [];
  const notInGroup = [];

  for (const user of users) {
    const participant = participants.find(p => p.id === user);
    
    if (!participant) {
      notInGroup.push(user);
    } else if (participant.admin) {
      alreadyAdmin.push(user);
    } else {
      valid.push(user);
    }
  }

  return { valid, invalid: [...alreadyAdmin, ...notInGroup], alreadyAdmin, notInGroup };
}

// Missing module.exports fixed
module.exports = command;

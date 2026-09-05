/**
 * Command: kick
 * Category: 👥 Group
 * Description: Removes a person from the group
 */

const { parseMentions, getUsersFromContext, isBotAdmin, isAdmin, formatJid } = require('../utils/group.js');
const command = {
  name: 'kick',
  pattern: 'kick',
  aliases: ['remove', 'rm', 'k'],
  category: '👥 Group',
  description: 'Removes a person from the group',
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

    // Get users to kick from context
    const text = args.join(' ');
    const usersToKick = getUsersFromContext(message, text);

    if (usersToKick.length === 0) {
      await sock.sendMessage(chatId, { 
        text: '_Please mention or reply to a user to kick_' 
      });
      return;
    }

    // Validate users - filter out admins and users not in group
    const validation = validateUsersForAction(usersToKick, participants, true);
    
    // Notify about admin users that can't be kicked
    for (const adminUser of validation.alreadyAdmin) {
      await sock.sendMessage(chatId, {
        text: `Cannot kick admin @${formatJid(adminUser)}`,
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

    // If no valid users to kick, stop
    if (validation.valid.length === 0) {
      await sock.sendMessage(chatId, { text: '_No valid users to kick_' });
      return;
    }

    try {
      // Kick the users
      await sock.groupParticipantsUpdate(chatId, validation.valid, 'remove');
      
      const kickedNames = validation.valid.map(u => `@${formatJid(u)}`).join(', ');
      await sock.sendMessage(chatId, {
        text: `Successfully removed ${kickedNames} from the group`,
        mentions: validation.valid
      });
    } catch (error) {
      console.error('[KickCommand] Error:', error);
      await sock.sendMessage(chatId, { 
        text: `_Failed to remove user(s): ${error.message}_` 
      });
    }
  }
};

// Helper function for validation (could also be in group.js)
function validateUsersForAction(users, participants, excludeAdmins = true) {
  const valid = [];
  const alreadyAdmin = [];
  const notInGroup = [];

  for (const user of users) {
    const participant = participants.find(p => p.id === user);
    
    if (!participant) {
      notInGroup.push(user);
    } else if (excludeAdmins && participant.admin) {
      alreadyAdmin.push(user);
    } else {
      valid.push(user);
    }
  }

  return { valid, invalid: [...alreadyAdmin, ...notInGroup], alreadyAdmin, notInGroup };
}


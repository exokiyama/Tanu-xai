/**
 * Command: demote
 * Category: 👥 Group
 * Description: Demotes an admin to member
 */

import { getUsersFromContext, isBotAdmin, isAdmin, formatJid } from '../utils/group.js';

export const command = {
  name: 'demote',
  pattern: 'demote',
  aliases: ['removeadmin', 'unadmin', 'dm'],
  category: '👥 Group',
  description: 'Demotes an admin to member',
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

    // Get users to demote from context
    const text = args.join(' ');
    const usersToDemote = getUsersFromContext(message, text);

    if (usersToDemote.length === 0) {
      await sock.sendMessage(chatId, { 
        text: '_Please mention or reply to a user to demote_' 
      });
      return;
    }

    // Validate users - filter out non-admins and users not in group
    const validation = validateUsersForDemotion(usersToDemote, participants);
    
    // Notify about users who are not admins
    for (const nonAdminUser of validation.notAdmin) {
      await sock.sendMessage(chatId, {
        text: `@${formatJid(nonAdminUser)} is not an admin`,
        mentions: [nonAdminUser]
      });
    }

    // Notify about users not in group
    for (const missingUser of validation.notInGroup) {
      await sock.sendMessage(chatId, {
        text: `@${formatJid(missingUser)} is not in this group`,
        mentions: [missingUser]
      });
    }

    // If no valid users to demote, stop
    if (validation.valid.length === 0) {
      await sock.sendMessage(chatId, { text: '_No valid users to demote_' });
      return;
    }

    try {
      // Demote the users
      await sock.groupParticipantsUpdate(chatId, validation.valid, 'demote');
      
      const demotedNames = validation.valid.map(u => `@${formatJid(u)}`).join(', ');
      await sock.sendMessage(chatId, {
        text: `Successfully demoted ${demotedNames} from admin`,
        mentions: validation.valid
      });
    } catch (error) {
      console.error('[DemoteCommand] Error:', error);
      await sock.sendMessage(chatId, { 
        text: `_Failed to demote user(s): ${error.message}_` 
      });
    }
  }
};

// Helper function for validation
function validateUsersForDemotion(users, participants) {
  const valid = [];
  const notAdmin = [];
  const notInGroup = [];

  for (const user of users) {
    const participant = participants.find(p => p.id === user);
    
    if (!participant) {
      notInGroup.push(user);
    } else if (!participant.admin) {
      notAdmin.push(user);
    } else {
      valid.push(user);
    }
  }

  return { valid, invalid: [...notAdmin, ...notInGroup], notAdmin, notInGroup };
}

export default command;

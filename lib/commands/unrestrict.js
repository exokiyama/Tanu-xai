/**
 * Command: unrestrict
 * Category: 👥 Group
 * Description: Allows all members to edit group settings
 */

import { formatJid } from '../utils/group.js';

export const command = {
  name: 'unrestrict',
  pattern: 'unrestrict',
  aliases: ['unlockinfo', 'openinfo', 'allmembers'],
  category: '👥 Group',
  description: 'Allows all members to edit group settings',
  usage: 'unrestrict',
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
    const botIsAdmin = participants.find(p => p.id === botJid)?.admin !== null;
    if (!botIsAdmin) {
      await sock.sendMessage(chatId, { text: '_Bot must be an admin to use this command_' });
      return;
    }

    // Check if sender is admin
    const senderIsAdmin = participants.find(p => p.id === senderJid)?.admin !== null;
    if (!senderIsAdmin) {
      await sock.sendMessage(chatId, { text: '_You must be an admin to use this command_' });
      return;
    }

    try {
      // Allow all members to edit group info
      await sock.groupSettingUpdate(chatId, 'unlocked');
      
      await sock.sendMessage(chatId, { 
        text: `🔓 *Group Settings Unrestricted*\n\nAll members can now edit group info (subject, description, icon).` 
      });
    } catch (error) {
      console.error('[UnrestrictCommand] Error:', error);
      await sock.sendMessage(chatId, { 
        text: `_Failed to unlock group settings: ${error.message}_` 
      });
    }
  }
};

export default command;

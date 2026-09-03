/**
 * Command: lock
 * Category: 👥 Group
 * Description: Sets group to announcement mode (only admins can send messages)
 */

import { formatJid } from '../utils/group.js';

export const command = {
  name: 'lock',
  pattern: 'lock',
  aliases: ['announce', 'groupannounce', 'lockgroup'],
  category: '👥 Group',
  description: 'Sets group to announcement mode (only admins can send messages)',
  usage: 'lock',
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
      // Set group to announcement mode (locked)
      await sock.groupSettingUpdate(chatId, 'announcement');
      
      await sock.sendMessage(chatId, { 
        text: `🔒 *Group Locked*\n\nOnly admins can now send messages.` 
      });
    } catch (error) {
      console.error('[LockCommand] Error:', error);
      await sock.sendMessage(chatId, { 
        text: `_Failed to lock group: ${error.message}_` 
      });
    }
  }
};

export default command;

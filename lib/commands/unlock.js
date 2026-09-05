/**
 * Command: unlock
 * Category: 👥 Group
 * Description: Unlocks group (all members can send messages)
 */

const { formatJid } = require('../utils/group.js');
const command = {
  name: 'unlock',
  pattern: 'unlock',
  aliases: ['unannounce', 'open', 'unlockgroup'],
  category: '👥 Group',
  description: 'Unlocks group (all members can send messages)',
  usage: 'unlock',
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
      // Set group to open mode (unlocked)
      await sock.groupSettingUpdate(chatId, 'not_announcement');
      
      await sock.sendMessage(chatId, { 
        text: `🔓 *Group Unlocked*\n\nAll members can now send messages.` 
      });
    } catch (error) {
      console.error('[UnlockCommand] Error:', error);
      await sock.sendMessage(chatId, { 
        text: `_Failed to unlock group: ${error.message}_` 
      });
    }
  }
};


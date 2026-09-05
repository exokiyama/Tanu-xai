/**
 * Command: restrict
 * Category: 👥 Group
 * Description: Restricts group settings editing to admins only
 */

const { formatJid } = require('../utils/group.js');
const command = {
  name: 'restrict',
  pattern: 'restrict',
  aliases: ['lockinfo', 'restrictsettings', 'adminonly'],
  category: '👥 Group',
  description: 'Restricts group settings editing to admins only',
  usage: 'restrict',
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
      // Restrict group info editing to admins only
      await sock.groupSettingUpdate(chatId, 'locked');
      
      await sock.sendMessage(chatId, { 
        text: `🔐 *Group Settings Restricted*\n\nOnly admins can now edit group info (subject, description, icon).` 
      });
    } catch (error) {
      console.error('[RestrictCommand] Error:', error);
      await sock.sendMessage(chatId, { 
        text: `_Failed to restrict group settings: ${error.message}_` 
      });
    }
  }
};

// Missing module.exports fixed
module.exports = command;

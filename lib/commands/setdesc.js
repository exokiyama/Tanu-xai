/**
 * Command: setdesc
 * Category: 👥 Group
 * Description: Changes the group description
 */

const { formatJid } = require('../utils/group.js');
const command = {
  name: 'setdesc',
  pattern: 'setdesc',
  aliases: ['description', 'gdesc', 'setdescription', 'groupdesc'],
  category: '👥 Group',
  description: 'Changes the group description',
  usage: '<new description>',
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

    // Get new description from args
    const newDesc = args.join(' ').trim();
    
    if (!newDesc) {
      await sock.sendMessage(chatId, { 
        text: '_Please provide a new description for the group_\n\nUsage: .setdesc <description>' 
      });
      return;
    }

    try {
      await sock.groupUpdateDescription(chatId, newDesc);
      
      await sock.sendMessage(chatId, { 
        text: `✅ Successfully updated group description.` 
      });
    } catch (error) {
      console.error('[SetDescCommand] Error:', error);
      await sock.sendMessage(chatId, { 
        text: `_Failed to update group description: ${error.message}_` 
      });
    }
  }
};

// Missing module.exports fixed
module.exports = command;

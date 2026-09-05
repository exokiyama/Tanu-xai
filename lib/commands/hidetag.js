/**
 * Command: hidetag
 * Category: 👥 Group
 * Description: Tags all members silently (without notification sound)
 */

const { formatJid } = require('../utils/group.js');
const command = {
  name: 'hidetag',
  pattern: 'hidetag',
  aliases: ['ht', 'hiddentag', 'silentag'],
  category: '👥 Group',
  description: 'Tags all members in the group silently',
  usage: '<message>',
  permissions: [],
  groupOnly: true,
  adminOnly: true,
  botAdminRequired: false,

  async execute(sock, message, args, context) {
    const { chatId, senderJid, participants, isGroup } = context;

    // Verify this is a group
    if (!isGroup) {
      await sock.sendMessage(chatId, { text: '_This command can only be used in groups_' });
      return;
    }

    // Check if sender is admin
    const isAdmin = participants.find(p => p.id === senderJid)?.admin !== null;
    if (!isAdmin) {
      await sock.sendMessage(chatId, { text: '_You must be an admin to use this command_' });
      return;
    }

    // Get the message to send
    const customMessage = args.join(' ');
    
    if (!customMessage) {
      await sock.sendMessage(chatId, { 
        text: '_Please provide a message to send with hidetag_\n\nUsage: .hidetag <message>' 
      });
      return;
    }

    try {
      // Get all member JIDs for mentions
      const mentionedJid = participants.map(p => p.id);

      // Send message with mentions (this creates silent tags)
      await sock.sendMessage(chatId, {
        text: customMessage,
        mentions: mentionedJid
      });
    } catch (error) {
      console.error('[HideTagCommand] Error:', error);
      await sock.sendMessage(chatId, { 
        text: `_Failed to send hidden tag: ${error.message}_` 
      });
    }
  }
};

// Missing module.exports fixed
module.exports = command;

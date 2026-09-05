/**
 * Command: tagall
 * Category: 👥 Group
 * Description: Tags all members in the group
 */

const { getGroupMetadata, formatJid } = require('../utils/group.js');
const command = {
  name: 'tagall',
  pattern: 'tagall',
  aliases: ['everyone', 'all', 'mention'],
  category: '👥 Group',
  description: 'Tags all members in the group',
  usage: '[message]',
  permissions: [],
  groupOnly: true,
  adminOnly: false,
  botAdminRequired: false,

  async execute(sock, message, args, context) {
    const { chatId, senderJid, participants, isGroup } = context;

    // Verify this is a group
    if (!isGroup) {
      await sock.sendMessage(chatId, { text: '_This command can only be used in groups_' });
      return;
    }

    // Get the custom message if provided
    const customMessage = args.join(' ') || '';

    try {
      // Build the tag message
      let text = `乂 *GROUP TAG ALL*\n\n`;
      text += `*Group:* ${context.groupName || 'Unknown'}\n`;
      text += `*Total Members:* ${participants.length}\n\n`;
      
      if (customMessage) {
        text += `${customMessage}\n\n`;
      }

      // Tag each member
      const mentionedJid = participants.map(p => p.id);
      
      for (let i = 0; i < participants.length; i++) {
        const p = participants[i];
        text += `*${i + 1}.* @${formatJid(p.id)}\n`;
      }

      await sock.sendMessage(chatId, {
        text: text,
        mentions: mentionedJid
      });
    } catch (error) {
      console.error('[TagAllCommand] Error:', error);
      await sock.sendMessage(chatId, { 
        text: `_Failed to tag all members: ${error.message}_` 
      });
    }
  }
};

// Missing module.exports fixed
module.exports = command;

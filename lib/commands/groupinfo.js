/**
 * Command: groupinfo
 * Category: 👥 Group
 * Description: Shows detailed information about the group
 */

const { formatJid, isBotAdmin, isAdmin } = require('../utils/group.js');
const command = {
  name: 'groupinfo',
  pattern: 'groupinfo',
  aliases: ['ginfo', 'groupprops', 'infogroup'],
  category: '👥 Group',
  description: 'Shows detailed information about the group',
  usage: 'groupinfo',
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

    try {
      // Get full group metadata
      const groupMetadata = await sock.groupMetadata(chatId);
      
      const subject = groupMetadata.subject || 'Unknown';
      const owner = groupMetadata.owner ? formatJid(groupMetadata.owner) : 'Unknown';
      const creation = groupMetadata.creation 
        ? new Date(groupMetadata.creation * 1000).toLocaleString() 
        : 'Unknown';
      const desc = groupMetadata.desc || 'No description';
      
      // Count admins and members
      const admins = participants.filter(p => p.admin !== null);
      const memberCount = participants.length;
      const adminCount = admins.length;
      
      // Build info text
      let text = `乂 *GROUP INFORMATION*\n\n`;
      text += `*Subject:* ${subject}\n`;
      text += `*ID:* ${groupMetadata.id}\n`;
      text += `*Owner:* @${owner}\n`;
      text += `*Created:* ${creation}\n`;
      text += `*Total Members:* ${memberCount}\n`;
      text += `*Admins:* ${adminCount}\n`;
      text += `*Description:* ${desc}\n\n`;
      
      // List admins
      text += `*━━ Admin List ━━*\n`;
      if (admins.length > 0) {
        for (let i = 0; i < admins.length; i++) {
          const admin = admins[i];
          const role = admin.admin === 'superadmin' ? '(Owner)' : '(Admin)';
          text += `${i + 1}. @${formatJid(admin.id)} ${role}\n`;
        }
      } else {
        text += `No admins found\n`;
      }

      // Mention owner and admins
      const mentionedJid = [groupMetadata.owner, ...admins.map(a => a.id)].filter(Boolean);

      await sock.sendMessage(chatId, {
        text: text,
        mentions: mentionedJid
      });
    } catch (error) {
      console.error('[GroupInfoCommand] Error:', error);
      await sock.sendMessage(chatId, { 
        text: `_Failed to get group info: ${error.message}_` 
      });
    }
  }
};

// Missing module.exports fixed
module.exports = command;

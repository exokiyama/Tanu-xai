/**
 * Command: adminlist
 * Category: 👥 Group
 * Description: Shows list of group admins
 */

const { formatJid } = require('../utils/group.js');
const command = {
  name: 'adminlist',
  pattern: 'adminlist',
  aliases: ['admins', 'admin', 'listadmin'],
  category: '👥 Group',
  description: 'Shows list of group admins',
  usage: 'adminlist',
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
      // Filter admins from participants
      const admins = participants.filter(p => p.admin !== null);
      
      if (admins.length === 0) {
        await sock.sendMessage(chatId, { 
          text: '_No admins found in this group_' 
        });
        return;
      }

      // Build admin list text
      let text = `乂 *GROUP ADMINS*\n\n`;
      text += `*Total Admins:* ${admins.length}\n\n`;
      
      for (let i = 0; i < admins.length; i++) {
        const admin = admins[i];
        const role = admin.admin === 'superadmin' ? '(Owner)' : '(Admin)';
        text += `${i + 1}. @${formatJid(admin.id)} ${role}\n`;
      }

      // Mention all admins
      const mentionedJid = admins.map(a => a.id);

      await sock.sendMessage(chatId, {
        text: text,
        mentions: mentionedJid
      });
    } catch (error) {
      console.error('[AdminListCommand] Error:', error);
      await sock.sendMessage(chatId, { 
        text: `_Failed to get admin list: ${error.message}_` 
      });
    }
  }
};

// Missing module.exports fixed
module.exports = command;

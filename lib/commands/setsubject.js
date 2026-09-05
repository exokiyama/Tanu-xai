/**
 * Command: setsubject
 * Category: 👥 Group
 * Description: Changes the group subject/name
 */

const { formatJid } = require('../utils/group.js');
const command = {
  name: 'setsubject',
  pattern: 'setsubject',
  aliases: ['subject', 'gsubject', 'setname', 'groupname'],
  category: '👥 Group',
  description: 'Changes the group subject/name',
  usage: '<new subject>',
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

    // Get new subject from args
    const newSubject = args.join(' ').trim();
    
    if (!newSubject) {
      await sock.sendMessage(chatId, { 
        text: '_Please provide a new subject for the group_\n\nUsage: .setsubject <new name>' 
      });
      return;
    }

    // Validate subject length (WhatsApp limit is typically 100 chars)
    if (newSubject.length > 100) {
      await sock.sendMessage(chatId, { 
        text: '_Group subject must be 100 characters or less_' 
      });
      return;
    }

    try {
      await sock.groupUpdateSubject(chatId, newSubject);
      
      await sock.sendMessage(chatId, { 
        text: `✅ Successfully updated group subject to:\n\n*${newSubject}*` 
      });
    } catch (error) {
      console.error('[SetSubjectCommand] Error:', error);
      await sock.sendMessage(chatId, { 
        text: `_Failed to update group subject: ${error.message}_` 
      });
    }
  }
};


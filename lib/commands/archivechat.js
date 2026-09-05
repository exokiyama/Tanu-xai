/**
 * Command: archivechat
 * Category: 💬 Message
 * Description: Archive or unarchive the current chat
 */

const { archiveChat } = require('../utils/message.js');
const { formatBox } = require('../utils/format.js');
const command = {
  name: 'archivechat',
  pattern: 'archivechat',
  aliases: ['archive', 'ac'],
  category: '💬 Message',
  description: 'Archive or unarchive the current chat',
  usage: '.archivechat [on|off]',
  ownerOnly: false,
  groupOnly: false,

  async execute(sock, message, args, context) {
    const { reply, chatId } = context;

    const action = (args[0] || '').toLowerCase();

    try {
      let success = false;
      let actionText = '';

      if (action === 'off' || action === 'unarchive') {
        // Unarchive chat
        success = await archiveChat(sock, chatId, false);
        actionText = 'unarchived';
      } else {
        // Archive chat (default)
        success = await archiveChat(sock, chatId, true);
        actionText = 'archived';
      }

      if (success) {
        return reply(
          formatBox('ARCHIVE CHAT', [
            `✅ Chat has been *${actionText}*`,
            '',
            action === 'off'
              ? '_Chat restored to main chat list_'
              : '_Chat moved to archived chats_'
          ])
        );
      } else {
        return reply(`❌ Failed to ${action === 'off' ? 'unarchive' : 'archive'} chat.`);
      }

    } catch (error) {
      console.error('[ArchiveChat] Error:', error.message);
      return reply('❌ Failed to change archive status.');
    }
  }
};


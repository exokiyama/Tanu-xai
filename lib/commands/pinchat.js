/**
 * Command: pinchat
 * Category: 💬 Message
 * Description: Pin or unpin a chat
 */

const { pinChat, unpinChat } = require('../utils/message.js');
const { formatBox } = require('../utils/format.js');
const command = {
  name: 'pinchat',
  pattern: 'pinchat',
  aliases: ['pin', 'pc'],
  category: '💬 Message',
  description: 'Pin or unpin the current chat',
  usage: '.pinchat [on|off]',
  ownerOnly: false,
  groupOnly: false,

  async execute(sock, message, args, context) {
    const { reply, chatId } = context;

    const action = (args[0] || '').toLowerCase();

    try {
      let success = false;
      let actionText = '';

      if (action === 'off' || action === 'unpin') {
        // Unpin chat
        success = await unpinChat(sock, chatId);
        actionText = 'unpinned';
      } else {
        // Pin chat (default)
        success = await pinChat(sock, chatId);
        actionText = 'pinned';
      }

      if (success) {
        return reply(
          formatBox('PIN CHAT', [
            `✅ Chat has been *${actionText}*`,
            '',
            action === 'off' 
              ? '_Chat removed from pinned list_'
              : '_Chat moved to top of chat list_'
          ])
        );
      } else {
        return reply(`❌ Failed to ${action === 'off' ? 'unpin' : 'pin'} chat.`);
      }

    } catch (error) {
      console.error('[PinChat] Error:', error.message);
      return reply('❌ Failed to change pin status. Make sure you have access to this chat.');
    }
  }
};


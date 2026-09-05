/**
 * Command: online
 * Category: 💬 Message
 * Description: Set bot presence to online (owner-only)
 */

const { sendPresenceUpdate } = require('../utils/message.js');
const { formatBox } = require('../utils/format.js');
const command = {
  name: 'online',
  pattern: 'online',
  aliases: ['available', 'presence'],
  category: '💬 Message',
  description: 'Set bot presence to online/available',
  usage: '.online',
  ownerOnly: true,
  groupOnly: false,

  async execute(sock, message, args, context) {
    const { reply, chatId } = context;

    try {
      // Send available presence
      await sendPresenceUpdate(sock, chatId, 'available');

      return reply(
        formatBox('ONLINE STATUS', [
          '✅ Bot presence set to ONLINE',
          '',
          '_Bot will appear as "online" in this chat_'
        ])
      );

    } catch (error) {
      console.error('[Online] Error:', error.message);
      return reply('❌ Failed to set online status.');
    }
  }
};

// Missing module.exports fixed
module.exports = command;

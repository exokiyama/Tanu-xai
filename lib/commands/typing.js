/**
 * Command: typing
 * Category: 💬 Message
 * Description: Show typing indicator in chat (owner-only)
 */

const { sendPresenceUpdate } = require('../utils/message.js');
const { formatBox } = require('../utils/format.js');
const command = {
  name: 'typing',
  pattern: 'typing',
  aliases: ['type', 'composing'],
  category: '💬 Message',
  description: 'Show typing indicator in chat',
  usage: '.typing [seconds]',
  ownerOnly: true,
  groupOnly: false,

  async execute(sock, message, args, context) {
    const { reply, chatId } = context;

    // Default duration: 30 seconds
    let duration = 30;
    if (args[0] && !isNaN(parseInt(args[0]))) {
      duration = Math.min(parseInt(args[0]), 60); // Max 60 seconds
    }

    try {
      // Send typing presence
      await sendPresenceUpdate(sock, chatId, 'composing');

      await reply(
        formatBox('TYPING INDICATOR', [
          `✅ Typing indicator activated`,
          `⏱️ Duration: ${duration} seconds`,
          '',
          '_Indicator will stop automatically after timeout_'
        ])
      );

      // Stop typing after duration
      setTimeout(async () => {
        try {
          await sendPresenceUpdate(sock, chatId, 'paused');
        } catch (e) {
          // Ignore errors when stopping
        }
      }, duration * 1000);

    } catch (error) {
      console.error('[Typing] Error:', error.message);
      return reply('❌ Failed to send typing indicator.');
    }
  }
};

// Missing module.exports fixed
module.exports = command;

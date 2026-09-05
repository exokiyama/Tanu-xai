/**
 * Command: recording
 * Category: 💬 Message
 * Description: Show recording indicator in chat (owner-only)
 */

const { sendPresenceUpdate } = require('../utils/message.js');
const { formatBox } = require('../utils/format.js');
const command = {
  name: 'recording',
  pattern: 'recording',
  aliases: ['record', 'rec'],
  category: '💬 Message',
  description: 'Show recording audio indicator in chat',
  usage: '.recording [seconds]',
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
      // Send recording presence
      await sendPresenceUpdate(sock, chatId, 'recording');

      await reply(
        formatBox('RECORDING INDICATOR', [
          `✅ Recording indicator activated`,
          `⏱️ Duration: ${duration} seconds`,
          '',
          '_Indicator will stop automatically after timeout_'
        ])
      );

      // Stop recording after duration
      setTimeout(async () => {
        try {
          await sendPresenceUpdate(sock, chatId, 'paused');
        } catch (e) {
          // Ignore errors when stopping
        }
      }, duration * 1000);

    } catch (error) {
      console.error('[Recording] Error:', error.message);
      return reply('❌ Failed to send recording indicator.');
    }
  }
};

// Missing module.exports fixed
module.exports = command;

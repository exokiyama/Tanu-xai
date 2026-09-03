/**
 * Command: star
 * Category: 💬 Message
 * Description: Star or unstar a message
 */

import { getQuotedMessage, getMessageKey, starMessage } from '../utils/message.js';
import { formatBox } from '../utils/format.js';
import { checkRateLimit } from '../utils/rate-limiter.js';

export const command = {
  name: 'star',
  pattern: 'star',
  aliases: ['unstar', 'bookmark'],
  category: '💬 Message',
  description: 'Star or unstar a message for easy access later',
  usage: '.star [on|off] (reply to a message)',
  ownerOnly: false,
  groupOnly: false,

  async execute(sock, message, args, context) {
    const { reply, chatId, senderJid } = context;

    // Rate limit: 20 star operations per minute per user
    const rateLimitKey = `star:${senderJid}`;
    if (!checkRateLimit(rateLimitKey, 20, 60)) {
      return reply('⏱️ Please wait before starring more messages. Rate limit: 20 per minute.');
    }

    // Get quoted message
    const quoted = await getQuotedMessage(message, sock);

    if (!quoted || !quoted.key) {
      return reply(
        formatBox('STAR MESSAGE', [
          'Star or unstar a message for easy access.',
          '',
          '*Usage:* `.star [option]` (reply to a message)',
          '',
          '*Options:*',
          '• `.star` or `.star on` - Star the message',
          '• `.star off` or `.unstar` - Unstar the message',
          '',
          '_Starred messages can be found in chat info_'
        ])
      );
    }

    const action = (args[0] || '').toLowerCase();
    const shouldStar = action !== 'off' && action !== 'unstar';

    try {
      const messageKey = quoted.key;
      const success = await starMessage(sock, chatId, messageKey, shouldStar);

      if (success) {
        return reply(
          formatBox('MESSAGE STARRED', [
            shouldStar ? '✅ Message has been *starred*' : '✅ Message has been *unstarred*',
            '',
            shouldStar 
              ? '_Find starred messages in chat info_'
              : '_Message removed from starred list_'
          ])
        );
      } else {
        return reply('❌ Failed to change star status.');
      }

    } catch (error) {
      console.error('[Star] Error:', error.message);
      return reply('❌ Failed to star/unstar message. Make sure you\'re replying to a valid message.');
    }
  }
};

export default command;

/**
 * Command: url
 * Category: utility
 * Description: URL encode or decode text
 */

import { urlEncode, urlDecode, sanitizeInput } from '../utils/text.js';
import { formatUtilityResponse } from '../utils/format.js';
import { checkRateLimit } from '../utils/rate-limiter.js';

export const command = {
  pattern: 'url',
  aliases: ['urlencode', 'urle'],
  description: 'URL encode or decode text',
  category: 'utility',
  usage: '<encode|decode> <text>',
  ownerOnly: false,
  groupOnly: false,

  async execute(sock, message, args, context) {
    const chatId = message.key.remoteJid;
    const userId = message.key.participant || message.key.remoteJid;
    
    // Rate limiting - max 15 requests per minute
    const rateLimit = checkRateLimit(userId, 'url', 15, 60);
    if (!rateLimit.allowed) {
      await sock.sendMessage(chatId, { 
        text: `⚠️ Rate limit exceeded. Please wait ${rateLimit.retryAfter} seconds.`
      });
      return;
    }

    if (args.length < 2) {
      const helpText = formatUtilityResponse({
        title: 'URL Utility',
        icon: '🔗',
        lines: [
          'Usage:',
          '.url encode <text>',
          '.url decode <encoded>',
          '',
          'Examples:',
          '.url encode Hello World!',
          '.url decode Hello%20World%21'
        ]
      });
      await sock.sendMessage(chatId, { text: helpText });
      return;
    }

    const action = args[0].toLowerCase();
    const text = sanitizeInput(args.slice(1).join(' '));

    try {
      let result;
      let title;

      if (action === 'encode') {
        if (!text) {
          await sock.sendMessage(chatId, { text: '❌ Please provide text to encode' });
          return;
        }
        result = urlEncode(text);
        title = 'URL Encoded';
      } else if (action === 'decode') {
        if (!text) {
          await sock.sendMessage(chatId, { text: '❌ Please provide URL encoded text' });
          return;
        }
        result = urlDecode(text);
        title = 'URL Decoded';
      } else {
        await sock.sendMessage(chatId, { 
          text: '❌ Invalid action. Use "encode" or "decode"'
        });
        return;
      }

      const response = formatUtilityResponse({
        title,
        icon: '🔗',
        lines: [
          `Output: \`${result}\``
        ]
      });

      await sock.sendMessage(chatId, { text: response });
    } catch (error) {
      await sock.sendMessage(chatId, { 
        text: `❌ Error: ${error.message}`
      });
    }
  }
};

export default command;

/**
 * Command: binary
 * Category: utility
 * Description: Convert text to binary or binary to text
 */

import { toBinary, fromBinary, sanitizeInput } from '../utils/text.js';
import { formatUtilityResponse } from '../utils/format.js';
import { checkRateLimit } from '../utils/rate-limiter.js';

export const command = {
  pattern: 'binary',
  aliases: ['bin'],
  description: 'Convert text to binary or binary to text',
  category: 'utility',
  usage: '<encode|decode> <text>',
  ownerOnly: false,
  groupOnly: false,

  async execute(sock, message, args, context) {
    const chatId = message.key.remoteJid;
    const userId = message.key.participant || message.key.remoteJid;
    
    // Rate limiting - max 15 requests per minute
    const rateLimit = checkRateLimit(userId, 'binary', 15, 60);
    if (!rateLimit.allowed) {
      await sock.sendMessage(chatId, { 
        text: `⚠️ Rate limit exceeded. Please wait ${rateLimit.retryAfter} seconds.`
      });
      return;
    }

    if (args.length < 2) {
      const helpText = formatUtilityResponse({
        title: 'Binary Utility',
        icon: '🔢',
        lines: [
          'Usage:',
          '.binary encode <text>',
          '.binary decode <binary>',
          '',
          'Examples:',
          '.binary encode Hi',
          '.binary decode 01001000 01101001'
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
        result = toBinary(text);
        title = 'Binary Encoded';
      } else if (action === 'decode') {
        if (!text) {
          await sock.sendMessage(chatId, { text: '❌ Please provide binary to decode' });
          return;
        }
        result = fromBinary(text);
        title = 'Binary Decoded';
      } else {
        await sock.sendMessage(chatId, { 
          text: '❌ Invalid action. Use "encode" or "decode"'
        });
        return;
      }

      const response = formatUtilityResponse({
        title,
        icon: '🔢',
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

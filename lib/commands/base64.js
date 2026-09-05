/**
 * Command: base64
 * Category: utility
 * Description: Encode or decode text using Base64
 */

const { base64Encode, base64Decode, sanitizeInput } = require('../utils/text.js');
const { formatUtilityResponse } = require('../utils/format.js');
const { checkRateLimit } = require('../utils/rate-limiter.js');
const command = {
  pattern: 'base64',
  aliases: ['b64'],
  description: 'Encode or decode text using Base64',
  category: 'utility',
  usage: '<encode|decode> <text>',
  ownerOnly: false,
  groupOnly: false,

  async execute(sock, message, args, context) {
    const chatId = message.key.remoteJid;
    const userId = message.key.participant || message.key.remoteJid;
    
    // Rate limiting - max 15 requests per minute
    const rateLimit = checkRateLimit(userId, 'base64', 15, 60);
    if (!rateLimit.allowed) {
      await sock.sendMessage(chatId, { 
        text: `⚠️ Rate limit exceeded. Please wait ${rateLimit.retryAfter} seconds.`
      });
      return;
    }

    if (args.length < 2) {
      const helpText = formatUtilityResponse({
        title: 'Base64 Utility',
        icon: '🔐',
        lines: [
          'Usage:',
          '.base64 encode <text>',
          '.base64 decode <base64>',
          '',
          'Examples:',
          '.base64 encode Hello World',
          '.base64 decode SGVsbG8gV29ybGQ='
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
        result = base64Encode(text);
        title = 'Base64 Encoded';
      } else if (action === 'decode') {
        if (!text) {
          await sock.sendMessage(chatId, { text: '❌ Please provide Base64 to decode' });
          return;
        }
        result = base64Decode(text);
        title = 'Base64 Decoded';
      } else {
        await sock.sendMessage(chatId, { 
          text: '❌ Invalid action. Use "encode" or "decode"'
        });
        return;
      }

      const response = formatUtilityResponse({
        title,
        icon: '🔐',
        lines: [
          `Input: ${text.length > 50 ? text.slice(0, 50) + '...' : text}`,
          '',
          `Output:`,
          `\`\`\`${result}\`\`\``
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


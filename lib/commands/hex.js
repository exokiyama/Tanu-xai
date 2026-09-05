/**
 * Command: hex
 * Category: utility
 * Description: Convert text to hexadecimal or hex to text
 */

const { toHex, fromHex, sanitizeInput } = require('../utils/text.js');
const { formatUtilityResponse } = require('../utils/format.js');
const { checkRateLimit } = require('../utils/rate-limiter.js');
const command = {
  pattern: 'hex',
  aliases: ['hexadecimal'],
  description: 'Convert text to hexadecimal or hex to text',
  category: 'utility',
  usage: '<encode|decode> <text>',
  ownerOnly: false,
  groupOnly: false,

  async execute(sock, message, args, context) {
    const chatId = message.key.remoteJid;
    const userId = message.key.participant || message.key.remoteJid;
    
    // Rate limiting - max 15 requests per minute
    const rateLimit = checkRateLimit(userId, 'hex', 15, 60);
    if (!rateLimit.allowed) {
      await sock.sendMessage(chatId, { 
        text: `⚠️ Rate limit exceeded. Please wait ${rateLimit.retryAfter} seconds.`
      });
      return;
    }

    if (args.length < 2) {
      const helpText = formatUtilityResponse({
        title: 'Hex Utility',
        icon: '🔠',
        lines: [
          'Usage:',
          '.hex encode <text>',
          '.hex decode <hex>',
          '',
          'Examples:',
          '.hex encode Hi',
          '.hex decode 4869'
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
        result = toHex(text);
        title = 'Hex Encoded';
      } else if (action === 'decode') {
        if (!text) {
          await sock.sendMessage(chatId, { text: '❌ Please provide hex to decode' });
          return;
        }
        result = fromHex(text);
        title = 'Hex Decoded';
      } else {
        await sock.sendMessage(chatId, { 
          text: '❌ Invalid action. Use "encode" or "decode"'
        });
        return;
      }

      const response = formatUtilityResponse({
        title,
        icon: '🔠',
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


/**
 * Command: hash
 * Category: utility
 * Description: Calculate MD5 or SHA256 hash of text
 */

import { md5, sha256, sanitizeInput } from '../utils/text.js';
import { formatUtilityResponse } from '../utils/format.js';
import { checkRateLimit } from '../utils/rate-limiter.js';

export const command = {
  pattern: 'hash',
  aliases: ['md5', 'sha256', 'sha'],
  description: 'Calculate MD5 or SHA256 hash of text',
  category: 'utility',
  usage: '<md5|sha256> <text>',
  ownerOnly: false,
  groupOnly: false,

  async execute(sock, message, args, context) {
    const chatId = message.key.remoteJid;
    const userId = message.key.participant || message.key.remoteJid;
    
    // Rate limiting - max 15 requests per minute
    const rateLimit = checkRateLimit(userId, 'hash', 15, 60);
    if (!rateLimit.allowed) {
      await sock.sendMessage(chatId, { 
        text: `⚠️ Rate limit exceeded. Please wait ${rateLimit.retryAfter} seconds.`
      });
      return;
    }

    if (args.length < 2) {
      const helpText = formatUtilityResponse({
        title: 'Hash Utility',
        icon: '🔐',
        lines: [
          'Usage:',
          '.hash md5 <text>',
          '.hash sha256 <text>',
          '',
          'Or use aliases:',
          '.md5 <text>',
          '.sha256 <text>'
        ]
      });
      await sock.sendMessage(chatId, { text: helpText });
      return;
    }

    const action = args[0].toLowerCase();
    const text = sanitizeInput(args.slice(1).join(' '));

    if (!text) {
      await sock.sendMessage(chatId, { text: '❌ Please provide text to hash' });
      return;
    }

    try {
      let result;
      let algo;

      if (action === 'md5') {
        result = md5(text);
        algo = 'MD5';
      } else if (action === 'sha256' || action === 'sha') {
        result = sha256(text);
        algo = 'SHA256';
      } else {
        await sock.sendMessage(chatId, { 
          text: '❌ Invalid algorithm. Use "md5" or "sha256"'
        });
        return;
      }

      const response = formatUtilityResponse({
        title: `${algo} Hash`,
        icon: '🔐',
        lines: [
          `Input: ${text.length > 40 ? text.slice(0, 40) + '...' : text}`,
          '',
          `${algo}:`,
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

export default command;

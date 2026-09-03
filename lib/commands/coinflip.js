/**
 * Command: coinflip
 * Category: utility
 * Description: Flip a coin (heads or tails)
 */

import { formatUtilityResponse } from '../utils/format.js';
import { checkRateLimit } from '../utils/rate-limiter.js';

export const command = {
  pattern: 'coinflip',
  aliases: ['coin', 'flip'],
  description: 'Flip a coin (heads or tails)',
  category: 'game',
  usage: '',
  ownerOnly: false,
  groupOnly: false,

  async execute(sock, message, args, context) {
    const chatId = message.key.remoteJid;
    const userId = message.key.participant || message.key.remoteJid;
    
    // Rate limiting - max 30 requests per minute
    const rateLimit = checkRateLimit(userId, 'coinflip', 30, 60);
    if (!rateLimit.allowed) {
      await sock.sendMessage(chatId, { 
        text: `⚠️ Rate limit exceeded. Please wait ${rateLimit.retryAfter} seconds.`
      });
      return;
    }

    const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
    const emoji = result === 'Heads' ? '🪙' : '🔁';

    const response = formatUtilityResponse({
      title: 'Coin Flip',
      icon: emoji,
      lines: [
        `Result: *${result}*`
      ]
    });

    await sock.sendMessage(chatId, { text: response });
  }
};

export default command;

/**
 * Command: dice
 * Category: utility
 * Description: Roll dice (D4, D6, D8, D10, D12, D20, D100)
 */

const { formatUtilityResponse } = require('../utils/format.js');
const { checkRateLimit } = require('../utils/rate-limiter.js');
const command = {
  pattern: 'dice',
  aliases: ['roll', 'd'],
  description: 'Roll dice (D4, D6, D8, D10, D12, D20, D100)',
  category: 'game',
  usage: '[type] [count]',
  ownerOnly: false,
  groupOnly: false,

  async execute(sock, message, args, context) {
    const chatId = message.key.remoteJid;
    const userId = message.key.participant || message.key.remoteJid;
    
    // Rate limiting - max 30 requests per minute
    const rateLimit = checkRateLimit(userId, 'dice', 30, 60);
    if (!rateLimit.allowed) {
      await sock.sendMessage(chatId, { 
        text: `⚠️ Rate limit exceeded. Please wait ${rateLimit.retryAfter} seconds.`
      });
      return;
    }

    const validDice = [4, 6, 8, 10, 12, 20, 100];
    let dieType = 6;
    let count = 1;

    if (args.length >= 1) {
      // Parse dice type (e.g., d20, 20, D20)
      const typeArg = args[0].toLowerCase().replace('d', '');
      const parsedType = parseInt(typeArg);
      if (validDice.includes(parsedType)) {
        dieType = parsedType;
      }
    }

    if (args.length >= 2) {
      count = Math.min(Math.max(1, parseInt(args[1]) || 1), 10);
    }

    const rolls = [];
    let total = 0;
    
    for (let i = 0; i < count; i++) {
      const roll = Math.floor(Math.random() * dieType) + 1;
      rolls.push(roll);
      total += roll;
    }

    const response = formatUtilityResponse({
      title: `D${dieType} Roll`,
      icon: '🎲',
      lines: [
        `Dice: D${dieType}`,
        `Count: ${count}`,
        `Rolls: ${rolls.join(', ')}`,
        count > 1 ? `Total: *${total}*` : `Result: *${rolls[0]}*`
      ]
    });

    await sock.sendMessage(chatId, { text: response });
  }
};


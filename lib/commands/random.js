/**
 * Command: random
 * Category: utility
 * Description: Generate random numbers or make random choices
 */

const { formatUtilityResponse } = require('../utils/format.js');
const { checkRateLimit } = require('../utils/rate-limiter.js');
const command = {
  pattern: 'random',
  aliases: ['rand', 'rng'],
  description: 'Generate random numbers or make random choices',
  category: 'utility',
  usage: 'number <min> <max> | choice <options>',
  ownerOnly: false,
  groupOnly: false,

  async execute(sock, message, args, context) {
    const chatId = message.key.remoteJid;
    const userId = message.key.participant || message.key.remoteJid;
    
    // Rate limiting - max 20 requests per minute
    const rateLimit = checkRateLimit(userId, 'random', 20, 60);
    if (!rateLimit.allowed) {
      await sock.sendMessage(chatId, { 
        text: `⚠️ Rate limit exceeded. Please wait ${rateLimit.retryAfter} seconds.`
      });
      return;
    }

    if (args.length < 1) {
      const helpText = formatUtilityResponse({
        title: 'Random Utility',
        icon: '🎲',
        lines: [
          'Usage:',
          '.random number <min> <max>',
          '.random choice <option1|option2|...>',
          '',
          'Examples:',
          '.random number 1 100',
          '.random choice yes|no|maybe'
        ]
      });
      await sock.sendMessage(chatId, { text: helpText });
      return;
    }

    const action = args[0].toLowerCase();

    try {
      if (action === 'number' || action === 'num' || action === 'n') {
        const min = parseInt(args[1]) || 1;
        const max = parseInt(args[2]) || 100;
        
        if (min >= max) {
          await sock.sendMessage(chatId, { 
            text: '❌ Minimum must be less than maximum'
          });
          return;
        }
        
        const result = Math.floor(Math.random() * (max - min + 1)) + min;
        
        const response = formatUtilityResponse({
          title: 'Random Number',
          icon: '🎲',
          lines: [
            `Range: ${min} - ${max}`,
            `Result: *${result}*`
          ]
        });
        
        await sock.sendMessage(chatId, { text: response });
        
      } else if (action === 'choice' || action === 'pick' || action === 'c') {
        const optionsText = args.slice(1).join(' ');
        
        if (!optionsText) {
          await sock.sendMessage(chatId, { 
            text: '❌ Please provide options separated by |'
          });
          return;
        }
        
        const options = optionsText.split('|').map(o => o.trim()).filter(o => o);
        
        if (options.length < 2) {
          await sock.sendMessage(chatId, { 
            text: '❌ Please provide at least 2 options separated by |'
          });
          return;
        }
        
        const result = options[Math.floor(Math.random() * options.length)];
        
        const response = formatUtilityResponse({
          title: 'Random Choice',
          icon: '🎯',
          lines: [
            `Options: ${options.join(', ')}`,
            `Chosen: *${result}*`
          ]
        });
        
        await sock.sendMessage(chatId, { text: response });
        
      } else {
        await sock.sendMessage(chatId, { 
          text: '❌ Invalid action. Use "number" or "choice"'
        });
      }
    } catch (error) {
      await sock.sendMessage(chatId, { 
        text: `❌ Error: ${error.message}`
      });
    }
  }
};


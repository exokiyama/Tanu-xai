/**
 * Command: time
 * Category: utility
 * Description: Get current timestamp or convert timezones
 */

const { formatUtilityResponse } = require('../utils/format.js');
const { getTimestamp, formatTimestamp, formatDateInTimezone } = require('../utils/time.js');
const { checkRateLimit } = require('../utils/rate-limiter.js');
const command = {
  pattern: 'time',
  aliases: ['timestamp', 'date', 'now'],
  description: 'Get current timestamp or convert timezones',
  category: 'utility',
  usage: '[timezone]',
  ownerOnly: false,
  groupOnly: false,

  async execute(sock, message, args, context) {
    const chatId = message.key.remoteJid;
    const userId = message.key.participant || message.key.remoteJid;
    
    // Rate limiting - max 20 requests per minute
    const rateLimit = checkRateLimit(userId, 'time', 20, 60);
    if (!rateLimit.allowed) {
      await sock.sendMessage(chatId, { 
        text: `⚠️ Rate limit exceeded. Please wait ${rateLimit.retryAfter} seconds.`
      });
      return;
    }

    const now = new Date();
    
    if (args.length > 0) {
      // Try to parse as timezone
      const timezone = args.join(' ');
      
      try {
        const convertedTime = formatDateInTimezone(now, timezone);
        
        const response = formatUtilityResponse({
          title: 'Timezone Converter',
          icon: '🕐',
          lines: [
            `Timezone: ${timezone}`,
            `Local Time: ${convertedTime}`
          ]
        });
        
        await sock.sendMessage(chatId, { text: response });
        return;
      } catch (error) {
        await sock.sendMessage(chatId, { 
          text: `❌ Invalid timezone. Try formats like "America/New_York" or "Asia/Kolkata"`
        });
        return;
      }
    }

    // Default: show current timestamp and local time
    const tsSeconds = Math.floor(Date.now() / 1000);
    const tsMillis = Date.now();
    const localTime = now.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    const response = formatUtilityResponse({
      title: 'Current Time',
      icon: '🕐',
      lines: [
        `Local Time: ${localTime}`,
        ``,
        `Timestamps:`,
        `  ├ Seconds: ${tsSeconds}`,
        `  └ Milliseconds: ${tsMillis}`
      ]
    });

    await sock.sendMessage(chatId, { text: response });
  }
};


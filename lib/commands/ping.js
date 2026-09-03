/**
 * Command: ping
 * Category: utility
 * Description: Check bot response time (latency)
 */

import { getCache, setCache } from '../utils/cache.js';
import { formatUtilityResponse } from '../utils/format.js';

export const command = {
  pattern: 'ping',
  aliases: ['pong', 'speed', 'p'],
  description: 'Check bot response time (latency)',
  category: 'utility',
  usage: '',
  ownerOnly: false,
  groupOnly: false,

  async execute(sock, message, args, context) {
    const chatId = message.key.remoteJid;
    
    // Check cache for recent ping result (cache for 5 seconds)
    const cachedPing = getCache('ping:last');
    if (cachedPing && Date.now() - cachedPing.timestamp < 5000) {
      const text = formatUtilityResponse({
        title: 'Ping Test',
        icon: '📶',
        lines: [
          `${cachedPing.emoji} Latency: *${cachedPing.latency}ms*`,
          `Server Time: ${new Date().toISOString()}`
        ]
      });
      await sock.sendMessage(chatId, { text });
      return;
    }
    
    const startTime = Date.now();

    // Send initial message to measure round-trip time
    const sentMessage = await sock.sendMessage(chatId, {
      text: '📶 Pinging...'
    });

    const endTime = Date.now();
    const latency = endTime - startTime;

    let emoji = '🟢';
    if (latency > 500) emoji = '🔴';
    else if (latency > 200) emoji = '🟡';
    
    // Cache the result
    setCache('ping:last', { latency, emoji, timestamp: Date.now() }, 5);

    const text = formatUtilityResponse({
      title: 'Ping Test',
      icon: '📶',
      lines: [
        `${emoji} Latency: *${latency}ms*`,
        `Server Time: ${new Date().toISOString()}`
      ]
    });

    // Edit the message with actual latency
    await sock.sendMessage(chatId, {
      text,
      edit: sentMessage.key
    });
  }
};

export default command;

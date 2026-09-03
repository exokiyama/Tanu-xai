/**
 * Command: alive
 * Category: utility
 * Description: Check if the bot is online and responsive
 */

import config from '../../config/config.js';
import { getUptimeString } from '../utils/system.js';
import { formatUtilityResponse } from '../utils/format.js';

export const command = {
  pattern: 'alive',
  aliases: ['status', 'online', 'a'],
  description: 'Check if the bot is online and responsive',
  category: 'utility',
  usage: '',
  ownerOnly: false,
  groupOnly: false,

  async execute(sock, message, args, context) {
    const uptimeString = getUptimeString();

    const text = formatUtilityResponse({
      title: config.BOT_NAME,
      icon: '✅',
      lines: [
        'Bot is Online!',
        `⏱ Uptime: ${uptimeString}`,
        `📦 Version: ${config.VERSION || '1.0.0'}`,
        `👑 Owner: ${config.OWNER_NAME}`
      ]
    });

    await sock.sendMessage(message.key.remoteJid, { text });
  }
};

export default command;

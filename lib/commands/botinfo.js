/**
 * Command: botinfo
 * Category: utility
 * Description: Display detailed bot information and statistics
 */

import config from '../../config/config.js';
import { getBotStatus } from '../utils/system.js';
import { formatUtilityResponse } from '../utils/format.js';

export const command = {
  pattern: 'botinfo',
  aliases: ['info', 'bot', 'bi'],
  description: 'Display detailed bot information and statistics',
  category: 'utility',
  usage: '',
  ownerOnly: false,
  groupOnly: false,

  async execute(sock, message, args, context) {
    const status = getBotStatus(
      config.BOT_NAME,
      config.OWNER_NAME,
      config.PREFIX,
      config.VERSION || '1.0.0'
    );

    const text = formatUtilityResponse({
      title: `${config.BOT_NAME} Info`,
      icon: '🤖',
      lines: [
        `🏷️ Name: *${config.BOT_NAME}*`,
        `👑 Owner: ${config.OWNER_NAME}`,
        `⚙️ Prefix: ${config.PREFIX}`,
        `🌐 Version: ${config.VERSION || '1.0.0'}`,
        '',
        '📊 Statistics:',
        `  ├ Uptime: ${status.uptime}`,
        `  ├ Memory: ${status.memoryString}`,
        `  ├ Node: ${status.nodeVersion}`,
        `  └ Platform: ${status.platform}`,
        '',
        '🔒 Security:',
        `  ├ Anti-Delete: ${config.ANTI_DELETE ? '✅' : '❌'}`,
        `  ├ Anti-ViewOnce: ${config.ANTI_VIEW_ONCE ? '✅' : '❌'}`,
        `  └ ReadMessage: ${config.READ_MESSAGES ? '✅' : '❌'}`
      ]
    });

    await sock.sendMessage(message.key.remoteJid, { text });
  }
};

export default command;

/**
 * Command: alive
 * Category: utility
 * Description: Check if the bot is online and responsive
 */

const config = require('../../config/config.js');
const { getUptimeString } = require('../utils/system.js');
const { formatUtilityResponse } = require('../utils/format.js');
const command = {
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


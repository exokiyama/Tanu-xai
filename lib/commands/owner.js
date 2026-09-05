/**
 * Command: owner
 * Category: 📊 Info
 * Description: Get bot owner contact information
 */

const { config } = require('../../config/config.js');

module.exports = {
  name: 'owner',
  pattern: 'owner',
  aliases: ['creator', 'dev', 'developer', 'o'],
  category: '📊 Info',
  description: 'Get bot owner contact information',
  usage: '',
  permissions: [],
  
  async execute(sock, message, args, context) {
    const text = `╭───「 Owner Info 」───⊷\n` +
      `│ 👑 Name: *${config.OWNER_NAME}*\n` +
      `│ 📱 Contact: ${config.PRIMARY_OWNER}\n` +
      `│ 🤖 Bot: ${config.BOT_NAME}\n` +
      `│ 🌐 Version: ${config.VERSION || '1.0.0'}\n` +
      `╰────────────────────⊷`;
    
    await sock.sendMessage(message.key.remoteJid, { text });
  }
};

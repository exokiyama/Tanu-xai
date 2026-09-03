/**
 * Command: alive
 * Category: 📊 Info
 * Description: Check if the bot is online and responsive
 */

const config = require('../config/config');

module.exports = {
  name: 'alive',
  pattern: 'alive',
  aliases: ['status', 'online', 'a'],
  category: '📊 Info',
  description: 'Check if the bot is online and responsive',
  usage: '',
  permissions: [],
  
  async execute(sock, message, args, context) {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    
    const uptimeString = `${hours}h ${minutes}m ${seconds}s`;
    
    const text = `╭───「 ${config.BOT_NAME} 」───⊷\n` +
      `│ ✅ Bot is Online!\n` +
      `│ ⏱ Uptime: ${uptimeString}\n` +
      `│ 📦 Version: ${config.VERSION || '1.0.0'}\n` +
      `│ 👑 Owner: ${config.OWNER_NAME}\n` +
      `╰────────────────────⊷`;
    
    await sock.sendMessage(message.key.remoteJid, { text });
  }
};

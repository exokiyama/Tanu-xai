/**
 * Command: botinfo
 * Category: 📊 Info
 * Description: Display detailed bot information and statistics
 */

const config = require('../config/config');

module.exports = {
  name: 'botinfo',
  pattern: 'botinfo',
  aliases: ['info', 'bot', 'bi'],
  category: '📊 Info',
  description: 'Display detailed bot information and statistics',
  usage: '',
  permissions: [],
  
  async execute(sock, message, args, context) {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    
    const memoryUsage = process.memoryUsage();
    const usedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const totalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    
    const text = `╭───「 ${config.BOT_NAME} Info 」───⊷\n` +
      `│ 🤖 Name: *${config.BOT_NAME}*\n` +
      `│ 👑 Owner: ${config.OWNER_NAME}\n` +
      `│ ⚙️ Prefix: ${config.PREFIX}\n` +
      `│ 🌐 Version: ${config.VERSION || '1.0.0'}\n` +
      `│\n` +
      `│ 📊 Statistics:\n` +
      `│   ├ Uptime: ${hours}h ${minutes}m ${seconds}s\n` +
      `│   ├ Memory: ${usedMB}MB / ${totalMB}MB\n` +
      `│   ├ Node: ${process.version}\n` +
      `│   └ Platform: ${process.platform}\n` +
      `│\n` +
      `│ 🔒 Security:\n` +
      `│   ├ Anti-Delete: ${config.ANTI_DELETE ? '✅' : '❌'}\n` +
      `│   ├ Anti-ViewOnce: ${config.ANTI_VIEW_ONCE ? '✅' : '❌'}\n` +
      `│   └ ReadMessage: ${config.READ_MESSAGES ? '✅' : '❌'}\n` +
      `╰────────────────────⊷`;
    
    await sock.sendMessage(message.key.remoteJid, { text });
  }
};

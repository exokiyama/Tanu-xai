'use strict';
const { config } = require('../../config/config.js');
module.exports = {
  pattern: 'repo', aliases: [], description: 'Show the official Tanu XAI repository', category: '🔎 Search', usage: 'repo',
  async handler(sock, message, args, context) {
    if (!config.repositoryUrl) return context.reply('❌ Repository URL is not configured.');
    return context.reply(`📦 *Tanu XAI Repository*\n\n${config.repositoryUrl}`);
  }
};

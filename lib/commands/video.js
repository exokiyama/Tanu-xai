'use strict';
const song = require('./song');
module.exports = {
  ...song,
  pattern: 'video', aliases: ['vid'],
  description: 'Download a YouTube video',
  usage: 'video <YouTube URL or search query>',
  async handler(sock, message, args, context) {
    const input = args.join(' ').trim();
    if (!input) return context.reply('Usage: `.video <YouTube URL or search query>`');
    try { await song.download(sock, message, context, input, 'video'); }
    catch (e) { await context.reply(`❌ Download failed: ${e.message}`); }
  }
};

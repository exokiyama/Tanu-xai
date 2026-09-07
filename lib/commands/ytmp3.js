'use strict';
const song = require('./song');
module.exports = {
  ...song,
  pattern: 'ytmp3', aliases: [],
  description: 'Download YouTube audio as MP3',
  usage: 'ytmp3 <YouTube URL or search query>',
  async handler(sock, message, args, context) {
    const input = args.join(' ').trim();
    if (!input) return context.reply('Usage: `.ytmp3 <song name or YouTube URL>`');
    try { await song.download(sock, message, context, input, 'audio'); }
    catch (e) { await context.reply(`❌ Download failed: ${e.message}`); }
  }
};

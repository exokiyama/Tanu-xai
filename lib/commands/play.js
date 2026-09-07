'use strict';

const { requestDownload, pickMedia, pickTitle, resolveYouTube, safeFilename } = require('../utils/hax-media');
const { checkRateLimit } = require('../utils/rate-limiter');

module.exports = {
  pattern: 'play',
  aliases: [],
  description: 'Search YouTube by title or URL and download audio',
  category: '🎵 Media',
  usage: 'play <song name or YouTube URL>',
  async handler(sock, message, args, context) {
    const sender = context.sender || 'unknown';
    if (!checkRateLimit(`play:${sender}`, 10, 3600)) return context.reply('⏱️ Download rate limit reached. Try again later.');
    const input = args.join(' ').trim();
    if (!input) return context.reply('🎵 Usage: `.play <song name or YouTube URL>`');
    try {
      const url = await resolveYouTube(input);
      await context.reply('⏳ Searching and downloading audio...');
      const data = await requestDownload(url, 'audio');
      const mediaUrl = pickMedia(data, 'audio');
      if (!mediaUrl) throw new Error('Media API returned no audio URL');
      const title = pickTitle(data, input);
      await sock.sendMessage(context.chat, { audio: { url: mediaUrl }, mimetype: 'audio/mpeg', fileName: `${safeFilename(title, 'song')}.mp3` }, { quoted: message });
    } catch (error) {
      await context.reply(`❌ Play failed: ${error.message}`);
    }
  }
};

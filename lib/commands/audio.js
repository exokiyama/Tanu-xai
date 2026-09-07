'use strict';
const { requestDownload, pickMedia, pickTitle } = require('../utils/hax-media');
module.exports = {
  pattern: 'audio', aliases: ['urlaudio'], description: 'Download audio from a direct media URL', category: '🎵 Media', usage: 'audio <URL>',
  async handler(sock, message, args, context) {
    const url = args.join(' ').trim(); if (!url) return context.reply('Usage: `.audio <URL>`');
    try { const data = await requestDownload(url, 'audio'); const media = pickMedia(data, 'audio'); if (!media) throw new Error('No audio URL returned'); await sock.sendMessage(context.chat, { audio: { url: media }, mimetype: 'audio/mpeg', fileName: `${pickTitle(data, 'audio')}.mp3` }, { quoted: message }); }
    catch (e) { await context.reply(`❌ ${e.message}`); }
  }
};

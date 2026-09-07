'use strict';

const { requestDownload, pickMedia, pickTitle, resolveYouTube, safeFilename } = require('../utils/hax-media');
const { checkRateLimit } = require('../utils/rate-limiter');

async function download(sock, message, context, input, format) {
  const url = await resolveYouTube(input);
  await context.reply(`⏳ Preparing ${format === 'video' ? 'video' : 'audio'} download...`);
  const data = await requestDownload(url, format);
  const mediaUrl = pickMedia(data, format);
  if (!mediaUrl) throw new Error(`Media API returned no ${format} URL`);
  const title = pickTitle(data, 'YouTube Media');
  if (format === 'video') {
    await sock.sendMessage(context.chat, { video: { url: mediaUrl }, caption: `🎬 *${title}*`, mimetype: 'video/mp4' }, { quoted: message });
  } else {
    await sock.sendMessage(context.chat, { audio: { url: mediaUrl }, mimetype: 'audio/mpeg', fileName: `${safeFilename(title, 'song')}.mp3` }, { quoted: message });
  }
}

module.exports = {
  pattern: 'song',
  aliases: ['music', 'yta'],
  description: 'Download a YouTube song as audio or video',
  category: '🎵 Media',
  usage: 'song <name|URL> [audio|video]',
  async handler(sock, message, args, context) {
    const sender = context.sender || context.senderJid || 'unknown';
    if (!checkRateLimit(`song:${sender}`, 10, 3600)) return context.reply('⏱️ Download rate limit reached. Try again later.');
    let input = args.join(' ').trim();
    if (!input && context.quoted) input = String(context.quoted.text || '').trim();
    if (!input) return context.reply('🎵 Usage: `.song <song name or YouTube URL>`\nThen choose *Audio* or *Video*.');

    let format = null;
    if (/\s+(audio|1)$/i.test(input)) { format = 'audio'; input = input.replace(/\s+(audio|1)$/i, '').trim(); }
    if (/\s+(video|2)$/i.test(input)) { format = 'video'; input = input.replace(/\s+(video|2)$/i, '').trim(); }

    try {
      if (!format) {
        return sock.sendMessage(context.chat, {
          text: `🎵 *${input}*\n\nChoose download format:`,
          buttons: [
            { type: 'reply', reply: { display_text: '🎵 Audio', id: `.song ${input} audio` } },
            { type: 'reply', reply: { display_text: '🎬 Video', id: `.song ${input} video` } }
          ],
          headerType: 1
        }, { quoted: message });
      }
      await download(sock, message, context, input, format);
    } catch (error) {
      await context.reply(`❌ Download failed: ${error.message}`);
    }
  },
  download
};

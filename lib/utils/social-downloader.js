'use strict';
const { requestDownload, pickAnyMedia, pickTitle, safeFilename } = require('./hax-media');

function createSocialCommand(pattern, description) {
  return {
    pattern, aliases: [], description, category: '🎵 Media', usage: `${pattern} <URL>`,
    async handler(sock, message, args, context) {
      const url = args.join(' ').trim();
      if (!url) return context.reply(`Usage: .${pattern} <URL>`);
      try {
        const data = await requestDownload(url, 'auto');
        const media = pickAnyMedia(data);
        if (!media) throw new Error('Media API returned no downloadable media');
        const title = pickTitle(data, `${pattern} media`);
        const safe = safeFilename(title, pattern);
        let payload;
        if (media.type === 'audio') payload = { audio: { url: media.url }, mimetype: 'audio/mpeg', fileName: `${safe}.mp3` };
        else if (media.type === 'image') payload = { image: { url: media.url }, caption: `📥 *${title}*` };
        else payload = { video: { url: media.url }, caption: `📥 *${title}*`, mimetype: 'video/mp4' };
        await sock.sendMessage(context.chat, payload, { quoted: message });
      } catch (error) { await context.reply(`❌ ${description} failed: ${error.message}`); }
    }
  };
}
module.exports = createSocialCommand;

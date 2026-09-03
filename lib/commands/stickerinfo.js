const { extractStickerMetadata } = require('../utils/sticker');
const { formatSize } = require('../utils/media');
const { checkRateLimit } = require('../utils/rate-limiter');

module.exports = {
  pattern: 'stickerinfo ?(.*)',
  aliases: ['stinfo', 'stickinfo'],
  description: 'Get sticker metadata information',
  category: 'sticker',
  usage: '<reply to sticker>',
  groupOnly: false,
  ownerOnly: false,
  async handler(sock, message, args, context) {
    const { reply, quoted, senderJid } = context;
    
    // Rate limiting check
    const rateCheck = await checkRateLimit(senderJid, 'stickerinfo', 30);
    if (!rateCheck.allowed) {
      return reply(`⏱️ Rate limit exceeded. Please wait ${Math.ceil(rateCheck.retryAfter)} seconds.`);
    }
    
    if (!quoted || !quoted.msg) {
      return reply('Reply to a sticker');
    }

    const messageType = quoted.msg.mtype || quoted.msg.type;
    if (messageType !== 'stickerMessage') {
      return reply('Please reply to a sticker message');
    }

    try {
      const buffer = await sock.downloadMediaMessage(quoted);
      
      if (!buffer) {
        return reply('Failed to download sticker');
      }

      const metadata = await extractStickerMetadata(buffer);
      
      if (!metadata) {
        return reply('Failed to extract sticker metadata');
      }

      let info = '╭───────────────╮\n';
      info += '│   STICKER INFO  │\n';
      info += '╰───────────────╯\n\n';
      info += `📐 *Format:* ${metadata.format.toUpperCase()}\n`;
      info += `📏 *Dimensions:* ${metadata.width}x${metadata.height}px\n`;
      info += `💾 *Size:* ${formatSize(metadata.size)}\n`;
      info += `🔍 *Has Alpha:* ${metadata.hasAlpha ? 'Yes' : 'No'}\n`;
      info += `🎬 *Animated:* ${metadata.isAnimated ? 'Yes' : 'No'}\n`;
      if (metadata.pages > 1) {
        info += `🎞️ *Frames:* ${metadata.pages}\n`;
      }

      await reply(info);

    } catch (error) {
      console.error('StickerInfo error:', error);
      await reply(`Failed to get sticker info: ${error.message}`);
    }
  }
};

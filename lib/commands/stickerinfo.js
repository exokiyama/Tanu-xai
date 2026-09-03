const { extractStickerMetadata } = require('../utils/sticker');
const { formatSize } = require('../utils/media');

module.exports = {
  pattern: 'stickerinfo ?(.*)',
  aliases: ['stinfo', 'stickinfo'],
  description: 'Get sticker metadata information',
  category: 'media',
  usage: '<reply to sticker>',
  groupOnly: false,
  async handler(sock, message, args, context) {
    const { reply, quoted } = context;
    
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

      let info = '乂 *STICKER INFORMATION*\n\n';
      info += `*Format:* ${metadata.format.toUpperCase()}\n`;
      info += `*Dimensions:* ${metadata.width}x${metadata.height}px\n`;
      info += `*Size:* ${formatSize(metadata.size)}\n`;
      info += `*Has Alpha:* ${metadata.hasAlpha ? 'Yes' : 'No'}\n`;
      info += `*Animated:* ${metadata.isAnimated ? 'Yes' : 'No'}\n`;
      if (metadata.pages > 1) {
        info += `*Frames:* ${metadata.pages}\n`;
      }

      await reply(info);

    } catch (error) {
      console.error('StickerInfo error:', error);
      await reply(`Failed to get sticker info: ${error.message}`);
    }
  }
};

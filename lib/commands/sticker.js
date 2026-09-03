const { createSticker } = require('../utils/sticker');
const { validateFileSize, SIZE_LIMITS } = require('../utils/media');

module.exports = {
  pattern: 'sticker ?(.*)',
  aliases: ['s', 'stick'],
  description: 'Create sticker from image or video',
  category: 'media',
  usage: '<reply to image/video>',
  groupOnly: false,
  async handler(sock, message, args, context) {
    const { reply, quoted } = context;
    
    if (!quoted || !quoted.msg) {
      return reply('Reply to an image or video to create a sticker');
    }

    const messageType = quoted.msg.mtype || quoted.msg.type;
    const isVideo = messageType === 'videoMessage';
    const isImage = messageType === 'imageMessage';

    if (!isImage && !isVideo) {
      return reply('Please reply to an image or video message');
    }

    try {
      // Download media
      const buffer = await sock.downloadMediaMessage(quoted);
      
      if (!buffer) {
        return reply('Failed to download media');
      }

      // Validate size
      const sizeCheck = validateFileSize(buffer.length, 'sticker');
      if (!sizeCheck.valid) {
        return reply(`File too large for sticker: ${sizeCheck.sizeFormatted} (max: ${sizeCheck.limitFormatted})`);
      }

      // Create sticker
      const sticker = await createSticker(buffer, isVideo, {
        pack: process.env.STICKER_PACK_NAME || 'Tanu Bot',
        author: process.env.STICKER_AUTHOR || 'WhatsApp Bot'
      });

      // Send as sticker
      await sock.sendMessage(context.chat, {
        sticker: sticker.buffer,
        mimetype: sticker.mimetype
      }, { quoted: message });

    } catch (error) {
      console.error('Sticker creation error:', error);
      await reply(`Failed to create sticker: ${error.message}`);
    }
  }
};

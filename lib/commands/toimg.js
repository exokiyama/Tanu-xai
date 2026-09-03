const sharp = require('sharp');
const { getTmpDir } = require('../utils/downloader');
const path = require('path');
const fs = require('fs');

module.exports = {
  pattern: 'toimg ?(.*)',
  aliases: ['toimage', 'webptoimg'],
  description: 'Convert WebP sticker to image',
  category: 'media',
  usage: '<reply to sticker>',
  groupOnly: false,
  async handler(sock, message, args, context) {
    const { reply, quoted } = context;
    
    if (!quoted || !quoted.msg) {
      return reply('Reply to a WebP sticker');
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

      // Convert WebP to PNG using sharp
      const outputBuffer = await sharp(buffer)
        .png()
        .toBuffer();

      await sock.sendMessage(context.chat, {
        image: outputBuffer,
        mimetype: 'image/png'
      }, { quoted: message });

    } catch (error) {
      console.error('ToImg error:', error);
      await reply(`Failed to convert to image: ${error.message}`);
    }
  }
};

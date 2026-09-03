const { toMp4 } = require('../utils/ffmpeg');
const fs = require('fs');
const path = require('path');
const { getTmpDir } = require('../utils/downloader');

module.exports = {
  pattern: 'tomp4 ?(.*)',
  aliases: ['tomedia', 'webptomp4'],
  description: 'Convert animated sticker/video to MP4',
  category: 'media',
  usage: '<reply to animated sticker or video>',
  groupOnly: false,
  async handler(sock, message, args, context) {
    const { reply, quoted } = context;
    
    if (!quoted || !quoted.msg) {
      return reply('Reply to an animated sticker or video');
    }

    try {
      const buffer = await sock.downloadMediaMessage(quoted);
      
      if (!buffer) {
        return reply('Failed to download media');
      }

      const tmpDir = getTmpDir();
      const inputPath = path.join(tmpDir, `input_${Date.now()}.webp`);
      const outputPath = path.join(tmpDir, `output_${Date.now()}.mp4`);

      fs.writeFileSync(inputPath, buffer);

      try {
        const mp4Path = await toMp4(inputPath, outputPath);
        const mp4Buffer = fs.readFileSync(mp4Path);

        await sock.sendMessage(context.chat, {
          video: mp4Buffer,
          mimetype: 'video/mp4'
        }, { quoted: message });

      } finally {
        // Cleanup
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      }

    } catch (error) {
      console.error('ToMP4 error:', error);
      await reply(`Failed to convert to MP4: ${error.message}`);
    }
  }
};

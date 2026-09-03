const { toMp4 } = require('../utils/ffmpeg');
const { checkRateLimit } = require('../utils/rate-limiter');
const fs = require('fs');
const path = require('path');
const { getTmpDir } = require('../utils/downloader');

module.exports = {
  pattern: 'tomp4 ?(.*)',
  aliases: ['tomedia', 'webptomp4'],
  description: 'Convert animated sticker/video to MP4',
  category: 'downloader',
  usage: '<reply to animated sticker or video>',
  groupOnly: false,
  async handler(sock, message, args, context) {
    const { reply, sender, quoted } = context;

    // Rate limiting: 10 conversions per hour per user
    const rateLimitKey = `tomp4:${sender}`;
    if (!checkRateLimit(rateLimitKey, 10, 3600)) {
      return reply('⏱️ Rate limit exceeded. Please wait before converting more files.');
    }

    if (!quoted || !quoted.msg) {
      return reply('📹 *MP4 Converter*\n\nPlease reply to an animated sticker or video.');
    }

    try {
      await reply('📹 Converting to MP4...\n⏳ Please wait...');

      const buffer = await sock.downloadMediaMessage(quoted);

      if (!buffer) {
        return reply('❌ Failed to download media.');
      }

      const tmpDir = getTmpDir();
      const inputPath = path.join(tmpDir, `input_${Date.now()}.webp`);
      const outputPath = path.join(tmpDir, `output_${Date.now()}.mp4`);

      fs.writeFileSync(inputPath, buffer);

      try {
        const mp4Path = await toMp4(inputPath, outputPath);
        const mp4Buffer = fs.readFileSync(mp4Path);

        // Check file size (64MB limit for video on WhatsApp)
        if (mp4Buffer.length > 64 * 1024 * 1024) {
          return reply('❌ Video file too large for WhatsApp. Maximum size is 64MB.');
        }

        await sock.sendMessage(context.chat, {
          video: mp4Buffer,
          mimetype: 'video/mp4',
          fileName: `video_${Date.now()}.mp4`
        }, { quoted: message });

      } finally {
        // Cleanup temp files
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      }

    } catch (error) {
      console.error('ToMP4 error:', error);
      await reply(`❌ Failed to convert to MP4: ${error.message}`);
    }
  }
};

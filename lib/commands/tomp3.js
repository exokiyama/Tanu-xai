const { extractAudio } = require('../utils/ffmpeg');
const { checkRateLimit } = require('../utils/rate-limiter');
const fs = require('fs');
const path = require('path');
const { getTmpDir } = require('../utils/downloader');

module.exports = {
  pattern: 'tomp3 ?(.*)',
  aliases: ['mp3', 'toaudio'],
  description: 'Extract MP3 audio from video',
  category: 'downloader',
  usage: '<reply to video>',
  groupOnly: false,
  async handler(sock, message, args, context) {
    const { reply, sender, quoted } = context;

    // Rate limiting: 10 conversions per hour per user
    const rateLimitKey = `tomp3:${sender}`;
    if (!checkRateLimit(rateLimitKey, 10, 3600)) {
      return reply('⏱️ Rate limit exceeded. Please wait before converting more files.');
    }

    if (!quoted || !quoted.msg) {
      return reply('🎵 *MP3 Converter*\n\nPlease reply to a video message to extract audio.');
    }

    const messageType = quoted.msg.mtype || quoted.msg.type;
    if (messageType !== 'videoMessage') {
      return reply('❌ Please reply to a video message only.');
    }

    try {
      await reply('🎵 Extracting audio from video...\n⏳ Please wait...');

      const buffer = await sock.downloadMediaMessage(quoted);

      if (!buffer) {
        return reply('❌ Failed to download video. Please try again.');
      }

      const tmpDir = getTmpDir();
      const inputPath = path.join(tmpDir, `video_${Date.now()}.mp4`);
      const outputPath = path.join(tmpDir, `audio_${Date.now()}.mp3`);

      fs.writeFileSync(inputPath, buffer);

      try {
        const mp3Path = await extractAudio(inputPath, outputPath);
        const mp3Buffer = fs.readFileSync(mp3Path);

        // Check file size (64MB limit for audio on WhatsApp)
        if (mp3Buffer.length > 64 * 1024 * 1024) {
          return reply('❌ Audio file too large for WhatsApp. Maximum size is 64MB.');
        }

        await sock.sendMessage(context.chat, {
          audio: mp3Buffer,
          mimetype: 'audio/mpeg',
          fileName: `audio_${Date.now()}.mp3`
        }, { quoted: message });

      } finally {
        // Cleanup temp files
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      }

    } catch (error) {
      console.error('ToMP3 error:', error);
      await reply(`❌ Failed to extract audio: ${error.message}`);
    }
  }
};

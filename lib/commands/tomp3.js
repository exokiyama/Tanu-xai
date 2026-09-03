const { extractAudio } = require('../utils/ffmpeg');
const fs = require('fs');
const path = require('path');
const { getTmpDir } = require('../utils/downloader');

module.exports = {
  pattern: 'tomp3 ?(.*)',
  aliases: ['mp3', 'toaudio'],
  description: 'Extract MP3 audio from video',
  category: 'media',
  usage: '<reply to video>',
  groupOnly: false,
  async handler(sock, message, args, context) {
    const { reply, quoted } = context;
    
    if (!quoted || !quoted.msg) {
      return reply('Reply to a video');
    }

    const messageType = quoted.msg.mtype || quoted.msg.type;
    if (messageType !== 'videoMessage') {
      return reply('Please reply to a video message');
    }

    try {
      const buffer = await sock.downloadMediaMessage(quoted);
      
      if (!buffer) {
        return reply('Failed to download video');
      }

      const tmpDir = getTmpDir();
      const inputPath = path.join(tmpDir, `video_${Date.now()}.mp4`);
      const outputPath = path.join(tmpDir, `audio_${Date.now()}.mp3`);

      fs.writeFileSync(inputPath, buffer);

      try {
        const mp3Path = await extractAudio(inputPath, outputPath);
        const mp3Buffer = fs.readFileSync(mp3Path);

        await sock.sendMessage(context.chat, {
          audio: mp3Buffer,
          mimetype: 'audio/mpeg'
        }, { quoted: message });

      } finally {
        // Cleanup
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      }

    } catch (error) {
      console.error('ToMP3 error:', error);
      await reply(`Failed to extract audio: ${error.message}`);
    }
  }
};

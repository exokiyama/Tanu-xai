const { checkRateLimit } = require('../utils/rate-limiter');

module.exports = {
  pattern: 'media ?(.*)',
  aliases: ['downloader'],
  description: 'Show downloader commands list',
  category: 'downloader',
  usage: '<category name>',
  groupOnly: false,
  async handler(sock, message, args, context) {
    const { reply } = context;
    
    const text = `╭───「 📥 DOWNLOADER 」───⊷
│ 
│ Available downloader commands:
│ 
│ ◦ .song <URL> - Download YouTube audio
│   Aliases: .play, .music, .yta, .ytmp3
│ 
│ ◦ .video <URL> - Download YouTube video  
│   Aliases: .vid, .ytv, .ytmp4
│ 
│ ◦ .tomp3 - Extract audio from video
│   Aliases: .mp3, .toaudio
│ 
│ ◦ .tomp4 - Convert to MP4
│   Aliases: .tomedia, .webptomp4
│ 
│ Note: Full YouTube download requires ytdl-core
│ Install: npm install ytdl-core
│ 
│ File Size Limits (WhatsApp):
│ • Audio: 64MB
│ • Video: 64MB
│ • Images: 16MB
│ • Documents: 100MB
│ 
╰────────────────────⊷`;

    await reply(text);
  }
};

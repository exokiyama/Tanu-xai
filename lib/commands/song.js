const { downloadFile, validateUrl, extractYouTubeId, LIMITS } = require('../utils/downloader');
const { extractAudio } = require('../utils/ffmpeg');
const { checkRateLimit } = require('../utils/rate-limiter');
const fs = require('fs');
const path = require('path');

module.exports = {
  pattern: 'song ?(.*)',
  aliases: ['play', 'music', 'yta', 'ytmp3'],
  description: 'Download audio from YouTube',
  category: 'downloader',
  usage: '<YouTube URL or search query>',
  groupOnly: false,
  async handler(sock, message, args, context) {
    const { reply, sender, quoted } = context;
    
    // Rate limiting: 10 downloads per hour per user
    const rateLimitKey = `song:${sender}`;
    if (!checkRateLimit(rateLimitKey, 10, 3600)) {
      return reply('⏱️ Rate limit exceeded. Please wait before downloading more songs.');
    }

    // Extract URL from args or quoted message
    let url = args.join(' ').trim();
    
    if (!url && quoted?.msg) {
      const quotedText = quoted.msg.conversation || quoted.msg.extendedTextMessage?.text || '';
      const urlMatch = quotedText.match(/(https?:\/\/[^\s]+)/);
      if (urlMatch) url = urlMatch[1];
    }
    
    if (!url) {
      return reply('🎵 *Song Downloader*\n\nPlease provide a YouTube URL:\n• `.song https://youtube.com/watch?v=...`\n• `.song https://youtu.be/...`\n• Reply to a message containing a YouTube URL');
    }

    // Validate YouTube URL
    if (!validateUrl(url, 'youtube')) {
      return reply('❌ Invalid YouTube URL. Please provide a valid YouTube link.');
    }
    
    const videoId = extractYouTubeId(url);
    if (!videoId) {
      return reply('❌ Could not extract video ID from URL.');
    }

    try {
      await reply('🎵 Downloading audio...\n\n📹 Video ID: `' + videoId + '`\n⏳ Please wait...');
      
      // Note: This is a placeholder - full implementation requires ytdl-core
      // The actual implementation would:
      // 1. Use ytdl-core to get audio stream URL
      // 2. Download the audio
      // 3. Extract metadata (title, artist, thumbnail)
      // 4. Send as audio message with metadata
      // 5. Cleanup temp files
      
      await reply('⚠️ *Note*: Full YouTube download requires `ytdl-core` library installation.\n\nThis is a placeholder implementation. To enable full functionality:\n\n`npm install ytdl-core`');
      
    } catch (error) {
      console.error('Song download error:', error);
      const errorMsg = error.message.toLowerCase();
      
      if (errorMsg.includes('private') || errorMsg.includes('unavailable')) {
        return reply('❌ This video is private or unavailable.');
      } else if (errorMsg.includes('region')) {
        return reply('❌ This content is not available in your region.');
      } else if (errorMsg.includes('large') || errorMsg.includes('size')) {
        return reply('❌ File too large for WhatsApp. Maximum audio size is 64MB.');
      } else if (errorMsg.includes('timeout')) {
        return reply('⏱️ Download timed out. The file may be too large.');
      }
      
      await reply(`❌ Failed to download: ${error.message}`);
    }
  }
};

const { sendReaction } = require('../utils/reaction');

module.exports = {
  pattern: 'shadi ?(.*)',
  aliases: ['marry', 'propose', 'wedding'],
  description: 'Propose marriage to someone (with ring GIF)',
  category: 'reaction',
  usage: '@user or reply to message',
  async execute(sock, message, args, context) {
    const chatId = message.chat || message.key?.remoteJid;
    const sender = message.sender || message.key?.participant || message.key?.remoteJid;
    
    // Get target from quoted message or mention
    let target = null;
    if (message.quoted) {
      target = message.quoted.sender;
    } else if (args[0] && args[0].includes('@')) {
      target = args[0].replace('@', '') + '@s.whatsapp.net';
    }
    
    if (!target) {
      return await sock.sendMessage(chatId, { 
        text: '❌ Please mention someone or reply to their message to propose!' 
      }, { quoted: message });
    }
    
    // Prevent self-marriage
    if (target === sender) {
      return await sock.sendMessage(chatId, { 
        text: '❌ You cannot marry yourself! Choose someone else 💍' 
      }, { quoted: message });
    }
    
    const senderName = message.pushName || sender.split('@')[0];
    const targetName = target.split('@')[0];
    
    try {
      // Use kiss API as fallback for proposal (romantic)
      const axios = require('axios');
      const response = await axios.get('https://api.waifu.pics/sfw/kiss', {
        timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      
      const gifUrl = response.data.url;
      const gifBuffer = Buffer.from((await axios.get(gifUrl, { 
        responseType: 'arraybuffer',
        timeout: 15000 
      })).data);
      
      const caption = `💍 *MARRIAGE PROPOSAL* 💍\n\n@${senderName} is proposing to @${targetName}!\n\nWill you accept? 💕`;
      
      await sock.sendMessage(chatId, {
        video: gifBuffer,
        caption: caption,
        gifPlayback: true,
        mentions: [sender, target]
      }, { quoted: message });
      
    } catch (error) {
      console.error('Shadi error:', error);
      await sock.sendMessage(chatId, { 
        text: `💍 @${senderName} wants to marry @${targetName}! 💕\n\n(GIF failed to load)` ,
        mentions: [sender, target]
      }, { quoted: message });
    }
  }
};

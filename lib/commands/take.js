const { createSticker } = require('../utils/sticker');
const { checkRateLimit } = require('../utils/rate-limiter');

module.exports = {
  pattern: 'take ?(.*)',
  aliases: ['steal', 'changepack'],
  description: 'Change sticker pack metadata',
  category: 'sticker',
  usage: '<pack|author> <reply to sticker>',
  groupOnly: false,
  ownerOnly: false,
  async handler(sock, message, args, context) {
    const { reply, quoted, senderJid } = context;
    
    // Rate limiting check
    const rateCheck = await checkRateLimit(senderJid, 'take', 30);
    if (!rateCheck.allowed) {
      return reply(`⏱️ Rate limit exceeded. Please wait ${Math.ceil(rateCheck.retryAfter)} seconds.`);
    }
    
    if (!quoted || !quoted.msg) {
      return reply('Reply to a sticker');
    }

    if (!args || args.length === 0) {
      return reply('Usage: .take <pack name>|<author name>\nExample: .take MyPack|Me');
    }

    const [pack, author] = args.join(' ').split('|');

    try {
      const buffer = await sock.downloadMediaMessage(quoted);
      
      if (!buffer) {
        return reply('Failed to download sticker');
      }

      const sticker = await createSticker(buffer, false, {
        pack: pack || 'Tanu Bot',
        author: author || 'WhatsApp Bot'
      });

      await sock.sendMessage(context.chat, {
        sticker: sticker.buffer,
        mimetype: sticker.mimetype
      }, { quoted: message });

    } catch (error) {
      console.error('Take sticker error:', error);
      await reply(`Failed to change pack: ${error.message}`);
    }
  }
};

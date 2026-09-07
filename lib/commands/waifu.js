'use strict';

const axios = require('axios');
const { config } = require('../../config/config.js');

const SAFE_TAGS = ['maid', 'waifu', 'marin-kitagawa', 'mori-calliope', 'raiden-shogun', 'oppai', 'selfies', 'uniform', 'kamisato-ayaka'];
const NSFW_TAGS = ['ass', 'hentai', 'milf', 'oral', 'paizuri', 'ecchi', 'ero'];

module.exports = {
  pattern: 'waifu',
  aliases: ['waifus'],
  description: 'Download random waifu images by tag',
  category: '🎨 Image',
  usage: 'waifu <tag> | waifu tags | waifu nsfw <tag>',
  async handler(sock, message, args, context) {
    let input = args.join(' ').trim().toLowerCase();
    if (!input || input === 'help') return context.reply('🖼️ Usage: `.waifu <tag>` or `.waifu nsfw <tag>`\nUse `.waifu tags` for available tags.');
    if (input === 'tags') return context.reply(`*Available Waifu Tags*\n\n*Safe:* ${SAFE_TAGS.join(', ')}\n\n*NSFW:* ${NSFW_TAGS.join(', ')}`);

    const nsfw = /(^|\s)nsfw(\s|$)/i.test(input);
    const tag = input.replace(/(^|\s)nsfw(\s|$)/ig, ' ').trim() || 'waifu';
    const allowed = nsfw ? NSFW_TAGS : SAFE_TAGS;
    if (!allowed.includes(tag)) return context.reply(`❌ Unknown ${nsfw ? 'NSFW' : 'safe'} tag. Use .waifu tags.`);

    try {
      const response = await axios.get('https://api.waifu.im/search', {
        params: { included_tags: tag, is_nsfw: String(nsfw), height: '>=1000' },
        headers: config.WAIFU_API_KEY ? { Authorization: `Bearer ${config.WAIFU_API_KEY}` } : {},
        timeout: 20000
      });
      const images = response.data?.images || [];
      if (!images.length) return context.reply('❌ No image found for that tag.');
      for (const image of images.slice(0, 3)) {
        await sock.sendMessage(context.chat, { image: { url: image.url }, caption: `✨ *${tag}*` }, { quoted: message });
      }
    } catch (error) {
      await context.reply(`❌ Failed to retrieve waifu image: ${error.response?.data?.message || error.message}`);
    }
  }
};

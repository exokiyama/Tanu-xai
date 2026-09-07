'use strict';
const { searchYouTube } = require('../utils/hax-media');
module.exports = { pattern: 'ytsearch', aliases: ['yts'], description: 'Search YouTube and return the first result URL', category: '🔎 Search', usage: 'ytsearch <query>', async handler(sock, message, args, context) { try { const url = await searchYouTube(args.join(' ')); await context.reply(`🔎 YouTube result:\n${url}`); } catch (e) { await context.reply(`❌ ${e.message}`); } } };

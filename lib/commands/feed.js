const { sendReaction } = require('../utils/reaction');

module.exports = {
  pattern: 'feed ?(.*)',
  aliases: ['feeding'],
  description: 'Feed someone',
  category: 'reaction',
  usage: '@user or reply to message',
  async execute(sock, message, args, context) {
    await sendReaction(sock, message, {
      action: 'feed',
      captionTemplate: '{sender} fed {target} 🍕'
    });
  }
};

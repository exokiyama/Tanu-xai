const { sendReaction } = require('../utils/reaction');

module.exports = {
  pattern: 'punch ?(.*)',
  aliases: ['hit', 'punching'],
  description: 'Punch someone',
  category: 'reaction',
  usage: '@user or reply to message',
  async execute(sock, message, args, context) {
    await sendReaction(sock, message, {
      action: 'punch',
      captionTemplate: '{sender} punched {target} 👊'
    });
  }
};

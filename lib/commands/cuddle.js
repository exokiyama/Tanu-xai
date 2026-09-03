const { sendReaction } = require('../utils/reaction');

module.exports = {
  pattern: 'cuddle ?(.*)',
  aliases: ['glomp', 'snuggle'],
  description: 'Cuddle someone with a cute GIF',
  category: 'reaction',
  usage: '@user or reply to message',
  async execute(sock, message, args, context) {
    await sendReaction(sock, message, {
      action: 'cuddle',
      captionTemplate: '{sender} cuddled {target} 🤗'
    });
  }
};

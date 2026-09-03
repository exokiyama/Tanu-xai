const { sendReaction } = require('../utils/reaction');

module.exports = {
  pattern: 'hug ?(.*)',
  aliases: ['cuddle', 'glomp'],
  description: 'Hug someone with a cute GIF',
  category: 'reaction',
  usage: '@user or reply to message',
  async execute(sock, message, args, context) {
    await sendReaction(sock, message, {
      action: 'hug',
      captionTemplate: '{sender} hugged {target} 💕'
    });
  }
};
